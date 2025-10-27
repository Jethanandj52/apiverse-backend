const express = require('express');
const appRouter = express.Router();
const { User } = require('../models/user');
const bcrypt = require('bcrypt');
const validator = require('validator');
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');

// ======================== SIGNUP ========================
appRouter.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // ✅ Validation
    if (!firstName || !lastName) {
      throw new Error("Name not found!");
    } else if (!validator.isEmail(email)) {
      throw new Error("Invalid Email!");
    } else if (!validator.isStrongPassword(password)) {
      throw new Error("Type a Strong password!");
    }

    // ✅ Check existing user
    const existing = await User.findOne({ email });
    if (existing) throw new Error("Email already registered!");

    // ✅ Hash password
    const passwordHashed = await bcrypt.hash(password, 10);

    // ✅ Save user
    const user = new User({
      firstName,
      lastName,
      email,
      password: passwordHashed
    });
    await user.save();

    // ✅ Create JWT
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // ✅ Send cookie + response
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // ❌ development me false
      sameSite: "Lax",
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(201).json({ message: "User Added Successfully!"});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// ======================== LOGIN ========================
appRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Incorrect password" });

    // ✅ Create token
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // ✅ Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // production me true
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    user.isActive = true;
    await user.save();

    res.status(200).json({ message: "Login successful", user: { firstName: user.firstName, lastName: user.lastName, email: user.email, _id: user._id, token } });
  } catch (error) {
    console.error("Login error:");
    res.status(500).json({ error: "Server error" });
  }
});


// ======================== FORGET PASSWORD ========================
appRouter.post('/forget-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new Error("Email not found");

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '10m' });

    // ✅ Save reset token in DB
    user.resetToken = token;
    await user.save();

    const resetLink = `http://localhost:5173/reset-password/${token}`;

    // ✅ Send Email via Nodemailer
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
      html: `<p>Click the link below to reset your password:</p>
             <a href="${resetLink}">${resetLink}</a>
             <p>This link expires in 10 minutes.</p>`
    };

    await transporter.sendMail(mailOptions);
    res.send({ message: "Password reset link sent to your email" });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// ======================== RESET PASSWORD ========================
// ======================== RESET PASSWORD ========================
appRouter.post('/reset-password/:token', async (req, res) => {
   const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ message: "New password is required." });
  }

  try {
    // ✅ Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Find user with matching resetToken
    const user = await User.findOne({ _id: decoded._id, resetToken: token });
    if (!user) {
      return res.status(404).json({ message: "Invalid or expired token." });
    }

    // ✅ Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ✅ Update user password and clear reset token
    user.password = hashedPassword;
    user.resetToken = null; // clear token
    await user.save();

    console.log(`✅ Password reset successful for user: ${user.email}`);

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("⚠️ Reset Password Error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Token has expired. Please request a new password reset." });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid token. Please request a new password reset." });
    }

    res.status(500).json({ message: "Server error while resetting password." });
  }
});



// ======================== LOGOUT ========================
appRouter.post('/logout', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.isActive = false;
    await user.save();

    res.clearCookie("token", {
      httpOnly: true,
      secure: false, // ❌ local me false, prod me true
      sameSite: "Lax"
    });

    return res.status(200).json({ msg: 'Logout successful' });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ msg: "Server error during logout" });
  }
});

module.exports = appRouter;
