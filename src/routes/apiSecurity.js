// routes/apiSecurity.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const sslChecker = require("ssl-checker");
const Api = require("../models/api"); // assume Api model exists

router.get("/:apiId", async (req, res) => {
  try {
    const api = await Api.findById(req.params.apiId);
    if (!api) return res.status(404).json({ message: "API not found" });

    const apiUrl = api.documentation?.endpoints || api.url;
    const result = { https: false, sslExpiry: null, vulnerable: false };

    result.https = apiUrl.startsWith("https://");

    if (result.https) {
      const sslInfo = await sslChecker(apiUrl);
      result.sslExpiry = sslInfo.validTo;
    }

    try {
      const response = await axios.get(apiUrl);
      result.vulnerable = response.headers["x-powered-by"] === "PHP"; // example check
    } catch {
      result.vulnerable = true;
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
