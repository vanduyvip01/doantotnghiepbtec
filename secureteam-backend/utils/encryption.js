/**
 * E2E Encryption Utilities with TweetNaCl.js
 * Uses Curve25519 + XSalsa20 + Poly1305
 */

const nacl = require('tweetnacl');
const utils = require('tweetnacl-util');

class EncryptionService {
  /**
   * Generate keypair cho user
   * @returns { publicKey: string (base64), privateKey: string (base64) }
   */
  static generateKeyPair() {
    const keyPair = nacl.box.keyPair();
    return {
      publicKey: utils.encodeBase64(keyPair.publicKey),
      privateKey: utils.encodeBase64(keyPair.secretKey),
    };
  }

  /**
   * Encrypt một tin nhắn cho người nhận
   * @param {string} message - Tin nhắn gốc
   * @param {string} recipientPublicKeyB64 - Public key của người nhận (base64)
   * @param {string} senderPrivateKeyB64 - Private key của người gửi (base64)
   * @returns { ciphertext: string (base64), nonce: string (base64) }
   */
  static encryptMessage(message, recipientPublicKeyB64, senderPrivateKeyB64) {
    try {
      // Decode keys từ base64
      const recipientPublicKey = utils.decodeBase64(recipientPublicKeyB64);
      const senderPrivateKey = utils.decodeBase64(senderPrivateKeyB64);

      // Tạo nonce ngẫu nhiên (24 bytes)
      const nonce = nacl.randomBytes(24);

      // Convert message sang bytes (proper UTF8 encoding)
      const messageBytes = new TextEncoder().encode(message);

      // Encrypt
      const ciphertext = nacl.box(messageBytes, nonce, recipientPublicKey, senderPrivateKey);

      return {
        ciphertext: utils.encodeBase64(ciphertext),
        nonce: utils.encodeBase64(nonce),
      };
    } catch (error) {
      console.error('Encryption error:', error.message);
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  /**
   * Decrypt tin nhắn
   * @param {string} ciphertextB64 - Ciphertext (base64)
   * @param {string} nonceB64 - Nonce (base64)
   * @param {string} senderPublicKeyB64 - Public key của người gửi (base64)
   * @param {string} recipientPrivateKeyB64 - Private key của người nhận (base64)
   * @returns {string} Tin nhắn gốc
   */
  static decryptMessage(ciphertextB64, nonceB64, senderPublicKeyB64, recipientPrivateKeyB64) {
    try {
      // Decode từ base64
      const ciphertext = utils.decodeBase64(ciphertextB64);
      const nonce = utils.decodeBase64(nonceB64);
      const senderPublicKey = utils.decodeBase64(senderPublicKeyB64);
      const recipientPrivateKey = utils.decodeBase64(recipientPrivateKeyB64);

      // Decrypt
      const messageBytes = nacl.box.open(ciphertext, nonce, senderPublicKey, recipientPrivateKey);

      if (!messageBytes) {
        throw new Error('Decryption failed - message could not be opened');
      }

      return new TextDecoder().decode(messageBytes);
    } catch (error) {
      console.error('Decryption error:', error.message);
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  /**
   * Encrypt private key dùng password (cho storage)
   * Đơn giản: PBKDF2 derived key + XSalsa20Poly1305
   * @param {string} privateKeyB64 - Private key (base64)
   * @param {string} password - User password
   * @returns {string} Encrypted private key (base64)
   */
  static encryptPrivateKeyWithPassword(privateKeyB64, password) {
    try {
      // Simplified: dùng password hash as key (production: dùng PBKDF2)
      const crypto = require('crypto');
      const key = crypto
        .createHash('sha256')
        .update(password)
        .digest(); // 32 bytes

      const nonce = nacl.randomBytes(24);
      const messageBytes = utils.decodeBase64(privateKeyB64);

      // Đây là symmetric encryption (secretbox)
      const ciphertext = nacl.secretbox(messageBytes, nonce, key);

      // Gộp nonce + ciphertext
      const combined = new Uint8Array(nonce.length + ciphertext.length);
      combined.set(nonce);
      combined.set(ciphertext, nonce.length);

      return utils.encodeBase64(combined);
    } catch (error) {
      console.error('Private key encryption error:', error.message);
      throw error;
    }
  }

  /**
   * Decrypt private key dùng password
   * @param {string} encryptedPrivateKeyB64 - Encrypted private key (base64)
   * @param {string} password - User password
   * @returns {string} Private key (base64)
   */
  static decryptPrivateKeyWithPassword(encryptedPrivateKeyB64, password) {
    try {
      const crypto = require('crypto');
      const key = crypto
        .createHash('sha256')
        .update(password)
        .digest();

      const combined = utils.decodeBase64(encryptedPrivateKeyB64);

      // Extract nonce (first 24 bytes)
      const nonce = combined.slice(0, 24);
      const ciphertext = combined.slice(24);

      // Decrypt
      const messageBytes = nacl.secretbox.open(ciphertext, nonce, key);

      if (!messageBytes) {
        throw new Error('Invalid password or corrupted key');
      }

      return utils.encodeBase64(messageBytes);
    } catch (error) {
      console.error('Private key decryption error:', error.message);
      throw error;
    }
  }

  /**
   * Verify keypair (check if they match)
   * @param {string} publicKeyB64
   * @param {string} privateKeyB64
   * @returns {boolean}
   */
  static verifyKeyPair(publicKeyB64, privateKeyB64) {
    try {
      const publicKey = utils.decodeBase64(publicKeyB64);
      const privateKey = utils.decodeBase64(privateKeyB64);

      // Generate public key from private key
      const keyPair = nacl.box.keyPair.fromSecretKey(privateKey);

      // Compare
      const generatedPublic = utils.encodeBase64(keyPair.publicKey);
      return generatedPublic === publicKeyB64;
    } catch (error) {
      return false;
    }
  }
}

module.exports = EncryptionService;
