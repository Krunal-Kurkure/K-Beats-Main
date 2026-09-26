package com.kkmusic.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle

class BigMusicWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        WidgetMediaController.setApplicationContext(context)

        // Render last-known values first so the widget never becomes an
        // empty/placeholder widget merely because the service is reconnecting.
        WidgetUpdater.updateAll(context)
        WidgetMediaController.syncNow(context)
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
