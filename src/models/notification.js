const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { 
      type: String, 
      enum: ["API", "Library", "Group", "Invitation", "Feedback","UserApi"],
      required: true 
    },
    itemId: { type: mongoose.Schema.Types.ObjectId },
    action: { 
      type: String, 
      enum: ["statusChange", "update", "delete", "favorite", "invite", "reply","new"],
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "notifications" }
);

module.exports = mongoose.model("Notification", notificationSchema);
