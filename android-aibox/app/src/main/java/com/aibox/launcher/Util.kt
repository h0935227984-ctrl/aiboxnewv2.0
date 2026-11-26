package com.aibox.launcher

import android.app.ActivityOptions
import android.content.Context
import android.content.Intent
import android.graphics.Rect
import android.graphics.drawable.Drawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.DisplayMetrics
import android.view.WindowManager
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import org.lsposed.hiddenapibypass.HiddenApiBypass

data class Combo(val top: String, val bottom: String)
class AppItem(val label: String, val pkg: String, val icon: Drawable)

/** 自適應單位:1u = 螢幕短邊的 1%。所有新介面都以 u 為單位,換任何尺寸/解析度的螢幕都會等比例縮放 */
object Ui {
    fun unit(c: Context): Float {
        val dm = c.resources.displayMetrics
        return minOf(dm.widthPixels, dm.heightPixels) / 100f
    }
}

object Store {
    private fun sp(c: Context) = c.getSharedPreferences("launcher", Context.MODE_PRIVATE)

    fun combos(c: Context): MutableList<Combo> {
        val a = JSONArray(sp(c).getString("combos", "[]"))
        return MutableList(a.length()) { i -> a.getJSONObject(i).let { Combo(it.getString("t"), it.getString("b")) } }
    }

    fun saveCombos(c: Context, list: List<Combo>) {
        val a = JSONArray()
        list.forEach { a.put(JSONObject().put("t", it.top).put("b", it.bottom)) }
        sp(c).edit().putString("combos", a.toString()).apply()
    }

    fun blurOn(c: Context) = sp(c).getBoolean("blurOn", false)
    fun setBlurOn(c: Context, v: Boolean) = sp(c).edit().putBoolean("blurOn", v).apply()
    fun blurStrength(c: Context) = sp(c).getInt("blurS", 50)
    fun setBlurStrength(c: Context, v: Int) = sp(c).edit().putInt("blurS", v).apply()
    fun dimOn(c: Context) = sp(c).getBoolean("dimOn", true)
    fun setDimOn(c: Context, v: Boolean) = sp(c).edit().putBoolean("dimOn", v).apply()
    fun dimStrength(c: Context) = sp(c).getInt("dimS", 40)
    fun setDimStrength(c: Context, v: Int) = sp(c).edit().putInt("dimS", v).apply()

    fun navBarOn(c: Context) = sp(c).getBoolean("navBar", true)
    fun setNavBarOn(c: Context, v: Boolean) = sp(c).edit().putBoolean("navBar", v).apply()

    fun car3DOn(c: Context) = sp(c).getBoolean("car3DOn", true)
    fun setCar3DOn(c: Context, v: Boolean) = sp(c).edit().putBoolean("car3DOn", v).apply()

    /** 3D 車輛模型顯示位置: "top"=上方, "bottom"=下方 */
    fun car3DPosition(c: Context): String = sp(c).getString("car3d_pos", "top") ?: "top"
    fun setCar3DPosition(c: Context, pos: String) = sp(c).edit().putString("car3d_pos", if (pos == "bottom") "bottom" else "top").apply()

    fun demoDriveOn(c: Context) = sp(c).getBoolean("demoDriveOn", false)
    fun setDemoDriveOn(c: Context, v: Boolean) = sp(c).edit().putBoolean("demoDriveOn", v).apply()

    fun rainbowRoadOn(c: Context) = sp(c).getBoolean("rainbowOn", true)
    fun setRainbowRoadOn(c: Context, v: Boolean) = sp(c).edit().putBoolean("rainbowOn", v).apply()

    /** 主題光影模式: 0=自動, 1=日間, 2=夜間 */
    fun themeMode(c: Context) = sp(c).getInt("themeMode", 0)
    fun setThemeMode(c: Context, mode: Int) = sp(c).edit().putInt("themeMode", mode.coerceIn(0, 2)).apply()

    /** 3D 攝影機視角: 0=跟隨, 1=俯視, 2=展廳 */
    fun fsdCameraMode(c: Context) = sp(c).getInt("fsdCam", 0)
    fun setFsdCameraMode(c: Context, mode: Int) = sp(c).edit().putInt("fsdCam", mode.coerceIn(0, 2)).apply()

    /** 開機自動背景續播 Spotify / 音樂 */
    fun autoResumeSpotifyOn(c: Context) = sp(c).getBoolean("autoResumeSpotify", true)
    fun setAutoResumeSpotifyOn(c: Context, v: Boolean) = sp(c).edit().putBoolean("autoResumeSpotify", v).apply()
    fun lastResumedBootCount(c: Context) = sp(c).getInt("lastBootCount", -1)
    fun setLastResumedBootCount(c: Context, v: Int) = sp(c).edit().putInt("lastBootCount", v).apply()

    fun wallpaperPaths(c: Context): MutableList<String> {
        val a = JSONArray(sp(c).getString("wp_paths", "[]"))
        return MutableList(a.length()) { i -> a.getString(i) }
    }
    fun setWallpaperPaths(c: Context, list: List<String>) {
        val a = JSONArray()
        list.forEach { a.put(it) }
        sp(c).edit().putString("wp_paths", a.toString()).apply()
    }
    fun wallpaperRandomOn(c: Context) = sp(c).getBoolean("wp_random", false)
    fun setWallpaperRandomOn(c: Context, v: Boolean) = sp(c).edit().putBoolean("wp_random", v).apply()

    /** 輪播目前選中的桌布索引、選中時間、選中時的開機次數(-1 = 尚未選過) */
    fun wallpaperPickIndex(c: Context) = sp(c).getInt("wp_pick_idx", -1)
    fun wallpaperPickTime(c: Context) = sp(c).getLong("wp_pick_time", 0L)
    fun wallpaperPickBoot(c: Context) = sp(c).getInt("wp_pick_boot", -1)
    fun saveWallpaperPick(c: Context, idx: Int, timeMs: Long, boot: Int) =
        sp(c).edit().putInt("wp_pick_idx", idx).putLong("wp_pick_time", timeMs).putInt("wp_pick_boot", boot).apply()
    fun resetWallpaperPick(c: Context) =
        sp(c).edit().remove("wp_pick_idx").remove("wp_pick_time").remove("wp_pick_boot").apply()

    /** 時鐘位置(螢幕比例)與縮放倍率 */
    fun clockX(c: Context) = sp(c).getFloat("clkX", 0.05f)
    fun clockY(c: Context) = sp(c).getFloat("clkY", 0.04f)
    fun clockScale(c: Context) = sp(c).getFloat("clkS", 1f)
    fun saveClock(c: Context, x: Float, y: Float, s: Float) =
        sp(c).edit().putFloat("clkX", x).putFloat("clkY", y).putFloat("clkS", s).apply()
    fun resetClock(c: Context) = sp(c).edit().remove("clkX").remove("clkY").remove("clkS").apply()

    fun wallpaper(c: Context): String? = sp(c).getString("wp", null)
    fun wallpaperIsVideo(c: Context) = sp(c).getBoolean("wpv", false)
    fun setWallpaper(c: Context, path: String?, video: Boolean) =
        sp(c).edit().putString("wp", path).putBoolean("wpv", video).apply()
}

object Apps {
    const val CAR_3D_PKG = "__aibox_car_3d__"
    const val CAR_3D_LABEL = "3D 電動車模型"

    fun list(c: Context): List<AppItem> {
        val pm = c.packageManager
        val i = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        return pm.queryIntentActivities(i, 0)
            .filter { it.activityInfo.packageName != c.packageName }
            .map { AppItem(it.loadLabel(pm).toString(), it.activityInfo.packageName, it.loadIcon(pm)) }
            .distinctBy { it.pkg }
            .sortedBy { it.label.lowercase() }
    }

    /** 回傳含「3D 電動車模型」與所有已安裝 App 的清單（供分割組合上下選單使用） */
    fun listWithCar3D(c: Context): List<AppItem> {
        val carDrawable = icon(c, CAR_3D_PKG) ?: androidx.core.content.ContextCompat.getDrawable(c, R.drawable.ic_launcher)!!
        val carItem = AppItem(CAR_3D_LABEL, CAR_3D_PKG, carDrawable)
        return listOf(carItem) + list(c)
    }

    fun label(c: Context, pkg: String): String {
        if (pkg == CAR_3D_PKG) return CAR_3D_LABEL
        return try {
            c.packageManager.getApplicationLabel(c.packageManager.getApplicationInfo(pkg, 0)).toString()
        } catch (_: Exception) { pkg }
    }

    fun icon(c: Context, pkg: String): Drawable? {
        if (pkg == CAR_3D_PKG) {
            return androidx.core.content.ContextCompat.getDrawable(c, R.drawable.ic_car_3d)
        }
        return try {
            c.packageManager.getApplicationIcon(pkg)
        } catch (_: Exception) { null }
    }

    private fun launchIntentFor(c: Context, pkg: String): Intent? {
        return if (pkg == CAR_3D_PKG) {
            Intent(c, CarSplitActivity::class.java)
        } else {
            c.packageManager.getLaunchIntentForPackage(pkg)
        }
    }

    fun open(c: Context, pkg: String) {
        val i = launchIntentFor(c, pkg) ?: return
        c.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /**
     * 以指定範圍開啟(自由視窗)。只給範圍不夠:系統會當成全螢幕、直接忽略範圍,
     * 必須同時明確要求「自由視窗模式」(WINDOWING_MODE_FREEFORM = 5)。
     * 這個方法被系統隱藏,需要反射呼叫,必要時用 HiddenApiBypass 解除限制。
     */
    fun openBounds(c: Context, pkg: String, r: Rect) {
        val i = launchIntentFor(c, pkg) ?: return
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val o = ActivityOptions.makeBasic().setLaunchBounds(r)
        requestFreeform(o)
        c.startActivity(i, o.toBundle())
    }

    private fun requestFreeform(o: ActivityOptions) {
        fun call() {
            ActivityOptions::class.java
                .getMethod("setLaunchWindowingMode", Int::class.javaPrimitiveType)
                .invoke(o, 5)
        }
        try { call() } catch (_: Throwable) {
            try {
                if (Build.VERSION.SDK_INT >= 28) HiddenApiBypass.addHiddenApiExemptions("Landroid/app/ActivityOptions;")
                call()
            } catch (_: Throwable) { /* 系統不允許:只能退回全螢幕開啟 */ }
        }
    }
}

object Split {
    private fun freeformAvailable(c: Context) =
        c.packageManager.hasSystemFeature("android.software.freeform_window_management") ||
            try { Settings.Global.getString(c.contentResolver, "enable_freeform_support") == "1" } catch (_: Exception) { false }

    /** 兩個 App（或 3D 電動車模型 + App）各佔一半:直式螢幕 = 上下,橫式螢幕 = 左右 */
    fun launch(ctx: Context, combo: Combo) {
        val c = ctx.applicationContext
        if (combo.top == Apps.CAR_3D_PKG) {
            Store.setCar3DPosition(c, "top")
        } else if (combo.bottom == Apps.CAR_3D_PKG) {
            Store.setCar3DPosition(c, "bottom")
        }
        if (!freeformAvailable(c)) {
            Toast.makeText(c, "此系統尚未啟用自由視窗(開發人員選項),畫面可能不會分割", Toast.LENGTH_LONG).show()
        }
        val d = DisplayMetrics()
        @Suppress("DEPRECATION")
        (c.getSystemService(Context.WINDOW_SERVICE) as WindowManager).defaultDisplay.getRealMetrics(d)
        val w = d.widthPixels
        val h = d.heightPixels
        val first: Rect
        val second: Rect
        if (h >= w) { first = Rect(0, 0, w, h / 2); second = Rect(0, h / 2, w, h) }
        else { first = Rect(0, 0, w / 2, h); second = Rect(w / 2, 0, w, h) }
        Apps.openBounds(c, combo.top, first)
        Handler(Looper.getMainLooper()).postDelayed({ Apps.openBounds(c, combo.bottom, second) }, 800)
    }
}
