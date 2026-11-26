package com.aibox.launcher

import android.animation.ValueAnimator
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.RenderEffect
import android.graphics.Shader
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.TextureView
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.GridLayout
import android.widget.ImageView
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.widget.SwitchCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

class HomeActivity : BaseActivity() {
    private val h = Handler(Looper.getMainLooper())
    private lateinit var clockPanel: ClockPanel
    private lateinit var clock: TextView
    private lateinit var date: TextView
    private lateinit var box: GridLayout
    private lateinit var btnMore: ImageView
    private lateinit var scrollView: View
    private lateinit var bgImage: ImageView
    private lateinit var bgVideo: TextureView
    private lateinit var scrim: View
    private lateinit var video: VideoBg

    // 系統列內距 + 導覽列出現時額外預留的高度
    private var insTop = 0
    private var insBottom = 0
    private var navExtra = 0
    private var navAnim: ValueAnimator? = null

    // 桌布圖片快取 / 虛化
    private var loadedKey: String? = null
    private var blurVersion = 0
    @Volatile private var smallKey: String? = null
    @Volatile private var small: Bitmap? = null
    private val blurExec = Executors.newSingleThreadExecutor()

    private val tick = object : Runnable {
        override fun run() { updateClock(); h.postDelayed(this, 5000) }
    }

    private val multiPicker = registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        if (uris.isNotEmpty()) {
            Toast.makeText(this, "處理多張桌布中…", Toast.LENGTH_SHORT).show()
            Wallpaper.importUris(this, uris) { ok ->
                Toast.makeText(this, if (ok) "桌布群組已更新" else "桌布讀取失敗", Toast.LENGTH_SHORT).show()
                if (ok) applyWallpaper()
            }
        }
    }

    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[android.Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            permissions[android.Manifest.permission.ACCESS_COARSE_LOCATION] == true) {
            startGpsSpeedMonitor()
        }
    }

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        setContentView(R.layout.activity_home)

        try {
            locationPermissionLauncher.launch(arrayOf(
                android.Manifest.permission.ACCESS_FINE_LOCATION,
                android.Manifest.permission.ACCESS_COARSE_LOCATION
            ))
        } catch (_: Exception) {}

        box = findViewById(R.id.combos)
        btnMore = findViewById(R.id.btnMore)
        bgImage = findViewById(R.id.bgImage); bgVideo = findViewById(R.id.bgVideo)
        scrim = findViewById(R.id.scrim)
        scrollView = findViewById(R.id.scroll)
        video = VideoBg(bgVideo) {
            Toast.makeText(this, "影片無法播放,建議使用 H.264 編碼的 MP4", Toast.LENGTH_LONG).show()
        }

        val root = findViewById<ViewGroup>(R.id.root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val s = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            insTop = s.top; insBottom = s.bottom
            applyScrollPadding()
            insets
        }

        // 時鐘:獨立浮在桌面上,可長按拖曳位置、縮放大小
        clockPanel = ClockPanel(this)
        clock = clockPanel.clock; date = clockPanel.date
        root.addView(clockPanel, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP or Gravity.START
        ))

        // 右上角設定按鈕:依螢幕大小縮放的圓形玻璃按鈕
        val u = Ui.unit(this)
        btnMore.layoutParams.apply { width = (9f * u).toInt(); height = (9f * u).toInt() }
        (2.2f * u).toInt().let { btnMore.setPadding(it, it, it, it) }
        btnMore.background = GradientDrawable().apply { shape = GradientDrawable.OVAL }

        btnMore.setOnClickListener { showSettings() }
        scrollView.setOnLongClickListener { showSettings(); true }          // 長按空白處也能開設定

        applyCar3DPosition()
        updateCar3DView()
        MediaResumeHelper.resumeOnBootIfNeeded(this)
    }

    private fun applyCar3DPosition() {
        val column = findViewById<ViewGroup>(R.id.homeContentColumn) ?: return
        val carWrapper = findViewById<View>(R.id.carWrapper) ?: return
        val combosSection = findViewById<View>(R.id.combosSection) ?: return
        val wantBottom = Store.car3DPosition(this) == "bottom"
        val carIdx = column.indexOfChild(carWrapper)
        val comboIdx = column.indexOfChild(combosSection)
        if (carIdx < 0 || comboIdx < 0) return
        if (wantBottom && carIdx < comboIdx) {
            column.removeView(carWrapper)
            column.addView(carWrapper, column.indexOfChild(combosSection) + 1)
        } else if (!wantBottom && carIdx > comboIdx) {
            column.removeView(carWrapper)
            column.addView(carWrapper, column.indexOfChild(combosSection))
        }
    }

    private fun updateCar3DView(forceReload: Boolean = false) {
        val carContainer = findViewById<ViewGroup>(R.id.carContainer) ?: return
        val want3D = Store.car3DOn(this)
        val current = carContainer.getChildAt(0)
        if (!forceReload) {
            if (want3D && current is GlbCarView) return
            if (!want3D && current is Turntable360View) return
        }
        carContainer.removeAllViews()
        carContainer.visibility = View.VISIBLE
        if (want3D) {
            carContainer.addView(GlbCarView(this), ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        } else {
            carContainer.addView(Turntable360View(this), ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        }
    }

    override fun onResume() {
        super.onResume()
        applyScrollPadding()
        NavState.listener = { v -> animateReserve(v, true) }
        animateReserve(NavState.visible && Store.navBarOn(this), false)
        applyCar3DPosition()
        buildCombos()
        applyWallpaper()
        updateCar3DView()
        (findViewById<ViewGroup>(R.id.carContainer)?.getChildAt(0) as? GlbCarView)
            ?.setRainbowRoad(Store.rainbowRoadOn(this))
        startGpsSpeedMonitor()
        h.post(tick)
    }

    override fun onPause() {
        super.onPause()
        stopGpsSpeedMonitor()
        h.removeCallbacks(tick)
        NavState.listener = null
        clockPanel.setEditing(false)
        video.release()
    }

    private var locListener: android.location.LocationListener? = null
    private var lastGpsLocation: android.location.Location? = null

    private fun handleGpsLocation(loc: android.location.Location, isCachedOnly: Boolean = false) {
        val prev = lastGpsLocation
        var kmh = if (!isCachedOnly && loc.hasSpeed()) loc.speed * 3.6f else 0f
        if (!isCachedOnly && !loc.hasSpeed() && prev != null) {
            val dtSec = (loc.time - prev.time) / 1000f
            val dist = prev.distanceTo(loc)
            if (dtSec in 0.2f..10f && dist > 1.5f) {
                kmh = (dist / dtSec) * 3.6f
            }
        }
        val bearing = when {
            loc.hasBearing() -> loc.bearing
            prev != null && prev.distanceTo(loc) > 2.0f -> (prev.bearingTo(loc) + 360f) % 360f
            else -> -1f
        }
        lastGpsLocation = loc

        val glbView = findViewById<ViewGroup>(R.id.carContainer)?.getChildAt(0) as? GlbCarView
        glbView?.setGpsData(kmh, bearing, loc.latitude, loc.longitude)
    }

    private fun startGpsSpeedMonitor() {
        stopGpsSpeedMonitor()
        try {
            val lm = getSystemService(LOCATION_SERVICE) as? android.location.LocationManager ?: return
            val hasFine = checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
            val hasCoarse = checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
            if (!hasFine && !hasCoarse) return

            // 立即讀取最後一次已知座標（含 GPS / 網路 / 被動定位），第一時間顯示實景道路與立體建築
            val cachedLoc = (if (hasFine) lm.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER) else null)
                ?: lm.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)
                ?: lm.getLastKnownLocation(android.location.LocationManager.PASSIVE_PROVIDER)
            if (cachedLoc != null) {
                handleGpsLocation(cachedLoc, isCachedOnly = true)
            }

            locListener = android.location.LocationListener { loc ->
                handleGpsLocation(loc, isCachedOnly = false)
            }
            locListener?.let { listener ->
                if (hasFine && lm.allProviders.contains(android.location.LocationManager.GPS_PROVIDER)) {
                    lm.requestLocationUpdates(android.location.LocationManager.GPS_PROVIDER, 400L, 0f, listener, Looper.getMainLooper())
                }
                if (lm.allProviders.contains(android.location.LocationManager.NETWORK_PROVIDER)) {
                    lm.requestLocationUpdates(android.location.LocationManager.NETWORK_PROVIDER, 1500L, 10f, listener, Looper.getMainLooper())
                }
            }
        } catch (_: Exception) {}
    }

    private fun stopGpsSpeedMonitor() {
        try {
            val lm = getSystemService(LOCATION_SERVICE) as? android.location.LocationManager ?: return
            locListener?.let { lm.removeUpdates(it) }
            locListener = null
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        super.onDestroy()
        blurExec.shutdownNow()
    }

    private fun updateClock() {
        val now = Date()
        clock.text = SimpleDateFormat("HH:mm", Locale.getDefault()).format(now)
        date.text = SimpleDateFormat("M月d日 EEEE", Locale.getDefault()).format(now)
    }

    // ---------------- 設定選單 ----------------

    private fun showSettings() {
        SettingsMenu.show(this, btnMore, listOf(
            SettingsMenu.Item(R.drawable.ic_m_image, "桌布與背景美化設定") { showWallpaperSettingsDialog() },
            SettingsMenu.Item(R.drawable.ic_m_clock, "調整時鐘位置與大小", divider = true) { clockPanel.setEditing(true) },
            SettingsMenu.Item(R.drawable.ic_m_nav, "3D 車輛與系統導覽設定") { showSystemSettingsDialog() }
        ))
    }

    private fun showWallpaperSettingsDialog() {
        val v = layoutInflater.inflate(R.layout.dialog_effects, null)
        val swBlur = v.findViewById<SwitchCompat>(R.id.swBlur)
        val sbBlur = v.findViewById<SeekBar>(R.id.sbBlur)
        val swDim = v.findViewById<SwitchCompat>(R.id.swDim)
        val sbDim = v.findViewById<SeekBar>(R.id.sbDim)
        val swRandom = v.findViewById<SwitchCompat>(R.id.swRandom)
        val btnPickWallpaper = v.findViewById<View>(R.id.btnPickWallpaper)
        val btnResetWallpaper = v.findViewById<View>(R.id.btnResetWallpaper)
        val note = v.findViewById<View>(R.id.note)

        swBlur.isChecked = Store.blurOn(this); sbBlur.progress = Store.blurStrength(this)
        sbBlur.isEnabled = swBlur.isChecked
        swDim.isChecked = Store.dimOn(this); sbDim.progress = Store.dimStrength(this)
        sbDim.isEnabled = swDim.isChecked
        swRandom.isChecked = Store.wallpaperRandomOn(this)
        note.visibility = if (Store.wallpaperIsVideo(this) && Build.VERSION.SDK_INT < 31) View.VISIBLE else View.GONE

        swBlur.setOnCheckedChangeListener { _, on ->
            Store.setBlurOn(this, on); sbBlur.isEnabled = on; applyWallpaper()
        }
        swDim.setOnCheckedChangeListener { _, on ->
            Store.setDimOn(this, on); sbDim.isEnabled = on; applyWallpaper()
        }
        swRandom.setOnCheckedChangeListener { _, on ->
            Store.setWallpaperRandomOn(this, on)
            Store.resetWallpaperPick(this)
            Toast.makeText(this, "隨機輪播已${if (on) "開啟" else "關閉"}", Toast.LENGTH_SHORT).show()
            applyWallpaper()
        }
        sbBlur.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(s: SeekBar?, p: Int, fromUser: Boolean) {
                if (fromUser) { Store.setBlurStrength(this@HomeActivity, p); applyWallpaper() }
            }
            override fun onStartTrackingTouch(s: SeekBar?) {}
            override fun onStopTrackingTouch(s: SeekBar?) {}
        })
        sbDim.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(s: SeekBar?, p: Int, fromUser: Boolean) {
                if (fromUser) { Store.setDimStrength(this@HomeActivity, p); applyWallpaper() }
            }
            override fun onStartTrackingTouch(s: SeekBar?) {}
            override fun onStopTrackingTouch(s: SeekBar?) {}
        })

        btnPickWallpaper.setOnClickListener {
            try {
                multiPicker.launch(arrayOf("image/*", "video/mp4"))
            } catch (e: Exception) {
                if (Wallpaper.importFolderFromAppFolder(this)) {
                    applyWallpaper()
                    Toast.makeText(this, "已從資料夾匯入全部桌布", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "無法開啟檔案選擇器，請將桌布放入 App 專屬資料夾", Toast.LENGTH_LONG).show()
                }
            }
        }
        btnResetWallpaper.setOnClickListener {
            Wallpaper.clear(this)
            applyWallpaper()
            Toast.makeText(this, "已還原預設桌布", Toast.LENGTH_SHORT).show()
        }

        val d = AlertDialog.Builder(this)
            .setTitle("桌布與背景美化設定")
            .setView(v)
            .setPositiveButton("完成", null)
            .create()
        d.window?.setGravity(Gravity.BOTTOM)
        d.show()
    }

    private fun showSystemSettingsDialog() {
        val v = layoutInflater.inflate(R.layout.dialog_system, null)
        val swCar3D = v.findViewById<SwitchCompat>(R.id.swCar3D)
        val swDemoDrive = v.findViewById<SwitchCompat>(R.id.swDemoDrive)
        val swRainbowRoad = v.findViewById<SwitchCompat>(R.id.swRainbowRoad)
        val rgThemeMode = v.findViewById<android.widget.RadioGroup>(R.id.rgThemeMode)
        val rgCameraMode = v.findViewById<android.widget.RadioGroup>(R.id.rgCameraMode)
        val swNavBar = v.findViewById<SwitchCompat>(R.id.swNavBar)
        val swAutoResumeSpotify = v.findViewById<SwitchCompat>(R.id.swAutoResumeSpotify)
        val btnSplitManager = v.findViewById<View>(R.id.btnSplitManager)

        swCar3D.isChecked = Store.car3DOn(this)
        swCar3D.setOnCheckedChangeListener { _, on ->
            Store.setCar3DOn(this, on)
            updateCar3DView()
            Toast.makeText(this, if (on) "已開啟 3D 車輛桌面展廳" else "已切換至預設 360 轉盤", Toast.LENGTH_SHORT).show()
        }

        swDemoDrive.isChecked = Store.demoDriveOn(this)
        swDemoDrive.setOnCheckedChangeListener { _, on ->
            Store.setDemoDriveOn(this, on)
            (findViewById<ViewGroup>(R.id.carContainer)?.getChildAt(0) as? GlbCarView)?.setDemoDrive(on)
            Toast.makeText(this, if (on) "已開啟模擬試駕預覽" else "已關閉模擬試駕預覽", Toast.LENGTH_SHORT).show()
        }

        swRainbowRoad.isChecked = Store.rainbowRoadOn(this)
        swRainbowRoad.setOnCheckedChangeListener { _, on ->
            Store.setRainbowRoadOn(this, on)
            (findViewById<ViewGroup>(R.id.carContainer)?.getChildAt(0) as? GlbCarView)?.setRainbowRoad(on)
            Toast.makeText(this, if (on) "已啟用彩虹大道模式" else "已關閉彩虹大道模式", Toast.LENGTH_SHORT).show()
        }

        when (Store.themeMode(this)) {
            1 -> rgThemeMode.check(R.id.rbThemeDay)
            2 -> rgThemeMode.check(R.id.rbThemeNight)
            else -> rgThemeMode.check(R.id.rbThemeAuto)
        }
        rgThemeMode.setOnCheckedChangeListener { _, checkedId ->
            val mode = when (checkedId) {
                R.id.rbThemeDay -> 1
                R.id.rbThemeNight -> 2
                else -> 0
            }
            Store.setThemeMode(this, mode)
            App.applyNightMode(this)
            (findViewById<ViewGroup>(R.id.carContainer)?.getChildAt(0) as? GlbCarView)?.setThemeMode(mode)
        }

        when (Store.fsdCameraMode(this)) {
            1 -> rgCameraMode.check(R.id.rbCamTop)
            2 -> rgCameraMode.check(R.id.rbCamShowroom)
            else -> rgCameraMode.check(R.id.rbCamFollow)
        }
        rgCameraMode.setOnCheckedChangeListener { _, checkedId ->
            val mode = when (checkedId) {
                R.id.rbCamTop -> 1
                R.id.rbCamShowroom -> 2
                else -> 0
            }
            Store.setFsdCameraMode(this, mode)
            (findViewById<ViewGroup>(R.id.carContainer)?.getChildAt(0) as? GlbCarView)?.setCameraMode(mode)
        }

        swNavBar.isChecked = Store.navBarOn(this)
        swNavBar.setOnCheckedChangeListener { _, on ->
            Store.setNavBarOn(this, on)
            val svc = NavService.inst
            svc?.nav?.refresh()
            applyScrollPadding()
            if (on && svc == null) {
                AlertDialog.Builder(this)
                    .setTitle("需要開啟無障礙服務")
                    .setMessage("虛擬導覽列需要您到系統「無障礙」設定中啟用「AIBOX 桌面」，啟用後就會立即出現在螢幕底部。")
                    .setPositiveButton("前往開啟") { _, _ ->
                        try {
                            startActivity(Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS))
                        } catch (_: Exception) {
                            Toast.makeText(this, "請手動前往系統設定開啟無障礙服務", Toast.LENGTH_LONG).show()
                        }
                    }
                    .setNegativeButton("稍後", null)
                    .show()
            } else {
                Toast.makeText(
                    this,
                    if (on) "固定虛擬導覽列已開啟 (全寬自適應)" else "虛擬導覽列已關閉",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }

        swAutoResumeSpotify?.isChecked = Store.autoResumeSpotifyOn(this)
        swAutoResumeSpotify?.setOnCheckedChangeListener { _, on ->
            Store.setAutoResumeSpotifyOn(this, on)
            Toast.makeText(this, if (on) "已開啟開機背景續播 Spotify／音樂" else "已關閉開機背景續播", Toast.LENGTH_SHORT).show()
        }

        btnSplitManager.setOnClickListener {
            startActivity(Intent(this, SplitManagerActivity::class.java))
        }

        val d = AlertDialog.Builder(this)
            .setTitle("3D 車輛與系統導覽設定")
            .setView(v)
            .setPositiveButton("完成", null)
            .create()
        d.window?.setGravity(Gravity.BOTTOM)
        d.show()
    }

    // ---------------- 導覽列出現時,下半部整個上移 ----------------

    private fun applyScrollPadding() {
        scrollView.setPadding(0, insTop, 0, insBottom + navExtra)
    }

    /**
     * 導覽列出現 → 桌面底部多預留一段高度,「組合方塊 + 全部 App」整個下半部一起平順上移;
     * 導覽列消失 → 一起移回最下方。(中間的彈性空白會自動被壓縮)
     */
    private fun animateReserve(navVisible: Boolean, animate: Boolean) {
        navAnim?.cancel()
        val contentPad = (scrollView as ViewGroup).getChildAt(0)?.paddingBottom ?: 0
        val target = if (navVisible) (NavOverlay.reservePx(this) - contentPad).coerceAtLeast(0) else 0
        if (!animate) { navExtra = target; applyScrollPadding(); return }
        navAnim = ValueAnimator.ofInt(navExtra, target).apply {
            duration = 180
            addUpdateListener { navExtra = it.animatedValue as Int; applyScrollPadding() }
            start()
        }
    }

    // ---------------- 桌布 ----------------

    private fun applyWallpaper() {
        val f = Wallpaper.file(this)
        val custom = f != null

        // 調暗(使用者可開關、可調強度,最高 85%)
        scrim.visibility = if (custom && Store.dimOn(this)) View.VISIBLE else View.GONE
        scrim.setBackgroundColor(Color.BLACK)
        scrim.alpha = Store.dimStrength(this) / 100f * 0.85f

        // 有自訂桌布時文字改白字加陰影,避免淺色桌布上看不清楚
        clock.setTextColor(if (custom) Color.WHITE else getColor(R.color.text))
        date.setTextColor(if (custom) 0xCCFFFFFF.toInt() else getColor(R.color.sub))
        val shadow = if (custom) 8f else 0f
        clock.setShadowLayer(shadow, 0f, 2f, 0x99000000.toInt())
        date.setShadowLayer(shadow, 0f, 2f, 0x99000000.toInt())
        btnMore.setColorFilter(if (custom) Color.WHITE else getColor(R.color.text))
        (btnMore.background as? GradientDrawable)?.setColor(if (custom) 0x40FFFFFF else getColor(R.color.chip))
        setLightBars(!custom && !isNight())

        if (f == null) {
            bgImage.setImageDrawable(null); bgVideo.visibility = View.GONE; loadedKey = null
            return
        }
        val isVideo = f.name.endsWith(".mp4", ignoreCase = true)
        if (isVideo) {
            bgImage.setImageDrawable(null); loadedKey = null
            bgVideo.visibility = View.VISIBLE
            applyVideoBlur()
            video.play(f.path)
        } else {
            bgVideo.visibility = View.GONE
            showImage(f.path)
        }
    }

    private fun showImage(path: String) {
        val blur = Store.blurOn(this)
        val strength = Store.blurStrength(this)
        val key = if (blur) "$path|b$strength" else "$path|raw"
        if (key == loadedKey) return
        loadedKey = key
        val ver = ++blurVersion
        if (!blur) {
            val dm = resources.displayMetrics
            bgImage.setImageBitmap(Wallpaper.decode(path, dm.widthPixels, dm.heightPixels))
            return
        }
        blurExec.execute {
            if (ver != blurVersion) return@execute            // 已有更新的請求,放棄舊的
            val src = if (smallKey == path) small else Blur.small(path).also { small = it; smallKey = path }
            val out = src?.let { Blur.apply(it, strength) }
            runOnUiThread { if (ver == blurVersion && out != null) bgImage.setImageBitmap(out) }
        }
    }

    /** 影片虛化只有 Android 12(API 31)以上的系統支援 */
    private fun applyVideoBlur() {
        if (Build.VERSION.SDK_INT < 31) return
        if (Store.blurOn(this)) {
            val r = 1f + Store.blurStrength(this) / 100f * 39f
            bgVideo.setRenderEffect(RenderEffect.createBlurEffect(r, r, Shader.TileMode.CLAMP))
        } else {
            bgVideo.setRenderEffect(null)
        }
    }

    private fun buildCombos() {
        Folders.fill(this, box, Store.combos(this), false, Wallpaper.file(this) != null) {}
    }
}
