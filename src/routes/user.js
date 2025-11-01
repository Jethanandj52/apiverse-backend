const express = require('express');
const userHD = express.Router();
const { User } = require('../models/user');
const { userAuth } = require('../middleware/Auth');

// Get current logged-in user
userHD.get('/user', userAuth, async (req, res) => {
  try {
    res.json({
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      _id: req.user._id,
      isActive: req.user.isActive
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: Get all users
userHD.get('/admin/users', userAuth, async (req, res) => {
  try {
    if (req.user.email !== 'admin@gmail.com') {
      return res.status(403).json({ error: "Access denied: Admin only" });
    }

    const users = await User.find().select('-password'); // Hide passwords
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

// Admin: Delete a user
userHD.delete('/admin/user/:id', userAuth, async (req, res) => {
  try {
    if (req.user.email !== 'admin@gmail.com') {
      return res.status(403).json({ error: "Access denied: Admin only" });
    }

    const userId = req.params.id;
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

module.exports = userHD;
