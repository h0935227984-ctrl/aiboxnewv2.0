package com.aibox.launcher

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.ImageView
import android.widget.LinearLayout

/** 導覽列目前是否固定顯示。桌面與管理頁用它讓出底部區域 */
object NavState {
    @Volatile var visible = false
        private set
    var listener: ((Boolean) -> Unit)? = null
    fun set(v: Boolean) {
        if (visible == v) return
        visible = v
        listener?.invoke(v)
    }
}

/**
 * 全寬滿版無圓角系統導覽列(返回 / 首頁 / 應用程式 / 最近工作)。
 * 直接貼齊螢幕左右兩側與最底部邊緣，無圓弧外框。
 */
class NavOverlay(private val svc: AccessibilityService) {
    private val wm = svc.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val u = Ui.unit(svc)
    private var bar: View? = null

    private fun pu(v: Float) = (v * u).toInt()
    private fun params(w: Int, hgt: Int, flags: Int) = WindowManager.LayoutParams(
        w, hgt, WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY, flags, PixelFormat.TRANSLUCENT
    )

    fun start() { refresh() }
    fun touchDown() {}
    fun touchUp() {}

    /** 設定開關改變時呼叫 */
    fun refresh() {
        if (Store.navBarOn(svc)) {
            showFixedBar()
        } else {
            removeBarNow()
        }
    }

    fun stop() {
        removeBarNow()
    }

    /** 建立並固定顯示於螢幕最底部、左右滿版無圓角的導覽列 */
    private fun showFixedBar() {
        if (bar == null) {
            val v = buildBar()
            val p = params(
                WindowManager.LayoutParams.MATCH_PARENT,
                pu(BAR_H_U),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
            ).apply {
                gravity = Gravity.BOTTOM or Gravity.FILL_HORIZONTAL
                x = 0
                y = 0
            }
            try {
                wm.addView(v, p)
                bar = v
            } catch (_: Exception) {
                return
            }
        }
        bar?.alpha = 1.0f
        NavState.set(true)
    }

    private fun removeBarNow() {
        bar?.let { safeRemove(it) }
        bar = null
        NavState.set(false)
    }

    private fun safeRemove(v: View) { try { wm.removeView(v) } catch (_: Exception) {} }

    /** 建構滿版柔霧過渡導覽列 (無銳利切割線、延伸至螢幕左右兩側、4 等分平均排列) */
    private fun buildBar(): View {
        val wrapper = LinearLayout(svc).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.bg_nav_feather)
        }

        val row = LinearLayout(svc).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, pu(1.0f), 0, 0)
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f)
        }

        fun btn(res: Int, desc: String, onClick: () -> Unit) = ImageView(svc).apply {
            contentDescription = desc
            setImageResource(res)
            setColorFilter(0xFFF8FAFC.toInt())
            scaleType = ImageView.ScaleType.FIT_CENTER
            setPadding(0, pu(BTN_VPAD_U), 0, pu(BTN_VPAD_U))
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f)
            setOnClickListener { onClick() }
        }

        row.addView(btn(R.drawable.ic_nav_back, "返回") {
            svc.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
        })
        row.addView(btn(R.drawable.ic_nav_home, "首頁") {
            svc.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME)
        })
        row.addView(btn(R.drawable.ic_nav_apps, "應用程式") {
            try {
                val intent = Intent(svc, AppsActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                svc.startActivity(intent)
            } catch (_: Exception) {}
        })
        row.addView(btn(R.drawable.ic_nav_recents, "最近工作") {
            svc.performGlobalAction(AccessibilityService.GLOBAL_ACTION_RECENTS)
        })

        wrapper.addView(row)
        return wrapper
    }

    companion object {
        private const val ICON_U = 6.2f
        private const val BTN_VPAD_U = 1.8f
        private const val BAR_H_U = ICON_U + 2 * BTN_VPAD_U

        /** 導覽列固定顯示時佔用的底部高度(px) */
        fun reservePx(c: Context): Int = (Ui.unit(c) * (BAR_H_U + 1.5f)).toInt()
    }
}
