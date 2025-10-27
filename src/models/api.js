const mongoose = require("mongoose");
const { Schema } = mongoose;

const apiSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    language: [String],
    category: String,
    security: String,
    license: String,

    version: {
      type: String,
      required: true,
      default: "v1",
    },

    documentation: {
      title: String,
      description: String,
      endpoints: String,
      parameters: String,
      example: String,
    },

    integration: {
      title: String,
      description: String,
      setupSteps: String,
      codeExamples: String,
    },

    // ✅ Health check fields
    status: { type: String, enum: ["up", "down"], default: "down" },
    lastChecked: { type: Date },
    responseTime: { type: Number }, // ms

    // ✅ Version history (track old versions)
    versionHistory: [
      {
        version: String,
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    createdAt: {
      type: Date,
      default: Date.now,
    },
    popular: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: process.env.APICOLLECTION,
    timestamps: true,
  }
);

const Api = mongoose.model("Api", apiSchema);
module.exports = Api;
