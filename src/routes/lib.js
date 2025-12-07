const express = require('express');
const mongoose = require('mongoose');
const Library = require('../models/lib');
const { User } = require('../models/user'); // Users for subscription notifications
const Notification = require('../models/notification');
const { userAuth } = require('../middleware/Auth');

const libraryRoute = express.Router();

// ✅ Public - GET all libraries
libraryRoute.get('/getlibraries', async (req, res) => {
  try {
    const libraries = await Library.find();
    res.json(libraries);
  } catch (err) {
    console.error("Fetch libraries error:", err.message);
    res.status(500).json({ message: 'Failed to fetch libraries', error: err.message });
  }
});

// ✅ Public - GET a single library by ID
libraryRoute.get('/getLibById/:id', async (req, res) => {
  try {
    const lib = await Library.findById(req.params.id);
    if (!lib) return res.status(404).json({ message: 'Library not found' });
    res.json(lib);
  } catch (err) {
    console.error("Get library by ID error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Protected - POST Add a new library
libraryRoute.post('/libraryAddDB', async (req, res) => {
  try {
    const newLibrary = new Library(req.body);
    await newLibrary.save();
    res.status(201).json({ message: "Library saved successfully.", data: newLibrary });
  } catch (err) {
    console.error("Save library error:", err.message);
    res.status(500).json({ error: "Error saving library", details: err.message });
  }
});

// ✅ Protected - POST Add multiple libraries
libraryRoute.post('/libraryAddMany', async (req, res) => {
  try {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "Request body must be a non-empty array" });
    }
    const newLibraries = await Library.insertMany(req.body);
    res.status(201).json({ message: `${newLibraries.length} libraries saved successfully.`, data: newLibraries });
  } catch (err) {
    console.error("Bulk save error:", err.message);
    res.status(500).json({ error: "Error saving libraries", details: err.message });
  }
});

// ✅ Protected - PUT Update library + Notifications
libraryRoute.put('/updateLib/:id', async (req, res) => {
  try {
    const lib = await Library.findById(req.params.id);
    if (!lib) return res.status(404).json({ message: "Library not found" });

    const updated = await Library.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(400).json({ message: "Update failed" });

    // Compare old vs new fields (ignore updatedAt)
    let changes = [];
    for (let key in req.body) {
      if (key === "updatedAt") continue;
      if (JSON.stringify(lib[key]) !== JSON.stringify(updated[key])) {
        changes.push({ field: key, old: lib[key], new: updated[key] });
      }
    }

    // Send notifications to subscribed users
    if (changes.length > 0) {
      const targetCategory = updated.category || lib.category;
      const users = await User.find({ subscriptions: targetCategory });
      const changeSummary = changes.map(c => `${c.field}: "${c.old}" → "${c.new}"`).join(", ");
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
    console.error("Update library error:", err.message);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

// ✅ Protected - DELETE library + Notifications
libraryRoute.delete('/deletelibrary/:id', async (req, res) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID format" });

  try {
    const lib = await Library.findById(id);
    if (!lib) return res.status(404).json({ error: "Library not found" });

    await Library.findByIdAndDelete(id);

    // Notify subscribed users
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
    console.error("Delete library error:", err.message);
    res.status(500).json({ error: "Deletion failed", details: err.message });
  }
});

// 🔍 Search libraries endpoint
libraryRoute.get('/search', userAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') return res.status(400).json({ message: 'Search query is required' });

    const regex = new RegExp(q, 'i');
    const results = await Library.find({
      $or: [
        { name: regex },
        { description: regex },
        { category: regex },
        { language: regex }
      ]
    });

    res.json(results);
  } catch (err) {
    console.error("Search libraries error:", err.message);
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

module.exports = libraryRoute;
