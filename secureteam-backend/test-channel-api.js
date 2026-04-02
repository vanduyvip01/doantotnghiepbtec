const http = require('http');
const url = require('url');

function makeRequest(method, endpoint, data = null, headers = {}) {
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
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: responseData });
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

async function testChannelMessages() {
  try {
    console.log('═══════════════════════════════════════════');
    console.log('TEST: Fetch messages from channel endpoint');
    console.log('═══════════════════════════════════════════\n');

    const channelId = '660000000000000000000701'; // general channel
    
    // Try to fetch messages
    const response = await makeRequest(
      'GET', 
      `http://localhost:5000/api/chat/channels/${channelId}/messages`,
      null,
      {
        'Authorization': 'Bearer test-token',
        'Cookie': 'auth_token=test'
      }
    );

    console.log(`Status: ${response.status}\n`);
    
    if (response.status === 401) {
      console.log('❌ Unauthorized - endpoint requires authentication');
      console.log('Response:', response.data);
      console.log('\nNeed valid JWT token. Let me check if /api/chat/channels needs protection...');
    } else if (response.status === 200 || response.status === 201) {
      const messages = Array.isArray(response.data) ? response.data : response.data?.data || [];
      console.log(`✅ Success! Found ${messages.length} messages\n`);
      
      messages.forEach((msg, idx) => {
        console.log(`Message ${idx + 1}:`);
        console.log(`  ID: ${msg._id}`);
        console.log(`  Sender: ${msg.senderId?.name || msg.senderId || 'Unknown'}`);
        console.log(`  Text: ${msg.text?.substring(0, 50)}...`);
        console.log(`  Attachments: ${msg.attachments?.length || 0}`);
        console.log();
      });
    } else {
      console.log(`⚠️  Status ${response.status}`);
      console.log('Response:', response.data);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testChannelMessages();
