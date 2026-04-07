/**
 * Client-side E2E Encryption Utilities
 * Uses TweetNaCl.js
 */

import nacl from 'tweetnacl';
import utils from 'tweetnacl-util';

export class ClientEncryptionService {
  /**
   * Generate keypair (should run on client only!)
   * @returns { publicKey: string (base64), privateKey: string (base64) }
   */
  static generateKeyPair() {
    console.log('🔐 [Client] Generating keypair...');
    const keyPair = nacl.box.keyPair();
    
    const publicKey = utils.encodeBase64(keyPair.publicKey);
    const privateKey = utils.encodeBase64(keyPair.secretKey);
    
    console.log('✅ [Client] Keypair generated');
    return { publicKey, privateKey };
  }

  /**
   * Store keypair in localStorage (encrypted by password)
   * @param {string} privateKey - Base64 encoded private key
   * @param {string} password - User password for local encryption
   */
  static storePrivateKeyLocally(privateKey: string, password: string) {
    try {
      const storageKey = 'secureteam_e2e_privkey';
      // Simple storage - production should use better encryption/secure storage
      const encrypted = btoa(`${password}:${privateKey}`); // NOT for production!
      localStorage.setItem(storageKey, encrypted);
      console.log('✅ [Client] Private key stored locally');
    } catch (err) {
      console.error('❌ [Client] Failed to store key:', err);
      throw err;
    }
  }

  /**
   * Retrieve private key from localStorage
   * @param {string} password - User password for verification
   * @returns {string} Private key (base64)
   */
  static retrievePrivateKeyLocally(password: string) {
    try {
      const storageKey = 'secureteam_e2e_privkey';
      const encrypted = localStorage.getItem(storageKey);
      
      if (!encrypted) {
        throw new Error('No private key found in local storage');
      }

      const [storedPassword, privateKey] = atob(encrypted).split(':');
      
      if (storedPassword !== password) {
        throw new Error('Invalid password');
      }

      console.log('✅ [Client] Private key retrieved from local storage');
      return privateKey;
    } catch (err) {
      console.error('❌ [Client] Failed to retrieve key:', err);
      throw err;
    }
  }

  /**
   * Check if private key exists locally
   * @returns {boolean}
   */
  static hasPrivateKeyLocally() {
    return !!localStorage.getItem('secureteam_e2e_privkey');
  }

  /**
   * Encrypt a message for sending
   * @param {string} message - Plain text message
   * @param {string} recipientPublicKeyB64 - Recipient's public key (base64)
   * @param {string} senderPrivateKeyB64 - Sender's private key (base64)
   * @returns { ciphertext: string, nonce: string }
   */
  static encryptMessage(
    message: string,
    recipientPublicKeyB64: string,
    senderPrivateKeyB64: string
  ) {
    try {
      console.log('🔐 [Client] Encrypting message...');

      // Decode keys from base64
      const recipientPublicKey = utils.decodeBase64(recipientPublicKeyB64);
      const senderPrivateKey = utils.decodeBase64(senderPrivateKeyB64);

      // Create random nonce (24 bytes)
      const nonce = nacl.randomBytes(24);

      // Convert message to bytes using TextEncoder (proper UTF8)
      const messageBytes = new TextEncoder().encode(message);

      // Encrypt using box (public key crypto)
      const ciphertext = nacl.box(messageBytes, nonce, recipientPublicKey, senderPrivateKey);

      const result = {
        ciphertext: utils.encodeBase64(ciphertext),
        nonce: utils.encodeBase64(nonce),
      };

      console.log('✅ [Client] Message encrypted');
      return result;
    } catch (error: any) {
      console.error('❌ [Client] Encryption error:', error.message);
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  /**
   * Decrypt a received message
   * @param {string} ciphertextB64 - Encrypted message (base64)
   * @param {string} nonceB64 - Nonce (base64)
   * @param {string} senderPublicKeyB64 - Sender's public key (base64)
   * @param {string} recipientPrivateKeyB64 - Recipient's private key (base64)
   * @returns {string} Decrypted message
   */
  static decryptMessage(
    ciphertextB64: string,
    nonceB64: string,
    senderPublicKeyB64: string,
    recipientPrivateKeyB64: string
  ) {
    try {
      console.log('🔓 [Client] Decrypting message...');

      // Decode from base64
      const ciphertext = utils.decodeBase64(ciphertextB64);
      const nonce = utils.decodeBase64(nonceB64);
      const senderPublicKey = utils.decodeBase64(senderPublicKeyB64);
      const recipientPrivateKey = utils.decodeBase64(recipientPrivateKeyB64);

      // Decrypt
      const messageBytes = nacl.box.open(
        ciphertext,
        nonce,
        senderPublicKey,
        recipientPrivateKey
      );

      if (!messageBytes) {
        throw new Error('Decryption failed - invalid message or keys');
      }

      const message = new TextDecoder().decode(messageBytes);
      console.log('✅ [Client] Message decrypted');
      return message;
    } catch (error: any) {
      console.error('❌ [Client] Decryption error:', error.message);
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  /**
   * Verify keypair (check if public key matches private key)
   * @param {string} publicKeyB64
   * @param {string} privateKeyB64
   * @returns {boolean}
   */
  static verifyKeyPair(publicKeyB64: string, privateKeyB64: string) {
    try {
      const publicKey = utils.decodeBase64(publicKeyB64);
      const privateKey = utils.decodeBase64(privateKeyB64);

      // Generate public key from private key
      const keyPair = nacl.box.keyPair.fromSecretKey(privateKey);

      // Compare
      const generatedPublic = utils.encodeBase64(keyPair.publicKey);
      const isValid = generatedPublic === publicKeyB64;

      if (isValid) {
        console.log('✅ [Client] Keypair verified');
      } else {
        console.warn('⚠️  [Client] Keypair mismatch');
      }

      return isValid;
    } catch (error: any) {
      console.error('❌ [Client] Keypair verification error:', error.message);
      return false;
    }
  }

  /**
   * Clear stored encryption keys
   */
  static clearStoredKeys() {
    try {
      localStorage.removeItem('secureteam_e2e_privkey');
      console.log('✅ [Client] Encryption keys cleared from storage');
    } catch (err) {
      console.error('❌ [Client] Failed to clear keys:', err);
    }
  }
}

export default ClientEncryptionService;
