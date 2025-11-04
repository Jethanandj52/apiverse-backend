const express = require("express");
const router = express.Router();
const Feedback = require("../models/feedback");
const Notification = require("../models/notification");
const nodemailer = require("nodemailer");
const { userAuth } = require("../middleware/Auth");
const mongoose = require("mongoose");

// ✅ Send Feedback
router.post("/sendFeedback", userAuth, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const userId = req.user._id;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    // save feedback
    const feedback = new Feedback({ userId, name, email, subject, message });
    await feedback.save();

    // ✅ find admin(s) by email instead of role
    const User = mongoose.model("User");
    const admins = await User.find(
      { email: { $in: ["jethanandj52@gmail.com"] } }, // <-- yahan apne admin emails likho
      "_id"
    );

    // agar koi admin mila
    if (admins.length > 0) {
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          type: "Feedback",
          itemId: feedback._id,
          action: "new",
          message: `New feedback from ${name}: "${subject}"`,
        });
      }
    }

    res.json({ success: true, message: "Feedback submitted successfully" });
  } catch (err) {
    console.error("Feedback Send Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Get all Feedbacks
router.get("/showFeedback", async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Reply to Feedback
// ✅ Reply to Feedback (fixed)
router.post("/replyFeedback/:id", userAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;

    if (!replyMessage?.trim()) {
      return res.status(400).json({ success: false, error: "Reply message is required" });
    }

    const feedback = await Feedback.findById(id);
    if (!feedback)
      return res.status(404).json({ success: false, error: "Feedback not found" });

    feedback.reply = replyMessage;
    feedback.repliedAt = new Date();
    await feedback.save();

    // ✅ Email send
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `APIverse Admin <${process.env.EMAIL_USER}>`,
      to: feedback.email,
      subject: `Reply to your feedback: ${feedback.subject}`,
      text: `Hi ${feedback.name},\n\nYour feedback: ${feedback.message}\n\nAdmin Reply:\n${replyMessage}\n\nThank you!`,
    });

    // ✅ Notification for user only (not admin)
    await Notification.create({
      user: feedback.userId,
      type: "Feedback",
      itemId: feedback._id,
      action: "reply",
      message: `Admin replied to your feedback: "${feedback.subject}"`,
    });

    res.json({ success: true, message: "Reply sent successfully" });
  } catch (err) {
    console.error("Reply Feedback Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ✅ Delete Feedback
router.delete("/deleteFeedback/:id", userAuth, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback)
      return res.status(404).json({ success: false, error: "Feedback not found" });

    res.json({ success: true, message: "Feedback deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
