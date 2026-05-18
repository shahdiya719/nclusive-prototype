import { useState, useCallback, useRef } from "react";

const TEAL = "#028090"; // v3
const DARK = "#01424A";
const SEAFOAM = "#02C39A";

function QRCode({ value, size = 100 }) {
  const [loaded, setLoaded] = useState(false);
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&color=01424A&bgcolor=F4FAFB`;
  return (
    <div>
      {!loaded && <div style={{ width: size, height: size, background: "#E0EFF2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#888" }}>Loading...</div>}
      <img src={url} alt="QR" width={size} height={size} style={{ borderRadius: 8, border: `2px solid ${SEAFOAM}`, display: loaded ? "block" : "none" }} onLoad={() => setLoaded(true)} />
    </div>
  );
}

function ConditionCard({ condition, index }) {
  const [expanded, setExpanded] = useState(false);
  const mlUrl = `https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=${condition.icdCode}&mainSearchCriteria.v.dn=${encodeURIComponent(condition.name)}`;
  return (
    <div style={{ background: "#fff", border: "1px solid #E0EFF2", borderRadius: 12, marginBottom: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(1,66,74,0.06)" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "linear-gradient(90deg,#F4FAFB,#E8F6F8)", cursor: "pointer", borderBottom: expanded ? "1px solid #E0EFF2" : "none" }}>
        <div style={{ minWidth: 32, height: 32, borderRadius: "50%", background: TEAL, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{index + 1}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: DARK }}>{condition.name}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, fontFamily: "monospace" }}>ICD-10: {condition.icdCode}</div>
        </div>
        <div style={{ fontSize: 18, color: TEAL, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</div>
      </div>
      {expanded && (
        <div style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: SEAFOAM, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Plain Language Summary</div>
          <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.65, marginBottom: 14 }}>{condition.summary}</div>
          {condition.keyPoints?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: SEAFOAM, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>What This Means For You</div>
              {condition.keyPoints.map((pt, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <span style={{ color: SEAFOAM, fontWeight: 700 }}>→</span>
                  <span style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.5 }}>{pt}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", padding: 14, background: "#F4FAFB", borderRadius: 8 }}>
            <QRCode value={mlUrl} size={100} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: DARK, marginBottom: 4 }}>Scan to learn more</div>
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, marginBottom: 8 }}>Links to the NIH MedlinePlus page for this condition — powered by Nclusive.</div>
              <a href={mlUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "6px 14px", background: TEAL, color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Open MedlinePlus →</a>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 10, fontStyle: "italic" }}>Source: NIH MedlinePlus. The doctor's original notes are unchanged — this is supplementary patient education only.</div>
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
  const [patientName, setPatientName] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const processDocument = useCallback(async () => {
    if (!file && !fileText.trim()) return;
    setStatus("extracting");
    setConditions([]);
    setError("");
    setPatientName("");

    try {
      let body;
      let headers = {};

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        body = formData;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({ text: fileText });
      }

      const res = await fetch("/api/analyze", { method: "POST", headers, body });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.patientName) setPatientName(data.patientName);
      setConditions(data.conditions || []);
      setStatus("done");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }, [file, fileText]);

  const reset = () => { setFile(null); setFileText(""); setStatus("idle"); setConditions([]); setError(""); setPatientName(""); };

  const canSubmit = file || fileText.trim();

  const statusLabel = { idle: "Ready", extracting: "Extracting...", fetching: "Querying MedlinePlus...", done: "Complete", error: "Error" };
  const statusColor = { idle: { bg: "#E0EFF2", text: DARK }, extracting: { bg: "#FFF3CD", text: "#856404" }, fetching: { bg: "#D1ECF1", text: "#0C5460" }, done: { bg: "#D4EDDA", text: "#155724" }, error: { bg: "#F8D7DA", text: "#721C24" } };
  const sc = statusColor[status] || statusColor.idle;

  return (
    <div style={{ minHeight: "100vh", background: "#F4FAFB", fontFamily: "DM Sans, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: DARK, padding: "18px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, background: SEAFOAM, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: DARK }}>N</div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>Nclusive Scan</div>
          <div style={{ color: "#64B5C2", fontSize: 12 }}>VA Comprehension Pilot · Powered by MedlinePlus / NIH</div>
        </div>
        <span style={{ marginLeft: "auto", background: sc.bg, color: sc.text, padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{statusLabel[status]}</span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px" }}>

        {status === "idle" && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: DARK, margin: "0 0 8px" }}>Upload a Discharge Document</h1>
            <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 28px", lineHeight: 1.6 }}>
              Upload a VA discharge summary or paste the text below. Nclusive extracts diagnoses, looks them up in NIH MedlinePlus, and generates a plain-language patient summary with a scannable QR code for each condition.
            </p>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); setFile(e.dataTransfer.files[0]); }}
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? SEAFOAM : file ? TEAL : "#B0D4D8"}`, borderRadius: 12, padding: "32px 24px", textAlign: "center", cursor: "pointer", background: dragOver ? "#E8F8F6" : file ? "#EBF7F9" : "#fff", marginBottom: 16, transition: "all 0.2s" }}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,.txt" style={{ display: "none" }} onChange={(e) => setFile(e.target.files[0])} />
              <div style={{ fontSize: 36, marginBottom: 8 }}>{file ? "📄" : "📁"}</div>
              {file ? (
                <>
                  <div style={{ fontWeight: 700, color: TEAL, fontSize: 15 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 600, color: DARK, fontSize: 15, marginBottom: 4 }}>Drop a file here or click to browse</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>PDF or TXT — discharge summaries, clinical notes</div>
                </>
              )}
            </div>

            <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 13, margin: "12px 0" }}>— or paste document text directly —</div>

            <textarea
              value={fileText}
              onChange={(e) => setFileText(e.target.value)}
              placeholder="Paste discharge summary text here... e.g. 'Patient diagnosed with Type 2 Diabetes Mellitus (E11.9), Hypertension (I10), and COPD (J44.1). Follow up in 2 weeks.'"
              style={{ width: "100%", minHeight: 130, padding: "12px 14px", border: "1px solid #D0E8EC", borderRadius: 10, fontSize: 13, color: DARK, resize: "vertical", background: "#fff", boxSizing: "border-box", outline: "none", lineHeight: 1.6, fontFamily: "DM Sans, sans-serif" }}
            />

            <button
              onClick={processDocument}
              disabled={!canSubmit}
              style={{ marginTop: 16, width: "100%", padding: 14, background: canSubmit ? TEAL : "#D0E8EC", color: canSubmit ? "#fff" : "#94A3B8", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed", transition: "background 0.2s" }}
            >
              Extract Diagnoses & Generate Patient Summary →
            </button>

            <div style={{ marginTop: 8, fontSize: 12, color: "#94A3B8", textAlign: "center" }}>Doctor's original language is never modified. Plain-language explanations sourced from NIH MedlinePlus.</div>
          </>
        )}

        {(status === "extracting" || status === "fetching") && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{status === "extracting" ? "🔍" : "📡"}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: DARK, marginBottom: 8 }}>
              {status === "extracting" ? "Extracting diagnoses..." : "Querying MedlinePlus NIH database..."}
            </div>
            <div style={{ fontSize: 14, color: "#64748B", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
              {status === "extracting" ? "Identifying medical conditions and ICD-10 codes from your document" : "Retrieving plain-language patient education from the National Library of Medicine"}
            </div>
          </div>
        )}

        {status === "error" && (
          <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 10, padding: 20 }}>
            <div style={{ fontWeight: 700, color: "#991B1B", marginBottom: 6 }}>Something went wrong</div>
            <div style={{ fontSize: 13, color: "#7F1D1D", marginBottom: 12 }}>{error}</div>
            <button onClick={reset} style={{ padding: "8px 16px", background: "#991B1B", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Try Again</button>
          </div>
        )}

        {status === "done" && conditions.length > 0 && (
          <>
            <div style={{ background: DARK, borderRadius: 12, padding: "20px 24px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: SEAFOAM, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Patient Summary Ready</div>
                {patientName && <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{patientName}</div>}
                <div style={{ color: "#9DC4CA", fontSize: 13 }}>{conditions.length} diagnosis{conditions.length !== 1 ? "es" : ""} found · MedlinePlus explanations loaded</div>
              </div>
              <button onClick={reset} style={{ padding: "8px 16px", background: "transparent", color: SEAFOAM, border: `1px solid ${SEAFOAM}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>New Document</button>
            </div>

            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16, lineHeight: 1.5 }}>Tap any card to expand. Scan the QR code to open the full NIH patient education page for that condition.</div>

            {conditions.map((c, i) => <ConditionCard key={i} condition={c} index={i} />)}

            <div style={{ marginTop: 24, padding: "16px 20px", background: "#E8F6F8", borderRadius: 10, borderLeft: `4px solid ${SEAFOAM}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: DARK, marginBottom: 4 }}>About this prototype</div>
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6 }}>This demonstrates the Nclusive × MedlinePlus integration for the VA pilot. ICD-10 codes are extracted by AI and matched to NIH patient education. The doctor's original notes are never modified.</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
