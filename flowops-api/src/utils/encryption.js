/**
 * Encrypt / decrypt sensitive strings at rest (e.g. GitHub access tokens).
 * Uses AES-256-GCM with a random IV per ciphertext.
 *
 * Requires ENCRYPTION_KEY env var (hex-encoded 32-byte key, i.e. 64 hex chars).
 * If ENCRYPTION_KEY is not set, falls back to plaintext (logs a warning once).
 */
const crypto = require("crypto");
const logger = require("./logger");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

let _key = null;
let _warned = false;

function getKey() {
  if (_key) return _key;
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    if (!_warned) {
      logger.warn("ENCRYPTION_KEY not set – access tokens stored in plaintext");
      _warned = true;
    }
    return null;
  }
  _key = Buffer.from(hex, "hex");
  if (_key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return _key;
}

/**
 * Encrypt a plaintext string.
 * Returns a base64 string: iv + authTag + ciphertext
 */
function encrypt(plaintext) {
  const key = getKey();
  if (!key) return plaintext; // fallback

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Decrypt a base64 string produced by encrypt().
 * Returns the original plaintext.
 */
function decrypt(ciphertext) {
  const key = getKey();
  if (!key) return ciphertext; // fallback – assume stored as plaintext

  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted, undefined, "utf8") + decipher.final("utf8");
}

module.exports = { encrypt, decrypt };
