package com.yougrow.screentime

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.lifecycle.lifecycleScope
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

class MainActivity : ComponentActivity() {

  private lateinit var projectIdInput: EditText
  private lateinit var apiKeyInput: EditText
  private lateinit var syncCodeInput: EditText
  private lateinit var statusText: TextView
  private lateinit var previewText: TextView

  private val prefs by lazy { getSharedPreferences("yougrow_screen_time_bridge", Context.MODE_PRIVATE) }

  private val addictivePackageHints = listOf(
    "com.instagram.android",
    "com.zhiliaoapp.musically",
    "com.google.android.youtube",
    "com.snapchat.android",
    "com.twitter.android",
    "com.facebook.katana",
    "com.reddit.frontpage",
    "com.discord",
    "com.netflix.mediaclient"
  )

  private val usefulPackageHints = listOf(
    "com.google.android.apps.docs",
    "com.notion.id",
    "com.openai.chatgpt",
    "com.microsoft.teams",
    "com.microsoft.office",
    "com.oracle",
    "com.google.android.calendar",
    "com.adobe.reader",
    "com.evernote"
  )

  private val usefulLabelHints = listOf(
    "chatgpt", "notion", "gmail", "calendar", "docs", "drive", "oracle", "study", "learning", "blinkist"
  )

  private val addictiveLabelHints = listOf(
    "instagram", "tiktok", "youtube", "snapchat", "x", "twitter", "facebook", "reddit", "netflix"
  )

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main)

    projectIdInput = findViewById(R.id.projectIdInput)
    apiKeyInput = findViewById(R.id.apiKeyInput)
    syncCodeInput = findViewById(R.id.syncCodeInput)
    statusText = findViewById(R.id.statusText)
    previewText = findViewById(R.id.previewText)

    findViewById<Button>(R.id.saveConfigBtn).setOnClickListener { saveConfig() }
    findViewById<Button>(R.id.openUsageAccessBtn).setOnClickListener { openUsageAccessSettings() }
    findViewById<Button>(R.id.captureUploadBtn).setOnClickListener {
      lifecycleScope.launchWhenStarted {
        captureAndUploadToday()
      }
    }

    loadConfig()
    renderStatus("Status: ready")
  }

  private fun loadConfig() {
    projectIdInput.setText(prefs.getString("projectId", "") ?: "")
    apiKeyInput.setText(prefs.getString("apiKey", "") ?: "")
    syncCodeInput.setText(prefs.getString("syncCode", "") ?: "")
  }

  private fun saveConfig() {
    val syncCode = normalizeSyncCode(syncCodeInput.text?.toString())
    prefs.edit()
      .putString("projectId", projectIdInput.text?.toString()?.trim() ?: "")
      .putString("apiKey", apiKeyInput.text?.toString()?.trim() ?: "")
      .putString("syncCode", syncCode)
      .apply()
    syncCodeInput.setText(syncCode)
    renderStatus("Status: config saved")
  }

  private suspend fun captureAndUploadToday() {
    saveConfig()

    val projectId = projectIdInput.text?.toString()?.trim().orEmpty()
    val apiKey = apiKeyInput.text?.toString()?.trim().orEmpty()
    val syncCode = normalizeSyncCode(syncCodeInput.text?.toString())

    if (projectId.isBlank() || apiKey.isBlank() || syncCode.isBlank()) {
      renderStatus("Status: fill projectId + apiKey + sync code")
      return
    }

    if (!hasUsagePermission()) {
      renderStatus("Status: Usage Access missing. Tap Open Usage Access Settings.")
      return
    }

    renderStatus("Status: collecting app usage...")
    val todayData = collectUsageForToday()

    if (todayData.totalScreenMinutes <= 0) {
      renderStatus("Status: no usage found today (or permission issue)")
      return
    }

    previewText.text = buildPreview(todayData)

    renderStatus("Status: uploading to Firestore...")
    val ok = uploadToFirestore(projectId, apiKey, syncCode, todayData)
    if (ok) {
      renderStatus("Status: upload done. Home page can now read cloud screen time.")
    } else {
      renderStatus("Status: upload failed (check Firestore rules/network/config)")
    }
  }

  private fun openUsageAccessSettings() {
    startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
  }

  private fun hasUsagePermission(): Boolean {
    val appOps = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), packageName)
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun collectUsageForToday(): DayUsage {
    val usageManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

    val zone = ZoneId.systemDefault()
    val now = System.currentTimeMillis()
    val startOfDay = LocalDate.now(zone).atStartOfDay(zone).toInstant().toEpochMilli()

    val stats = usageManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startOfDay, now).orEmpty()

    val packageMinutes = linkedMapOf<String, Int>()
    for (entry in stats) {
      val totalMs = entry.totalTimeInForeground
      if (totalMs <= 0L) continue
      val minutes = (totalMs / 60000.0).roundToInt()
      if (minutes <= 0) continue
      val pkg = entry.packageName ?: continue
      packageMinutes[pkg] = (packageMinutes[pkg] ?: 0) + minutes
    }

    val rows = packageMinutes.entries
      .map { (pkg, mins) ->
        val label = resolveLabel(pkg)
        val bucket = classifyApp(pkg, label)
        UsageRow(pkg, label, mins, bucket)
      }
      .sortedByDescending { it.minutes }

    val addictive = rows.filter { it.bucket == Bucket.ADDICTIVE }.take(10)
    val useful = rows.filter { it.bucket == Bucket.USEFUL }.take(10)

    return DayUsage(
      date = LocalDate.now(zone).format(DateTimeFormatter.ISO_DATE),
      updatedAt = java.time.Instant.now().toString(),
      addictiveApps = addictive,
      usefulApps = useful,
      topApps = rows.take(20),
      totalScreenMinutes = rows.sumOf { it.minutes }
    )
  }

  private fun resolveLabel(packageName: String): String {
    return try {
      val info: ApplicationInfo = packageManager.getApplicationInfo(packageName, 0)
      val label = packageManager.getApplicationLabel(info).toString().trim()
      if (label.isBlank()) packageName else label
    } catch (_: Exception) {
      packageName
    }
  }

  private fun classifyApp(packageName: String, appLabel: String): Bucket {
    val pkg = packageName.lowercase()
    val label = appLabel.lowercase()

    if (addictivePackageHints.any { pkg.contains(it.lowercase()) }) return Bucket.ADDICTIVE
    if (usefulPackageHints.any { pkg.contains(it.lowercase()) }) return Bucket.USEFUL

    if (addictiveLabelHints.any { label.contains(it) }) return Bucket.ADDICTIVE
    if (usefulLabelHints.any { label.contains(it) }) return Bucket.USEFUL

    return Bucket.OTHER
  }

  private fun buildPreview(day: DayUsage): String {
    val addictive = if (day.addictiveApps.isEmpty()) "none" else day.addictiveApps.joinToString { "${it.name} ${it.minutes}m" }
    val useful = if (day.usefulApps.isEmpty()) "none" else day.usefulApps.joinToString { "${it.name} ${it.minutes}m" }
    return "Date: ${day.date}\nTotal: ${day.totalScreenMinutes}m\nAddictive: $addictive\nUseful: $useful"
  }

  private fun normalizeSyncCode(value: String?): String {
    return (value ?: "")
      .trim()
      .lowercase()
      .replace(Regex("[^a-z0-9-_]"), "")
      .take(48)
  }

  private fun uploadToFirestore(projectId: String, apiKey: String, syncCode: String, day: DayUsage): Boolean {
    return try {
      val endpoint = "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents/syncSpaces/$syncCode/screenTime/${day.date}?key=$apiKey"
      val body = JSONObject().put("fields", buildFirestoreFields(day))

      val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
        requestMethod = "PATCH"
        connectTimeout = 15000
        readTimeout = 15000
        doOutput = true
        setRequestProperty("Content-Type", "application/json")
      }

      OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }

      val code = conn.responseCode
      if (code in 200..299) {
        true
      } else {
        val errorText = try {
          BufferedReader(InputStreamReader(conn.errorStream)).use { it.readText() }
        } catch (_: Exception) {
          ""
        }
        previewText.text = "Firestore error $code:\n$errorText"
        false
      }
    } catch (err: Exception) {
      previewText.text = "Upload exception: ${err.message}"
      false
    }
  }

  private fun buildFirestoreFields(day: DayUsage): JSONObject {
    val addictiveArray = JSONArray()
    for (app in day.addictiveApps) {
      addictiveArray.put(
        mapValue(
          mapOf(
            "name" to stringValue(app.name),
            "minutes" to integerValue(app.minutes),
            "packageName" to stringValue(app.packageName)
          )
        )
      )
    }

    val usefulArray = JSONArray()
    for (app in day.usefulApps) {
      usefulArray.put(
        mapValue(
          mapOf(
            "name" to stringValue(app.name),
            "minutes" to integerValue(app.minutes),
            "packageName" to stringValue(app.packageName)
          )
        )
      )
    }

    val topArray = JSONArray()
    for (app in day.topApps) {
      topArray.put(
        mapValue(
          mapOf(
            "name" to stringValue(app.name),
            "minutes" to integerValue(app.minutes),
            "packageName" to stringValue(app.packageName),
            "bucket" to stringValue(app.bucket.value)
          )
        )
      )
    }

    return JSONObject()
      .put("date", stringValue(day.date))
      .put("updatedAt", stringValue(day.updatedAt))
      .put("source", stringValue("android-usage-bridge"))
      .put("totalScreenMinutes", integerValue(day.totalScreenMinutes))
      .put("addictiveApps", arrayValue(addictiveArray))
      .put("usefulApps", arrayValue(usefulArray))
      .put("topApps", arrayValue(topArray))
  }

  private fun stringValue(value: String): JSONObject = JSONObject().put("stringValue", value)

  private fun integerValue(value: Int): JSONObject = JSONObject().put("integerValue", value)

  private fun arrayValue(values: JSONArray): JSONObject = JSONObject().put("arrayValue", JSONObject().put("values", values))

  private fun mapValue(fields: Map<String, JSONObject>): JSONObject {
    val fieldObj = JSONObject()
    for ((k, v) in fields) {
      fieldObj.put(k, v)
    }
    return JSONObject().put("mapValue", JSONObject().put("fields", fieldObj))
  }

  private fun renderStatus(text: String) {
    statusText.text = text
  }
}

private enum class Bucket(val value: String) {
  ADDICTIVE("addictive"),
  USEFUL("useful"),
  OTHER("other")
}

private data class UsageRow(
  val packageName: String,
  val name: String,
  val minutes: Int,
  val bucket: Bucket
)

private data class DayUsage(
  val date: String,
  val updatedAt: String,
  val addictiveApps: List<UsageRow>,
  val usefulApps: List<UsageRow>,
  val topApps: List<UsageRow>,
  val totalScreenMinutes: Int
)
