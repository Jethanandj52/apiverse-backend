const mongoose = require("mongoose");
const { Schema } = mongoose;

const groupInviteSchema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiverEmail: { type: String, required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model("GroupInvite", groupInviteSchema);
