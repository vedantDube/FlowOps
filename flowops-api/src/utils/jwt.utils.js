const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "flowops-dev-secret-change-in-prod";
const EXPIRY = process.env.JWT_EXPIRY || "7d";

/**
 * Sign a JWT token containing user payload
 */
function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

/**
 * Verify and decode a JWT token
 * Returns decoded payload or throws
 */
function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
