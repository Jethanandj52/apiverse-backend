const Api = require("../models/api");
const { User } = require("../models/user");
const Notification = require("../models/notification");

// ✅ Create API + send notification
exports.createApi = async (req, res) => {
  try {
    const api = new Api(req.body);
    await api.save();

    // Send notification to all users subscribed to this API category
    if (api.category) {
      const subscribers = await User.find({ subscriptions: api.category });
      for (let user of subscribers) {
        await Notification.create({
          user: user._id,
          type: "API",
          itemId: api._id,
          message: `New API added: ${api.name} (v${api.version})`
        });
      }
    }

    res.status(201).json(api);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Update API + send notification (fix merge issue)
exports.updateApi = async (req, res) => {
  try {
    const api = await Api.findById(req.params.id);
    if (!api) return res.status(404).json({ message: "API not found" });

    // Merge old + new data
    Object.assign(api, req.body);
    const updated = await api.save();

    // Track changes
    let changes = [];
    for (let key in req.body) {
      if (JSON.stringify(api[key]) !== JSON.stringify(req.body[key])) {
        changes.push({ field: key, old: api[key], new: req.body[key] });
      }
    }

    // Send notifications
    if (changes.length > 0 && api.category) {
      const users = await User.find({ subscriptions: api.category });
      let changeSummary = changes
        .map(c => `${c.field}: "${c.old}" → "${c.new}"`)
        .join(", ");

      for (const user of users) {
        await Notification.create({
          user: user._id,
          type: "API",
          itemId: updated._id,
          message: `API "${api.name}" updated. Changes: ${changeSummary}`
        });
      }
    }

    res.json({ message: "Updated successfully", updated, changes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Delete API + notify subscribers
exports.deleteApi = async (req, res) => {
  try {
    const api = await Api.findById(req.params.id);
    if (!api) return res.status(404).json({ message: "API not found" });

    await Api.findByIdAndDelete(req.params.id);

    if (api.category) {
      const users = await User.find({ subscriptions: api.category });
      for (const user of users) {
        await Notification.create({
          user: user._id,
          type: "API",
          itemId: api._id,
          message: `Admin deleted API "${api.name}"`
        });
      }
    }

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get all APIs
exports.getApis = async (req, res) => {
  try {
    const apis = await Api.find();
    res.json(apis);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get API by ID
exports.getApiById = async (req, res) => {
  try {
    const api = await Api.findById(req.params.id);
    if (!api) return res.status(404).json({ message: "API not found" });
    res.json(api);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
