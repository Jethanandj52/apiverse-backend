const express = require("express");
const aiRoute = express.Router();
const axios = require("axios");
const Chat = require("../models/Chat");

// 🔥 Gemini 3 API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ===============================
//  AI Chat Route (Gemini 3)
// ===============================
aiRoute.post("/gemini", async (req, res) => {
  try {
    const { prompt, userId, chatId } = req.body;

    if (!prompt || !userId) {
      return res.status(400).json({ message: "Prompt and User ID required" });
    }

    // 🔥 Gemini AI Request
    const response = await axios.post(
      "https://gemini.googleapis.com/v1beta2/models/text-bison-003:generateMessage",
      {
        prompt: { text: prompt }
      },
      {
        headers: {
          "Authorization": `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    // Extract AI reply
    const aiResponse = response.data?.candidates?.[0]?.content || "No response received";

    let chat;

    if (chatId) {
      // 🟦 Update Existing Chat
      chat = await Chat.findById(chatId);

      if (chat) {
        chat.messages.push({ role: "user", content: prompt });
        chat.messages.push({ role: "ai", content: aiResponse });
        chat.title = chat.title || prompt.slice(0, 40);
        await chat.save();
      }
    }

    if (!chat) {
      // 🟩 New Chat Create
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
    console.error("AI Error:", err.response?.data || err.message);
    return res.status(500).json({
      message: "AI processing failed",
      error: err.response?.data || err.message
    });
  }
});

// ===============================
// Chat History Routes
// ===============================

// Get All Chats of User
aiRoute.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const chats = await Chat.find({ userId }).sort({ updatedAt: -1 });
    return res.status(200).json(chats);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch history" });
  }
});

// Single Chat by ID
aiRoute.get("/chat/:id", async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    return res.status(200).json(chat);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch chat" });
  }
});

// Delete Chat
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
