const jwt = require("jsonwebtoken");

function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from Bearer header

  if (!token) {
    return res.status(403).json({ message: "Access denied, no token provided" });
  }

  try {
    const decoded = jwt.verify(token, "secretKey");
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: "Access denied, not an admin" });
    }
    req.user = decoded; // Attach user info to the request object
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { verifyAdmin };
