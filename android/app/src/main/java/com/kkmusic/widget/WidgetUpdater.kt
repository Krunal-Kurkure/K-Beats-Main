package com.kkmusic.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import com.kkmusic.R

object WidgetUpdater {

    const val ACTION_WIDGET_COMMAND =
        "com.kkmusic.widget.ACTION_WIDGET_COMMAND"

    const val EXTRA_COMMAND =
        "extra_command"

    const val EXTRA_WIDGET_KIND =
        "extra_widget_kind"

    const val CMD_PLAY_PAUSE =
        "play_pause"

    const val CMD_PREVIOUS =
        "previous"

    const val CMD_NEXT =
        "next"

    const val CMD_SHUFFLE =
        "shuffle"

    const val CMD_REPEAT =
        "repeat"

    const val KIND_SMALL =
        "small"

    const val KIND_BIG =
        "big"

    private const val PINK =
        0xFFFF0050.toInt()

    private const val BLACK =
        Color.BLACK

    /**
     * Render the LAST PERSISTED state immediately.
     * This is what makes the widget useful even when the RNTP service cannot
     * be reached for a moment.
     */
    fun updateAll(context: Context) {

        val appContext =
            context.applicationContext

        val manager =
            AppWidgetManager.getInstance(appContext)

        updateProvider(
            appContext,
            manager,
            ComponentName(
                appContext,
                SmallMusicWidget::class.java,
            ),
            true,
        )

        updateProvider(
            appContext,
            manager,
            ComponentName(
                appContext,
                BigMusicWidget::class.java,
            ),
            false,
        )
    }

    private fun updateProvider(
        context: Context,
        manager: AppWidgetManager,
        provider: ComponentName,
        small: Boolean,
    ) {

        val ids =
            manager.getAppWidgetIds(provider)

        if (ids.isEmpty()) {
            return
        }

        for (widgetId in ids) {

            val views =
                if (small) {
                    buildSmall(
                        context,
                        widgetId,
                    )
                } else {
                    buildBig(
                        context,
                        widgetId,
                    )
                }

            manager.updateAppWidget(
                widgetId,
                views,
            )
        }
    }

    /**
     * Cheap 1-second-ish update:
     * only progress and play/pause.
     */
    fun updatePlaybackOnly(
        context: Context,
    ) {

        val appContext =
            context.applicationContext

        val manager =
            AppWidgetManager.getInstance(appContext)

        val prefs =
            WidgetStateStore.prefs(appContext)

        val playing =
            prefs.getBoolean(
                WidgetStateStore.KEY_IS_PLAYING,
                false,
            )

        val position =
            prefs.getFloat(
                WidgetStateStore.KEY_POSITION,
                0f,
            )

        val duration =
            prefs.getFloat(
                WidgetStateStore.KEY_DURATION,
                0f,
            )

        val progress =
            if (duration > 0f) {

                ((position / duration) * 1000f)
                    .toInt()
                    .coerceIn(
                        0,
                        1000,
                    )

            } else {
                0
            }

        val smallProvider =
            ComponentName(
                appContext,
                SmallMusicWidget::class.java,
            )

        for (
            widgetId in
            manager.getAppWidgetIds(smallProvider)
        ) {

            val views =
                RemoteViews(
                    appContext.packageName,
                    R.layout.widget_small,
                )

            views.setImageViewResource(
                R.id.small_play_icon,
                if (playing) {
                    R.drawable.ic_widget_pause
                } else {
                    R.drawable.ic_widget_play
                },
            )

            manager.partiallyUpdateAppWidget(
                widgetId,
                views,
            )
        }

        val bigProvider =
            ComponentName(
                appContext,
                BigMusicWidget::class.java,
            )

        for (
            widgetId in
            manager.getAppWidgetIds(bigProvider)
        ) {

            val views =
                RemoteViews(
                    appContext.packageName,
                    R.layout.widget_big,
                )

            views.setImageViewResource(
                R.id.big_play_icon,
                if (playing) {
                    R.drawable.ic_widget_pause
                } else {
                    R.drawable.ic_widget_play
                },
            )

            views.setProgressBar(
                R.id.big_progress,
                1000,
                progress,
                false,
            )

            manager.partiallyUpdateAppWidget(
                widgetId,
                views,
            )
        }
    }

    private fun buildSmall(
        context: Context,
        widgetId: Int,
    ): RemoteViews {

        val appContext =
            context.applicationContext

        val state =
            WidgetStateStore.prefs(appContext)

        val views =
            RemoteViews(
                appContext.packageName,
                R.layout.widget_small,
            )

        views.setTextViewText(
            R.id.small_title,
            state.getString(
                WidgetStateStore.KEY_TITLE,
                "No song playing",
            ).orEmpty().ifBlank {
                "No song playing"
            },
        )

        views.setTextViewText(
            R.id.small_artist,
            state.getString(
                WidgetStateStore.KEY_ARTIST,
                "KKMusic",
            ).orEmpty().ifBlank {
                "KKMusic"
            },
        )

        val playing =
            state.getBoolean(
                WidgetStateStore.KEY_IS_PLAYING,
                false,
            )

        views.setImageViewResource(
            R.id.small_play_icon,
            if (playing) {
                R.drawable.ic_widget_pause
            } else {
                R.drawable.ic_widget_play
            },
        )

        val artwork =
            WidgetImageCache.loadCached(appContext)

        if (artwork != null) {

            try {

                val rendered =
                    WidgetBitmapUtils.circle(
                        source = artwork,
                        size = 128,
                    )

                views.setImageViewBitmap(
                    R.id.small_artwork,
                    rendered,
                )

                if (!rendered.isRecycled) {
                    rendered.recycle()
                }

            } catch (e: Throwable) {

                android.util.Log.e(
                    "KKMusicWidget",
                    "Small widget artwork rendering failed",
                    e,
                )

                views.setImageViewResource(
                    R.id.small_artwork,
                    R.drawable.widget_artwork_placeholder,
                )

            } finally {

                if (!artwork.isRecycled) {
                    artwork.recycle()
                }
            }

        } else {

            views.setImageViewResource(
                R.id.small_artwork,
                R.drawable.widget_artwork_placeholder,
            )
        }

        views.setOnClickPendingIntent(
            R.id.small_root,
            appPendingIntent(appContext),
        )

        views.setOnClickPendingIntent(
            R.id.small_previous_slot,
            commandPendingIntent(
                appContext,
                CMD_PREVIOUS,
                KIND_SMALL,
                widgetId,
            ),
        )

        views.setOnClickPendingIntent(
            R.id.small_play_slot,
            commandPendingIntent(
                appContext,
                CMD_PLAY_PAUSE,
                KIND_SMALL,
                widgetId,
            ),
        )

        views.setOnClickPendingIntent(
            R.id.small_next_slot,
            commandPendingIntent(
                appContext,
                CMD_NEXT,
                KIND_SMALL,
                widgetId,
            ),
        )

        return views
    }

    private fun buildBig(
        context: Context,
        widgetId: Int,
    ): RemoteViews {

        val appContext =
            context.applicationContext

        val state =
            WidgetStateStore.prefs(appContext)

        val views =
            RemoteViews(
                appContext.packageName,
                R.layout.widget_big,
            )

        views.setTextViewText(
            R.id.big_title,
            state.getString(
                WidgetStateStore.KEY_TITLE,
                "No song playing",
            ).orEmpty().ifBlank {
                "No song playing"
            },
        )

        views.setTextViewText(
            R.id.big_artist,
            state.getString(
                WidgetStateStore.KEY_ARTIST,
                "KKMusic",
            ).orEmpty().ifBlank {
                "KKMusic"
            },
        )

        val playing =
            state.getBoolean(
                WidgetStateStore.KEY_IS_PLAYING,
                false,
            )

        views.setImageViewResource(
            R.id.big_play_icon,
            if (playing) {
                R.drawable.ic_widget_pause
            } else {
                R.drawable.ic_widget_play
            },
        )

        val shuffle =
            state.getBoolean(
                WidgetStateStore.KEY_SHUFFLE,
                false,
            )

        val repeat =
            state.getInt(
                WidgetStateStore.KEY_REPEAT,
                0,
            )

        views.setInt(
            R.id.big_shuffle_icon,
            "setColorFilter",
            if (shuffle) PINK else BLACK,
        )

        views.setInt(
            R.id.big_repeat_icon,
            "setColorFilter",
            if (repeat != 0) PINK else BLACK,
        )

        val position =
            state.getFloat(
                WidgetStateStore.KEY_POSITION,
                0f,
            )

        val duration =
            state.getFloat(
                WidgetStateStore.KEY_DURATION,
                0f,
            )

        val progress =
            if (duration > 0f) {

                ((position / duration) * 1000f)
                    .toInt()
                    .coerceIn(
                        0,
                        1000,
                    )

            } else {
                0
            }

        views.setProgressBar(
            R.id.big_progress,
            1000,
            progress,
            false,
        )

        val artwork =
            WidgetImageCache.loadCached(appContext)

        if (artwork != null) {

            try {

                /**
                 * BIG WIDGET:
                 *
                 * Use TOP-CROP so a 1:1 square artwork keeps
                 * its TOP portion visible in the rectangular
                 * 800 x 500 artwork area.
                 *
                 * Excess image is cropped from the BOTTOM.
                 */
                val rendered =
                    WidgetBitmapUtils.roundedTopCrop(
                        source = artwork,
                        width = 800,
                        height = 500,
                        radius = 36f,
                    )

                views.setImageViewBitmap(
                    R.id.big_artwork,
                    rendered,
                )

                if (!rendered.isRecycled) {
                    rendered.recycle()
                }

            } catch (e: Throwable) {

                android.util.Log.e(
                    "KKMusicWidget",
                    "Big widget artwork rendering failed",
                    e,
                )

                views.setImageViewResource(
                    R.id.big_artwork,
                    R.drawable.widget_artwork_placeholder,
                )

            } finally {

                if (!artwork.isRecycled) {
                    artwork.recycle()
                }
            }

        } else {

            views.setImageViewResource(
                R.id.big_artwork,
                R.drawable.widget_artwork_placeholder,
            )
        }

        views.setOnClickPendingIntent(
            R.id.big_root,
            appPendingIntent(appContext),
        )

        views.setOnClickPendingIntent(
            R.id.big_shuffle_slot,
            commandPendingIntent(
                appContext,
                CMD_SHUFFLE,
                KIND_BIG,
                widgetId,
            ),
        )

        views.setOnClickPendingIntent(
            R.id.big_previous_slot,
            commandPendingIntent(
                appContext,
                CMD_PREVIOUS,
                KIND_BIG,
                widgetId,
            ),
        )

        views.setOnClickPendingIntent(
            R.id.big_play_slot,
            commandPendingIntent(
                appContext,
                CMD_PLAY_PAUSE,
                KIND_BIG,
                widgetId,
            ),
        )

        views.setOnClickPendingIntent(
            R.id.big_next_slot,
            commandPendingIntent(
                appContext,
                CMD_NEXT,
                KIND_BIG,
                widgetId,
            ),
        )

        views.setOnClickPendingIntent(
            R.id.big_repeat_slot,
            commandPendingIntent(
                appContext,
                CMD_REPEAT,
                KIND_BIG,
                widgetId,
            ),
        )

        return views
    }

    private fun appPendingIntent(
        context: Context,
    ): PendingIntent {

        val launch =
            context.packageManager.getLaunchIntentForPackage(
                context.packageName,
            )
                ?: Intent(
                    context,
                    Class.forName(
                        "${context.packageName}.MainActivity",
                    ),
                )

        launch.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP,
        )

        return PendingIntent.getActivity(
            context,
            5001,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT or
                PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun commandPendingIntent(
        context: Context,
        command: String,
        kind: String,
        widgetId: Int,
    ): PendingIntent {

        val intent =
            Intent(
                context,
                WidgetCommandReceiver::class.java,
            ).apply {

                action =
                    ACTION_WIDGET_COMMAND

                putExtra(
                    EXTRA_COMMAND,
                    command,
                )

                putExtra(
                    EXTRA_WIDGET_KIND,
                    kind,
                )

                putExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    widgetId,
                )
            }

        return PendingIntent.getBroadcast(
            context,
            widgetId * 31 + command.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or
                PendingIntent.FLAG_IMMUTABLE,
        )
    }
}