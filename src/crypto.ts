import { Buffer } from 'node:buffer';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export class CryptoUtils {
  static sha256(s: string): string {
    return createHash('sha256').update(s).digest('hex');
  }

  static safeConcat(...values: string[]): string {
    let s = '';
    values.forEach((v) => {
      s += this.sha256(v);
    });
    return this.sha256(s);
  }

  static slowHash(password: string, pepper: string): string {
    const HASH_ITERATIONS = 10000;
    const KEY_LENGTH = 64;
    const DIGEST = 'sha512';
    return pbkdf2Sync(
      password,
      pepper,
      HASH_ITERATIONS,
      KEY_LENGTH,
      DIGEST,
    ).toString('hex');
  }

  static generateNewSessionId(): string {
    // https://security.stackexchange.com/a/255773/36751
    // "Use a cryptographically secure random number generator (CSPRNG)
    // to generate a random session ID. A length of 16 bytes (128 bits) is fine."
    const N_BYTES = 16;
    return randomBytes(N_BYTES).toString('hex');
  }

  // https://security.stackexchange.com/a/31846
  // "16 bytes are enough so that you will never see a salt collision in your life"
  static generateNewSalt() {
    return this.generateNewSessionId();
  }

  static generateNewEmailToken() {
    return this.generateNewSessionId();
  }

  static hashSessionId(sessionId: string): string {
    // https://security.stackexchange.com/a/255773/36751
    // "Because the session ID is a long random string,
    // you do not need to use anything more than a cryptographic
    // hash (e.g. SHA256) here. The hash does not need to be salted,
    // and you don't need a computationally hard KDF like Argon2, bcrypt, or PBKDF2."
    return this.sha256(sessionId);
  }

  static generateNewEncryptionKey() {
    const KEY_BYTE_LEN = 32;
    return randomBytes(KEY_BYTE_LEN).toString('hex');
  }

  static encrypt<T extends string | null | undefined>(
    plain: T,
    key: string,
  ): T {
    // https://stackoverflow.com/a/53573115
    if (!plain) return plain;
    const IV_BYTE_LEN = 12;
    const iv = randomBytes(IV_BYTE_LEN);
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    let encryptedMessage = cipher.update(Buffer.from(plain, 'utf-8'));
    encryptedMessage = Buffer.concat([encryptedMessage, cipher.final()]);
    return Buffer.concat([iv, encryptedMessage, cipher.getAuthTag()]).toString(
      'hex',
    ) as T;
  }

  static decrypt<T extends string | null | undefined>(
    encrypted: T,
    key: string,
  ): T {
    // https://stackoverflow.com/a/53573115
    if (!encrypted) return encrypted;
    const ciphertext = Buffer.from(encrypted, 'hex');
    const authTag = ciphertext.subarray(-16);
    const iv = ciphertext.subarray(0, 12);
    const encryptedMessage = ciphertext.subarray(12, -16);
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(key, 'hex'),
      iv,
    );
    decipher.setAuthTag(authTag);
    let messagetext = decipher.update(encryptedMessage);
    messagetext = Buffer.concat([messagetext, decipher.final()]);
    return messagetext.toString('utf8') as T;
  }

  static safeEqual(a: string, b: string): boolean {
    try {
      return timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }
}
