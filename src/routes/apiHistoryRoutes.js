const express = require("express");
const router = express.Router();
const ApiHistory = require("../models/ApiHistory");
const { userAuth } = require("../middleware/Auth"); // JWT auth middleware

// ✅ Save API request
router.post("/save", userAuth, async (req, res) => {
  try {
    const { method, url, headers, body, response } = req.body;

    if (!method || !url)
      return res.status(400).json({ error: "Method and URL are required" });

    const newEntry = new ApiHistory({
      user: req.user._id,
      method,
      url,
      headers,
      body,
      response,
    });

    await newEntry.save();
    res.status(201).json({ message: "Saved successfully", id: newEntry._id });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: "Failed to save request" });
  }
});

// ✅ Get user’s saved requests (history)
router.get("/myRequests", userAuth, async (req, res) => {
  try {
    const history = await ApiHistory.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(history);
  } catch (err) {
    console.error("Fetch history error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

module.exports = router;
