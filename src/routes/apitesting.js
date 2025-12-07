const express = require("express");
const axios = require("axios");
const router = express.Router();

// Proxy route for external APIs
router.post("/proxy", async (req, res) => {
  const { url, method, body, headers } = req.body;

  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const response = await axios({
      url,
      method: method || "GET",
      data: body || {},
      headers: headers || {},
    });
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: err.message,
      data: err.response?.data || null,
    });
  }
});

module.exports = router;
