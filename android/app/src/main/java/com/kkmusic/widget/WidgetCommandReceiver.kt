package com.kkmusic.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class WidgetCommandReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        if (
            intent.action !=
            WidgetUpdater.ACTION_WIDGET_COMMAND
        ) {
            return
        }

        val command = intent.getStringExtra(
            WidgetUpdater.EXTRA_COMMAND,
        ) ?: return

        val pendingResult = goAsync()

        WidgetMediaController.setApplicationContext(context)

        WidgetMediaController.runCommand(
            context,
            command,
        ) {
            pendingResult.finish()
        }
    }
}
