import * as crypto from 'crypto';
import { ConfigurationError } from '../errors/AppErrors.js';
import { ENCRYPTION_KEY_LENGTH } from '../config/constants.js';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

function getEncryptionKey(): string {
  // Get the encryption key from environment variables
  // We expect a 32-byte key, represented as a 64-character hex string
  const key = process.env.ENCRYPTION_KEY || '';

  if (!key || key.length !== ENCRYPTION_KEY_LENGTH) {
    throw new ConfigurationError(
      'FATAL: ENCRYPTION_KEY is missing or invalid (must be 64 hex chars). Application cannot start safely.'
    );
  }
  return key;
}

function getKeyBuffer(): Buffer {
  // Key is guaranteed valid by the check above
  return Buffer.from(getEncryptionKey(), 'hex');
}

export function encrypt(text: string): string {
  if (!text) return '';
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  if (!text) return '';
  
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) {
      throw new Error('Invalid encryption format: Expected IV:EncryptedText');
    }
    
    const ivHex = textParts[0];
    const encryptedHex = textParts[1];
    
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getKeyBuffer(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Decryption failed: Invalid key or corrupted data.');
  }
}
