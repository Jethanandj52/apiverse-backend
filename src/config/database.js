const mongoose = require('mongoose');

async function connectToDB() {
  try {
    if (!process.env.DB) {
      throw new Error("MongoDB URI not set in environment variables");
    }

    await mongoose.connect(process.env.DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB successfully!");
  } catch (err) {
    console.error("❌ DB connection failed:", err);
    process.exit(1); // stop server if DB connection fails
  }
}

module.exports = { connectToDB };
