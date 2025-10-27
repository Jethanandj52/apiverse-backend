const express = require('express');
const Api = require('../models/api');
const { User } = require('../models/user');
const Notification = require('../models/notification');
const { userAuth } = require('../middleware/Auth');

const apiRoute = express.Router();

// ✅ Single API insert
apiRoute.post("/addApiDB", userAuth, async (req, res) => {
  try {
    const newApi = new Api(req.body);
    await newApi.save();
    res.status(201).json({ message: "API saved successfully." });
  } catch (error) {
    console.error("❌ Save Error:", error.message);
    res.status(500).json({ error: "Error saving API.", details: error.message });
  }
});

// ✅ Multiple APIs insert
apiRoute.post("/addManyApis", async (req, res) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: "Request body must be an array of APIs" });

    const insertedApis = await Api.insertMany(req.body);
    res.status(201).json({ message: `${insertedApis.length} APIs saved successfully.`, data: insertedApis });
  } catch (error) {
    console.error("❌ Bulk Insert Error:", error.message);
    res.status(500).json({ error: "Error inserting multiple APIs.", details: error.message });
  }
});

// ✅ Show all APIs
apiRoute.get('/showApi', userAuth, async (req, res) => {
  try {
    const allApis = await Api.find();
    res.json(allApis);
  } catch (err) {
    console.error("Error fetching APIs:", err.message);
    res.status(500).jsona({ message: 'Failed to fetch APIs', error: err.message });
  }
});

// ✅ Get API by ID
apiRoute.get('/getApiById/:id', async (req, res) => {
  try {
    const api = await Api.findById(req.params.id);
    if (!api) return res.status(404).json({ message: "API not found" });
    res.json(api);
  } catch (err) {
    console.error("Error fetching API by ID:", err.message);
    res.status(500).json({ message: 'Failed to fetch API by ID', error: err.message });
  }
});

// ✅ Update API with notifications (Library style)
apiRoute.put("/updateApi/:id", userAuth, async (req, res) => {
  try {
    const api = await Api.findById(req.params.id);
    if (!api) return res.status(404).json({ message: "API not found" });

    const updated = await Api.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(400).json({ message: "Update failed" });

    // ✅ Compare old vs new fields (ignore updatedAt)
    let changes = [];
    for (let key in req.body) {
      if (key === "updatedAt") continue; // ignore updatedAt
      if (JSON.stringify(api[key]) !== JSON.stringify(updated[key])) {
        changes.push({ field: key, old: api[key], new: updated[key] });
      }
    }

    // ✅ Send notifications if any changes
    if (changes.length > 0 && api.category) {
      const users = await User.find({ subscriptions: api.category });

      let changeSummary = changes
        .map(c => `${c.field}: "${c.old}" → "${c.new}"`)
        .join(", ");

      for (const user of users) {
        const notif = new Notification({
          user: user._id,
          type: "API",
          itemId: updated._id,
          message: `API "${api.name}" updated. Changes: ${changeSummary}`,
        });
        await notif.save();
      }
    }

    res.json({ message: "Updated successfully", updated, changes });
  } catch (error) {
    console.error("❌ Update failed:", error.stack);
    res.status(500).json({ message: "Update failed", error: error.message });
  }
});

// ✅ Delete API with notifications
apiRoute.delete("/deleteApi/:id", userAuth, async (req, res) => {
  try {
    const api = await Api.findById(req.params.id);
    if (!api) return res.status(404).json({ message: "API not found" });

    await Api.findByIdAndDelete(req.params.id);

    if (api.category) {
      const users = await User.find({ subscriptions: api.category });
      for (const user of users) {
        const notif = new Notification({
          user: user._id,
          type: "API",
          itemId: api._id,
          message: `Admin deleted API "${api.name}"`,
        });
        await notif.save();
      }
    }

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting:", err.message);
    res.status(500).json({ message: "Deletion failed", error: err.message });
  }
});

// ✅ Search APIs
apiRoute.get('/search', userAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') return res.status(400).json({ message: 'Search query is required' });

    const searchRegex = new RegExp(q, 'i');
    const searchResults = await Api.find({
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

module.exports = apiRoute;
