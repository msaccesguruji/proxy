// Simple serverless proxy for Vercel
module.exports = async (req, res) => {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

  if (req.method === "OPTIONS") return res.status(200).end()

  if (req.method === "GET")
    return res.json({ message: "API Proxy Service Active", endpoint: "/api/proxy", method: "POST" })

  if (req.method === "POST") {
    try {
      const { method, url, headers = {}, payload, payloadType } = req.body || {}
      if (!method || !url)
        return res.status(400).json({ success: false, error: "Missing required fields" })

      const opts = { method, headers: { ...headers } }

      // --- Body handling ---
      if (method !== "GET" && payload) {
        if (payloadType === "form" || headers["Content-Type"]?.includes("form-urlencoded")) {
          opts.headers["Content-Type"] ||= "application/x-www-form-urlencoded"
          opts.body = typeof payload === "object"
            ? new URLSearchParams(Object.entries(payload)).toString()
            : String(payload)
        } else if (payloadType === "text" || payloadType === "raw") {
          opts.body = String(payload)
        } else {
          opts.headers["Content-Type"] ||= "application/json"
          opts.body = typeof payload === "string" ? payload : JSON.stringify(payload)
        }
      }

      const apiRes = await fetch(url, opts)
      const resHeaders = {}
      apiRes.headers.forEach((v, k) => (resHeaders[k] = v))

      let data
      const ct = apiRes.headers.get("content-type") || ""
      data = ct.includes("application/json")
        ? await apiRes.json().catch(() => apiRes.text())
        : await apiRes.text()

      return res.status(apiRes.status).json({
        success: apiRes.ok,
        status: apiRes.status,
        headers: resHeaders,
        data,
      })
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: "Proxy request failed",
        message: err?.message || "Unknown error",
      })
    }
  }

  res.status(405).json({ success: false, error: "Method not allowed" })
}
