function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
    },
  });
}

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
      ? item.sources
          .map((s) => ({
            title: String(s?.title || "").trim(),
            url: String(s?.url || "").trim(),
            host: String(s?.host || "").trim(),
            publishedAt: String(s?.publishedAt || "").trim(),
          }))
          .filter((s) => s.url.startsWith("http"))
          .slice(0, 3)
      : [],
    factKey: normalizeFactKey(item?.factKey || `${item?.title || ""} ${item?.body || ""} ${item?.explanation || ""}`),
  };

  if (format === "true_false") {
    normalized.correctValue = Boolean(item?.correctValue);
  } else if (format === "mcq") {
    normalized.options = Array.isArray(item?.options)
      ? item.options
          .map((o) => ({
            text: String(o?.text || "").trim(),
            correct: Boolean(o?.correct),
            explanation: String(o?.explanation || "").trim(),
          }))
          .filter((o) => o.text)
          .slice(0, 6)
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

function extractOutputText(payload) {
  const direct = String(payload?.output_text || "").trim();
  if (direct) return direct;
  const output = Array.isArray(payload?.output) ? payload.output : [];
  const chunks = [];
  output.forEach((entry) => {
    const content = Array.isArray(entry?.content) ? entry.content : [];
    content.forEach((part) => {
      const text = String(part?.text || "").trim();
      if (text) chunks.push(text);
    });
  });
  return chunks.join("\n").trim();
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (!env.OPENAI_API_KEY) {
      return jsonResponse({ error: "OPENAI_API_KEY is missing in Worker secrets." }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const topics = Array.isArray(body?.topics)
      ? body.topics.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 10)
      : [];
    if (!topics.length) {
      return jsonResponse({ error: "At least one topic is required." }, 400);
    }

    const prompt = String(body?.prompt || "").trim();
    const avoidFacts = Array.isArray(body?.avoidFacts)
      ? body.avoidFacts.map((x) => normalizeFactKey(x)).filter(Boolean).slice(0, 600)
      : [];
    const language = String(body?.language || "en").trim();
    const todayIso = new Date().toISOString().slice(0, 10);
    const configuredModel = String(env.DAILY5_MODEL || "").trim();
    const modelCandidates = [...new Set([configuredModel, "gpt-5", "gpt-4.1", "gpt-4.1-mini"].filter(Boolean))];

    const systemPrompt = [
      "You generate Daily Five learning questions from latest web updates using retrieval.",
      "Return only JSON with key items (exactly 5 items).",
      "Allowed formats only: mcq, true_false, fill_blank, short_answer.",
      "Include format diversity with at least one mcq, one true_false, one fill_blank, and one short_answer.",
      "Each item must be topic-constrained and based on recent factual updates.",
      "Each item must include sources with real URLs.",
      "No generic theory. No duplicates. Avoid all prior facts.",
    ].join("\n");

    const userPrompt = [
      `Date: ${todayIso}`,
      `Topics: ${topics.join(", ")}`,
      `Language: ${language}`,
      prompt ? `User learning intent: ${prompt}` : "",
      `Facts that must NOT be repeated:\n${avoidFacts.join("\n") || "None"}`,
      "Required fields: associatedTopic, format, type, title, body, explanation, wrongExplanation, visualBullets, sources, factKey.",
      "For mcq include options with one correct option.",
      "For true_false include correctValue boolean.",
      "For fill_blank and short_answer include acceptedAnswers (array) and correctAnswer (string).",
      "Use sources from latest relevant updates (prefer last 30 days).",
    ]
      .filter(Boolean)
      .join("\n\n");

    let parsed = null;
    let openaiFailure = "";
    let usedModel = "";

    for (const model of modelCandidates) {
      const openaiRes = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          tools: [{ type: "web_search_preview" }],
          input: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_output_tokens: 5000,
        }),
      });

      if (!openaiRes.ok) {
        const err = await openaiRes.text();
        openaiFailure = `model=${model} status=${openaiRes.status} ${String(err || "").slice(0, 400)}`;
        continue;
      }

      const payload = await openaiRes.json();
      const parsedCandidate = safeJsonParse(extractOutputText(payload));
      if (!parsedCandidate || !Array.isArray(parsedCandidate.items)) {
        openaiFailure = `model=${model} returned unparsable output`;
        continue;
      }

      parsed = parsedCandidate;
      usedModel = model;
      break;
    }

    if (!parsed) {
      return jsonResponse(
        {
          error: "OpenAI call failed",
          detail: openaiFailure || "No model candidate returned valid output.",
          modelsTried: modelCandidates,
        },
        502
      );
    }

    if (!parsed || !Array.isArray(parsed.items)) {
      return jsonResponse({ error: "Model output could not be parsed as Daily5 JSON." }, 502);
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
      return jsonResponse({ error: "Insufficient unique latest-update items generated." }, 502);
    }
    if (!hasRequiredFormatMix(deduped)) {
      return jsonResponse({ error: "Insufficient Daily5 format diversity." }, 502);
    }

    return jsonResponse({ items: deduped.slice(0, 5), model: usedModel }, 200);
  },
};
