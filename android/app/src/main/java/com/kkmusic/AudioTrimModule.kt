package com.kkmusic

import android.content.Context
import android.media.MediaExtractor
import android.media.MediaMuxer
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer

class AudioTrimModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AudioTrim"

    /**
     * trim(inputPath, startSec, endSec, promise)
     *
     * - inputPath: absolute path OR content:// URI string (String)
     * - startSec, endSec: seconds (Double)  <-- IMPORTANT: pass seconds from JS
     * Resolves with absolute path to trimmed temp file (String)
     */
    @ReactMethod
    fun trim(inputPath: String, startSec: Double, endSec: Double, promise: Promise) {
        Thread {
            var fd: android.os.ParcelFileDescriptor? = null
            val extractor = MediaExtractor()
            try {
                val context: Context = reactApplicationContext

                // set data source (handle content:// and plain file paths)
                try {
                    if (inputPath.startsWith("content://")) {
                        val uri = Uri.parse(inputPath)
                        fd = context.contentResolver.openFileDescriptor(uri, "r")
                        if (fd != null) {
                            extractor.setDataSource(fd.fileDescriptor)
                        } else {
                            // fallback: try as path
                            extractor.setDataSource(inputPath)
                        }
                    } else {
                        // handle file:// or plain path
                        val path = if (inputPath.startsWith("file://")) inputPath.replace("file://", "") else inputPath
                        extractor.setDataSource(path)
                    }
                } catch (e: Exception) {
                    // last attempt: try as File absolute path
                    try {
                        val f = File(inputPath)
                        extractor.setDataSource(f.absolutePath)
                    } catch (ex: Exception) {
                        extractor.release()
                        promise.reject("SET_DATA_SOURCE_FAILED", "Could not set data source: ${ex.message}")
                        return@Thread
                    }
                }

                // find audio track
                var audioTrackIndex = -1
                var format: MediaFormat? = null
                var mime: String? = null

                for (i in 0 until extractor.trackCount) {
                    val ftmp = extractor.getTrackFormat(i)
                    val m = ftmp.getString(MediaFormat.KEY_MIME)
                    if (m != null && m.startsWith("audio/")) {
                        audioTrackIndex = i
                        format = ftmp
                        mime = m
                        break
                    }
                }

                if (audioTrackIndex < 0 || format == null || mime == null) {
                    extractor.release()
                    promise.reject("NO_AUDIO", "No audio track found in input")
                    return@Thread
                }

                extractor.selectTrack(audioTrackIndex)

                // compute start/end in microseconds for extractor (JS provides seconds)
                val startUs = (startSec * 1_000_000.0).toLong()
                val endUs = (endSec * 1_000_000.0).toLong()
                if (endUs <= startUs) {
                    extractor.release()
                    promise.reject("INVALID_RANGE", "end must be greater than start")
                    return@Thread
                }

                // choose output path and branch if mp3
                val isMp3 = mime.contains("mpeg")
                val outExt = if (isMp3) "mp3" else "m4a"
                val outFile = File(context.cacheDir, "trim_${System.currentTimeMillis()}.$outExt")
                val outPath = outFile.absolutePath

                val maxBufferSize = if (format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
                    format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE)
                } else {
                    1024 * 256
                }
                val buffer = ByteBuffer.allocate(maxBufferSize)
                val info = android.media.MediaCodec.BufferInfo()

                // Seek near start; then skip samples before startUs explicitly
                extractor.seekTo(startUs, MediaExtractor.SEEK_TO_CLOSEST_SYNC)

                if (isMp3) {
                    // MP3: write raw sample bytes to .mp3 file (note: this approach usually works for streamable MP3 frames)
                    var fos: FileOutputStream? = null
                    try {
                        fos = FileOutputStream(outFile)
                        while (true) {
                            info.offset = 0
                            info.size = extractor.readSampleData(buffer, 0)
                            if (info.size < 0) break

                            val sampleTime = extractor.sampleTime
                            // skip any samples before requested exact start
                            if (sampleTime < startUs) {
                                extractor.advance()
                                buffer.clear()
                                continue
                            }
                            if (sampleTime > endUs) break

                            val bytes = ByteArray(info.size)
                            buffer.get(bytes, 0, info.size)
                            fos.write(bytes)
                            buffer.clear()
                            extractor.advance()
                        }
                        fos.fd.sync()
                        promise.resolve(outPath)
                        return@Thread
                    } catch (e: Exception) {
                        promise.reject("MP3_TRIM_FAILED", e.message)
                        return@Thread
                    } finally {
                        try { fos?.close() } catch (_: Exception) {}
                    }
                } else {
                    // Non-MP3: use MediaMuxer to produce container (m4a / mp4)
                    val muxer = MediaMuxer(outPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
                    val muxerTrackIndex = muxer.addTrack(format)
                    muxer.start()
                    try {
                        while (true) {
                            info.offset = 0
                            info.size = extractor.readSampleData(buffer, 0)
                            if (info.size < 0) break

                            val sampleTime = extractor.sampleTime
                            // skip samples before startUs
                            if (sampleTime < startUs) {
                                extractor.advance()
                                buffer.clear()
                                continue
                            }
                            if (sampleTime > endUs) break

                            info.presentationTimeUs = sampleTime
                            info.flags = extractor.sampleFlags
                            muxer.writeSampleData(muxerTrackIndex, buffer, info)
                            buffer.clear()
                            extractor.advance()
                        }
                        muxer.stop()
                        muxer.release()
                        promise.resolve(outPath)
                        return@Thread
                    } catch (e: Exception) {
                        try { muxer.release() } catch (_: Exception) {}
                        promise.reject("MUXER_ERROR", e.message)
                        return@Thread
                    }
                }
            } catch (e: Exception) {
                promise.reject("TRIM_ERROR", e.message)
            } finally {
                try { extractor.release() } catch (_: Exception) {}
                try { fd?.close() } catch (_: Exception) {}
            }
        }.start()
    }

    /**
     * getAudioDuration(filePath, promise)
     *
     * - filePath: absolute path OR content:// URI string (String)
     * Resolves with duration in seconds (Double)
     */
    @ReactMethod
    fun getAudioDuration(filePath: String, promise: Promise) {
        Thread {
            var fd: android.os.ParcelFileDescriptor? = null
            try {
                val retriever = MediaMetadataRetriever()
                try {
                    if (filePath.startsWith("content://")) {
                        val uri = Uri.parse(filePath)
                        fd = reactApplicationContext.contentResolver.openFileDescriptor(uri, "r")
                        if (fd != null) {
                            retriever.setDataSource(fd.fileDescriptor)
                        } else {
                            retriever.setDataSource(filePath)
                        }
                    } else {
                        val path = if (filePath.startsWith("file://")) filePath.replace("file://", "") else filePath
                        retriever.setDataSource(path)
                    }
                } catch (e: Exception) {
                    try {
                        val f = File(filePath)
                        retriever.setDataSource(f.absolutePath)
                    } catch (ex: Exception) {
                        retriever.release()
                        promise.reject("DURATION_SET_DATA_SOURCE_FAILED", ex.message)
                        return@Thread
                    }
                }

                val durationStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                retriever.release()
                val durationMs = durationStr?.toLongOrNull() ?: 0L
                // return seconds as double
                promise.resolve(durationMs / 1000.0)
            } catch (e: Exception) {
                promise.reject("DURATION_ERROR", e.message)
            } finally {
                try { fd?.close() } catch (_: Exception) {}
            }
        }.start()
    }
}
