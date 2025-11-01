const express = require("express");
const Store = require("../models/store");
const Api = require("../models/api");
const Library = require("../models/lib");
const UserApi = require("../models/userApi");

const { User } = require("../models/user");
const Notification = require("../models/notification");

const router = express.Router();

// ✅ Add API to favorites
// ✅ Add API to favorites (supports both official & user-created)
router.post("/addApi", async (req, res) => {
  try {
    const { userId, apiId, isUserApi } = req.body;

    // ✅ Pehle check karo kis collection se API leni hai
    const api = isUserApi
      ? await UserApi.findById(apiId)
      : await Api.findById(apiId);

    if (!api) return res.status(404).json({ error: "API not found" });

    let store = await Store.findOne({ user: userId });
    if (!store) store = new Store({ user: userId, apis: [], libraries: [] });

    if (!store.apis.includes(apiId)) {
      store.apis.push(apiId);
      await store.save();

      // ✅ Notification with action
      await Notification.create({
        user: userId,
        type: "API",
        itemId: apiId,
        action: "favorite",
        message: `API "${api.name}" added to favorites`,
      });
    }

    res.status(200).json({ message: "API added to favorites", store });
  } catch (error) {
    console.error("Add API error:", error);
    res.status(500).json({ error: error.message });
  }
});


// ✅ Add Library to favorites
router.post("/addLibrary", async (req, res) => {
  try {
    const { userId, libraryId } = req.body;
    const library = await Library.findById(libraryId);
    if (!library) return res.status(404).json({ error: "Library not found" });

    let store = await Store.findOne({ user: userId });
    if (!store) store = new Store({ user: userId, apis: [], libraries: [] });

    if (!store.libraries.includes(libraryId)) {
      store.libraries.push(libraryId);
      await store.save();

      // ✅ Notification with action
      await Notification.create({
        user: userId,
        type: "Library",
        itemId: libraryId,
        action: "favorite", // 🔹 required
        message: `Library "${library.name}" added to favorites`,
      });
    }

    res.status(200).json({ message: "Library added to favorites", store });
  } catch (error) {
    console.error("Add Library error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get user's favorites
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const store = await Store.findOne({ user: userId })
      .populate("apis")
      .populate("libraries");
    if (!store) return res.status(404).json({ message: "No favorites found for this user" });
    res.status(200).json(store);
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Remove API from favorites
router.delete("/removeApi", async (req, res) => {
  try {
    const { userId, apiId } = req.body;
    const store = await Store.findOneAndUpdate(
      { user: userId },
      { $pull: { apis: apiId } },
      { new: true }
    );

    // ✅ Optional: Notification on removal
    await Notification.create({
      user: userId,
      type: "API",
      itemId: apiId,
      action: "delete", // 🔹 required
      message: "API removed from favorites",
    });

    res.status(200).json({ message: "API removed from favorites", store });
  } catch (error) {
    console.error("Remove API error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Remove Library from favorites
router.delete("/removeLibrary", async (req, res) => {
  try {
    const { userId, libraryId } = req.body;
    const store = await Store.findOneAndUpdate(
      { user: userId },
      { $pull: { libraries: libraryId } },
      { new: true }
    );

    // ✅ Optional: Notification on removal
    await Notification.create({
      user: userId,
      type: "Library",
      itemId: libraryId,
      action: "delete", // 🔹 required
      message: "Library removed from favorites",
    });

    res.status(200).json({ message: "Library removed from favorites", store });
  } catch (error) {
    console.error("Remove Library error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
