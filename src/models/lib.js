const mongoose = require("mongoose");
const { Schema } = mongoose;

const librarySchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    language: [String],
    category: String,
    version: String,
    license: String,

    usage: {
      repository: String,
      documentationUrl: String,
      installation: String,
      usageExamples: String,
      integrationSteps: String,
    },

    // ✅ Health fields (like APIs)
    status: { type: String, enum: ["up", "down"], default: "down" },
    lastChecked: { type: Date },
    responseTime: { type: Number },

    // ✅ Version history
    versionHistory: [
      {
        version: String,
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    popular: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: process.env.LIBCOLLECTION,
    timestamps: true,
  }
);

const Library = mongoose.model("Library", librarySchema);
module.exports = Library;
