const express = require("express");
const SavedRequest = require("../models/SavedRequest");
const { userAuth } = require("../middleware/Auth"); // <-- make sure you have JWT auth
const router = express.Router();

// 📌 Save a new API request
router.post("/save", userAuth, async (req, res) => {
  try {
    const { method, url, headers, body, response } = req.body;
    const saved = await SavedRequest.create({
      userId: req.user.id,
      method,
      url,
      headers,
      body,
      response,
    });
    res.json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 📌 Get user’s saved requests (history)
router.get("/myRequests", userAuth, async (req, res) => {
  try {
    const data = await SavedRequest.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// 📌 Delete a request
router.delete("/:id", userAuth, async (req, res) => {
  try {
    await SavedRequest.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete request" });
  }
});
// 📌 Get all saved requests of logged-in user
router.get("/history", userAuth, async (req, res) => {
  try {
    const history = await SavedRequest.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
