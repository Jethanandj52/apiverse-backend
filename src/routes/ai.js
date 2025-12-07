const express = require("express");
const aiRoute = express.Router();
const axios = require("axios");
const Chat = require("../models/Chat");

const GEMINI_API_KEY =
  process.env.API_KEY ||
  "AIzaSyCF8IutexTkZhF6k155aDHmTXQ59kHWJwA"; // apni valid Gemini key

// ✅ Gemini AI Endpoint
aiRoute.post("/gemini", async (req, res) => {
  try {
    const { prompt, userId, chatId } = req.body;
    if (!prompt || !userId) {
      return res.status(400).json({ message: "Prompt and User ID required" });
    }

    // ✅ Updated model to gemini-2.0-flash
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    const aiResponse =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response received";

    let chat;

    if (chatId) {
      chat = await Chat.findById(chatId);
      if (chat) {
        chat.messages.push({ role: "user", content: prompt });
        chat.messages.push({ role: "ai", content: aiResponse });
        chat.title = chat.title || prompt.slice(0, 40);
        await chat.save();
      }
    }

    if (!chat) {
      chat = new Chat({
        userId,
        title: prompt.slice(0, 40),
        messages: [
          { role: "user", content: prompt },
          { role: "ai", content: aiResponse }
        ]
      });
      await chat.save();
    }

    return res.status(200).json({ chatId: chat._id, response: aiResponse });
  } catch (err) {
    console.error("Gemini Error:", err.response?.data || err.message);
    return res.status(500).json({
      message: "AI processing failed",
      error: err.response?.data || err.message
    });
  }
});

// ✅ Chat history routes
aiRoute.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const chats = await Chat.find({ userId }).sort({ updatedAt: -1 });
    return res.status(200).json(chats);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch history" });
  }
});

aiRoute.get("/chat/:id", async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    return res.status(200).json(chat);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch chat" });
  }
});

aiRoute.delete("/chat/:id", async (req, res) => {
  try {
    const chat = await Chat.findByIdAndDelete(req.params.id);
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    return res.status(200).json({ message: "Chat deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete chat" });
  }
});

module.exports = aiRoute;
