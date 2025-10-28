const express = require('express');
const appRouter = express.Router();
const { User } = require('../models/user');
const bcrypt = require('bcrypt');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

/* =======================================================
   ✅ SIGNUP
======================================================= */
appRouter.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName) {
      throw new Error("Name is required!");
    }
    if (!validator.isEmail(email)) {
      throw new Error("Invalid email address!");
    }
    if (!validator.isStrongPassword(password)) {
      throw new Error("Please choose a stronger password!");
    }

    const existing = await User.findOne({ email });
    if (existing) throw new Error("Email already registered!");

    const passwordHashed = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      email,
      password: passwordHashed
    });
    await user.save();

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* =======================================================
   ✅ LOGIN
======================================================= */
appRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Incorrect password" });

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    user.isActive = true;
    await user.save();

    res.status(200).json({
      message: "Login successful",
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        _id: user._id,
        token
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* =======================================================
   ✅ FORGET PASSWORD (Send Email Link)
======================================================= */
appRouter.post('/forget-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new Error("Email not found!");

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '10m' });

    user.resetToken = token;
    await user.save({ validateBeforeSave: false });

    const frontendURL = process.env.FRONTEND_URL || "https://apiverse-frotend.vercel.app";
    const resetLink = `${frontendURL}/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'jethanandj52@gmail.com',
        pass: process.env.EMAIL_PASS || 'zsnvgtugeahrpnpi'
      }
    });

    const mailOptions = {
      from: 'APIverse <jethanandj52@gmail.com>',
      to: email,
      subject: 'Reset Your Password - APIverse',
      html: `
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
        <p>This link will expire in 10 minutes.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Password reset link sent to your email!" });

  } catch (error) {
    console.error("Forget Password Error:", error);
    res.status(400).json({ error: error.message });
  }
});

/* =======================================================
   ✅ RESET PASSWORD
======================================================= */
appRouter.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ message: "New password is required." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.resetToken !== token) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = null;
    await user.save();

    console.log(`✅ Password reset successful for user: ${user.email}`);
    res.json({ message: "Password updated successfully!" });
  } catch (error) {
    console.error("⚠️ Reset Password Error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Token expired. Please request again." });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid token. Please request again." });
    }

    res.status(500).json({ message: "Server error while resetting password." });
  }
});

/* =======================================================
   ✅ LOGOUT
======================================================= */
appRouter.post('/logout', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.isActive = false;
    await user.save();

    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });

    return res.status(200).json({ msg: 'Logout successful' });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ msg: "Server error during logout" });
  }
});

module.exports = appRouter;
