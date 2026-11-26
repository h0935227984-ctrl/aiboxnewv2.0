package com.aibox.launcher

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.view.MotionEvent
import android.view.View
import java.io.File

/**
 * 100% 離線高畫質 360 度轉盤檢視器
 * 支援從 assets/360_turntable 或 App 內部私有空間載入 24~36 張真實照片序列。
 * 手指左右拖曳即可 60fps 無縫旋轉車輛，具備真實滑行慣性。
 */
class Turntable360View(context: Context) : View(context) {
    private val frames = mutableListOf<Bitmap>()
    private var currentFrameIndex = 0
    private var lastX = 0f
    private var velocityX = 0f
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val srcRect = Rect()
    private val dstRect = Rect()

    init {
        isClickable = true
        isFocusable = true
        loadFrames()
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }

    /** 讀取離線 360 角度圖片庫 */
    fun loadFrames() {
        frames.forEach { it.recycle() }
        frames.clear()

        // 1. 優先尋找 App 私有空間使用者上傳的 360 圖庫
        val customDir = File(context.filesDir, "360_turntable")
        if (customDir.exists() && customDir.isDirectory) {
            val files = customDir.listFiles()?.filter {
                val n = it.name.lowercase()
                n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".webp")
            }?.sortedBy { it.name }
            if (!files.isNullOrEmpty()) {
                files.forEach { file ->
                    try {
                        val bmp = BitmapFactory.decodeFile(file.absolutePath)
                        if (bmp != null) frames.add(bmp)
                    } catch (_: Exception) {}
                }
            }
        }

        // 2. 若私有空間無圖片，則嘗試讀取內建 assets/360_turntable/ 圖片庫
        if (frames.isEmpty()) {
            try {
                val assetManager = context.assets
                val list = assetManager.list("360_turntable")?.sorted() ?: emptyList()
                for (name in list) {
                    if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".webp")) {
                        assetManager.open("360_turntable/$name").use { input ->
                            val bmp = BitmapFactory.decodeStream(input)
                            if (bmp != null) frames.add(bmp)
                        }
                    }
                }
            } catch (_: Exception) {}
        }

        invalidate()
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (frames.isEmpty()) return super.onTouchEvent(event)

        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                lastX = event.x
                velocityX = 0f
                parent?.requestDisallowInterceptTouchEvent(true)
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = event.x - lastX
                velocityX = dx
                val sensitivity = 15f // 敏感度:拖曳多少像素切換一張圖
                val step = (dx / sensitivity).toInt()
                if (step != 0) {
                    currentFrameIndex = (currentFrameIndex - step) % frames.size
                    if (currentFrameIndex < 0) currentFrameIndex += frames.size
                    lastX = event.x
                    invalidate()
                }
                return true
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                performClick()
                parent?.requestDisallowInterceptTouchEvent(false)
                startInertia()
                return true
            }
        }
        return super.onTouchEvent(event)
    }

    private val inertiaRunnable = object : Runnable {
        override fun run() {
            if (kotlin.math.abs(velocityX) > 0.5f && frames.isNotEmpty()) {
                val step = if (velocityX > 0) 1 else -1
                currentFrameIndex = (currentFrameIndex - step) % frames.size
                if (currentFrameIndex < 0) currentFrameIndex += frames.size
                velocityX *= 0.88f
                invalidate()
                postDelayed(this, 30)
            }
        }
    }

    private fun startInertia() {
        removeCallbacks(inertiaRunnable)
        if (frames.isEmpty() || kotlin.math.abs(velocityX) < 2f) return
        post(inertiaRunnable)
    }

    override fun onDetachedFromWindow() {
        removeCallbacks(inertiaRunnable)
        frames.forEach { if (!it.isRecycled) it.recycle() }
        frames.clear()
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (frames.isNotEmpty()) {
            val bmp = frames[currentFrameIndex.coerceIn(0, frames.size - 1)]
            if (!bmp.isRecycled) {
                srcRect.set(0, 0, bmp.width, bmp.height)
                dstRect.set(0, 0, width, height)
                canvas.drawBitmap(bmp, srcRect, dstRect, paint)
            }
        }
    }
}
