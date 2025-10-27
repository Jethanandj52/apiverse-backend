const mongoose = require("mongoose");
const { Schema } = mongoose;

const sharedRequestSchema = new Schema({
  title: { type: String, required: true },
  request: {
    apiId: { type: Schema.Types.ObjectId, ref: "Api", default: null }, // optional reference
    method: String,
    url: String,
    body: Schema.Types.Mixed,
    category: { type: String, default: "General" },
  },
  response: Schema.Types.Mixed,
  group: { type: Schema.Types.ObjectId, ref: "Group" },
  sender: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("SharedRequest", sharedRequestSchema);
