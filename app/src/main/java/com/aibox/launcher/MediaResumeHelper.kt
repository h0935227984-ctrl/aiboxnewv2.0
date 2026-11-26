package com.aibox.launcher

import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import android.view.KeyEvent

/**
 * 開機背景續播媒體工具（針對車機 AIBOX 取代原廠桌面後，自動背景喚醒 Spotify / 音樂播放）。
 */
object MediaResumeHelper {
    private const val TAG = "MediaResume"
    private const val SPOTIFY_PKG = "com.spotify.music"
    private val mainHandler = Handler(Looper.getMainLooper())
    @Volatile private var scheduledForBoot = false

    fun resumeOnBootIfNeeded(context: Context) {
        val app = context.applicationContext
        if (!Store.autoResumeSpotifyOn(app)) return
        if (scheduledForBoot) return

        val bootCount = currentBootCount(app)
        if (bootCount >= 0 && bootCount == Store.lastResumedBootCount(app)) {
            return
        }

        scheduledForBoot = true
        if (bootCount >= 0) {
            Store.setLastResumedBootCount(app, bootCount)
        }

        // 車機冷開機後等待藍牙音訊與背景服務就緒再嘗試喚醒（不搶前景畫面）
        mainHandler.postDelayed({ tryResume(app, allowRetry = true) }, 2500L)
    }

    private fun tryResume(app: Context, allowRetry: Boolean) {
        if (!Store.autoResumeSpotifyOn(app)) return
        val am = app.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
        if (am.isMusicActive) {
            Log.d(TAG, "Music already active, skipping resume")
            return
        }

        try {
            val down = KeyEvent(SystemClock.uptimeMillis(), SystemClock.uptimeMillis(), KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PLAY, 0)
            val up = KeyEvent(SystemClock.uptimeMillis(), SystemClock.uptimeMillis(), KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_PLAY, 0)
            am.dispatchMediaKeyEvent(down)
            am.dispatchMediaKeyEvent(up)
        } catch (e: Exception) {
            Log.w(TAG, "dispatchMediaKeyEvent failed: ${e.message}")
        }

        // 若有安裝 Spotify，額外精準發送背景媒體按鍵廣播喚醒服務（不開啟前景 App）
        if (isPackageInstalled(app, SPOTIFY_PKG)) {
            sendMediaButtonToPackage(app, SPOTIFY_PKG)
        }

        if (allowRetry) {
            mainHandler.postDelayed({
                if (!am.isMusicActive) {
                    tryResume(app, allowRetry = false)
                }
            }, 4500L)
        }
    }

    private fun sendMediaButtonToPackage(context: Context, pkg: String) {
        val now = SystemClock.uptimeMillis()
        listOf(KeyEvent.ACTION_DOWN, KeyEvent.ACTION_UP).forEach { action ->
            try {
                val event = KeyEvent(now, now, action, KeyEvent.KEYCODE_MEDIA_PLAY, 0)
                val intent = Intent(Intent.ACTION_MEDIA_BUTTON).apply {
                    setPackage(pkg)
                    putExtra(Intent.EXTRA_KEY_EVENT, event)
                    addFlags(Intent.FLAG_INCLUDE_STOPPED_PACKAGES)
                }
                context.sendBroadcast(intent)
            } catch (e: Exception) {
                Log.w(TAG, "sendBroadcast media button failed: ${e.message}")
            }
        }
    }

    private fun isPackageInstalled(context: Context, pkg: String): Boolean = try {
        context.packageManager.getPackageInfo(pkg, 0)
        true
    } catch (_: Exception) {
        false
    }

    private fun currentBootCount(context: Context): Int = try {
        Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1)
    } catch (_: Exception) {
        -1
    }
}
