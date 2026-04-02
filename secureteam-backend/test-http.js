const http = require('http');

// Test fetching channels via HTTP (simulating frontend API call)
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/chat/channels',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token-admin-id-660000000000000000000101'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('\nChannels Response:');
    try {
      const channels = JSON.parse(data);
      console.log(JSON.stringify(channels, null, 2));
      console.log(`\n✅ Got ${channels.length} channels`);
    } catch (e) {
      console.log('Error parsing JSON:', e.message);
      console.log('Raw:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
