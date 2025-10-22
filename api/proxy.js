// Simple serverless function for Vercel
module.exports = async (req, res) => {
  // Set CORS headers for all requests
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

  // Handle OPTIONS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  // Handle GET request (health check)
  if (req.method === "GET") {
    return res.json({
      message: "API Proxy Service Active",
      endpoint: "/api/proxy",
      method: "POST",
    })
  }

  // Handle POST request (proxy functionality)
  if (req.method === "POST") {
    try {
      const body = req.body

      // Validate required fields
      if (!body.method || !body.url) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
          message: 'Both "method" and "url" are required',
        })
      }

      // Prepare headers
      const headers = {
        ...body.headers,
      }

      // Prepare fetch options
      const fetchOptions = {
        method: body.method,
        headers: headers,
      }

      // Add payload for methods that support body
      if (body.method !== "GET" && body.payload) {
        if (body.payloadType === "form" || headers["Content-Type"]?.includes("form-urlencoded")) {
          if (!headers["Content-Type"]) {
            headers["Content-Type"] = "application/x-www-form-urlencoded"
          }

          if (typeof body.payload === "object") {
            const params = new URLSearchParams()
            Object.entries(body.payload).forEach(([key, value]) => {
              params.append(key, String(value))
            })
            fetchOptions.body = params.toString()
          } else {
            fetchOptions.body = String(body.payload)
          }
        } else if (body.payloadType === "text" || body.payloadType === "raw") {
          fetchOptions.body = String(body.payload)
        } else {
          if (!headers["Content-Type"]) {
            headers["Content-Type"] = "application/json"
          }
          fetchOptions.body = typeof body.payload === "string" ? body.payload : JSON.stringify(body.payload)
        }
      }

      // Make the actual API call
      const apiResponse = await fetch(body.url, fetchOptions)

      // Get response headers
      const responseHeaders = {}
      apiResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      // Get response body
      let responseData
      const contentType = apiResponse.headers.get("content-type")

      if (contentType?.includes("application/json")) {
        try {
          responseData = await apiResponse.json()
        } catch {
          responseData = await apiResponse.text()
        }
      } else {
        responseData = await apiResponse.text()
      }

      // Return the proxied response
      return res.status(200).json({
        success: true,
        status: apiResponse.status,
        data: responseData,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Proxy request failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      })
    }
  }

  // Handle other methods
  return res.status(405).json({
    success: false,
    error: "Method not allowed",
    message: "Only GET and POST methods are supported",
  })
}
