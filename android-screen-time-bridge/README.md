# Android Screen Time Bridge (Option A)

This native Android app reads phone screen-time usage (Usage Access), classifies apps into `addictive` and `useful`, then uploads daily data to Firestore under your existing YouGrow `Sync Code`.

## What this unlocks
- Real phone usage data (not mock values) for the Home dashboard.
- No Play Store required for your own use (debug install from Android Studio).
- Push notifications are optional and not required for this bridge.

## Data path
- Firestore document written by Android app:
  - `syncSpaces/{syncCode}/screenTime/{YYYY-MM-DD}`
- Web Home now reads from that path when Firebase config + Sync Code exist in Settings.

## Required once
1. Firebase project with Firestore enabled.
2. Firestore rules that allow your client write/read strategy.
3. In Android bridge app, enter:
   - `projectId`
   - Web `apiKey`
   - same `Sync Code` as your PWA
4. Grant **Usage Access** in Android settings.

## Run Android app (local)
1. Open folder `android-screen-time-bridge` in Android Studio.
2. Let Gradle sync.
3. Run app on your Android phone.
4. In app:
   - Save config
   - Open Usage Access Settings and enable access for this app
   - Tap `Capture + Upload Today`
5. Open YouGrow web app Home and refresh.

## Cost and barriers
- Google Play Store: **not required** (unless you want public distribution).
- Firebase: can start on **free Spark plan** for low personal usage.
- Paid costs only appear if your Firestore reads/writes grow significantly.

## Notes
- Classification is heuristic by package/app name and can be tuned in `MainActivity.kt`.
- iOS screen-time APIs are restricted; this bridge is Android-only.
