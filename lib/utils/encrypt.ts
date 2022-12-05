import crypto from "crypto";

/**
 * encrypt string using AES256
 * @param password
 * @param text 
 * @returns 
 */
export function encryptString(password: string, text: string): string {
    const passwordHash = crypto.createHash('sha256').update(password, 'ascii').digest();
    const initVector = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', passwordHash, initVector);
    const encbuf = cipher.update(text, 'utf-8');
    return Buffer.concat([initVector, encbuf]).toString('base64');
}

/**
 * decrypt string using AES256
 * @param password 
 * @param encryptedText 
 * @returns 
 */
export function decryptString(password: string, encryptedText: string): string {
    const passwordHash = crypto.createHash('sha256').update(password, 'ascii').digest();
    const encIvBuf = Buffer.from(encryptedText, 'base64');
    const initVector = encIvBuf.subarray(0, 16);
    const encBuf = encIvBuf.subarray(16);
    const cipher = crypto.createDecipheriv('aes-256-gcm', passwordHash, initVector);
    return cipher.update(encBuf).toString('utf-8');
}