package com.aibox.launcher

import android.content.Context
import android.graphics.Color
import android.view.MotionEvent
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import java.io.File

/**
 * 載入 3D 車輛與動態物理畫面的互動檢視器 (WebView + Three.js / WebGL)
 */
class GlbCarView(context: Context) : FrameLayout(context) {
    val webView = WebView(context)
    private var isPageLoaded = false
    private var latestSpeedKmh = 0f
    private var latestBearingDeg = -1f
    private var latestDemoDrive = Store.demoDriveOn(context)
    private var latestRainbow = Store.rainbowRoadOn(context)
    private var latestThemeMode = Store.themeMode(context)
    private var latestCameraMode = Store.fsdCameraMode(context)

    inner class AndroidBridge {

        @JavascriptInterface
        fun setDemoDrive(enabled: Boolean) {
            latestDemoDrive = enabled
            Store.setDemoDriveOn(context, enabled)
        }

        @JavascriptInterface
        fun setRainbowRoad(enabled: Boolean) {
            latestRainbow = enabled
            Store.setRainbowRoadOn(context, enabled)
        }

        @JavascriptInterface
        fun setThemeMode(mode: Int) {
            val clamped = mode.coerceIn(0, 2)
            latestThemeMode = clamped
            Store.setThemeMode(context, clamped)
            (context as? HomeActivity)?.runOnUiThread {
                App.applyNightMode(context)
            }
        }

        @JavascriptInterface
        fun setCameraMode(mode: Int) {
            val clamped = mode.coerceIn(0, 2)
            latestCameraMode = clamped
            Store.setFsdCameraMode(context, clamped)
        }
    }

    init {
        setBackgroundColor(Color.TRANSPARENT)
        webView.setBackgroundColor(Color.TRANSPARENT)
        webView.setLayerType(LAYER_TYPE_HARDWARE, null)
        webView.webChromeClient = WebChromeClient()
        webView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val uri = request.url
                if (uri.host == "appassets.androidplatform.net") {
                    val path = uri.path ?: return null
                    if (path.startsWith("/assets/")) {
                        val assetName = path.removePrefix("/assets/")
                        val corsHeaders = mapOf(
                            "Access-Control-Allow-Origin" to "*",
                            "Cache-Control" to "no-cache"
                        )
                        if (assetName == "custom_car.glb") {
                            val customFile = File(context.filesDir, "custom_car.glb")
                            if (customFile.exists()) {
                                return WebResourceResponse("model/gltf-binary", null, 200, "OK", corsHeaders, customFile.inputStream())
                            }
                        }
                        val mime = when {
                            assetName.endsWith(".html", true) -> "text/html"
                            assetName.endsWith(".js", true) -> "application/javascript"
                            assetName.endsWith(".glb", true) -> "model/gltf-binary"
                            assetName.endsWith(".png", true) -> "image/png"
                            assetName.endsWith(".jpg", true) || assetName.endsWith(".jpeg", true) -> "image/jpeg"
                            else -> "application/octet-stream"
                        }
                        val encoding = if (mime.startsWith("text/") || mime == "application/javascript") "UTF-8" else null
                        return try {
                            WebResourceResponse(mime, encoding, 200, "OK", corsHeaders, context.assets.open(assetName))
                        } catch (_: Exception) {
                            null
                        }
                    }
                }
                return super.shouldInterceptRequest(view, request)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                isPageLoaded = true
                setDemoDrive(latestDemoDrive)
                setRainbowRoad(latestRainbow)
                setThemeMode(latestThemeMode)
                setCameraMode(latestCameraMode)
                setGpsData(latestSpeedKmh, latestBearingDeg)
            }
        }

        @Suppress("DEPRECATION")
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            useWideViewPort = false
            loadWithOverviewMode = false
            mediaPlaybackRequiresUserGesture = true
            cacheMode = WebSettings.LOAD_NO_CACHE
        }

        addView(webView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

        val customGlb = File(context.filesDir, "custom_car.glb")
        val modelParam = if (customGlb.exists()) "custom_car.glb" else "carnew.glb"
        webView.loadUrl(
            "https://appassets.androidplatform.net/assets/car_viewer.html" +
                "?model=$modelParam&rainbow=$latestRainbow&theme=$latestThemeMode&cam=$latestCameraMode&demo=$latestDemoDrive"
        )
    }

    fun setDemoDrive(enabled: Boolean) {
        latestDemoDrive = enabled
        if (!isPageLoaded) return
        webView.post {
            webView.evaluateJavascript("if(window.setDemoDrive)setDemoDrive($enabled)", null)
        }
    }

    fun setGpsData(speedKmh: Float, bearingDeg: Float) {
        latestSpeedKmh = speedKmh
        latestBearingDeg = bearingDeg
        if (!isPageLoaded) return
        webView.post {
            webView.evaluateJavascript("if(window.setGpsData)setGpsData($speedKmh, $bearingDeg)", null)
        }
    }

    fun setThemeMode(mode: Int) {
        latestThemeMode = mode.coerceIn(0, 2)
        if (!isPageLoaded) return
        webView.post {
            webView.evaluateJavascript("if(window.setThemeMode)setThemeMode($latestThemeMode)", null)
        }
    }

    fun setCameraMode(mode: Int) {
        latestCameraMode = mode.coerceIn(0, 2)
        if (!isPageLoaded) return
        webView.post {
            webView.evaluateJavascript("if(window.setCameraMode)setCameraMode($latestCameraMode)", null)
        }
    }

    fun setRainbowRoad(enabled: Boolean) {
        latestRainbow = enabled
        if (!isPageLoaded) return
        webView.post {
            webView.evaluateJavascript("if(window.setRainbowRoad)setRainbowRoad($enabled)", null)
        }
    }

    override fun onInterceptTouchEvent(ev: MotionEvent?): Boolean {
        parent?.requestDisallowInterceptTouchEvent(true)
        return super.onInterceptTouchEvent(ev)
    }
}
