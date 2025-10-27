const express = require("express");
const router = express.Router();
const Message = require("../models/message");
const { userAuth } = require("../middleware/Auth");

// Send a message
router.post("/:groupId", userAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Message text required" });

    const message = await Message.create({
      group: groupId,
      sender: req.user._id,
      text,
    });

    const populatedMessage = await message.populate("sender", "firstName lastName email");
    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Get all messages of a group
router.get("/:groupId", userAuth, async (req, res) => {
  try {
    const messages = await Message.find({ group: req.params.groupId })
      .populate("sender", "firstName lastName email")
      .sort("createdAt");
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

module.exports = router;
