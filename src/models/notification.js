const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who receives the notification
    type: { 
      type: String, 
      enum: ["API", "Library", "Group", "Invitation"], // added Group & Invitation
      required: true 
    },
    itemId: { type: mongoose.Schema.Types.ObjectId }, // reference to API, Library, Group, etc.
    action: { 
      type: String, 
      enum: ["statusChange", "update", "delete", "favorite", "invite"], // added invite for groups
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "notifications" }
);

module.exports = mongoose.model("Notification", notificationSchema);
