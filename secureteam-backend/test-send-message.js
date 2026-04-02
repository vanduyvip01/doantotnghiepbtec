const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';

function makeRequest(method, endpoint, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new url.URL(endpoint);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: responseData, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function testSendMessage() {
  try {
    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 1: Send simple message');
    console.log('═══════════════════════════════════════════');

    const channelId = '660000000000000000000701'; // general channel
    const response = await makeRequest('POST', `${API_URL}/chat/send`, {
      text: '🧪 Test message from automation',
      channelId,
      senderId: '69b900dd4a727b044a4df01f' // Admin
    }, {
      'Authorization': 'Bearer test-token'
    });

    if (response.status === 201 || response.status === 200) {
      console.log('✅ Message sent successfully!');
      console.log(`Message ID: ${response.data._id}`);
      console.log(`Text: ${response.data.text}`);
      console.log(`Sender: ${response.data.senderId}`);
      console.log(`Channel: ${response.data.channelId}\n`);
      return response.data;
    } else {
      console.log('❌ Send message failed!');
      console.log(`Status: ${response.status}`);
      console.log('Response:', response.data);
    }
  } catch (err) {
    console.log('❌ Send message error:', err.message);
  }
}

async function testSendMessageWithAttachment() {
  try {
    console.log('═══════════════════════════════════════════');
    console.log('TEST 2: Send message with attachment');
    console.log('═══════════════════════════════════════════');

    const channelId = '660000000000000000000701'; // general channel
    const testAttachment = {
      type: 'IMAGE',
      url: '/uploads/messages/test-image.jpg',
      name: 'test-image.jpg',
      size: 102400,
      mimeType: 'image/jpeg'
    };

    const response = await makeRequest('POST', `${API_URL}/chat/send`, {
      text: '🖼️ Test message with image attachment',
      channelId,
      senderId: '69b900dd4a727b044a4df01f', // Admin
      attachments: [testAttachment]
    }, {
      'Authorization': 'Bearer test-token'
    });

    if (response.status === 201 || response.status === 200) {
      console.log('✅ Message with attachment sent successfully!');
      console.log(`Message ID: ${response.data._id}`);
      console.log(`Text: ${response.data.text}`);
      console.log(`Attachments: ${response.data.attachments.length}`);
      console.log(`Attachment type: ${response.data.attachments[0].type}`);
      console.log(`Attachment URL: ${response.data.attachments[0].url}\n`);
    } else {
      console.log('❌ Send with attachment failed!');
      console.log(`Status: ${response.status}`);
      console.log('Response:', response.data);
    }
  } catch (err) {
    console.log('❌ Send with attachment error:', err.message);
  }
}

async function runTests() {
  try {
    console.log('🧪 TESTING CHAT API\n');
    
    await testSendMessage();
    await testSendMessageWithAttachment();

    console.log('✓ All tests completed!');
  } catch (err) {
    console.error('Test suite error:', err.message);
  }
}

runTests();
