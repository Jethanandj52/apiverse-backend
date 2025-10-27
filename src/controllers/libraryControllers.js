const Library = require("../models/lib");
const { User } = require("../models/user");
const Notification = require("../models/notification");

// ✅ Create Library
exports.createLibrary = async (req, res) => {
  try {
    const library = new Library(req.body);
    await library.save();

    const subscribers = await User.find({ subscriptions: "library" });
    for (let user of subscribers) {
      await Notification.create({
        user: user._id,
        message: `New Library added: ${library.name} (v${library.version})`
      });
    }

    res.status(201).json(library);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Update Library
exports.updateLibrary = async (req, res) => {
  try {
    const library = await Library.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!library) return res.status(404).json({ message: "Library not found" });

    const subscribers = await User.find({ subscriptions: "library" });
    for (let user of subscribers) {
      await Notification.create({
        user: user._id,
        message: `Library updated: ${library.name} (v${library.version})`
      });
    }

    res.json(library);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get all Libraries
exports.getLibraries = async (req, res) => {
  try {
    const libraries = await Library.find();
    res.json(libraries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
