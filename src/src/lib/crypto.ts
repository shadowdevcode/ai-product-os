import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
    const hexKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (!hexKey) {
        throw new Error('Missing TOKEN_ENCRYPTION_KEY environment variable');
    }
    const key = Buffer.from(hexKey, 'hex');
    if (key.length !== 32) {
        throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
    }
    return key;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a combined string: iv:authTag:ciphertext (all base64)
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt a string produced by encrypt().
 * Expects format: iv:authTag:ciphertext (all base64)
 */
export function decrypt(encryptedStr: string): string {
    const key = getEncryptionKey();
    const parts = encryptedStr.split(':');

    if (parts.length !== 3) {
        throw new Error('Invalid encrypted token format');
    }

    const [ivB64, authTagB64, ciphertext] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid encrypted token components');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
