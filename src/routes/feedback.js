const express = require("express");
const router = express.Router();
const Feedback = require("../models/feedback");
const Notification = require("../models/notification");
const nodemailer = require("nodemailer");

// ✅ 1. User send feedback
router.post("/sendFeedback", async (req, res) => {
  try {
    const { name, email, subject, message, userId } = req.body;

    if (!name || !email || !subject || !message) {
      return res
        .status(400)
        .json({ success: false, error: "All fields are required" });
    }

    // Save feedback
    const feedback = new Feedback({
      userId: userId || null,
      name,
      email,
      subject,
      message,
    });
    await feedback.save();

    // ✅ Create notification for admin
    // Admin ka ID yahan manually daalna hoga (replace karo apne admin userId se)
    const adminId = "68a831c61c68485f60f722bc"; // Example admin _id
    await Notification.create({
      user: adminId,
      type: "Feedback",
      itemId: feedback._id,
      action: "update",
      message: `New feedback received from ${name}: "${subject}"`,
    });

    res.json({ success: true, message: "Feedback submitted successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ 2. Admin get all feedback
router.get("/showFeedback", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 3. Admin reply to feedback
router.post("/replyFeedback/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;

    const feedback = await Feedback.findById(id);
    if (!feedback)
      return res
        .status(404)
        .json({ success: false, error: "Feedback not found" });

    // ✅ Update reply in DB
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

    // ✅ Create notification for user
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
router.delete("/deleteFeedback/:id", async (req, res) => {
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
