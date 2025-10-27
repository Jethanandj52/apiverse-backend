const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  reply: { type: String }, // admin ka reply
  repliedAt: { type: Date }, // reply kab bheja gaya
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Feedback", FeedbackSchema);
