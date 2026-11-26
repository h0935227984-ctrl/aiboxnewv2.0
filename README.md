<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1cfabf0b-11f6-4ad3-8d53-351083344fea

## Run Locally

**Prerequisites:**  [Android Studio](https://developer.android.com/studio)


1. Open Android Studio
2. Select **Open** and choose the directory containing this project
3. Allow Android Studio to fix any incompatibilities as it imports the project.
4. Open `local.properties` in the project root (created automatically by Android Studio) and add `MAPS_API_KEY=your_google_maps_api_key_here`, then place your 3D car model at `app/src/main/assets/carnew.glb`
5. Sync Gradle and run the app on an emulator or physical device (if `debug.keystore` is missing, the default Android debug key is used automatically)
6. If you have already published your app in AI Studio, please [request upload key reset](https://support.google.com/googleplay/android-developer/answer/9842756#zippy=%2Crequest-an-upload-key-reset) in Google Play Console.
