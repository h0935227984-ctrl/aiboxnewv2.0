package com.aibox.launcher

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.TextView
import androidx.core.view.WindowCompat

/**
 * 專供分割組合啟動「3D 電動車模型」半屏視窗使用，
 * 讓使用者可自由決定 3D 模型顯示在分割畫面的上方或下方。
 */
class CarSplitActivity : BaseActivity() {
    private var carView: GlbCarView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT

        val root = FrameLayout(this).apply {
            setBackgroundColor(getColor(R.color.bg))
        }

        if (Store.car3DOn(this)) {
            val view = GlbCarView(this)
            carView = view
            root.addView(
                view,
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            )
        } else {
            root.addView(
                Turntable360View(this),
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            )
        }

        val u = Ui.unit(this)
        val btnClose = TextView(this).apply {
            text = "✕"
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_PX, 3.2f * u)
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(0x660F172A)
            }
            setOnClickListener { finish() }
        }
        val size = (7.2f * u).toInt().coerceAtLeast(64)
        val margin = (2.5f * u).toInt().coerceAtLeast(20)
        root.addView(
            btnClose,
            FrameLayout.LayoutParams(size, size, Gravity.TOP or Gravity.END).apply {
                topMargin = margin
                marginEnd = margin
            }
        )

        setContentView(root)
        reserveBottom(root)
    }

    override fun onResume() {
        super.onResume()
        carView?.apply {
            setRainbowRoad(Store.rainbowRoadOn(this@CarSplitActivity))
            setDemoDrive(Store.demoDriveOn(this@CarSplitActivity))
            setThemeMode(Store.themeMode(this@CarSplitActivity))
            setCameraMode(Store.fsdCameraMode(this@CarSplitActivity))
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        carView?.webView?.destroy()
        carView = null
    }
}
