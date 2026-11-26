plugins {
  alias(libs.plugins.android.application)
}

android {
  namespace = "com.aibox.launcher"
  compileSdk { version = release(36) { minorApiLevel = 1 } }

  defaultConfig {
    applicationId = "com.aibox.launcher"
    minSdk = 24
    targetSdk = 36
    versionCode = 1
    versionName = "1.0"

  }

  // Do not remove or modify these signingConfigs. They are necessary for building, installing,
  // and updating Android apps in AI Studio.
  signingConfigs {
    create("release") {
      val keystorePath = System.getenv("KEYSTORE_PATH") ?: "${rootDir}/my-upload-key.jks"
      storeFile = file(keystorePath)
      storePassword = System.getenv("STORE_PASSWORD")
      keyAlias = "upload"
      keyPassword = System.getenv("KEY_PASSWORD")
    }
    create("debugConfig") {
      storeFile = file("${rootDir}/debug.keystore")
      storePassword = "android"
      keyAlias = "androiddebugkey"
      keyPassword = "android"
    }
  }

  buildTypes {
    release {
      isCrunchPngs = false
      isMinifyEnabled = false
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
      // Do not remove or modify this signingConfig assignment. It is necessary for Android apps in
      // AI Studio.
      // 只有金鑰檔存在時才套用；其他人 clone 後沒有金鑰檔，release 會輸出未簽章 APK 而不是建置失敗。
      val releaseCfg = signingConfigs.getByName("release")
      if (releaseCfg.storeFile?.exists() == true) signingConfig = releaseCfg
    }
    debug {
      // Do not remove or modify this signingConfig assignment. It is necessary for Android apps in
      // AI Studio.
      // debug.keystore 被 .gitignore 排除，其他人 clone 後不存在；
      // 此時不指定 signingConfig，AGP 會自動使用 Android 預設的 debug 金鑰，不用再手動改檔。
      val debugCfg = signingConfigs.getByName("debugConfig")
      if (debugCfg.storeFile?.exists() == true) signingConfig = debugCfg
    }
  }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
  }
  buildFeatures {
    buildConfig = true
  }
  dependenciesInfo {
    includeInApk = false
    includeInBundle = true
  }
}

dependencies {
  implementation("androidx.appcompat:appcompat:1.6.1")
  implementation("org.lsposed.hiddenapibypass:hiddenapibypass:4.3")
  implementation(libs.androidx.core.ktx)
}
