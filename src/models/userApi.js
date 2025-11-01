const mongoose = require("mongoose");
const { Schema } = mongoose;

const userApiSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },

    // meta
    category: { type: String, default: "General" },
    version: { type: String, default: "v1" },
    parameters: { type: String, default: "" }, // free text or JSON string describing params
    endpoints: { type: String, default: "" }, // free text (e.g. "/items, /items/:id")

    // the actual data that will be served (array of objects)
    data: { type: Array, default: [] },

    // file info
    fileType: { type: String, enum: ["json", "csv", "excel", "none"], default: "none" },

    // visibility and access
    visibility: { type: String, enum: ["public", "private"], default: "public" },

    // example code (e.g., usage snippet or sample call)
    

    // slug + public URL
    slug: { type: String, required: true, unique: true },
    url: { type: String, required: true },
exampleCode: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserApi", userApiSchema);
