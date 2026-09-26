package com.kkmusic

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class FloatingPlayerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        val actionReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val action = intent?.getStringExtra("action")
                if (action != null) {
                    val params = Arguments.createMap()
                    params.putString("action", action)
                    reactApplicationContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("FLOATING_ACTION", params)
                }
            }
        }
        
        val filter = IntentFilter("FLOATING_ACTION")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(actionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactContext.registerReceiver(actionReceiver, filter)
        }
    }

    override fun getName(): String {
        return "FloatingPlayer"
    }

    @ReactMethod
    fun showPlayer() {
        val context = reactApplicationContext
        if (!Settings.canDrawOverlays(context)) {
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + context.packageName))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            return
        }
        val serviceIntent = Intent(context, FloatingPlayerService::class.java)
        context.startService(serviceIntent)
        
        // 🔥 FIX FOR BLANK WIDGET: Tell React Native the widget opened instantly
        val params = Arguments.createMap()
        params.putString("action", "WIDGET_OPENED")
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("FLOATING_ACTION", params)
    }

    @ReactMethod
    fun hidePlayer() {
        val context = reactApplicationContext
        val serviceIntent = Intent(context, FloatingPlayerService::class.java)
        context.stopService(serviceIntent)
    }

    @ReactMethod
    fun minimizeApp() {
        val context = reactApplicationContext
        val intent = Intent(Intent.ACTION_MAIN)
        intent.addCategory(Intent.CATEGORY_HOME)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(intent)
    }

    @ReactMethod
    fun updatePlayerState(songData: ReadableMap) {
        val intent = Intent("UPDATE_FLOATING_PLAYER")
        intent.setPackage(reactApplicationContext.packageName)
        
        if (songData.hasKey("title")) intent.putExtra("title", songData.getString("title"))
        if (songData.hasKey("isPlaying")) intent.putExtra("isPlaying", songData.getBoolean("isPlaying"))
        if (songData.hasKey("progress")) intent.putExtra("progress", songData.getInt("progress"))
        if (songData.hasKey("duration")) intent.putExtra("duration", songData.getInt("duration"))
        if (songData.hasKey("imageUrl")) intent.putExtra("imageUrl", songData.getString("imageUrl"))
        if (songData.hasKey("isDarkMode")) intent.putExtra("isDarkMode", songData.getBoolean("isDarkMode"))
        if (songData.hasKey("queue")) intent.putExtra("queue", songData.getString("queue"))
        
        reactApplicationContext.sendBroadcast(intent)
    }
}