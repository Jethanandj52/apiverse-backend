const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const { userAuth } = require("../middleware/Auth");


// ======================== CREATE GROUP ========================
router.post("/create", userAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Group name is required" });

    const group = new Group({
      name,
      description,
      createdBy: req.user._id,
      members: [req.user._id], // creator automatically member
    });

    await group.save();
    res.status(201).json({ message: "Group created successfully", group });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ error: error.message });
  }
});


// ======================== GET MY GROUPS ========================
router.get("/myGroups", userAuth, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id });
    res.status(200).json(groups);
  } catch (error) {
    console.error("Get groups error:", error);
    res.status(500).json({ error: error.message });
  }
});


// ======================== UPDATE GROUP ========================
router.put("/update/:id", userAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Only creator can update
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the creator can update this group" });
    }

    if (name) group.name = name;
    if (description) group.description = description;

    await group.save();
    res.status(200).json({ message: "Group updated successfully", group });
  } catch (error) {
    console.error("Update group error:", error);
    res.status(500).json({ error: error.message });
  }
});


// ======================== DELETE GROUP ========================
router.delete("/delete/:id", userAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Only creator can delete
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the creator can delete this group" });
    }

    await Group.findByIdAndDelete(id);
    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Delete group error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
