const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Get the encryption secret from environment.
 * @returns {Buffer} 32-byte key
 */
function getEncryptionKey() {
    const secret = process.env.AI_KEY_ENCRYPTION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error(
            'AI_KEY_ENCRYPTION_SECRET must be set in environment and be at least 32 characters.'
        );
    }
    // Use first 32 bytes of the secret
    return Buffer.from(secret.slice(0, 32), 'utf8');
}

/**
 * Encrypt a plaintext string using AES-256-CBC.
 * Returns a hex string in the format: iv:encrypted
 *
 * @param {string} plaintext
 * @returns {string} encrypted string
 */
function encrypt(plaintext) {
    if (!plaintext) return null;

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string that was encrypted with encrypt().
 *
 * @param {string} encryptedText – in format iv:encrypted (hex)
 * @returns {string} decrypted plaintext
 */
function decrypt(encryptedText) {
    if (!encryptedText) return null;

    const key = getEncryptionKey();
    const [ivHex, encrypted] = encryptedText.split(':');

    if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

module.exports = { encrypt, decrypt };
