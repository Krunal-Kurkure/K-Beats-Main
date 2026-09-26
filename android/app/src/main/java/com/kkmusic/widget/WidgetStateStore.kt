package com.kkmusic.widget

import android.content.Context

object WidgetStateStore {
    private const val PREFS = "kkmusic_widget_state"
    private const val SHUFFLE_SEPARATOR = "\u001F"

    const val KEY_TRACK_ID = "track_id"
    const val KEY_TITLE = "title"
    const val KEY_ARTIST = "artist"
    const val KEY_ARTWORK_SOURCE = "artwork_source"
    const val KEY_ARTWORK_CACHE = "artwork_cache"
    const val KEY_POSITION = "position_seconds"
    const val KEY_DURATION = "duration_seconds"
    const val KEY_IS_PLAYING = "is_playing"
    const val KEY_SHUFFLE = "shuffle_enabled"
    const val KEY_REPEAT = "repeat_mode"
    const val KEY_CACHED_ARTWORK_SOURCE = "cached_artwork_source"
    const val KEY_SHUFFLE_ORIGINAL_ORDER = "shuffle_original_order"
    const val KEY_LAST_SYNC_MS = "last_sync_ms"

    fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(
            PREFS,
            Context.MODE_PRIVATE,
        )

    fun saveTrackId(context: Context, trackId: String) {
        prefs(context).edit()
            .putString(KEY_TRACK_ID, trackId)
            .putLong(KEY_LAST_SYNC_MS, System.currentTimeMillis())
            .apply()
    }

    fun getTrackId(context: Context): String =
        prefs(context)
            .getString(KEY_TRACK_ID, "")
            .orEmpty()

    fun getTitle(context: Context): String =
        prefs(context)
            .getString(KEY_TITLE, "No song playing")
            ?.takeIf { it.isNotBlank() }
            ?: "No song playing"

    fun getArtist(context: Context): String =
        prefs(context)
            .getString(KEY_ARTIST, "KKMusic")
            ?.takeIf { it.isNotBlank() }
            ?: "KKMusic"

    fun getArtworkSource(context: Context): String =
        prefs(context)
            .getString(KEY_ARTWORK_SOURCE, "")
            .orEmpty()

    /**
     * Metadata is important for cold/widget-process recovery, so title/artist/
     * artwork/track-id are persisted together before the widget is rendered.
     */
    fun saveMetadata(
        context: Context,
        trackId: String,
        title: String?,
        artist: String?,
        artworkSource: String?,
    ) {
        prefs(context).edit()
            .putString(KEY_TRACK_ID, trackId)
            .putString(
                KEY_TITLE,
                title?.takeIf { it.isNotBlank() } ?: "No song playing",
            )
            .putString(
                KEY_ARTIST,
                artist?.takeIf { it.isNotBlank() } ?: "KKMusic",
            )
            .putString(KEY_ARTWORK_SOURCE, artworkSource.orEmpty())
            .putLong(KEY_LAST_SYNC_MS, System.currentTimeMillis())
            .commit()
    }

    fun savePlayback(
        context: Context,
        positionSeconds: Double,
        durationSeconds: Double,
        isPlaying: Boolean,
    ) {
        prefs(context).edit()
            .putFloat(
                KEY_POSITION,
                positionSeconds.coerceAtLeast(0.0).toFloat(),
            )
            .putFloat(
                KEY_DURATION,
                durationSeconds.coerceAtLeast(0.0).toFloat(),
            )
            .putBoolean(KEY_IS_PLAYING, isPlaying)
            .putLong(KEY_LAST_SYNC_MS, System.currentTimeMillis())
            .apply()
    }

    fun savePlaybackState(
        context: Context,
        title: String?,
        artist: String?,
        artworkSource: String?,
        positionSeconds: Double,
        durationSeconds: Double,
        isPlaying: Boolean,
    ) {
        prefs(context).edit()
            .putString(
                KEY_TITLE,
                title?.takeIf { it.isNotBlank() } ?: "No song playing",
            )
            .putString(
                KEY_ARTIST,
                artist?.takeIf { it.isNotBlank() } ?: "KKMusic",
            )
            .putString(KEY_ARTWORK_SOURCE, artworkSource.orEmpty())
            .putFloat(
                KEY_POSITION,
                positionSeconds.coerceAtLeast(0.0).toFloat(),
            )
            .putFloat(
                KEY_DURATION,
                durationSeconds.coerceAtLeast(0.0).toFloat(),
            )
            .putBoolean(KEY_IS_PLAYING, isPlaying)
            .putLong(KEY_LAST_SYNC_MS, System.currentTimeMillis())
            .apply()
    }

    fun setShuffle(context: Context, enabled: Boolean) {
        prefs(context).edit()
            .putBoolean(KEY_SHUFFLE, enabled)
            .apply()
    }

    fun isShuffleEnabled(context: Context): Boolean =
        prefs(context).getBoolean(KEY_SHUFFLE, false)

    fun saveShuffleOriginalOrder(
        context: Context,
        order: List<String>,
    ) {
        prefs(context).edit()
            .putString(
                KEY_SHUFFLE_ORIGINAL_ORDER,
                order.joinToString(SHUFFLE_SEPARATOR),
            )
            .apply()
    }

    fun getShuffleOriginalOrder(context: Context): List<String> {
        val value = prefs(context)
            .getString(KEY_SHUFFLE_ORIGINAL_ORDER, "")
            .orEmpty()

        if (value.isBlank()) return emptyList()

        return value.split(SHUFFLE_SEPARATOR)
            .filter { it.isNotBlank() }
    }

    fun clearShuffleOriginalOrder(context: Context) {
        prefs(context).edit()
            .remove(KEY_SHUFFLE_ORIGINAL_ORDER)
            .apply()
    }

    fun setRepeatMode(context: Context, mode: Int) {
        prefs(context).edit()
            .putInt(KEY_REPEAT, mode)
            .apply()
    }

    /**
     * Used only when the actual player has no media item anymore.
     * Widget providers do NOT call this just because the app UI closes.
     */
    fun clearPlayback(context: Context) {
        prefs(context).edit()
            .putString(KEY_TRACK_ID, "")
            .putString(KEY_TITLE, "No song playing")
            .putString(KEY_ARTIST, "KKMusic")
            .putString(KEY_ARTWORK_SOURCE, "")
            .putFloat(KEY_POSITION, 0f)
            .putFloat(KEY_DURATION, 0f)
            .putBoolean(KEY_IS_PLAYING, false)
            .putLong(KEY_LAST_SYNC_MS, System.currentTimeMillis())
            .apply()
    }
}
