package com.aibox.launcher

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * 接收車機開機完成廣播，觸發背景音樂（Spotify）自動續播。
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            MediaResumeHelper.resumeOnBootIfNeeded(context)
        }
    }
}
