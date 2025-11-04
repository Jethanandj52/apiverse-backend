const express = require("express");
const router = express.Router();
const Feedback = require("../models/feedback");
const Notification = require("../models/notification");
const nodemailer = require("nodemailer");
const { userAuth } = require("../middleware/Auth"); // import your auth middleware
const mongoose = require("mongoose");

// ✅ 1. User send feedback
router.post("/sendFeedback", userAuth, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const userId = req.user._id; // ✅ logged-in user ID from token

    if (!name || !email || !subject || !message) {
      return res
        .status(400)
        .json({ success: false, error: "All fields are required" });
    }

    // Save feedback
    const feedback = new Feedback({
      userId,
      name,
      email,
      subject,
      message,
    });
    await feedback.save();

    // ✅ Get all admins dynamically (instead of hardcoding)
    const User = mongoose.model("User");
    const admins = await User.find({ role: "admin" }, "_id");

    if (admins.length > 0) {
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          type: "Feedback",
          itemId: feedback._id,
          action: "update",
          message: `New feedback received from ${name}: "${subject}"`,
        });
      }
    }

    res.json({ success: true, message: "Feedback submitted successfully!" });
  } catch (err) {
    console.error("Feedback Send Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ 2. Admin get all feedback
router.get("/showFeedback", async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 3. Admin reply to feedback
router.post("/replyFeedback/:id", userAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;

    const feedback = await Feedback.findById(id);
    if (!feedback)
      return res
        .status(404)
        .json({ success: false, error: "Feedback not found" });

    feedback.reply = replyMessage;
    feedback.repliedAt = new Date();
    await feedback.save();

    // ✅ Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const emailBody = `
Hello ${feedback.name},

We received your feedback:
Subject: ${feedback.subject}
Message: ${feedback.message}

Here is our reply:
${replyMessage}

Thank you for helping us improve APIverse!
    `;

    await transporter.sendMail({
      from: `APIverse Admin <${process.env.EMAIL_USER}>`,
      to: feedback.email,
      subject: `Reply to your feedback: ${feedback.subject}`,
      text: emailBody,
    });

    // ✅ Create notification for the feedback sender
    if (feedback.userId) {
      await Notification.create({
        user: feedback.userId,
        type: "Feedback",
        itemId: feedback._id,
        action: "reply",
        message: `Admin replied to your feedback: "${feedback.subject}"`,
      });
    }

    res.json({ success: true, message: "Reply sent and saved successfully" });
  } catch (err) {
    console.error("Reply Feedback Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ 4. Admin delete feedback
router.delete("/deleteFeedback/:id", userAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = await Feedback.findByIdAndDelete(id);

    if (!feedback) {
      return res
        .status(404)
        .json({ success: false, error: "Feedback not found" });
    }

    res.json({ success: true, message: "Feedback deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
