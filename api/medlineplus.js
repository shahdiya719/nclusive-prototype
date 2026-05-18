const https = require("https");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const params = new URLSearchParams(req.query).toString();
  const options = {
    hostname: "connect.medlineplus.gov",
    path: "/service?" + params + "&knowledgeResponseType=application/json",
    method: "GET"
  };
  const proxyReq = https.request(options, (proxyRes) => {
    let data = "";
    proxyRes.on("data", (chunk) => { data += chunk; });
    proxyRes.on("end", () => {
      try { res.json(JSON.parse(data)); }
      catch { res.status(500).json({ error: "Parse error" }); }
    });
  });
  proxyReq.on("error", (e) => res.status(500).json({ error: e.message }));
  proxyReq.end();
};