const mongoose = require("mongoose");

const savedRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    method: { type: String, required: true },
    url: { type: String, required: true },
    body: { type: Object, default: {} },
    response: { type: Object, default: {} },
    title: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SavedRequest", savedRequestSchema);
