package com.kkmusic.widget

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import kotlin.math.max
import kotlin.math.min

object WidgetBitmapUtils {

    /**
     * Safely center-crop a bitmap to the requested dimensions.
     *
     * IMPORTANT:
     * We do NOT use Bitmap.createBitmap(source, left, top, width, height)
     * because that can throw:
     *
     * java.lang.IllegalArgumentException:
     * y + height must be <= bitmap.height()
     *
     * Instead, we create an exact-size destination bitmap and draw the
     * source into it using a scale + translation matrix.
     */
    fun centerCrop(
        source: Bitmap,
        targetWidth: Int,
        targetHeight: Int,
    ): Bitmap {

        val safeWidth = targetWidth.coerceAtLeast(1)
        val safeHeight = targetHeight.coerceAtLeast(1)

        /**
         * If the source is invalid/recycled, return a safe blank bitmap.
         */
        if (
            source.isRecycled ||
            source.width <= 0 ||
            source.height <= 0
        ) {
            return Bitmap.createBitmap(
                safeWidth,
                safeHeight,
                Bitmap.Config.ARGB_8888,
            )
        }

        /**
         * Create the exact output size.
         */
        val output = Bitmap.createBitmap(
            safeWidth,
            safeHeight,
            Bitmap.Config.ARGB_8888,
        )

        val canvas = Canvas(output)

        /**
         * Scale enough to completely cover the destination.
         */
        val scale = max(
            safeWidth.toFloat() / source.width.toFloat(),
            safeHeight.toFloat() / source.height.toFloat(),
        )

        val scaledWidth =
            source.width.toFloat() * scale

        val scaledHeight =
            source.height.toFloat() * scale

        /**
         * Center the scaled image.
         */
        val dx =
            (safeWidth.toFloat() - scaledWidth) / 2f

        val dy =
            (safeHeight.toFloat() - scaledHeight) / 2f

        val matrix = Matrix()

        matrix.setScale(
            scale,
            scale,
        )

        matrix.postTranslate(
            dx,
            dy,
        )

        val paint = Paint(
            Paint.ANTI_ALIAS_FLAG or
                Paint.FILTER_BITMAP_FLAG or
                Paint.DITHER_FLAG,
        )

        /**
         * Draw directly into the destination bitmap.
         *
         * No manual crop coordinates are used.
         */
        canvas.drawBitmap(
            source,
            matrix,
            paint,
        )

        return output
    }

    /**
     * TOP-CROP a bitmap to the requested dimensions.
     *
     * This is specifically for the BIG widget artwork.
     *
     * The image is scaled until the entire destination is covered,
     * centered horizontally, but the TOP of the original artwork
     * remains aligned to the TOP of the destination.
     *
     * Therefore:
     *
     * - top of artwork stays visible
     * - excess image is cropped from the BOTTOM
     * - no manual Bitmap.createBitmap crop coordinates are used
     */
    fun topCrop(
        source: Bitmap,
        targetWidth: Int,
        targetHeight: Int,
    ): Bitmap {

        val safeWidth = targetWidth.coerceAtLeast(1)
        val safeHeight = targetHeight.coerceAtLeast(1)

        /**
         * If the source is invalid/recycled, return a safe blank bitmap.
         */
        if (
            source.isRecycled ||
            source.width <= 0 ||
            source.height <= 0
        ) {
            return Bitmap.createBitmap(
                safeWidth,
                safeHeight,
                Bitmap.Config.ARGB_8888,
            )
        }

        /**
         * Create exact destination size.
         */
        val output = Bitmap.createBitmap(
            safeWidth,
            safeHeight,
            Bitmap.Config.ARGB_8888,
        )

        val canvas = Canvas(output)

        /**
         * Scale enough to completely cover the destination.
         */
        val scale = max(
            safeWidth.toFloat() / source.width.toFloat(),
            safeHeight.toFloat() / source.height.toFloat(),
        )

        val scaledWidth =
            source.width.toFloat() * scale

        /**
         * Center horizontally.
         */
        val dx =
            (safeWidth.toFloat() - scaledWidth) / 2f

        /**
         * IMPORTANT:
         *
         * dy = 0
         *
         * This keeps the TOP of the original artwork
         * aligned to the TOP of the rectangular widget.
         *
         * Any extra height gets cropped from the BOTTOM.
         */
        val dy = 0f

        val matrix = Matrix()

        matrix.setScale(
            scale,
            scale,
        )

        matrix.postTranslate(
            dx,
            dy,
        )

        val paint = Paint(
            Paint.ANTI_ALIAS_FLAG or
                Paint.FILTER_BITMAP_FLAG or
                Paint.DITHER_FLAG,
        )

        /**
         * Draw directly into the destination bitmap.
         */
        canvas.drawBitmap(
            source,
            matrix,
            paint,
        )

        return output
    }

    /**
     * Creates a rounded rectangle using a SAFE CENTER-CROP.
     *
     * Used by the small widget / any normal center-cropped artwork.
     */
    fun roundedRect(
        source: Bitmap,
        width: Int,
        height: Int,
        radius: Float,
    ): Bitmap {

        val safeWidth =
            width.coerceAtLeast(1)

        val safeHeight =
            height.coerceAtLeast(1)

        /**
         * Safely center-crop the source.
         */
        val cropped =
            centerCrop(
                source = source,
                targetWidth = safeWidth,
                targetHeight = safeHeight,
            )

        /**
         * Create final bitmap.
         */
        val output =
            Bitmap.createBitmap(
                safeWidth,
                safeHeight,
                Bitmap.Config.ARGB_8888,
            )

        val canvas =
            Canvas(output)

        /**
         * Radius cannot be larger than half the smallest dimension.
         */
        val safeRadius =
            radius.coerceIn(
                0f,
                min(
                    safeWidth,
                    safeHeight,
                ) / 2f,
            )

        val rect =
            RectF(
                0f,
                0f,
                safeWidth.toFloat(),
                safeHeight.toFloat(),
            )

        val path =
            Path().apply {

                addRoundRect(
                    rect,
                    safeRadius,
                    safeRadius,
                    Path.Direction.CW,
                )
            }

        canvas.save()

        /**
         * Clip to rounded rectangle.
         */
        canvas.clipPath(path)

        val paint = Paint(
            Paint.ANTI_ALIAS_FLAG or
                Paint.FILTER_BITMAP_FLAG or
                Paint.DITHER_FLAG,
        )

        canvas.drawBitmap(
            cropped,
            0f,
            0f,
            paint,
        )

        canvas.restore()

        /**
         * cropped was created by us, so it can safely be recycled.
         *
         * Never recycle the original source here because the caller
         * still owns it.
         */
        if (
            cropped !== source &&
            !cropped.isRecycled
        ) {
            cropped.recycle()
        }

        return output
    }

    /**
     * Creates a rounded rectangle using a TOP-CROP.
     *
     * Used by the BIG widget.
     *
     * This keeps the top of a square 1:1 artwork visible
     * while cropping the excess from the bottom.
     */
    fun roundedTopCrop(
        source: Bitmap,
        width: Int,
        height: Int,
        radius: Float,
    ): Bitmap {

        val safeWidth =
            width.coerceAtLeast(1)

        val safeHeight =
            height.coerceAtLeast(1)

        /**
         * Safely top-crop the source.
         */
        val cropped =
            topCrop(
                source = source,
                targetWidth = safeWidth,
                targetHeight = safeHeight,
            )

        /**
         * Create final bitmap.
         */
        val output =
            Bitmap.createBitmap(
                safeWidth,
                safeHeight,
                Bitmap.Config.ARGB_8888,
            )

        val canvas =
            Canvas(output)

        /**
         * Radius cannot be larger than half the smallest dimension.
         */
        val safeRadius =
            radius.coerceIn(
                0f,
                min(
                    safeWidth,
                    safeHeight,
                ) / 2f,
            )

        val rect =
            RectF(
                0f,
                0f,
                safeWidth.toFloat(),
                safeHeight.toFloat(),
            )

        val path =
            Path().apply {

                addRoundRect(
                    rect,
                    safeRadius,
                    safeRadius,
                    Path.Direction.CW,
                )
            }

        canvas.save()

        /**
         * Clip to rounded rectangle.
         */
        canvas.clipPath(path)

        val paint = Paint(
            Paint.ANTI_ALIAS_FLAG or
                Paint.FILTER_BITMAP_FLAG or
                Paint.DITHER_FLAG,
        )

        canvas.drawBitmap(
            cropped,
            0f,
            0f,
            paint,
        )

        canvas.restore()

        /**
         * cropped was created by us, so it can safely be recycled.
         */
        if (
            cropped !== source &&
            !cropped.isRecycled
        ) {
            cropped.recycle()
        }

        return output
    }

    /**
     * Creates a circular bitmap.
     *
     * Used by the SMALL widget artwork.
     */
    fun circle(
        source: Bitmap,
        size: Int,
    ): Bitmap {

        val safeSize =
            size.coerceAtLeast(1)

        return roundedRect(
            source = source,
            width = safeSize,
            height = safeSize,
            radius = safeSize / 2f,
        )
    }
}