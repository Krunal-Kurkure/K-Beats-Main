package com.kkmusic.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class WidgetPinResultReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        // First paint cached data immediately, then refresh from the live session.
        WidgetUpdater.updateAll(context)
        WidgetMediaController.setApplicationContext(context)
        WidgetMediaController.syncNow(context)
        WidgetTicker.start(context)
    }
}
