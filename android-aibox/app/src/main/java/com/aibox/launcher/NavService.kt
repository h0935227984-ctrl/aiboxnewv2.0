package com.aibox.launcher

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

/** 無障礙服務:承載虛擬導覽列(返回 / 首頁 / 最近工作) */
class NavService : AccessibilityService() {
    var nav: NavOverlay? = null

    override fun onServiceConnected() {
        inst = this
        nav = NavOverlay(this).also { it.start() }
    }

    override fun onAccessibilityEvent(e: AccessibilityEvent?) {
        when (e?.eventType) {
            AccessibilityEvent.TYPE_TOUCH_INTERACTION_START -> nav?.touchDown()
            AccessibilityEvent.TYPE_TOUCH_INTERACTION_END -> nav?.touchUp()
        }
    }

    override fun onInterrupt() {}

    override fun onUnbind(intent: Intent?): Boolean {
        nav?.stop(); nav = null; inst = null
        return super.onUnbind(intent)
    }

    companion object { var inst: NavService? = null }
}
