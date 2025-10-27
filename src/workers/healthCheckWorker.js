// workers/healthCheckWorker.js
const cron = require("node-cron");
const axios = require("axios");
const Api = require("../models/api");
const Library = require("../models/lib");
const Store = require("../models/store");
const Notification = require("../models/notification");
const { io } = require("../app"); // { io } export karo app.js se

// 🔹 Helper to create notification
async function createNotification(userId, type, itemId, action, message) {
  const notif = await Notification.create({
    user: userId,
    type,
    itemId,
    action,
    message,
    createdAt: new Date(),
  });

  // ✅ real-time emit
  if (io) {
    io.to(userId.toString()).emit("notification", notif);
  }
}

// 🔹 API/Library check function
async function checkItem(item, type) {
  const url =
    type === "API"
      ? item.documentation?.endpoints
      : item.usage?.documentationUrl;

  if (!url) return;

  const start = Date.now();
  try {
    const res = await axios.get(url, { timeout: 5000 });
    const rt = Date.now() - start;

    if (item.status !== "up") {
      item.status = "up";
      item.lastChecked = new Date();
      item.responseTime = rt;
      await item.save();

      // Notify all users who saved this API/Library
      const stores = await Store.find({
        [type === "API" ? "apis" : "libraries"]: item._id,
      });

      for (const s of stores) {
        await createNotification(
          s.user,
          type,
          item._id,
          "statusChange",
          `${item.name} is now UP`
        );
      }
    }
  } catch (err) {
    const rt = Date.now() - start;

    if (item.status !== "down") {
      item.status = "down";
      item.lastChecked = new Date();
      item.responseTime = rt;
      await item.save();

      const stores = await Store.find({
        [type === "API" ? "apis" : "libraries"]: item._id,
      });

      for (const s of stores) {
        await createNotification(
          s.user,
          type,
          item._id,
          "statusChange",
          `${item.name} is DOWN`
        );
      }
    }
  }
}

// 🔹 Cron job: run every 2 minutes (test ke liye chhota rakh lo)
cron.schedule("*/2 * * * *", async () => {
  console.log("⏳ Running health check...");

  try {
    const apis = await Api.find({});
    const libs = await Library.find({});

    for (const api of apis) {
      await checkItem(api, "API");
    }

    for (const lib of libs) {
      await checkItem(lib, "Library");
    }
  } catch (err) {
    console.error("Health check error:", err.message);
  }
});
