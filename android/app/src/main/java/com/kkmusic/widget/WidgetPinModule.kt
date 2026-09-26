package com.kkmusic.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

class WidgetPinModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val NAME = "WidgetPinModule"
        private const val REQUEST_SMALL = 9101
        private const val REQUEST_BIG = 9102
        private const val EXTRA_TYPE = "widget_type"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun requestPinWidget(type: String, promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise.resolve(false)
            return
        }

        val manager = AppWidgetManager.getInstance(reactContext)
        if (!manager.isRequestPinAppWidgetSupported) {
            promise.resolve(false)
            return
        }

        val normalized = type.trim().lowercase()
        val provider = when (normalized) {
            "small" -> ComponentName(reactContext, SmallMusicWidget::class.java)
            "big" -> ComponentName(reactContext, BigMusicWidget::class.java)
            else -> {
                promise.reject("INVALID_WIDGET", "Use 'small' or 'big'.")
                return
            }
        }

        val requestCode = if (normalized == "small") REQUEST_SMALL else REQUEST_BIG
        val callback = Intent(reactContext, WidgetPinResultReceiver::class.java).apply {
            action = "com.kkmusic.widget.ACTION_PIN_RESULT"
            putExtra(EXTRA_TYPE, normalized)
        }
        val callbackPendingIntent = PendingIntent.getBroadcast(
            reactContext,
            requestCode,
            callback,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        manager.requestPinAppWidget(provider, null, callbackPendingIntent)
        promise.resolve(true)
    }

    @ReactMethod
    fun getWidgetStatus(promise: Promise) {
        try {
            val manager = AppWidgetManager.getInstance(reactContext)
            val smallProvider = ComponentName(reactContext, SmallMusicWidget::class.java)
            val bigProvider = ComponentName(reactContext, BigMusicWidget::class.java)
            val result: WritableMap = Arguments.createMap().apply {
                putBoolean("smallAdded", manager.getAppWidgetIds(smallProvider).isNotEmpty())
                putBoolean("bigAdded", manager.getAppWidgetIds(bigProvider).isNotEmpty())
                putBoolean("pinSupported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.isRequestPinAppWidgetSupported)
            }
            promise.resolve(result)
        } catch (e: Throwable) {
            promise.reject("WIDGET_STATUS_FAILED", e)
        }
    }

    @ReactMethod
    fun syncWidgetState(
        title: String,
        artist: String,
        artwork: String,
        positionSeconds: Double,
        durationSeconds: Double,
        isPlaying: Boolean,
        promise: Promise,
    ) {
        try {
            val prefs = WidgetStateStore.prefs(reactContext)
            val metadataChanged =
                prefs.getString(WidgetStateStore.KEY_TITLE, "") != title ||
                prefs.getString(WidgetStateStore.KEY_ARTIST, "") != artist ||
                prefs.getString(WidgetStateStore.KEY_ARTWORK_SOURCE, "") != artwork

            WidgetStateStore.savePlaybackState(
                reactContext,
                title,
                artist,
                artwork,
                positionSeconds,
                durationSeconds,
                isPlaying,
            )

            if (metadataChanged) {
                WidgetUpdater.updateAll(reactContext)
                WidgetImageCache.cacheAsync(reactContext, artwork)
            } else {
                WidgetUpdater.updatePlaybackOnly(reactContext)
            }
            promise.resolve(null)
        } catch (e: Throwable) {
            promise.reject("WIDGET_SYNC_FAILED", e)
        }
    }

    @ReactMethod
    fun syncWidgetModes(shuffleEnabled: Boolean, repeatMode: Int, promise: Promise) {
        try {
            WidgetStateStore.setShuffle(reactContext, shuffleEnabled)
            WidgetStateStore.setRepeatMode(reactContext, repeatMode)
            WidgetUpdater.updateAll(reactContext)
            promise.resolve(null)
        } catch (e: Throwable) {
            promise.reject("WIDGET_MODES_FAILED", e)
        }
    }


    @ReactMethod
    fun refreshWidget(promise: Promise) {
        try {
            WidgetMediaController.syncNow(reactContext)
            promise.resolve(null)
        } catch (e: Throwable) {
            promise.reject("WIDGET_REFRESH_FAILED", e)
        }
    }

    @ReactMethod
    fun clearWidgetState(promise: Promise) {
        try {
            WidgetStateStore.clearPlayback(reactContext)
            WidgetUpdater.updateAll(reactContext)
            promise.resolve(null)
        } catch (e: Throwable) {
            promise.reject("WIDGET_CLEAR_FAILED", e)
        }
    }
}
