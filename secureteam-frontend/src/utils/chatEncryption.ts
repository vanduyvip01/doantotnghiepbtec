/**
 * E2E Encryption Integration for Chat
 * Usage examples and integration helpers
 */

import ClientEncryptionService from './clientEncryption';
import { apiClient } from '../api/client';

/**
 * Step 1: Setup encryption for current user
 * Call this when user logs in or first time setup
 */
export async function setupUserEncryption(password: string) {
  try {
    console.log('\n🔐 [SETUP] Starting E2E encryption setup...');

    // Step 1: Check if keys already exist locally
    if (ClientEncryptionService.hasPrivateKeyLocally()) {
      console.log('✅ [SETUP] Keys already exist locally');
      return { success: true, message: 'Keys already configured' };
    }

    // Step 2: Generate keypair on client
    const { publicKey, privateKey } =
      ClientEncryptionService.generateKeyPair();

    // Step 3: Store private key locally (encrypted by password)
    ClientEncryptionService.storePrivateKeyLocally(privateKey, password);

    // Step 4: Send public key to server
    const response = await apiClient.post(
      '/users/current/encryption-keys/set',
      {
        publicKey,
        encryptedPrivateKey: '', // Server doesn't need encrypted key
      }
    );

    console.log('✅ [SETUP] Encryption setup complete');
    return {
      success: true,
      message: 'Encryption configured successfully',
      publicKey,
    };
  } catch (err: any) {
    console.error('❌ [SETUP] Error:', err.message);
    throw err;
  }
}

/**
 * Step 2: Get own private key for decryption
 * (stored locally, decrypt using local password)
 */
export function getOwnPrivateKey(password: string) {
  try {
    return ClientEncryptionService.retrievePrivateKeyLocally(password);
  } catch (err) {
    console.error('❌ Failed to get private key:', err);
    throw err;
  }
}

/**
 * Step 3: Prepare message for sending (with encryption)
 * @param messageText - Original message
 * @param recipientPublicKey - Recipient's public key from server
 * @param senderPrivateKey - Your own private key
 */
export async function prepareEncryptedMessage(
  messageText: string,
  recipientPublicKey: string,
  senderPrivateKey: string
) {
  try {
    console.log('\n📤 [ENCRYPT] Preparing encrypted message...');

    const { ciphertext, nonce } = ClientEncryptionService.encryptMessage(
      messageText,
      recipientPublicKey,
      senderPrivateKey
    );

    console.log('✅ [ENCRYPT] Message prepared for sending');

    return {
      encryptedText: ciphertext,
      nonce,
      originalLength: messageText.length,
      encryptedLength: ciphertext.length,
    };
  } catch (err: any) {
    console.error('❌ [ENCRYPT] Error:', err.message);
    throw err;
  }
}

/**
 * Step 4: Decrypt received message
 * @param encryptedText - Encrypted message from server
 * @param nonce - Nonce used for encryption
 * @param senderPublicKey - Sender's public key
 * @param recipientPrivateKey - Your own private key
 */
export async function decryptReceivedMessage(
  encryptedText: string,
  nonce: string,
  senderPublicKey: string,
  recipientPrivateKey: string
) {
  try {
    console.log('\n📥 [DECRYPT] Decrypting received message...');

    const decryptedText = ClientEncryptionService.decryptMessage(
      encryptedText,
      nonce,
      senderPublicKey,
      recipientPrivateKey
    );

    console.log('✅ [DECRYPT] Message decrypted');

    return decryptedText;
  } catch (err: any) {
    console.error('❌ [DECRYPT] Error:', err.message);
    throw err;
  }
}

/**
 * Get recipient's public key from server
 */
export async function getRecipientPublicKey(userId: string) {
  try {
    const response = await apiClient.get(`/users/${userId}/public-key`);
    
    if (!response.data.hasEncryption) {
      console.warn(`⚠️  User ${userId} has not set up encryption`);
      return null;
    }

    console.log(`✅ Retrieved public key for ${userId}`);
    return response.data.publicKey;
  } catch (err: any) {
    console.error('❌ Failed to get recipient public key:', err.message);
    throw err;
  }
}

/**
 * Example usage in a message sending function:
 *
 * async function sendEncryptedMessage(recipientId, messageText, password) {
 *   try {
 *     // 1. Get recipient's public key
 *     const pubKey = await getRecipientPublicKey(recipientId);
 *     if (!pubKey) throw new Error('Recipient not ready for E2E');
 *
 *     // 2. Get your own private key
 *     const privKey = getOwnPrivateKey(password);
 *
 *     // 3. Encrypt message
 *     const { encryptedText, nonce } = await prepareEncryptedMessage(
 *       messageText,
 *       pubKey,
 *       privKey
 *     );
 *
 *     // 4. Send via API or WebSocket
 *     await apiClient.post(`/dm/${recipientId}/encrypted`, {
 *       encryptedText,
 *       nonce,
 *     });
 *
 *     // Or via WebSocket:
 *     // socket.emit('dm:send:encrypted', {
 *     //   receiverId,
 *     //   encryptedText,
 *     //   nonce,
 *     //   senderId: userId,
 *     // });
 *   } catch (err) {
 *     console.error('Failed to send encrypted message:', err);
 *   }
 * }
 */

/**
 * Example usage in a message receiving function:
 *
 * async function onEncryptedMessageReceived(encryptedMsg, password) {
 *   try {
 *     // 1. Decrypt message
 *     const plainText = await decryptReceivedMessage(
 *       encryptedMsg.encryptedText,
 *       encryptedMsg.nonce,
 *       encryptedMsg.senderPublicKey,
 *       getOwnPrivateKey(password)
 *     );
 *
 *     // 2. Display in chat UI
 *     displayMessage({
 *       ...encryptedMsg,
 *       text: plainText
 *     });
 *   } catch (err) {
 *     console.error('Failed to decrypt message:', err);
 *     displayMessage({
 *       ...encryptedMsg,
 *       text: '[Failed to decrypt]'
 *     });
 *   }
 * }
 */
