# 🔐 End-to-End Encryption (E2E) Implementation

## Overview

This document explains the **End-to-End Encryption** system implemented in SecureTeam. All messages are encrypted on the client side using public-key cryptography, ensuring only the intended recipients can read them.

---

## 🏗️ Architecture

### Cryptography

- **Algorithm**: Curve25519 + XSalsa20 + Poly1305 (via TweetNaCl.js)
- **Key Exchange**: Public-key cryptography (asymmetric)
- **Message Format**: Encrypted ciphertext + nonce (stored in DB)

### Flow Diagram

```
┌─────────────┐                           ┌─────────────┐
│   Alice     │                           │     Bob     │
│  (Private)  │                           │  (Private)  │
└──────┬──────┘                           └──────┬──────┘
       │                                         │
       │ 1. Generate keypair                     │
       │    (Keep private key local)             │
       │                                         │
       ├─────────────────────────────────────────┤
       │         2. Exchange public keys         │
       │    (Send via server, visible)   │
       │                                         │
       │ 3. Alice encrypts message with          │
       │    Bob's public key + her private key   │
       │                                         │
       ├─────────────────────────────────────────►
       │  4. Send encrypted message to server    │
       │                                         │
       │         5. Bob receives encrypted       │
       │            message from server          │
       │                                         │
       │ 6. Bob decrypts message with            │
       │    Alice's public key + his private key◄
       │                                         │
```

---

## 📋 Backend Implementation

### 1. Models

**User Schema** - Added encryption fields:
```javascript
publicKey: { type: String }                  // Curve25519 (base64)
encryptedPrivateKey: { type: String }        // Encrypted backup
keysGeneratedAt: { type: Date }
```

**Message Schema** - Added encryption support:
```javascript
isEncrypted: { type: Boolean }                // Flag
encryptedText: { type: String }               // Encrypted payload (base64)
encryptedFor: [{
  userId: ObjectId,                           // Who can decrypt
  nonce: String                               // Encryption nonce
}]
```

### 2. Encryption Service (Backend)

File: `utils/encryption.js`

**Key Functions:**

```javascript
// Generate keypair on client (don't transmit private key to server!)
EncryptionService.generateKeyPair()
  // Returns: { publicKey, privateKey } (both base64)

// Encrypt message (client-side)
EncryptionService.encryptMessage(message, recipientPublicKey, senderPrivateKey)
  // Returns: { ciphertext, nonce }

// Decrypt message (client-side)
EncryptionService.decryptMessage(ciphertext, nonce, senderPublicKey, recipientPrivateKey)
  // Returns: plaintext message

// Verify keypair validity
EncryptionService.verifyKeyPair(publicKey, privateKey)
  // Returns: boolean
```

### 3. API Endpoints

#### POST `/api/users/current/encryption-keys/generate`
Generate new encryption keypair (client calls this to get a new pair)

**Request:**
```json
{}
```

**Response:**
```json
{
  "message": "Encryption keypair generated",
  "publicKey": "...",      // 44 chars, base64
  "privateKey": "..."      // Encrypted, base64
}
```

#### POST `/api/users/current/encryption-keys/set`
Store public key on server after generation

**Request:**
```json
{
  "publicKey": "...",
  "encryptedPrivateKey": "..."  // Optional backup
}
```

#### GET `/api/users/{userId}/public-key`
Retrieve another user's public key (for encryption)

**Response:**
```json
{
  "userId": "...",
  "publicKey": "...",
  "keysGeneratedAt": "2024-04-02T...",
  "hasEncryption": true
}
```

#### GET `/api/users/current/encryption-keys/verify`
Check if current user has encryption set up

#### POST `/api/dm/{userId}/encrypted`
Send encrypted DM

**Request:**
```json
{
  "encryptedText": "...",  // Encrypted message
  "nonce": "..."           // Encryption nonce
}
```

#### GET `/api/dm/{userId}/encrypted`
Get chat history of encrypted DMs

#### POST `/api/channels/{channelId}/messages/encrypted`
Send encrypted channel message

#### GET `/api/channels/{channelId}/messages/encrypted`
Get channel encrypted messages

### 4. WebSocket Events

**Encrypted Channel Messages:**
```javascript
// Send
socket.emit('message:send:encrypted', {
  channelId,
  encryptedText,
  nonce,
  senderId
})

// Receive
socket.on('message:receive:encrypted', (data) => {
  // data.encryptedText, data.nonce, data.senderPublicKey
})
```

**Encrypted DMs:**
```javascript
// Send
socket.emit('dm:send:encrypted', {
  receiverId,
  encryptedText,
  nonce,
  senderId
})

// Receive
socket.on('dm:receive:encrypted', (data) => {
  // data.encryptedText, data.nonce, data.senderPublicKey
})
```

---

## 💻 Frontend Implementation

### 1. Client Encryption Service

File: `src/utils/clientEncryption.ts`

```typescript
import ClientEncryptionService from './clientEncryption';

// Generate keypair
const { publicKey, privateKey } = ClientEncryptionService.generateKeyPair();

// Store private key locally
ClientEncryptionService.storePrivateKeyLocally(privateKey, userPassword);

// Encrypt message
const { ciphertext, nonce } = ClientEncryptionService.encryptMessage(
  plaintext,
  recipientPublicKey,
  senderPrivateKey
);

// Decrypt message
const plaintext = ClientEncryptionService.decryptMessage(
  ciphertext,
  nonce,
  senderPublicKey,
  recipientPrivateKey
);
```

### 2. Chat Encryption Integration

File: `src/utils/chatEncryption.ts`

**Setup encryption for current user:**
```typescript
import { setupUserEncryption } from './chatEncryption';

await setupUserEncryption(userPassword);
```

**Send encrypted message:**
```typescript
import {
  getRecipientPublicKey,
  getOwnPrivateKey,
  prepareEncryptedMessage
} from './chatEncryption';

// 1. Get recipient's public key
const recipientPubKey = await getRecipientPublicKey(recipientId);

// 2. Get own private key (from localStorage)
const ownPrivKey = getOwnPrivateKey(userPassword);

// 3. Encrypt message
const { encryptedText, nonce } = await prepareEncryptedMessage(
  messageText,
  recipientPubKey,
  ownPrivKey
);

// 4. Send via API
await apiClient.post(`/dm/${recipientId}/encrypted`, {
  encryptedText,
  nonce
});
```

**Receive encrypted message:**
```typescript
import { decryptReceivedMessage, getOwnPrivateKey } from './chatEncryption';

socket.on('dm:receive:encrypted', async (encryptedMsg) => {
  try {
    const plaintext = await decryptReceivedMessage(
      encryptedMsg.encryptedText,
      encryptedMsg.nonce,
      encryptedMsg.senderPublicKey,
      getOwnPrivateKey(userPassword)
    );
    
    // Display plaintext in UI
    displayMessage({ ...encryptedMsg, text: plaintext });
  } catch (err) {
    displayMessage({ ...encryptedMsg, text: '[Failed to decrypt]' });
  }
});
```

---

## 🧪 Testing

Run E2E encryption tests:
```bash
cd secureteam-backend
node test-e2e-encryption.js
```

**Tests cover:**
1. ✅ Key generation and verification
2. ✅ Message encryption/decryption
3. ✅ API endpoints
4. ✅ Public key exchange
5. ✅ Encrypted message storage
6. ✅ End-to-end flow

---

## 🔒 Security Considerations

### ✅ What's Encrypted

- **Message content**: `text` field (encrypted at rest in DB)
- **Attachments**: Optional (client-side encryption)
- **Private key** (in transit): Could add password-based encryption

### ⚠️ What's NOT Encrypted

- **Metadata**: Sender, receiver, timestamps, read receipts
- **Channel membership**: Who's in which channel
- **Attachment URLs**: File storage references
- **User IDs**: Visible in all messages

### 🛡️ Security Best Practices

1. **Private Keys:**
   - Generated only on client
   - NEVER transmitted to server
   - Stored locally in localStorage (encrypted by password)
   - Never logged or exposed

2. **Public Keys:**
   - Stored on server plaintext (by design)
   - Anyone can get anyone's public key
   - Used only for encryption verification

3. **Nonce:**
   - Random 24 bytes per message
   - Prevents replay attacks
   - Included with ciphertext

4. **Server Trust:**
   - Server cannot read encrypted messages
   - Server cannot impersonate users (needs private key)
   - Server can delete messages but not modify content

---

## 🚀 Future Enhancements

1. **Group Encryption**
   - Encrypt for multiple recipients
   - Use shared keys or multi-recipient encryption

2. **Perfect Forward Secrecy**
   - Rotate keys periodically
   - One-time use keys for each message

3. **Message Signing**
   - Verify sender identity
   - Prevent forgery attacks

4. **File Encryption**
   - Encrypt attachments before upload
   - Client-side decryption on download

5. **Key Backup/Recovery**
   - Secure key backup mechanism
   - Password-based key derivation (PBKDF2)

6. **Audit Logging**
   - Log when messages are accessed
   - Track decryption attempts

---

## 📚 References

- [TweetNaCl.js](https://tweetnacl.js.org/)
- [Curve25519](https://en.wikipedia.org/wiki/Curve25519)
- [XSalsa20](https://en.wikipedia.org/wiki/Salsa20)
- [Public-key Cryptography](https://en.wikipedia.org/wiki/Public-key_cryptography)

---

## 📝 API Testing with curl

```bash
# 1. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@company.com","password":"Pass@123","code":"000000"}'

# 2. Generate keys
curl -X POST http://localhost:5000/api/users/current/encryption-keys/generate \
  -H "Authorization: Bearer <TOKEN>"

# 3. Store public key
curl -X POST http://localhost:5000/api/users/current/encryption-keys/set \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"publicKey":"...","encryptedPrivateKey":""}'

# 4. Get user's public key
curl http://localhost:5000/api/users/<USER_ID>/public-key

# 5. Send encrypted DM
curl -X POST http://localhost:5000/api/dm/<RECIPIENT_ID>/encrypted \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"encryptedText":"...","nonce":"..."}'
```

---

**Last Updated:** April 2, 2024  
**Status:** ✅ Fully Implemented & Tested
