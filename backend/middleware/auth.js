const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to authenticate user using JWT stored in HttpOnly cookie
const requireAuth = async (req, res, next) => {
  try {
    // Read JWT from cookie (or optional Authorization header fallback)
    const token =
      req.cookies?.token ||
      (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({ message: "Authentication required. Please log in." });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found. Please log in again." });
    }

    // Attach authenticated user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired session. Please log in again.",
    });
  }
};

module.exports = requireAuth;
