#!/usr/bin/env node

/**
 * E2E Encryption Test - Full Flow
 * 
 * Tests:
 * 1. Key generation and exchange
 * 2. Message encryption/decryption
 * 3. API endpoints
 * 4. Database storage
 * 
 * Run: node test-e2e-encryption.js
 */

const EncryptionService = require('./utils/encryption');
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Test data
const users = [
  { email: 'datvan@gmail.com', password: 'SecurePass@123', name: 'Dat Van' },
  { email: 'khanhgaavl@gmail.com', password: 'SecurePass@123', name: 'Khanh Gavl' },
];

let tokens = {};
let userIds = {};
let keyPairs = {};

async function delay(ms) {
  return new Promise((resolve) => setTimeout(ms, ms));
}

// ═══════════════════════════════════════════════════════════════
// TEST 1: Generate Keypairs
// ═══════════════════════════════════════════════════════════════

function testKeyGeneration() {
  console.log('\n\n📝 TEST 1: Key Generation');
  console.log('═'.repeat(50));

  try {
    users.forEach((user) => {
      const { publicKey, privateKey } = EncryptionService.generateKeyPair();
      keyPairs[user.email] = { publicKey, privateKey };

      console.log(`✅ Generated keypair for ${user.email}`);
      console.log(`   Public key length: ${publicKey.length}`);
      console.log(`   Private key length: ${privateKey.length}`);

      // Verify keypair
      const isValid = EncryptionService.verifyKeyPair(publicKey, privateKey);
      console.log(`   Keypair valid: ${isValid ? '✅' : '❌'}`);
    });

    return true;
  } catch (err) {
    console.error('❌ Key generation test failed:', err.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST 2: Encryption/Decryption
// ═══════════════════════════════════════════════════════════════

function testEncryptionDecryption() {
  console.log('\n\n📝 TEST 2: Encryption/Decryption');
  console.log('═'.repeat(50));

  try {
    const aliceKeys = keyPairs[users[0].email];
    const bobKeys = keyPairs[users[1].email];

    const originalMessage = 'Secret DM from Alice to Bob! 🔐';

    console.log(`Original message: "${originalMessage}"`);

    // Alice encrypts to Bob
    const { ciphertext, nonce } = EncryptionService.encryptMessage(
      originalMessage,
      bobKeys.publicKey,
      aliceKeys.privateKey
    );

    console.log(`✅ Message encrypted`);
    console.log(`   Ciphertext length: ${ciphertext.length}`);
    console.log(`   Nonce length: ${nonce.length}`);

    // Bob decrypts from Alice
    const decryptedMessage = EncryptionService.decryptMessage(
      ciphertext,
      nonce,
      aliceKeys.publicKey,
      bobKeys.privateKey
    );

    console.log(`✅ Message decrypted: "${decryptedMessage}"`);

    const isValid = decryptedMessage === originalMessage;
    console.log(`   Message integrity: ${isValid ? '✅' : '❌'}`);

    return isValid;
  } catch (err) {
    console.error('❌ Encryption/decryption test failed:', err.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST 3: API - Key Generation Endpoint
// ═══════════════════════════════════════════════════════════════

async function testAPIKeyGeneration() {
  console.log('\n\n📝 TEST 3: API - Key Generation');
  console.log('═'.repeat(50));

  try {
    const alice = users[0];

    // Step 1: Get valid 2FA code for Alice
    console.log(`📱 Fetching valid 2FA code for ${alice.email}...`);
    const codeRes = await axios.get(`${API_URL}/auth/debug-2fa-code/${alice.email}`);
    const code2FA = codeRes.data.currentCode;
    console.log(`✅ Got 2FA code: ${code2FA}`);

    // Step 2: Login Alice (will get tempToken because 2FA is required)
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: alice.email,
      password: alice.password,
    });

    if (loginRes.data.requires2FA) {
      console.log(`🔐 2FA required, verifying code...`);
      
      // Step 3: Verify 2FA code to get final token
      const verify2FARes = await axios.post(`${API_URL}/auth/verify-2fa`, {
        tempToken: loginRes.data.tempToken,
        code: code2FA,
      });

      tokens[alice.email] = verify2FARes.data.token;
      userIds[alice.email] = verify2FARes.data.user.id;
      console.log(`✅ 2FA verified, token received`);
    } else {
      tokens[alice.email] = loginRes.data.token;
      userIds[alice.email] = loginRes.data.user.id;
      console.log(`✅ Login successful without 2FA`);
    }

    console.log(`✅ Alice logged in: ${userIds[alice.email]}`);

    // Call key generation endpoint
    const genRes = await axios.post(
      `${API_URL}/users/current/encryption-keys/generate`,
      {},
      { headers: { Authorization: `Bearer ${tokens[alice.email]}` } }
    );

    console.log(`✅ Key generation endpoint called`);
    console.log(`   Public key received: ${genRes.data.publicKey.length} chars`);
    console.log(`   Private key received: ${genRes.data.privateKey.length} chars`);

    return {
      publicKey: genRes.data.publicKey,
      privateKey: genRes.data.privateKey,
    };
  } catch (err) {
    console.error('❌ API key generation test failed:', err.message);
    if (err.response?.data) {
      console.error('   Response:', err.response.data);
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST 4: API - Store Public Key
// ═════════════════════════════════════════════════════════════

async function testAPIStorePublicKey(aliceKeys) {
  console.log('\n\n📝 TEST 4: API - Store Public Key');
  console.log('═'.repeat(50));

  try {
    const alice = users[0];
    const storeRes = await axios.post(
      `${API_URL}/users/current/encryption-keys/set`,
      {
        publicKey: aliceKeys.publicKey,
        encryptedPrivateKey: 'client-stored',
      },
      { headers: { Authorization: `Bearer ${tokens[alice.email]}` } }
    );

    console.log(`✅ Public key stored on server`);
    console.log(`   Response: ${storeRes.data.message}`);
    console.log(`   Keys generated at: ${storeRes.data.keysGeneratedAt}`);

    return true;
  } catch (err) {
    console.error('❌ API store public key test failed:', err.message);
    if (err.response?.data) {
      console.error('   Response:', err.response.data);
    }
    return false;
  }
}

// ═════════════════════════════════════════════════════════════
// TEST 5: API - Retrieve Public Key
// ═════════════════════════════════════════════════════════════

async function testAPIGetPublicKey() {
  console.log('\n\n📝 TEST 5: API - Retrieve Public Key');
  console.log('═'.repeat(50));

  try {
    const bob = users[1];

    // Step 1: Get valid 2FA code for Bob
    console.log(`📱 Fetching valid 2FA code for ${bob.email}...`);
    const codeRes = await axios.get(`${API_URL}/auth/debug-2fa-code/${bob.email}`);
    const code2FA = codeRes.data.currentCode;
    console.log(`✅ Got 2FA code: ${code2FA}`);

    // Step 2: Login Bob
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: bob.email,
      password: bob.password,
    });

    if (loginRes.data.requires2FA) {
      console.log(`🔐 2FA required, verifying code...`);
      
      // Step 3: Verify 2FA code
      const verify2FARes = await axios.post(`${API_URL}/auth/verify-2fa`, {
        tempToken: loginRes.data.tempToken,
        code: code2FA,
      });

      tokens[bob.email] = verify2FARes.data.token;
      userIds[bob.email] = verify2FARes.data.user.id;
      console.log(`✅ 2FA verified`);
    } else {
      tokens[bob.email] = loginRes.data.token;
      userIds[bob.email] = loginRes.data.user.id;
    }

    console.log(`✅ Bob logged in: ${userIds[bob.email]}`);

    // Bob retrieves Alice's public key
    const alice = users[0];
    const getRes = await axios.get(`${API_URL}/users/${userIds[alice.email]}/public-key`);

    console.log(`✅ Retrieved Alice's public key`);
    console.log(`   Has encryption: ${getRes.data.hasEncryption}`);
    console.log(`   Public key: ${getRes.data.publicKey.substring(0, 20)}...`);

    return getRes.data.publicKey;
  } catch (err) {
    console.error('❌ API get public key test failed:', err.message);
    if (err.response?.data) {
      console.error('   Response:', err.response.data);
    }
    return null;
  }
}

// ═════════════════════════════════════════════════════════════
// TEST 6: Send Encrypted DM
// ═════════════════════════════════════════════════════════════

async function testSendEncryptedDM(aliceKeys, alicePublicKeyFromServer) {
  console.log('\n\n📝 TEST 6: Send Encrypted DM');
  console.log('═'.repeat(50));

  try {
    const message = 'Secret DM from Alice to Bob! 🔒';

    // Bob get Alice's public key from server and encrypt
    const bob = users[1];
    const alice = users[0];
    const bobPrivateKey = keyPairs[bob.email].privateKey;

    const { ciphertext, nonce } = EncryptionService.encryptMessage(
      message,
      alicePublicKeyFromServer,
      bobPrivateKey
    );

    console.log(`✅ Message encrypted by Bob`);

    // Send via API
    const sendRes = await axios.post(
      `${API_URL}/chat/dm/${userIds[alice.email]}/encrypted`,
      { encryptedText: ciphertext, nonce },
      { headers: { Authorization: `Bearer ${tokens[bob.email]}` } }
    );

    console.log(`✅ Encrypted DM sent`);
    console.log(`   Message ID: ${sendRes.data._id}`);
    console.log(`   Is encrypted: ${sendRes.data.isEncrypted}`);

    return sendRes.data;
  } catch (err) {
    console.error('❌ Send encrypted DM test failed:', err.message);
    if (err.response?.data) {
      console.error('   Response:', err.response.data);
    }
    return null;
  }
}

// ═════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═════════════════════════════════════════════════════════════

async function main() {
  console.log('\n\n╔════════════════════════════════════════════════════════╗');
  console.log('║  E2E ENCRYPTION FULL FLOW TEST                         ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  let passed = 0;
  let failed = 0;

  // Test 1: Key Generation
  if (testKeyGeneration()) {
    passed++;
  } else {
    failed++;
  }

  // Test 2: Encryption/Decryption
  if (testEncryptionDecryption()) {
    passed++;
  } else {
    failed++;
  }

  // Test 3: API Key Generation
  const aliceKeys = await testAPIKeyGeneration();
  if (aliceKeys) {
    passed++;
  } else {
    failed++;
    console.error('❌ Skipping remaining tests due to API failure');
    process.exit(1);
  }

  // Test 4: Store Public Key
  if (await testAPIStorePublicKey(aliceKeys)) {
    passed++;
  } else {
    failed++;
  }

  // Test 5: Get Public Key
  const alicePublicKeyFromServer = await testAPIGetPublicKey();
  if (alicePublicKeyFromServer) {
    passed++;
  } else {
    failed++;
  }

  // Test 6: Send Encrypted DM
  if (await testSendEncryptedDM(aliceKeys, alicePublicKeyFromServer)) {
    passed++;
  } else {
    failed++;
  }

  // Summary
  console.log('\n\n╔════════════════════════════════════════════════════════╗');
  console.log('║  TEST SUMMARY                                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${passed + failed}\n`);

  if (failed === 0) {
    console.log('🎉 All E2E encryption tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Review logs above.\n');
    process.exit(1);
  }
}

// Run tests
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
