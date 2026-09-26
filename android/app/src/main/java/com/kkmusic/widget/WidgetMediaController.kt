package com.kkmusic.widget

import android.content.ComponentName
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import java.util.concurrent.TimeUnit

/**
 * Single source of truth for the widget: the Media3 session exposed by RNTP.
 *
 * The widget never creates its own audio player.
 */
object WidgetMediaController {
    private const val TAG = "KKMusicWidget"
    private const val SERVICE_CLASS =
        "com.doublesymmetry.trackplayer.service.MusicService"
    private const val CONNECT_TIMEOUT_SECONDS = 5L
    private const val POST_COMMAND_REFRESH_MS = 180L

    private val mainHandler = Handler(Looper.getMainLooper())
    private val lock = Any()

    @Volatile
    private var mediaController: MediaController? = null

    @Volatile
    private var connecting = false

    private data class PendingOperation(
        val onConnected: (MediaController) -> Unit,
        val onFailed: () -> Unit,
    )

    private val pendingOperations = mutableListOf<PendingOperation>()

    private val controllerListener = object : Player.Listener {
        override fun onMediaItemTransition(
            mediaItem: MediaItem?,
            reason: Int,
        ) {
            refreshFromCallback()
        }

        override fun onMediaMetadataChanged(
            mediaMetadata: MediaMetadata,
        ) {
            refreshFromCallback()
        }

        override fun onIsPlayingChanged(
            isPlaying: Boolean,
        ) {
            refreshFromCallback()
        }

        override fun onPlaybackStateChanged(
            playbackState: Int,
        ) {
            if (
                playbackState == Player.STATE_READY ||
                playbackState == Player.STATE_ENDED ||
                playbackState == Player.STATE_IDLE
            ) {
                refreshFromCallback()
            }
        }

        override fun onRepeatModeChanged(
            repeatMode: Int,
        ) {
            refreshFromCallback()
        }

        override fun onShuffleModeEnabledChanged(
            shuffleModeEnabled: Boolean,
        ) {
            refreshFromCallback()
        }

        override fun onPlayerError(
            error: androidx.media3.common.PlaybackException,
        ) {
            Log.e(TAG, "RNTP player error", error)
            refreshFromCallback()
        }
    }

    fun setApplicationContext(context: Context) {
        WidgetApplicationContext.value = context.applicationContext
    }

    fun syncNow(
        context: Context,
        onFinished: () -> Unit = {},
    ) {
        val appContext = context.applicationContext

        // Always show the persisted snapshot first.
        WidgetUpdater.updateAll(appContext)

        withController(
            context = appContext,
            onConnected = { controller ->
                try {
                    syncFromController(
                        appContext,
                        controller,
                    )
                } catch (t: Throwable) {
                    Log.e(TAG, "syncNow failed", t)
                    WidgetUpdater.updateAll(appContext)
                } finally {
                    onFinished()
                }
            },
            onFailed = {
                Log.w(
                    TAG,
                    "RNTP session not available; keeping cached widget state",
                )
                WidgetUpdater.updateAll(appContext)
                onFinished()
            },
        )
    }

    /**
     * Cheap refresh used by the widget timer.
     * If the current track changes, it promotes to a full metadata sync.
     */
    fun syncPlaybackOnly(
        context: Context,
    ) {
        val appContext = context.applicationContext

        val controller = mediaController
        if (controller == null || !controller.isConnected) {
            // Don't hammer a dead connection every second.
            return
        }

        try {
            val mediaId = controller.currentMediaItem
                ?.mediaId
                .orEmpty()

            val storedId = WidgetStateStore.getTrackId(appContext)

            if (mediaId.isNotBlank() && mediaId != storedId) {
                syncFromController(
                    appContext,
                    controller,
                )
                return
            }

            val position = controller.currentPosition
                .coerceAtLeast(0L)
                .toDouble() / 1000.0

            val duration = controller.duration
                .coerceAtLeast(0L)
                .toDouble() / 1000.0

            WidgetStateStore.savePlayback(
                appContext,
                position,
                duration,
                controller.isPlaying,
            )

            WidgetUpdater.updatePlaybackOnly(appContext)
        } catch (t: Throwable) {
            Log.e(TAG, "Playback-only widget sync failed", t)
        }
    }

    fun runCommand(
        context: Context,
        command: String,
        onFinished: () -> Unit = {},
    ) {
        val appContext = context.applicationContext

        // Keep the widget responsive even if a connection takes a moment.
        WidgetUpdater.updateAll(appContext)

        withController(
            context = appContext,
            onConnected = { controller ->
                try {
                    executeCommand(
                        controller,
                        command,
                    )

                    mainHandler.postDelayed(
                        {
                            try {
                                syncFromController(
                                    appContext,
                                    controller,
                                )
                            } catch (t: Throwable) {
                                Log.e(
                                    TAG,
                                    "Post-command sync failed",
                                    t,
                                )
                                WidgetUpdater.updateAll(appContext)
                            } finally {
                                onFinished()
                            }
                        },
                        POST_COMMAND_REFRESH_MS,
                    )
                } catch (t: Throwable) {
                    Log.e(
                        TAG,
                        "Widget command failed: $command",
                        t,
                    )
                    WidgetUpdater.updateAll(appContext)
                    onFinished()
                }
            },
            onFailed = {
                Log.w(
                    TAG,
                    "Could not connect to RNTP session for command=$command",
                )
                WidgetUpdater.updateAll(appContext)
                onFinished()
            },
        )
    }

    private fun withController(
        context: Context,
        onConnected: (MediaController) -> Unit,
        onFailed: () -> Unit,
    ) {
        val appContext = context.applicationContext

        val existing = mediaController
        if (existing != null && existing.isConnected) {
            onConnected(existing)
            return
        }

        var startConnection = false

        synchronized(lock) {
            val connected = mediaController
            if (
                connected != null &&
                connected.isConnected
            ) {
                onConnected(connected)
                return
            }

            pendingOperations += PendingOperation(
                onConnected,
                onFailed,
            )

            if (!connecting) {
                connecting = true
                startConnection = true
            }
        }

        if (!startConnection) return

        val component = ComponentName(
            appContext.packageName,
            SERVICE_CLASS,
        )

        val token = try {
            SessionToken(
                appContext,
                component,
            )
        } catch (t: Throwable) {
            finishConnectionFailure(t)
            return
        }

        val future = try {
            MediaController.Builder(
                appContext,
                token,
            ).buildAsync()
        } catch (t: Throwable) {
            finishConnectionFailure(t)
            return
        }

        future.addListener(
            {
                try {
                    val controller = future.get(
                        CONNECT_TIMEOUT_SECONDS,
                        TimeUnit.SECONDS,
                    )

                    synchronized(lock) {
                        mediaController = controller
                        connecting = false
                    }

                    controller.addListener(controllerListener)

                    val operations: List<PendingOperation>
                    synchronized(lock) {
                        operations = pendingOperations.toList()
                        pendingOperations.clear()
                    }

                    Log.d(
                        TAG,
                        "Connected to RNTP MediaLibraryService",
                    )

                    operations.forEach { operation ->
                        try {
                            operation.onConnected(controller)
                        } catch (t: Throwable) {
                            Log.e(
                                TAG,
                                "Pending widget operation failed",
                                t,
                            )
                            operation.onFailed()
                        }
                    }
                } catch (t: Throwable) {
                    finishConnectionFailure(t)
                }
            },
            ContextCompat.getMainExecutor(appContext),
        )
    }

    private fun finishConnectionFailure(
        error: Throwable?,
    ) {
        if (error != null) {
            Log.e(
                TAG,
                "Unable to connect to RNTP MediaLibraryService",
                error,
            )
        }

        val operations: List<PendingOperation>

        synchronized(lock) {
            connecting = false
            operations = pendingOperations.toList()
            pendingOperations.clear()
        }

        operations.forEach {
            try {
                it.onFailed()
            } catch (_: Throwable) {
            }
        }
    }

    private fun executeCommand(
        controller: MediaController,
        command: String,
    ) {
        when (command) {
            WidgetUpdater.CMD_PLAY_PAUSE -> {
                if (!controller.isCommandAvailable(
                        Player.COMMAND_PLAY_PAUSE,
                    )
                ) {
                    Log.w(
                        TAG,
                        "Play/pause command unavailable",
                    )
                    return
                }

                if (controller.isPlaying) {
                    controller.pause()
                } else {
                    controller.play()
                }
            }

            WidgetUpdater.CMD_PREVIOUS -> {
                when {
                    controller.isCommandAvailable(
                        Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM,
                    ) -> controller.seekToPreviousMediaItem()

                    controller.isCommandAvailable(
                        Player.COMMAND_SEEK_TO_PREVIOUS,
                    ) -> controller.seekToPrevious()

                    else -> Log.w(
                        TAG,
                        "Previous unavailable",
                    )
                }
            }

            WidgetUpdater.CMD_NEXT -> {
                when {
                    controller.isCommandAvailable(
                        Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM,
                    ) -> controller.seekToNextMediaItem()

                    controller.isCommandAvailable(
                        Player.COMMAND_SEEK_TO_NEXT,
                    ) -> controller.seekToNext()

                    else -> Log.w(
                        TAG,
                        "Next unavailable",
                    )
                }
            }

            WidgetUpdater.CMD_SHUFFLE -> {
                if (!controller.isCommandAvailable(
                        Player.COMMAND_SET_SHUFFLE_MODE,
                    )
                ) {
                    Log.w(
                        TAG,
                        "Shuffle unavailable",
                    )
                    return
                }

                controller.shuffleModeEnabled =
                    !controller.shuffleModeEnabled
            }

            WidgetUpdater.CMD_REPEAT -> {
                if (!controller.isCommandAvailable(
                        Player.COMMAND_SET_REPEAT_MODE,
                    )
                ) {
                    Log.w(
                        TAG,
                        "Repeat unavailable",
                    )
                    return
                }

                controller.repeatMode = nextRepeatMode(
                    controller.repeatMode,
                )
            }

            else -> Log.w(
                TAG,
                "Unknown widget command: $command",
            )
        }
    }

    private fun nextRepeatMode(
        current: Int,
    ): Int = when (current) {
        Player.REPEAT_MODE_OFF -> Player.REPEAT_MODE_ONE
        Player.REPEAT_MODE_ONE -> Player.REPEAT_MODE_ALL
        else -> Player.REPEAT_MODE_OFF
    }

    private fun refreshFromCallback() {
        val context = WidgetApplicationContext.value
            ?: return
        val controller = mediaController
            ?: return

        if (!controller.isConnected) return

        mainHandler.post {
            try {
                syncFromController(
                    context,
                    controller,
                )
            } catch (t: Throwable) {
                Log.e(
                    TAG,
                    "Callback widget sync failed",
                    t,
                )
            }
        }
    }

    /**
     * Read the real active item and save its metadata.
     *
     * controller.mediaMetadata is preferred because Media3 may merge/update
     * metadata there while the item is active. The item's metadata is a fallback.
     */
    fun syncFromController(
        context: Context,
        controller: MediaController,
    ) {
        val appContext = context.applicationContext
        val mediaItem = controller.currentMediaItem

        if (mediaItem == null) {
            Log.d(
                TAG,
                "RNTP session has no current media item; rendering cached state",
            )
            WidgetUpdater.updateAll(appContext)
            return
        }

        val sessionMetadata = controller.mediaMetadata
        val itemMetadata = mediaItem.mediaMetadata
        val storedTrackId = WidgetStateStore.getTrackId(appContext)

        val sameTrack = storedTrackId == mediaItem.mediaId

        val storedTitle = WidgetStateStore.getTitle(appContext)
        val storedArtist = WidgetStateStore.getArtist(appContext)
        val storedArtwork = WidgetStateStore.getArtworkSource(appContext)

        val title = firstNonBlank(
            sessionMetadata.title?.toString(),
            sessionMetadata.displayTitle?.toString(),
            itemMetadata.title?.toString(),
            itemMetadata.displayTitle?.toString(),
            if (sameTrack) storedTitle else null,
            mediaItem.mediaId,
        ) ?: "No song playing"

        val artist = firstNonBlank(
            sessionMetadata.artist?.toString(),
            itemMetadata.artist?.toString(),
            sessionMetadata.subtitle?.toString(),
            itemMetadata.subtitle?.toString(),
            if (sameTrack) storedArtist else null,
        ) ?: "KKMusic"

        val artwork = firstNonBlank(
            sessionMetadata.artworkUri?.toString(),
            itemMetadata.artworkUri?.toString(),
            if (sameTrack) storedArtwork else null,
        ).orEmpty()

        val position = controller.currentPosition
            .coerceAtLeast(0L)
            .toDouble() / 1000.0

        val duration = controller.duration
            .coerceAtLeast(0L)
            .toDouble() / 1000.0

        val playing = controller.isPlaying

        WidgetStateStore.saveMetadata(
            appContext,
            mediaItem.mediaId.orEmpty(),
            title,
            artist,
            artwork,
        )

        WidgetStateStore.savePlayback(
            appContext,
            position,
            duration,
            playing,
        )

        WidgetStateStore.setShuffle(
            appContext,
            controller.shuffleModeEnabled,
        )

        WidgetStateStore.setRepeatMode(
            appContext,
            controller.repeatMode,
        )

        Log.d(
            TAG,
            "Widget sync: title=$title artist=$artist artwork=$artwork position=$position duration=$duration playing=$playing shuffle=${controller.shuffleModeEnabled} repeat=${controller.repeatMode}",
        )

        WidgetUpdater.updateAll(appContext)

        if (artwork.isNotBlank()) {
            WidgetImageCache.cacheAsync(
                appContext,
                artwork,
            )
        }
    }

    private fun firstNonBlank(
        vararg values: String?,
    ): String? {
        return values
            .mapNotNull { it?.trim() }
            .firstOrNull { it.isNotBlank() }
    }
}

private object WidgetApplicationContext {
    @Volatile
    var value: Context? = null
}
