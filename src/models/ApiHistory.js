const mongoose = require("mongoose");

const apiHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    headers: {
      type: Object,
    },
    body: {
      type: Object,
    },
    response: {
      type: Object,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ApiHistory", apiHistorySchema);
