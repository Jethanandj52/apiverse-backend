const express = require('express');
const mongoose = require('mongoose');
const Library = require('../models/lib');
const { User } = require('../models/user');   // ✅ Users for subscription
const Notification = require('../models/notification'); // ✅ Notifications
const { userAuth } = require('../middleware/Auth');

const libraryRoute = express.Router();

// ✅ Public - GET all libraries
libraryRoute.get('/getlibraries', userAuth, async (req, res) => {
  try {
    const libraries = await Library.find();
    res.json(libraries);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch libraries' });
  }
});

// ✅ Public - GET a single library by ID
libraryRoute.get('/getLibById/:id', async (req, res) => {
  try {
    const lib = await Library.findById(req.params.id);
    if (!lib) return res.status(404).json({ message: 'Library not found' });
    res.json(lib);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Protected - POST Add a new library
libraryRoute.post("/libraryAddDB", userAuth, async (req, res) => {
  try {
    const newLibrary = new Library(req.body);
    await newLibrary.save();
    res.status(201).json({ message: "Library saved successfully." });
  } catch (error) {
    console.error("❌ Save Error:", error.message);
    res.status(500).json({ error: "Error saving library.", details: error.message });
  }
});

// ✅ Protected - POST Add multiple libraries
libraryRoute.post("/libraryAddMany", userAuth, async (req, res) => {
  try {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "Request body must be a non-empty array" });
    }

    const newLibraries = await Library.insertMany(req.body);
    res.status(201).json({
      message: `${newLibraries.length} libraries saved successfully.`,
      data: newLibraries
    });
  } catch (error) {
    console.error("❌ Bulk Save Error:", error.message);
    res.status(500).json({ error: "Error saving libraries.", details: error.message });
  }
});

// ✅ Protected - PUT Update library + Notifications
// ✅ Protected - PUT Update library + Notifications
// ✅ Protected - PUT Update library + Notifications
libraryRoute.put("/updateLib/:id", userAuth, async (req, res) => {
  try {
    const lib = await Library.findById(req.params.id);
    if (!lib) return res.status(404).json({ message: "Library not found" });

    const updated = await Library.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(400).json({ message: "Update failed" });

    // ✅ Compare old vs new fields (ignore updatedAt)
    let changes = [];
    for (let key in req.body) {
      if (key === "updatedAt") continue; // ignore updatedAt
      if (JSON.stringify(lib[key]) !== JSON.stringify(updated[key])) {
        changes.push({ field: key, old: lib[key], new: updated[key] });
      }
    }

    // ✅ Send notifications if there are any changes
    if (changes.length > 0) {
      let targetCategory = updated.category || lib.category;

      const users = await User.find({ subscriptions: targetCategory });

      // Combine all changes into a single message
      let changeSummary = changes
        .map(c => `${c.field}: "${c.old}" → "${c.new}"`)
        .join(", ");

      for (const user of users) {
        const notif = new Notification({
          user: user._id,
          type: "Library",
          itemId: updated._id,
          message: `Library "${lib.name}" updated. Changes: ${changeSummary}`,
        });
        await notif.save();
      }
    }

    res.json({ message: "Updated successfully", updated, changes });
  } catch (err) {
    console.error("Update error:", err.message);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});



// ✅ Protected - DELETE library + Notifications
libraryRoute.delete("/deletelibrary/:id", userAuth, async (req, res) => {
  const id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {
    const lib = await Library.findById(id);
    if (!lib) return res.status(404).json({ error: "Library not found" });

    await Library.findByIdAndDelete(id);

    // ✅ Send notifications if category exists
    if (lib.category) {
      const users = await User.find({ subscriptions: lib.category });
      for (const user of users) {
        const notif = new Notification({
          user: user._id,
          type: "Library",
          itemId: lib._id,
          message: `Admin deleted Library "${lib.name}"`,
        });
        await notif.save();
      }
    }

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting:", err.message);
    res.status(500).json({ error: "Deletion failed" });
  }
});

// 🔍 Search libraries endpoint
libraryRoute.get('/search', userAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchRegex = new RegExp(q, 'i');

    const searchResults = await Library.find({
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { language: searchRegex }
      ]
    });

    res.json(searchResults);
  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

module.exports = libraryRoute;
