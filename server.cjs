const express = require("express");
const cors = require("cors");
const multer = require("multer");
const https = require("https");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PROMPT = `You are a medical coding assistant. Extract all diagnoses and medical conditions from this document. Return ONLY valid JSON with no markdown, no code blocks, no extra text whatsoever:
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

// Analyze endpoint - handles both file upload and plain text
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
      return res.status(400).json({ error: "No API key provided" });
    }

    let messages;

    if (req.file) {
      // PDF or text file uploaded
      const b64 = req.file.buffer.toString("base64");
      const mediaType = req.file.mimetype;

      if (mediaType === "application/pdf") {
        messages = [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
            { type: "text", text: PROMPT }
          ]
        }];
      } else {
        // Text file
        const text = req.file.buffer.toString("utf-8");
        messages = [{
          role: "user",
          content: [{ type: "text", text: PROMPT + "\n\nDOCUMENT:\n" + text }]
        }];
      }
    } else if (req.body && req.body.text) {
      // Plain text pasted in
      messages = [{
        role: "user",
        content: [{ type: "text", text: PROMPT + "\n\nDOCUMENT:\n" + req.body.text }]
      }];
    } else {
      return res.status(400).json({ error: "No file or text provided" });
    }

    const requestBody = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: messages
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      }
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let data = "";
      proxyRes.on("data", (chunk) => { data += chunk; });
      proxyRes.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            console.error("Anthropic API error:", parsed.error);
            return res.status(400).json({ error: parsed.error.message || "Anthropic API error" });
          }
          res.json(parsed);
        } catch (e) {
          console.error("Parse error:", e.message);
          res.status(500).json({ error: "Failed to parse API response" });
        }
      });
    });

    proxyReq.on("error", (e) => {
      console.error("Request error:", e.message);
      res.status(500).json({ error: e.message });
    });

    proxyReq.write(requestBody);
    proxyReq.end();

  } catch (e) {
    console.error("Server error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// MedlinePlus proxy - fixes CORS
app.get("/api/medlineplus", async (req, res) => {
  try {
    const params = new URLSearchParams(req.query).toString();
    const path = "/service?" + params + "&knowledgeResponseType=application/json";

    const options = {
      hostname: "connect.medlineplus.gov",
      path: path,
      method: "GET"
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let data = "";
      proxyRes.on("data", (chunk) => { data += chunk; });
      proxyRes.on("end", () => {
        try {
          res.json(JSON.parse(data));
        } catch (e) {
          res.status(500).json({ error: "Failed to parse MedlinePlus response" });
        }
      });
    });

    proxyReq.on("error", (e) => {
      res.status(500).json({ error: e.message });
    });

    proxyReq.end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () => {
  console.log("Nclusive proxy server running on http://localhost:3001");
});
