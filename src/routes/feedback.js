const express = require("express");
const router = express.Router();
const Feedback = require("../models/feedback");
const nodemailer = require("nodemailer");

// ✅ 1. User send feedback
router.post("/sendFeedback", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    const feedback = new Feedback({ name, email, subject, message });
    await feedback.save();

    res.json({ success: true, message: "Feedback submitted successfully!" });
  } catch (err) {
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
// ✅ 3. Admin reply to feedback
router.post("/replyFeedback/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ success: false, error: "Feedback not found" });
    }

    // ✅ Update DB with reply
    feedback.reply = replyMessage;
    feedback.repliedAt = new Date();
    await feedback.save();

    // ✅ Send email to user
    let transporter = nodemailer.createTransport({
      service: "gmail", // ya SMTP config
      auth: {
        user: "jethanandj52@gmail.com",
        pass: "zsnvgtugeahrpnpi",
      },
    });

    const emailBody = `
Hello ${feedback.name},

We received your feedback:

📌 Subject: ${feedback.subject}  
📝 Message: ${feedback.message}

Here is the admin's reply to your feedback:

💬 ${replyMessage}

Thank you for helping us improve APIverse!
    `;

    await transporter.sendMail({
      from: "APIverse Admin <jethanandj52@gmail.com>",
      to: feedback.email,
      subject: `Reply to your feedback: ${feedback.subject}`,
      text: emailBody,
    });

    res.json({ success: true, message: "Reply sent and saved successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ✅ 4. Admin delete feedback
router.delete("/deleteFeedback/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = await Feedback.findByIdAndDelete(id);

    if (!feedback) {
      return res.status(404).json({ success: false, error: "Feedback not found" });
    }

    res.json({ success: true, message: "Feedback deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
