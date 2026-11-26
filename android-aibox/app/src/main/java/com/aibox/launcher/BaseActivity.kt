package com.aibox.launcher

import android.content.res.Configuration
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat

open class BaseActivity : AppCompatActivity() {
    override fun setContentView(layoutResID: Int) {
        super.setContentView(layoutResID)
        setLightBars(!isNight())
    }

    fun isNight() =
        (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    fun setLightBars(light: Boolean) {
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = light
    }

    /** 在 view 的底部多加一段內距,讓內容不會被虛擬導覽列蓋住(導覽列關閉時不加) */
    fun reserveBottom(v: View) {
        val extra = if (Store.navBarOn(this)) NavOverlay.reservePx(this) else 0
        v.setPadding(v.paddingLeft, v.paddingTop, v.paddingRight, v.paddingBottom + extra)
    }
}
