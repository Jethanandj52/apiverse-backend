const express = require("express");
const Notification = require("../models/notification");

const notificationRouter = express.Router();

// Get all notifications for a user
notificationRouter.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("user", "firstName lastName email"); // optional: populate user details
    res.status(200).json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Mark a notification as read
notificationRouter.patch("/read/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.status(200).json(notification);
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add a new notification manually
notificationRouter.post("/add", async (req, res) => {
  try {
    const { userId, type, itemId, action, message } = req.body;

    if (!userId || !type || !message) {
      return res.status(400).json({ error: "userId, type, and message are required" });
    }

    const notification = new Notification({
      user: userId,
      type,
      itemId: itemId || null,
      action: action || null,
      message,
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    console.error("Add notification error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = notificationRouter;
