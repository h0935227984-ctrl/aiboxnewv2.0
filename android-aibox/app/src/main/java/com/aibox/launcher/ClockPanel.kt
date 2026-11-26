package com.aibox.launcher

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.math.abs

/**
 * 桌面時鐘(時間 + 日期)。長按進入編輯:拖曳 = 移動,拉右下角圓點 = 縮放,「重設」回預設,「完成」結束。
 * 位置以螢幕比例、大小以縮放倍率儲存,換螢幕尺寸也會自動適應。
 */
class ClockPanel(ctx: Context) : FrameLayout(ctx) {
    val clock = TextView(ctx)
    val date = TextView(ctx)

    private val u = Ui.unit(ctx)
    private val ui = Handler(Looper.getMainLooper())
    private val slop = ViewConfiguration.get(ctx).scaledTouchSlop
    private val accent = ctx.getColor(R.color.accent)

    private var xf = Store.clockX(ctx)
    private var yf = Store.clockY(ctx)
    private var scale = Store.clockScale(ctx)

    private var downX = 0f
    private var downY = 0f
    private var lastX = 0f
    private var lastY = 0f
    private var zone = 0              // 0 移動, 1 縮放, 2 重設, 3 完成
    private var moved = false
    private var dragging = false
    var editing = false
        private set
    private val longPress = Runnable { setEditing(true) }

    private fun pu(v: Float) = (v * u).toInt()

    private fun chip(label: String, color: Int) = TextView(context).apply {
        text = label
        setTextColor(Color.WHITE)
        setTextSize(TypedValue.COMPLEX_UNIT_PX, 2.6f * u)
        setPadding(pu(2f), pu(0.9f), pu(2f), pu(0.9f))
        background = GradientDrawable().apply { cornerRadius = pu(3f).toFloat(); setColor(color) }
    }

    private val chipDone = chip("完成", accent)
    private val chipReset = chip("重設", 0xFF64748B.toInt())
    private val grip = View(ctx).apply {
        background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL; setColor(accent); setStroke(maxOf(2, pu(0.4f)), Color.WHITE)
        }
    }
    private val editRow = LinearLayout(ctx).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = android.view.Gravity.CENTER_VERTICAL
        visibility = View.GONE
        setPadding(0, pu(1.2f), 0, 0)
    }
    private val editFg = GradientDrawable().apply {
        cornerRadius = pu(2.5f).toFloat(); setColor(0x1A10B981); setStroke(maxOf(2, pu(0.3f)), accent)
    }

    init {
        clock.setTypeface(Typeface.DEFAULT_BOLD)
        clock.setTextColor(ctx.getColor(R.color.text))
        date.setTextColor(ctx.getColor(R.color.sub))
        editRow.addView(chipDone)
        editRow.addView(chipReset, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply { marginStart = pu(1.5f) })
        editRow.addView(grip, LinearLayout.LayoutParams(pu(6f), pu(6f)).apply {
            marginStart = pu(3f)
        })
        val col = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            addView(clock, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
            addView(date, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
            addView(editRow, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        }
        addView(col, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ))
        setPadding(pu(1.5f), pu(1f), pu(1.5f), pu(1f))
        applyScale()
    }

    private fun screenW() = ((parent as? View)?.width ?: 0).takeIf { it > 0 } ?: resources.displayMetrics.widthPixels
    private fun screenH() = ((parent as? View)?.height ?: 0).takeIf { it > 0 } ?: resources.displayMetrics.heightPixels

    private fun applyScale() {
        clock.setTextSize(TypedValue.COMPLEX_UNIT_PX, 15f * u * scale)
        date.setTextSize(TypedValue.COMPLEX_UNIT_PX, 3.8f * u * scale)
    }

    /** 依儲存的比例擺放,並限制在螢幕範圍內 */
    private fun place() {
        val sw = screenW(); val sh = screenH()
        translationX = (xf * sw).coerceIn(0f, (sw - width).toFloat().coerceAtLeast(0f))
        translationY = (yf * sh).coerceIn(0f, (sh - height).toFloat().coerceAtLeast(0f))
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (!dragging) place()
    }

    private fun moveBy(dx: Float, dy: Float) {
        dragging = true
        translationX = (translationX + dx).coerceIn(0f, (screenW() - width).toFloat().coerceAtLeast(0f))
        translationY = (translationY + dy).coerceIn(0f, (screenH() - height).toFloat().coerceAtLeast(0f))
    }

    private fun resizeBy(dx: Float) {
        val w = clock.width.toFloat().coerceAtLeast(1f)
        val maxScale = (screenW() * 0.92f / (w / scale)).coerceIn(0.5f, 4f)     // 不超出螢幕寬度
        scale = (scale * (w + dx) / w).coerceIn(0.4f, maxScale)
        applyScale()
    }

    private fun commit() {
        dragging = false
        xf = translationX / screenW(); yf = translationY / screenH()
        Store.saveClock(context, xf, yf, scale)
    }

    private fun reset() {
        Store.resetClock(context)
        xf = Store.clockX(context); yf = Store.clockY(context); scale = Store.clockScale(context)
        applyScale()
        post { place() }
    }

    fun setEditing(on: Boolean) {
        if (on == editing) return
        ui.removeCallbacks(longPress)
        editing = on
        editRow.visibility = if (on) View.VISIBLE else View.GONE
        foreground = if (on) editFg else null
        zone = 0; moved = false
    }

    private fun hit(v: View, rx: Float, ry: Float): Boolean {
        if (v.visibility != View.VISIBLE) return false
        val loc = IntArray(2)
        v.getLocationOnScreen(loc)
        val pad = pu(1f)
        return rx >= loc[0] - pad && rx <= loc[0] + v.width + pad && ry >= loc[1] - pad && ry <= loc[1] + v.height + pad
    }

    override fun onTouchEvent(ev: MotionEvent): Boolean {
        when (ev.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downX = ev.rawX; downY = ev.rawY; lastX = ev.rawX; lastY = ev.rawY; moved = false
                if (editing) {
                    zone = when {
                        hit(chipDone, ev.rawX, ev.rawY) -> 3
                        hit(chipReset, ev.rawX, ev.rawY) -> 2
                        hit(grip, ev.rawX, ev.rawY) -> 1
                        else -> 0
                    }
                } else {
                    zone = 0
                    ui.removeCallbacks(longPress)
                    ui.postDelayed(longPress, ViewConfiguration.getLongPressTimeout().toLong())
                }
            }
            MotionEvent.ACTION_MOVE -> {
                if (!moved && (abs(ev.rawX - downX) > slop || abs(ev.rawY - downY) > slop)) {
                    moved = true
                    ui.removeCallbacks(longPress)
                }
                if (editing && moved) {
                    val dx = ev.rawX - lastX; val dy = ev.rawY - lastY
                    if (zone == 0) moveBy(dx, dy) else if (zone == 1) resizeBy(dx)
                }
                lastX = ev.rawX; lastY = ev.rawY
            }
            MotionEvent.ACTION_UP -> {
                ui.removeCallbacks(longPress)
                if (editing) {
                    if (moved) { if (zone == 0 || zone == 1) commit() }
                    else when (zone) { 3 -> setEditing(false); 2 -> reset() }
                }
                dragging = false
            }
            MotionEvent.ACTION_CANCEL -> { ui.removeCallbacks(longPress); dragging = false }
        }
        return true
    }

    override fun onDetachedFromWindow() {
        ui.removeCallbacks(longPress)
        super.onDetachedFromWindow()
    }
}
