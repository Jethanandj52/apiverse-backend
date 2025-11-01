const jwt = require("jsonwebtoken");
const { User } = require("../models/user");

const userAuth = async (req, res, next) => {
  try {
    // Header se token
    const authHeader = req.headers.authorization; // "Bearer <token>"
    if (!authHeader) throw new Error("Token not found in headers");

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded._id);
    if (!user) throw new Error("User not found");

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

module.exports = { userAuth };
