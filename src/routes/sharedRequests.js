const express = require("express");
const router = express.Router();
const SharedRequest = require("../models/SharedRequest");
const { userAuth } = require("../middleware/Auth");

// ---------------- Share API to Group ----------------
router.post("/groups/:groupId/share", userAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title, request, response } = req.body;

    if (!title || !request) {
      return res.status(400).json({ error: "Title and request are required" });
    }

    // If request.apiId is not provided, set it to null (or ObjectId('000000000000000000000001') if you want fixed)
    const apiId = request.apiId || null; 

    const shared = await SharedRequest.create({
      title,
      request: {
        ...request,
        apiId,
        category: request.category || "General",
      },
      response: response || null,
      group: groupId,
      sender: req.user._id,
    });

    res.status(201).json({ shareId: shared._id });
  } catch (err) {
    console.error("Error sharing request:", err);
    res.status(500).json({ error: "Failed to share request" });
  }
});


// ---------------- Fetch shared request by ID ----------------
router.get("/:sharedId", userAuth, async (req, res) => {
  try {
    const { sharedId } = req.params;

    const shared = await SharedRequest.findById(sharedId)
      .populate("sender", "firstName lastName email")
      .populate("group", "name");

    if (!shared) return res.status(404).json({ error: "Shared request not found" });

    res.json(shared);
  } catch (err) {
    console.error("Error fetching shared request:", err);
    res.status(500).json({ error: "Failed to fetch shared request" });
  }
});

// ---------------- Fetch all shared requests for a group ----------------
router.get("/group/:groupId", userAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const sharedRequests = await SharedRequest.find({ group: groupId })
      .populate("sender", "firstName lastName email")
      .populate("group", "name");
    res.json(sharedRequests);
  } catch (err) {
    console.error("Error fetching shared requests:", err);
    res.status(500).json({ error: "Failed to fetch shared requests" });
  }
});

module.exports = router;
