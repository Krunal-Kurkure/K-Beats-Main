package com.kkmusic.widget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

object WidgetImageCache {
    private val executor = Executors.newSingleThreadExecutor()

    fun cacheAsync(context: Context, source: String?) {
        val artwork = source?.trim().orEmpty()
        if (artwork.isBlank()) return

        val prefs = WidgetStateStore.prefs(context)
        val cachedSource = prefs.getString(
            WidgetStateStore.KEY_CACHED_ARTWORK_SOURCE,
            null,
        )
        val cachedPath = prefs.getString(
            WidgetStateStore.KEY_ARTWORK_CACHE,
            null,
        )

        if (
            cachedSource == artwork &&
            !cachedPath.isNullOrBlank() &&
            File(cachedPath).exists()
        ) {
            return
        }

        executor.execute {
            try {
                val bitmap = loadBitmap(context, artwork)
                    ?: return@execute

                val cacheDir = File(
                    context.filesDir,
                    "widget_artwork",
                ).apply {
                    mkdirs()
                }

                val temporary = File(
                    cacheDir,
                    "artwork_${artwork.hashCode()}.tmp",
                )

                val outputFile = File(
                    cacheDir,
                    "artwork_${artwork.hashCode()}.jpg",
                )

                FileOutputStream(temporary).use { output ->
                    bitmap.compress(
                        Bitmap.CompressFormat.JPEG,
                        92,
                        output,
                    )
                }

                bitmap.recycle()

                val currentSource = WidgetStateStore
                    .prefs(context)
                    .getString(
                        WidgetStateStore.KEY_ARTWORK_SOURCE,
                        "",
                    )

                if (currentSource != artwork) {
                    temporary.delete()
                    return@execute
                }

                if (outputFile.exists()) {
                    outputFile.delete()
                }

                if (!temporary.renameTo(outputFile)) {
                    temporary.copyTo(
                        outputFile,
                        overwrite = true,
                    )
                    temporary.delete()
                }

                WidgetStateStore.prefs(context)
                    .edit()
                    .putString(
                        WidgetStateStore.KEY_CACHED_ARTWORK_SOURCE,
                        artwork,
                    )
                    .putString(
                        WidgetStateStore.KEY_ARTWORK_CACHE,
                        outputFile.absolutePath,
                    )
                    .apply()

                WidgetUpdater.updateAll(context)
            } catch (_: Throwable) {
                // Keep last valid artwork/placeholder.
            }
        }
    }

    fun loadCached(context: Context): Bitmap? {
        val path = WidgetStateStore
            .prefs(context)
            .getString(
                WidgetStateStore.KEY_ARTWORK_CACHE,
                null,
            )
            ?: return null

        val file = File(path)
        if (!file.exists()) return null

        return BitmapFactory.decodeFile(file.absolutePath)
    }

    private fun loadBitmap(
        context: Context,
        source: String,
    ): Bitmap? {
        return when {
            source.startsWith("http://") ||
                source.startsWith("https://") ->
                loadHttp(source)

            source.startsWith("file://") ->
                BitmapFactory.decodeFile(
                    Uri.parse(source).path,
                )

            source.startsWith("content://") ||
                source.startsWith("android.resource://") ->
                context.contentResolver
                    .openInputStream(Uri.parse(source))
                    ?.use {
                        BitmapFactory.decodeStream(it)
                    }

            File(source).exists() ->
                BitmapFactory.decodeFile(source)

            else -> null
        }
    }

    private fun loadHttp(source: String): Bitmap? {
        val connection = (
            URL(source).openConnection()
                as HttpURLConnection
            ).apply {
            connectTimeout = 7000
            readTimeout = 10000
            doInput = true
            instanceFollowRedirects = true
            setRequestProperty(
                "User-Agent",
                "KKMusic-Widget/1.0",
            )
        }

        return try {
            connection.connect()

            if (connection.responseCode in 200..299) {
                connection.inputStream.use {
                    BitmapFactory.decodeStream(it)
                }
            } else {
                null
            }
        } finally {
            connection.disconnect()
        }
    }
}
