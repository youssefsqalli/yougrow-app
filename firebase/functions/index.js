const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const OpenAI = require("openai");

admin.initializeApp();
const db = admin.firestore();

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

exports.sendMissingListReminders = onSchedule(
  {
    schedule: "every 30 minutes",
    timeZone: "Africa/Casablanca"
  },
  async () => {
    const key = todayKey();
    const devicesSnap = await db.collection("devices").get();

    const messages = [];
    for (const deviceDoc of devicesSnap.docs) {
      const device = deviceDoc.data();
      if (!device.fcmToken) continue;

      const dayDoc = await deviceDoc.ref.collection("days").doc(key).get();
      const day = dayDoc.exists ? dayDoc.data() : null;

      if (day && day.hasAnyTask) {
        continue;
      }

      messages.push({
        token: device.fcmToken,
        notification: {
          title: "YouGrow",
          body: "Create your top priorities for today.",
        },
        data: {
          type: "vat_reminder",
          date: key,
        },
        android: {
          priority: "high",
          notification: { channelId: "vat-reminders" }
        },
        webpush: {
          headers: { Urgency: "high" },
        },
      });
    }

    if (messages.length === 0) {
      logger.info("No reminder messages to send");
      return;
    }

    const response = await admin.messaging().sendEach(messages);
    logger.info("Reminder push sent", { success: response.successCount, failure: response.failureCount });
  }
);

function normalizeFactKey(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function safeJsonParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch (_) {
      return null;
    }
  }
}

function normalizeItem(item) {
  const format = String(item?.format || "mcq").toLowerCase();
  if (!["mcq", "true_false", "fill_blank", "short_answer"].includes(format)) return null;
  const normalized = {
    associatedTopic: String(item?.associatedTopic || item?.topic || "").trim(),
    format,
    type: String(item?.type || "Question").trim(),
    title: String(item?.title || "").trim(),
    body: String(item?.body || "").trim(),
    explanation: String(item?.explanation || "").trim(),
    wrongExplanation: String(item?.wrongExplanation || "").trim(),
    visualBullets: Array.isArray(item?.visualBullets)
      ? item.visualBullets.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 4)
      : [],
    sources: Array.isArray(item?.sources)
      ? item.sources.map((s) => ({
          title: String(s?.title || "").trim(),
          url: String(s?.url || "").trim(),
          host: String(s?.host || "").trim(),
          publishedAt: String(s?.publishedAt || "").trim(),
        })).filter((s) => s.url.startsWith("http")).slice(0, 3)
      : [],
    factKey: normalizeFactKey(item?.factKey || `${item?.title || ""} ${item?.body || ""} ${item?.explanation || ""}`),
  };

  if (format === "true_false") {
    normalized.correctValue = Boolean(item?.correctValue);
  } else if (format === "mcq") {
    normalized.options = Array.isArray(item?.options)
      ? item.options.map((o) => ({
          text: String(o?.text || "").trim(),
          correct: Boolean(o?.correct),
          explanation: String(o?.explanation || "").trim(),
        })).filter((o) => o.text).slice(0, 6)
      : [];
  } else if (format === "fill_blank" || format === "short_answer") {
    normalized.correctAnswer = String(item?.correctAnswer || "").trim();
    normalized.acceptedAnswers = Array.isArray(item?.acceptedAnswers)
      ? item.acceptedAnswers.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 8)
      : [];
  }

  if (!normalized.associatedTopic || !normalized.title || !normalized.body || !normalized.explanation) return null;
  if (!normalized.sources.length) return null;
  if (format === "mcq") {
    if (!normalized.options || normalized.options.length < 2 || !normalized.options.some((o) => o.correct)) return null;
  } else if (format === "fill_blank" || format === "short_answer") {
    if (!normalized.correctAnswer || !normalized.acceptedAnswers || normalized.acceptedAnswers.length < 1) return null;
  }
  return normalized;
}

function hasRequiredFormatMix(items) {
  const required = new Set(["mcq", "true_false", "fill_blank", "short_answer"]);
  const seen = new Set((items || []).map((item) => String(item?.format || "mcq").toLowerCase()));
  return [...required].every((f) => seen.has(f));
}

exports.daily5 = onRequest(
  { cors: true, timeoutSeconds: 60, memory: "512MiB" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "OPENAI_API_KEY is missing on the server." });
      return;
    }

    const topics = Array.isArray(req.body?.topics)
      ? req.body.topics.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 10)
      : [];
    if (!topics.length) {
      res.status(400).json({ error: "At least one topic is required." });
      return;
    }

    const prompt = String(req.body?.prompt || "").trim();
    const avoidFacts = Array.isArray(req.body?.avoidFacts)
      ? req.body.avoidFacts.map((x) => normalizeFactKey(x)).filter(Boolean).slice(0, 600)
      : [];
    const language = String(req.body?.language || "en").trim();
    const count = Math.min(5, Math.max(5, Number(req.body?.count) || 5));

    const client = new OpenAI({ apiKey });
    const model = process.env.DAILY5_MODEL || "gpt-5.1";
    const todayIso = new Date().toISOString().slice(0, 10);
    const topicText = topics.join(", ");
    const avoidText = avoidFacts.length
      ? avoidFacts.map((x, i) => `${i + 1}. ${x}`).join("\n")
      : "None";

    const systemPrompt = [
      "You generate Daily Five learning questions from latest web updates using retrieval.",
      "Hard rules:",
      "- Return ONLY JSON object with key: items (array of exactly 5 items).",
      "- Allowed format values only: mcq, true_false, fill_blank, short_answer.",
      "- Include format diversity with at least one mcq, one true_false, one fill_blank, and one short_answer.",
      "- Every item must be tied to selected topics and to a recent factual update.",
      "- Every item must include sources with real URL(s).",
      "- No generic educational theory.",
      "- No duplicate facts in same set.",
      "- Avoid all prior facts listed by user.",
      "- Keep answers factual and concise.",
    ].join("\n");

    const userPrompt = [
      `Date: ${todayIso}`,
      `Topics: ${topicText}`,
      `Language: ${language}`,
      prompt ? `User learning intent: ${prompt}` : "",
      `Facts that must NOT be repeated:\n${avoidText}`,
      `Create exactly ${count} items.`,
      "Required item fields: associatedTopic, format, type, title, body, explanation, wrongExplanation, visualBullets, sources, factKey.",
      "For mcq include options with one correct option.",
      "For true_false include correctValue boolean.",
      "For fill_blank and short_answer include acceptedAnswers (array) and correctAnswer (string).",
      "Use sources from the latest relevant updates (prefer last 30 days).",
    ].filter(Boolean).join("\n\n");

    try {
      const response = await client.responses.create({
        model,
        tools: [{ type: "web_search_preview" }],
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_output_tokens: 5000,
      });

      const outputText = String(response.output_text || "").trim();
      const parsed = safeJsonParse(outputText);
      if (!parsed || !Array.isArray(parsed.items)) {
        res.status(502).json({ error: "Model output could not be parsed as Daily5 JSON." });
        return;
      }

      const normalized = parsed.items.map(normalizeItem).filter(Boolean).slice(0, 5);
      const seen = new Set();
      const deduped = [];
      for (const item of normalized) {
        const key = item.factKey;
        if (!key || seen.has(key) || avoidFacts.includes(key)) continue;
        seen.add(key);
        deduped.push(item);
      }

      if (deduped.length < 5) {
        res.status(502).json({ error: "Insufficient unique latest-update items generated." });
        return;
      }
      if (!hasRequiredFormatMix(deduped)) {
        res.status(502).json({ error: "Insufficient Daily5 format diversity." });
        return;
      }

      res.status(200).json({ items: deduped.slice(0, 5) });
    } catch (error) {
      logger.error("daily5 generation error", { message: error?.message || String(error) });
      res.status(500).json({ error: "Daily5 generation failed." });
    }
  }
);
