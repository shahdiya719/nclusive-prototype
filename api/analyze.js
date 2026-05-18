const https = require("https");

const PROMPT = `You are a medical coding assistant. Extract all diagnoses and medical conditions from this document. Return ONLY valid JSON with no markdown, no code blocks, no extra text:
{
  "patientName": "patient name or empty string if not found",
  "conditions": [
    {
      "name": "plain language name a patient would understand",
      "icdCode": "ICD-10 code e.g. E11.9",
      "technicalName": "exact medical term from document",
      "summary": "2-3 sentence plain language explanation of what this condition is and why it matters to the patient",
      "keyPoints": ["one thing about daily life impact", "one symptom to watch for", "one reason to call your doctor"]
    }
  ]
}`;

function callAnthropic(apiKey, messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Failed to parse Anthropic response")); }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function callMedlinePlus(icdCode, name) {
  return new Promise((resolve) => {
    const params = new URLSearchParams({
      "mainSearchCriteria.v.cs": "2.16.840.1.113883.6.90",
      "mainSearchCriteria.v.c": icdCode,
      "mainSearchCriteria.v.dn": name,
      "knowledgeResponseType": "application/json"
    });

    const options = {
      hostname: "connect.medlineplus.gov",
      path: "/service?" + params.toString(),
      method: "GET"
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          const entry = parsed?.feed?.entry?.[0];
          const raw = entry?.summary?.["_value"] || entry?.summary || "";
          const summary = typeof raw === "string" ? raw.replace(/<[^>]*>/g, "").slice(0, 500) + "..." : null;
          resolve(summary);
        } catch { resolve(null); }
      });
    });

    req.on("error", () => resolve(null));
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) return res.status(400).json({ error: "No API key provided" });

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    const messages = [{
      role: "user",
      content: [{ type: "text", text: PROMPT + "\n\nDOCUMENT:\n" + text }]
    }];

    const anthropicData = await callAnthropic(apiKey, messages);

    if (anthropicData.error) {
      return res.status(400).json({ error: anthropicData.error.message });
    }

    const rawText = anthropicData?.content?.[0]?.text || "";
    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      return res.status(500).json({ error: "Could not parse diagnoses from document. Try pasting the text directly." });
    }

    const enriched = await Promise.all(
      (parsed.conditions || []).map(async (c) => {
        const mlSummary = await callMedlinePlus(c.icdCode, c.name);
        return { ...c, summary: mlSummary || c.summary };
      })
    );

    res.status(200).json({ patientName: parsed.patientName || "", conditions: enriched });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
