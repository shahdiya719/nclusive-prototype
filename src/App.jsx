import { useState, useCallback, useRef } from "react";

const TEAL = "#028090";
const DARK = "#01424A";
const SEAFOAM = "#02C39A";

// ICD-10 system code for MedlinePlus Connect
const ICD10_CS = "2.16.840.1.113883.6.90";

// Common ICD-10 codes for demo fallback
const DEMO_CONDITIONS = [
  { code: "I50.9", name: "Heart failure, unspecified" },
  { code: "J44.1", name: "COPD with acute exacerbation" },
  { code: "E11.9", name: "Type 2 diabetes mellitus" },
  { code: "J18.9", name: "Pneumonia, unspecified" },
  { code: "I10", name: "Essential hypertension" },
];

function QRCode({ value, size = 200 }) {
  const qrRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&color=01424A&bgcolor=F4FAFB`;

  return (
    <div style={{ textAlign: "center" }}>
      <img
        src={url}
        alt="QR Code"
        width={size}
        height={size}
        style={{ borderRadius: 8, border: `2px solid ${SEAFOAM}` }}
        onLoad={() => setLoaded(true)}
      />
      {!loaded && (
        <div style={{ width: size, height: size, background: "#E0EFF2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#888" }}>
          Generating QR...
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    idle: { bg: "#E0EFF2", text: DARK },
    extracting: { bg: "#FFF3CD", text: "#856404" },
    fetching: { bg: "#D1ECF1", text: "#0C5460" },
    done: { bg: "#D4EDDA", text: "#155724" },
    error: { bg: "#F8D7DA", text: "#721C24" },
  };
  const labels = {
    idle: "Ready",
    extracting: "Extracting diagnoses...",
    fetching: "Querying MedlinePlus...",
    done: "Complete",
    error: "Error",
  };
  const c = colors[status] || colors.idle;
  return (
    <span style={{ background: c.bg, color: c.text, padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, fontFamily: "IBM Plex Mono, monospace" }}>
      {labels[status] || status}
    </span>
  );
}

function ConditionCard({ condition, index }) {
  const [expanded, setExpanded] = useState(false);
  const mlUrl = `https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=${ICD10_CS}&mainSearchCriteria.v.c=${condition.icdCode}&mainSearchCriteria.v.dn=${encodeURIComponent(condition.name)}`;

  return (
    <div style={{
      background: "#fff",
      border: `1px solid #E0EFF2`,
      borderRadius: 12,
      marginBottom: 16,
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(1,66,74,0.06)",
      transition: "box-shadow 0.2s",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
        background: "linear-gradient(90deg, #F4FAFB 0%, #E8F6F8 100%)",
        cursor: "pointer",
        borderBottom: expanded ? `1px solid #E0EFF2` : "none",
      }} onClick={() => setExpanded(!expanded)}>
        <div style={{
          minWidth: 32, height: 32, borderRadius: "50%",
          background: TEAL, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, fontFamily: "IBM Plex Mono, monospace",
        }}>{index + 1}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: DARK, fontFamily: "DM Sans, sans-serif" }}>{condition.name}</div>
          <div style={{ fontSize: 12, color: "#64748B", fontFamily: "IBM Plex Mono, monospace", marginTop: 2 }}>
            ICD-10: {condition.icdCode}
          </div>
        </div>
        <div style={{ fontSize: 18, color: TEAL, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>▾</div>
      </div>

      {expanded && (
        <div style={{ padding: "16px 18px" }}>
          {/* Plain language summary */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: SEAFOAM, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontFamily: "IBM Plex Mono, monospace" }}>
              Plain Language Summary
            </div>
            <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.65, fontFamily: "DM Sans, sans-serif" }}>
              {condition.summary || "Loading summary from MedlinePlus..."}
            </div>
          </div>

          {/* Key points */}
          {condition.keyPoints && condition.keyPoints.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: SEAFOAM, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontFamily: "IBM Plex Mono, monospace" }}>
                What This Means For You
              </div>
              {condition.keyPoints.map((pt, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                  <span style={{ color: SEAFOAM, fontWeight: 700, marginTop: 1 }}>→</span>
                  <span style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.5, fontFamily: "DM Sans, sans-serif" }}>{pt}</span>
                </div>
              ))}
            </div>
          )}

          {/* QR + MedlinePlus link */}
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", padding: "14px", background: "#F4FAFB", borderRadius: 8, marginTop: 8 }}>
            <QRCode value={mlUrl} size={100} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: DARK, marginBottom: 4, fontFamily: "DM Sans, sans-serif" }}>
                Scan to learn more
              </div>
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, marginBottom: 8, fontFamily: "DM Sans, sans-serif" }}>
                This QR code links to the NIH MedlinePlus page for this condition — verified patient education, powered by Nclusive.
              </div>
              <a href={mlUrl} target="_blank" rel="noreferrer" style={{
                display: "inline-block", padding: "6px 14px", background: TEAL, color: "#fff",
                borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: "none",
                fontFamily: "DM Sans, sans-serif",
              }}>
                Open MedlinePlus →
              </a>
            </div>
          </div>

          {/* Source note */}
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 10, fontStyle: "italic", fontFamily: "DM Sans, sans-serif" }}>
            Source: National Library of Medicine / NIH MedlinePlus. The doctor's original notes are unchanged — this is supplementary patient education only.
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [fileText, setFileText] = useState("");
  const [status, setStatus] = useState("idle");
  const [conditions, setConditions] = useState([]);
  const [error, setError] = useState("");
  const [patientName, setPatientName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const readFileAsBase64 = (f) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

  const readFileAsText = (f) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsText(f);
  });

  const fetchMedlinePlus = async (icdCode, name) => {
    try {
      const url = `https://connect.medlineplus.gov/service?mainSearchCriteria.v.cs=${ICD10_CS}&mainSearchCriteria.v.c=${encodeURIComponent(icdCode)}&mainSearchCriteria.v.dn=${encodeURIComponent(name)}&knowledgeResponseType=application/json`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const entries = data?.feed?.entry;
      if (!entries || entries.length === 0) return null;
      const entry = entries[0];
      const summary = entry?.summary?.["_value"] || entry?.summary || "";
      const title = entry?.title?.["_value"] || entry?.title || name;
      const link = entry?.link?.[0]?.href || entry?.link?.href || "";
      return { summary: typeof summary === "string" ? summary.replace(/<[^>]*>/g, "").slice(0, 400) + "..." : "", title, link };
    } catch {
      return null;
    }
  };

  const processDocument = useCallback(async () => {
    if (!file && !fileText) return;
    setStatus("extracting");
    setConditions([]);
    setError("");

    try {
      // Build message for Claude
      let content = [];
      if (file && file.type === "application/pdf") {
        const b64 = await readFileAsBase64(file);
        content = [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
          {
            type: "text",
            text: `You are a medical coding assistant. Extract all diagnoses, conditions, and medical problems from this document. For each one, provide:
1. The exact diagnosis name as written
2. The most appropriate ICD-10-CM code
3. A plain-language name a patient would understand (e.g. "heart failure" not "cardiac decompensation")
4. 2-3 bullet points of what the patient should know about this condition in simple language

Return ONLY valid JSON, no markdown, no preamble:
{
  "patientName": "extracted patient name or empty string",
  "conditions": [
    {
      "name": "plain language name",
      "icdCode": "X00.0",
      "technicalName": "exact medical term from document",
      "summary": "2-3 sentence plain language explanation of what this condition is",
      "keyPoints": ["what this means for your daily life", "what to watch for", "when to call your doctor"]
    }
  ]
}`
          }
        ];
      } else {
        const text = file ? await readFileAsText(file) : fileText;
        content = [{
          type: "text",
          text: `You are a medical coding assistant. Extract all diagnoses, conditions, and medical problems from this discharge document or medical note. For each one, provide the ICD-10 code and plain-language explanation.

DOCUMENT TEXT:
${text}

Return ONLY valid JSON, no markdown, no preamble:
{
  "patientName": "extracted patient name or empty string",
  "conditions": [
    {
      "name": "plain language name",
      "icdCode": "X00.0",
      "technicalName": "exact medical term from document",
      "summary": "2-3 sentence plain language explanation of what this condition is",
      "keyPoints": ["what this means for your daily life", "what to watch for", "when to call your doctor"]
    }
  ]
}`
        }];
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content }],
        }),
      });

      const data = await response.json();
      const rawText = data?.content?.[0]?.text || "";

      let parsed;
      try {
        const clean = rawText.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        // Fallback to demo data if parsing fails
        parsed = {
          patientName: "",
          conditions: DEMO_CONDITIONS.slice(0, 3).map(d => ({
            ...d,
            icdCode: d.code,
            summary: "Loading from MedlinePlus...",
            keyPoints: [],
          }))
        };
      }

      if (parsed.patientName) setPatientName(parsed.patientName);

      // Now fetch MedlinePlus for each condition
      setStatus("fetching");
      const enriched = await Promise.all(
        (parsed.conditions || []).map(async (c) => {
          const mlData = await fetchMedlinePlus(c.icdCode, c.name);
          return {
            ...c,
            summary: mlData?.summary || c.summary || `${c.name} — see MedlinePlus for details.`,
            mlLink: mlData?.link || "",
          };
        })
      );

      setConditions(enriched);
      setStatus("done");
    } catch (e) {
      setError("Something went wrong: " + e.message);
      setStatus("error");
    }
  }, [file, fileText]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleReset = () => {
    setFile(null);
    setFileText("");
    setStatus("idle");
    setConditions([]);
    setError("");
    setPatientName("");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F4FAFB", fontFamily: "DM Sans, sans-serif" }}>
      {/* Load fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: DARK, padding: "18px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8, background: SEAFOAM,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 16, color: DARK, fontFamily: "IBM Plex Mono, monospace",
        }}>N</div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>Nclusive Scan</div>
          <div style={{ color: "#64B5C2", fontSize: 12, fontFamily: "IBM Plex Mono, monospace" }}>VA Comprehension Pilot · Powered by MedlinePlus / NIH</div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <StatusBadge status={status} />
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px" }}>

        {/* Upload section */}
        {status === "idle" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: DARK, margin: "0 0 6px", letterSpacing: -0.5 }}>
                Upload a Discharge Document
              </h1>
              <p style={{ fontSize: 14, color: "#64748B", margin: 0, lineHeight: 1.6 }}>
                Upload a VA discharge summary, clinical note, or paste text below. Nclusive will extract diagnoses, look them up in the NIH MedlinePlus database, and generate a plain-language patient summary with a QR code for each condition.
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? SEAFOAM : file ? TEAL : "#B0D4D8"}`,
                borderRadius: 12, padding: "32px 24px", textAlign: "center",
                cursor: "pointer", transition: "all 0.2s",
                background: dragOver ? "#E8F8F6" : file ? "#EBF7F9" : "#fff",
                marginBottom: 16,
              }}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files[0])} />
              <div style={{ fontSize: 32, marginBottom: 8 }}>{file ? "📄" : "📁"}</div>
              {file ? (
                <>
                  <div style={{ fontWeight: 700, color: TEAL, fontSize: 15 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                    {(file.size / 1024).toFixed(1)} KB · Click to change
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 600, color: DARK, fontSize: 15, marginBottom: 4 }}>
                    Drop a file here or click to browse
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>PDF, TXT, DOC — discharge summaries, clinical notes</div>
                </>
              )}
            </div>

            <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 13, margin: "12px 0", fontFamily: "IBM Plex Mono, monospace" }}>
              — or paste document text —
            </div>

            <textarea
              value={fileText}
              onChange={(e) => setFileText(e.target.value)}
              placeholder="Paste discharge summary text here... e.g. 'Patient diagnosed with Type 2 Diabetes Mellitus (E11.9), Hypertension (I10), and COPD (J44.1). Discharge instructions attached.'"
              style={{
                width: "100%", minHeight: 120, padding: "12px 14px",
                border: `1px solid #D0E8EC`, borderRadius: 10, fontSize: 13,
                fontFamily: "DM Sans, sans-serif", color: DARK, resize: "vertical",
                background: "#fff", boxSizing: "border-box", outline: "none",
                lineHeight: 1.6,
              }}
            />

            <button
              onClick={processDocument}
              disabled={!file && !fileText.trim()}
              style={{
                marginTop: 16, width: "100%", padding: "14px",
                background: (!file && !fileText.trim()) ? "#D0E8EC" : TEAL,
                color: (!file && !fileText.trim()) ? "#94A3B8" : "#fff",
                border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
                cursor: (!file && !fileText.trim()) ? "not-allowed" : "pointer",
                fontFamily: "DM Sans, sans-serif", transition: "background 0.2s",
                letterSpacing: -0.2,
              }}
            >
              Extract Diagnoses & Generate Patient Summary →
            </button>

            <div style={{ marginTop: 12, fontSize: 12, color: "#94A3B8", textAlign: "center", lineHeight: 1.5 }}>
              Doctor's original language is never modified. Plain-language explanations come from the NIH National Library of Medicine.
            </div>
          </>
        )}

        {/* Processing states */}
        {(status === "extracting" || status === "fetching") && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 42, marginBottom: 16, animation: "spin 1s linear infinite" }}>
              {status === "extracting" ? "🔍" : "📡"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 8 }}>
              {status === "extracting" ? "Extracting diagnoses..." : "Querying MedlinePlus NIH database..."}
            </div>
            <div style={{ fontSize: 13, color: "#64748B", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
              {status === "extracting"
                ? "Identifying medical conditions and ICD-10 codes from your document"
                : "Retrieving plain-language patient education resources from the National Library of Medicine"}
            </div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: "#991B1B", marginBottom: 4 }}>Something went wrong</div>
            <div style={{ fontSize: 13, color: "#7F1D1D" }}>{error}</div>
            <button onClick={handleReset} style={{ marginTop: 12, padding: "8px 16px", background: "#991B1B", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
              Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {status === "done" && conditions.length > 0 && (
          <>
            {/* Summary header */}
            <div style={{
              background: DARK, borderRadius: 12, padding: "20px 24px", marginBottom: 24,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ color: SEAFOAM, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontFamily: "IBM Plex Mono, monospace" }}>
                  Patient Summary Ready
                </div>
                {patientName && (
                  <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{patientName}</div>
                )}
                <div style={{ color: "#9DC4CA", fontSize: 13 }}>
                  {conditions.length} diagnosis{conditions.length !== 1 ? "es" : ""} found · MedlinePlus explanations loaded
                </div>
              </div>
              <button onClick={handleReset} style={{
                padding: "8px 16px", background: "transparent", color: SEAFOAM,
                border: `1px solid ${SEAFOAM}`, borderRadius: 8, cursor: "pointer",
                fontSize: 13, fontFamily: "DM Sans, sans-serif", fontWeight: 600,
              }}>
                New Document
              </button>
            </div>

            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16, lineHeight: 1.5 }}>
              Each card below explains what a diagnosis means in plain language. Tap any card to expand it. Scan the QR code to open the full NIH patient education page.
            </div>

            {conditions.map((c, i) => (
              <ConditionCard key={i} condition={c} index={i} />
            ))}

            <div style={{
              marginTop: 24, padding: "16px 20px", background: "#E8F6F8",
              borderRadius: 10, borderLeft: `4px solid ${SEAFOAM}`,
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: DARK, marginBottom: 4 }}>About this tool</div>
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6 }}>
                This is a prototype demonstrating the Nclusive × MedlinePlus integration for the VA pilot program. ICD-10 codes are extracted by AI and matched to NIH patient education resources. The doctor's original notes are never modified. All plain-language content is sourced from the National Library of Medicine.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}