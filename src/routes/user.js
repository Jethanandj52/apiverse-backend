const express = require('express');
const userHD = express.Router()
const { User } = require('../models/user');
const { userAuth } = require('../middleware/Auth');
 


userHD.get('/user',  async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(400).json("Error: " + error.message);
  }
});

userHD.get('/admin/users', async (req, res) => {
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

userHD.delete('/admin/user/:id', async (req, res) => {
  try {
    if (req.user.email !== 'admin@gmail.com') {
      return res.status(403).json({ error: "Access denied: Admin only" });
    }

    const userId = req.params.id;
    await User.findByIdAndDelete(userId);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error: " + error.message });
  }
});
  
 

module.exports = userHD