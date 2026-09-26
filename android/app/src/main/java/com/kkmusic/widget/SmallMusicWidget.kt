package com.kkmusic.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle

class SmallMusicWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        WidgetMediaController.setApplicationContext(context)

        // 1) Immediately render persisted title/artist/artwork/state.
        WidgetUpdater.updateAll(context)

        // 2) Then try to refresh from RNTP's live MediaSession.
        WidgetMediaController.syncNow(context)

        // 3) Keep progress synced while the RNTP service remains alive.
        WidgetTicker.start(context)
    }

    override fun onEnabled(context: Context) {
        WidgetMediaController.setApplicationContext(context)
        WidgetUpdater.updateAll(context)
        WidgetMediaController.syncNow(context)
        WidgetTicker.start(context)
    }

    override fun onDisabled(context: Context) {
        WidgetTicker.stopIfNoWidgets(context)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle,
    ) {
        WidgetMediaController.setApplicationContext(context)
        WidgetUpdater.updateAll(context)
        WidgetMediaController.syncNow(context)
    }
}
