const express = require("express");
const Store = require("../models/store");
const Api = require("../models/api");
const Library = require("../models/lib");
const UserApi = require("../models/userApi");
const { User } = require("../models/user");
const Notification = require("../models/notification");

const router = express.Router();

/* ---------------------- ADD API TO FAVORITES ---------------------- */
// ✅ Supports both official APIs and user-created APIs
router.post("/addApi", async (req, res) => {
  try {
    const { userId, apiId, isUserApi } = req.body;

    // Check which collection to use
    const api = isUserApi ? await UserApi.findById(apiId) : await Api.findById(apiId);
    if (!api) return res.status(404).json({ error: "API not found" });

    // Find or create user store
    let store = await Store.findOne({ user: userId });
    if (!store) {
      store = new Store({ user: userId, apis: [], userApis: [], libraries: [] });
    }

    // Save to correct array
    if (isUserApi) {
      if (!store.userApis.includes(apiId)) {
        store.userApis.push(apiId);
      }
    } else {
      if (!store.apis.includes(apiId)) {
        store.apis.push(apiId);
      }
    }

    await store.save();

    // Notification
    await Notification.create({
      user: userId,
      type: "API",
      itemId: apiId,
      action: "favorite",
      message: `API "${api.name}" added to favorites`,
    });

    res.status(200).json({ message: "API added to favorites", store });
  } catch (error) {
    console.error("Add API error:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ---------------------- ADD LIBRARY TO FAVORITES ---------------------- */
router.post("/addLibrary", async (req, res) => {
  try {
    const { userId, libraryId } = req.body;
    const library = await Library.findById(libraryId);
    if (!library) return res.status(404).json({ error: "Library not found" });

    let store = await Store.findOne({ user: userId });
    if (!store) {
      store = new Store({ user: userId, apis: [], userApis: [], libraries: [] });
    }

    if (!store.libraries.includes(libraryId)) {
      store.libraries.push(libraryId);
      await store.save();

      await Notification.create({
        user: userId,
        type: "Library",
        itemId: libraryId,
        action: "favorite",
        message: `Library "${library.name}" added to favorites`,
      });
    }

    res.status(200).json({ message: "Library added to favorites", store });
  } catch (error) {
    console.error("Add Library error:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ---------------------- GET USER FAVORITES ---------------------- */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const store = await Store.findOne({ user: userId })
      .populate("apis")
      .populate("userApis")
      .populate("libraries");

    if (!store) return res.status(404).json({ message: "No favorites found for this user" });

    res.status(200).json(store);
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ---------------------- REMOVE API FROM FAVORITES ---------------------- */
router.delete("/removeApi", async (req, res) => {
  try {
    const { userId, apiId, isUserApi } = req.body;

    const updateField = isUserApi ? "userApis" : "apis";
    const store = await Store.findOneAndUpdate(
      { user: userId },
      { $pull: { [updateField]: apiId } },
      { new: true }
    );

    await Notification.create({
      user: userId,
      type: "API",
      itemId: apiId,
      action: "delete",
      message: "API removed from favorites",
    });

    res.status(200).json({ message: "API removed from favorites", store });
  } catch (error) {
    console.error("Remove API error:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ---------------------- REMOVE LIBRARY FROM FAVORITES ---------------------- */
router.delete("/removeLibrary", async (req, res) => {
  try {
    const { userId, libraryId } = req.body;
    const store = await Store.findOneAndUpdate(
      { user: userId },
      { $pull: { libraries: libraryId } },
      { new: true }
    );

    await Notification.create({
      user: userId,
      type: "Library",
      itemId: libraryId,
      action: "delete",
      message: "Library removed from favorites",
    });

    res.status(200).json({ message: "Library removed from favorites", store });
  } catch (error) {
    console.error("Remove Library error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
