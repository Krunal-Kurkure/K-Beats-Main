package com.kkmusic.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.os.Handler
import android.os.Looper

/**
 * Updates only playback fields while the app/RNTP service process is alive.
 * Metadata changes are handled by MediaController callbacks.
 */
object WidgetTicker {
    private const val INTERVAL_MS = 1000L

    private val handler = Handler(Looper.getMainLooper())

    @Volatile
    private var running = false

    private var context: Context? = null

    private val tick = object : Runnable {
        override fun run() {
            val appContext = context ?: return
            if (!running) return

            if (!hasWidgets(appContext)) {
                stop()
                return
            }

            WidgetMediaController.syncPlaybackOnly(appContext)
            handler.postDelayed(
                this,
                INTERVAL_MS,
            )
        }
    }

    @Synchronized
    fun start(context: Context) {
        this.context = context.applicationContext
        if (running) return

        running = true
        handler.removeCallbacks(tick)
        handler.post(tick)
    }

    @Synchronized
    fun stopIfNoWidgets(context: Context) {
        if (hasWidgets(context.applicationContext)) return
        stop()
    }

    @Synchronized
    private fun stop() {
        running = false
        handler.removeCallbacks(tick)
    }

    private fun hasWidgets(context: Context): Boolean {
        val appContext = context.applicationContext
        val manager = AppWidgetManager.getInstance(appContext)

        val smallIds = manager.getAppWidgetIds(
            ComponentName(
                appContext,
                SmallMusicWidget::class.java,
            ),
        )

        val bigIds = manager.getAppWidgetIds(
            ComponentName(
                appContext,
                BigMusicWidget::class.java,
            ),
        )

        return smallIds.isNotEmpty() || bigIds.isNotEmpty()
    }
}
