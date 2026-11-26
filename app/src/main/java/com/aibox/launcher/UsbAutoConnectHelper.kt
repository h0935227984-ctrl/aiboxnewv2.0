package com.aibox.launcher

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.display.DisplayManager
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Display
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.Executors

/**
 * AI Box 開機有線 USB 自動連線管理：
 * - 開機後每 3 秒檢查是否已與車機建立有線 USB 投屏連線，未連上則模擬 USB 重連／喚醒連線服務。
 * - 一旦偵測到連線成功（或使用者已於車機螢幕觸控操作），立即停止嘗試連線功能。
 */
object UsbAutoConnectHelper {
    private const val TAG = "UsbAutoConnect"
    private const val INITIAL_DELAY_MS = 3500L
    private const val RETRY_INTERVAL_MS = 3000L
    private const val MAX_ATTEMPTS = 20

    private val mainHandler = Handler(Looper.getMainLooper())
    private val worker = Executors.newSingleThreadExecutor()

    @Volatile private var running = false
    @Volatile private var connectedThisBoot = false
    @Volatile private var scheduledBootCount = -1
    @Volatile private var attemptCount = 0
    @Volatile private var statusMessage = "待命中"
    @Volatile private var receiverRegistered = false

    private val knownVendorPackages = listOf(
        "cn.manstep.phonemirrorBox",
        "com.carlinkit.carlink",
        "com.zjinnova.zlink",
        "com.suding.speedplay",
        "com.carletter.car",
        "com.hz.carplay",
        "com.tima.carnet",
        "com.android.car.link"
    )

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent?) {
            if (!running) return
            if (isUsbProjectionActive(context)) {
                markConnectedAndStop(context, "偵測到有線 USB 連線成功，已自動關閉重連")
            }
        }
    }

    private val retryRunnable: Runnable = object : Runnable {
        override fun run() {
            val ctx = appContext ?: return
            if (!running || !Store.autoUsbReconnectOn(ctx) || connectedThisBoot) {
                stopLoop()
                return
            }

            if (isUsbProjectionActive(ctx)) {
                markConnectedAndStop(ctx, "偵測到有線 USB 連線成功，已自動關閉重連")
                return
            }

            attemptCount++
            if (attemptCount > MAX_ATTEMPTS) {
                statusMessage = "已達嘗試上限（$MAX_ATTEMPTS 次），已自動停止重連"
                stopLoop()
                return
            }

            statusMessage = "正在嘗試有線 USB 連線（第 $attemptCount/$MAX_ATTEMPTS 次，每 3 秒）…"
            worker.execute {
                val didTrigger = performWiredUsbReconnect(ctx)
                mainHandler.post {
                    if (!running || connectedThisBoot) return@post
                    if (!didTrigger) {
                        statusMessage = "系統未提供 Root 或已知原廠 USB 服務，無法軟體重置 USB"
                    }
                    mainHandler.postDelayed(retryRunnable, RETRY_INTERVAL_MS)
                }
            }
        }
    }

    @Volatile private var appContext: Context? = null

    fun startOnBootIfNeeded(context: Context) {
        val app = context.applicationContext
        appContext = app

        if (!Store.autoUsbReconnectOn(app)) {
            statusMessage = "已關閉開機自動連線"
            stopLoop()
            return
        }

        val bootCount = currentBootCount(app)
        if (bootCount >= 0 && bootCount == Store.lastUsbBootCount(app)) {
            connectedThisBoot = true
            statusMessage = "本次開機已連線完成，嘗試連線功能已關閉"
            return
        }
        if (connectedThisBoot || (running && scheduledBootCount == bootCount)) {
            return
        }

        if (isUsbProjectionActive(app)) {
            markConnectedAndStop(app, "開機即已偵測到有線 USB 連線，無需重試")
            return
        }

        scheduledBootCount = bootCount
        attemptCount = 0
        running = true
        statusMessage = "開機待命，即將每 3 秒嘗試有線 USB 連線…"
        registerUsbReceiverIfNeeded(app)

        mainHandler.removeCallbacks(retryRunnable)
        mainHandler.postDelayed(retryRunnable, INITIAL_DELAY_MS)
    }

    fun setAutoReconnectEnabled(context: Context, enabled: Boolean) {
        val app = context.applicationContext
        appContext = app
        Store.setAutoUsbReconnectOn(app, enabled)
        if (!enabled) {
            statusMessage = "已手動關閉開機有線 USB 重連"
            stopLoop()
        } else {
            connectedThisBoot = false
            scheduledBootCount = -1
            Store.setLastUsbBootCount(app, -1)
            startOnBootIfNeeded(app)
        }
    }

    fun markConnectedAndStop(context: Context, reason: String = "已連線成功，嘗試連線功能已關閉") {
        val app = context.applicationContext
        connectedThisBoot = true
        statusMessage = reason
        val bootCount = currentBootCount(app)
        if (bootCount >= 0) {
            Store.setLastUsbBootCount(app, bootCount)
        }
        stopLoop()
    }

    fun statusText(): String = statusMessage

    private fun stopLoop() {
        running = false
        mainHandler.removeCallbacks(retryRunnable)
        val app = appContext
        if (app != null && receiverRegistered) {
            try {
                app.unregisterReceiver(usbReceiver)
            } catch (_: Exception) {}
            receiverRegistered = false
        }
    }

    private fun registerUsbReceiverIfNeeded(app: Context) {
        if (receiverRegistered) return
        try {
            val filter = IntentFilter().apply {
                addAction("android.hardware.usb.action.USB_STATE")
                addAction("android.hardware.usb.action.USB_ACCESSORY_ATTACHED")
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                app.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                app.registerReceiver(usbReceiver, filter)
            }
            receiverRegistered = true
        } catch (e: Exception) {
            Log.w(TAG, "registerUsbReceiver failed: ${e.message}")
        }
    }

    /**
     * 偵測是否已透過有線 USB 成功連線至車機畫面（僅偵測有線 USB／投屏，不檢查藍牙或 Wi-Fi）。
     */
    fun isUsbProjectionActive(context: Context): Boolean {
        val app = context.applicationContext

        // 1. 檢查是否有車機投屏建立的外接／虛擬螢幕
        try {
            val dm = app.getSystemService(Context.DISPLAY_SERVICE) as? DisplayManager
            if (dm != null && dm.displays.any { it.displayId != Display.DEFAULT_DISPLAY && it.state == Display.STATE_ON }) {
                return true
            }
        } catch (_: Exception) {}

        // 2. 檢查有線 USB Gadget 狀態（accessory / ncm / carplay / aoap 且已由車機 Host 完成枚舉 configured=true）
        try {
            val usbIntent = app.registerReceiver(null, IntentFilter("android.hardware.usb.action.USB_STATE"))
            if (usbIntent != null) {
                val connected = usbIntent.getBooleanExtra("connected", false)
                val configured = usbIntent.getBooleanExtra("configured", false)
                val accessory = usbIntent.getBooleanExtra("accessory", false)
                val ncm = usbIntent.getBooleanExtra("ncm", false)
                val rndis = usbIntent.getBooleanExtra("rndis", false)
                val func = (usbIntent.getStringExtra("function") ?: "").lowercase()
                val hasCarChannel = accessory || ncm || rndis ||
                    func.contains("accessory") || func.contains("ncm") ||
                    func.contains("carplay") || func.contains("iap") || func.contains("aoap")
                if (connected && configured && hasCarChannel) {
                    return true
                }
            }
        } catch (_: Exception) {}

        // 3. 檢查 USB Accessory 音訊輸出通道是否已啟用
        try {
            val am = app.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            if (am != null) {
                val outputs = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
                if (outputs.any { it.type == AudioDeviceInfo.TYPE_USB_ACCESSORY }) {
                    return true
                }
            }
        } catch (_: Exception) {}

        // 4. 檢查常見系統 CarPlay 連線旗標
        val carplayProp = readProp("sys.carplay.connected").ifEmpty { readProp("persist.carplay.connected") }
        if (carplayProp == "1" || carplayProp.equals("true", ignoreCase = true)) {
            return true
        }

        return false
    }

    /**
     * 嘗試軟體重置有線 USB 連線（優先使用 Root 重置 sys.usb.config，並喚醒常見盒子連線服務）。
     */
    private fun performWiredUsbReconnect(context: Context): Boolean {
        var triggered = false

        // 方式 A：若盒子具備 Root (su) 權限，短暫切換 sys.usb.config=none 後還原，模擬重新插拔 USB 線
        if (tryRootSoftUsbReplug()) {
            triggered = true
        }

        // 方式 B：檢查並喚醒 AI Box 內建的連線 App／背景廣播
        if (tryWakeVendorUsbService(context)) {
            triggered = true
        }

        return triggered
    }

    private fun tryRootSoftUsbReplug(): Boolean {
        val currentCfg = readProp("sys.usb.config").let {
            if (it.isBlank() || it == "none") "mtp,adb" else it
        }
        return runSuCommand(
            "prev=\$(getprop sys.usb.config); " +
                "[ -z \"\$prev\" ] || [ \"\$prev\" = \"none\" ] && prev=\"$currentCfg\"; " +
                "setprop sys.usb.config none; sleep 0.65; setprop sys.usb.config \"\$prev\""
        )
    }

    private fun tryWakeVendorUsbService(context: Context): Boolean {
        val pm = context.packageManager
        var woken = false
        for (pkg in knownVendorPackages) {
            val installed = try {
                pm.getPackageInfo(pkg, 0)
                true
            } catch (_: Exception) {
                false
            }
            if (!installed) continue

            listOf(
                "$pkg.AUTO_CONNECT",
                "$pkg.ACTION_CONNECT",
                "android.intent.action.BOOT_COMPLETED"
            ).forEach { act ->
                try {
                    context.sendBroadcast(Intent(act).setPackage(pkg))
                    woken = true
                } catch (_: Exception) {}
            }
        }
        return woken
    }

    private fun runSuCommand(cmd: String): Boolean {
        return try {
            val proc = ProcessBuilder("su", "-c", cmd)
                .redirectErrorStream(true)
                .start()
            val finished = waitForCompat(proc, 3000L)
            if (!finished) {
                proc.destroy()
                false
            } else {
                proc.exitValue() == 0
            }
        } catch (_: Exception) {
            false
        }
    }

    private fun readProp(name: String): String {
        return try {
            val proc = ProcessBuilder("getprop", name).start()
            val text = BufferedReader(InputStreamReader(proc.inputStream)).use { it.readLine()?.trim().orEmpty() }
            if (!waitForCompat(proc, 500L)) {
                proc.destroy()
            }
            text
        } catch (_: Exception) {
            ""
        }
    }

    private fun waitForCompat(proc: Process, timeoutMs: Long): Boolean {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (true) {
            try {
                proc.exitValue()
                return true
            } catch (_: IllegalThreadStateException) {
                if (System.currentTimeMillis() >= deadline) return false
                try {
                    Thread.sleep(40L)
                } catch (_: InterruptedException) {
                    return false
                }
            }
        }
    }

    private fun currentBootCount(context: Context): Int = try {
        Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1)
    } catch (_: Exception) {
        -1
    }
}
