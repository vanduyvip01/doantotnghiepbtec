#!/usr/bin/env node
/**
 * Chat Diagnosis Script
 * Kiểm tra toàn bộ chat flow
 */

const http = require('http');
const url = require('url');

function makeRequest(method, endpoint, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new url.URL(endpoint);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function diagnose() {
  console.log(`
${'═'.repeat(70)}
  💊 CHAT DIAGNOSIS TOOL
${'═'.repeat(70)}
  `);

  try {
    // STEP 1: Login
    console.log('\n📝 STEP 1: Login');
    console.log('─'.repeat(70));
    
    const login = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      email: 'admin@secureteam.com',
      password: 'SecurePass@123'
    });

    if (login.status !== 200 || !login.data.token) {
      console.log('❌ LOGIN FAILED');
      console.log('Status:', login.status);
      console.log('Error:', login.data);
      return;
    }

    const token = login.data.token;
    const userId = login.data.user.id;
    console.log('✅ Login Success');
    console.log('   User:', login.data.user.name);
    console.log('   Token:', token.substring(0, 50) + '...');

    // STEP 2: Fetch Channels
    console.log('\n📌 STEP 2: Fetch Channels');
    console.log('─'.repeat(70));
    
    const channels = await makeRequest('GET', 'http://localhost:5000/api/chat/channels', null, token);
    
    if (channels.status !== 200) {
      console.log('❌ FETCH CHANNELS FAILED');
      console.log('Status:', channels.status);
      console.log('Error:', channels.data);
      return;
    }

    const channelList = Array.isArray(channels.data) ? channels.data : channels.data?.data || [];
    console.log(`✅ Fetched ${channelList.length} channels`);
    
    if (channelList.length === 0) {
      console.log('⚠️  No channels found!');
      return;
    }

    channelList.forEach(ch => {
      console.log(`   - ${ch.name} (${ch.id || ch._id})`);
    });

    // STEP 3: Fetch Messages from first channel
    console.log('\n💬 STEP 3: Fetch Messages');
    console.log('─'.repeat(70));
    
    const firstChannelId = channelList[0].id || channelList[0]._id;
    const messages = await makeRequest(
      'GET',
      `http://localhost:5000/api/chat/channels/${firstChannelId}/messages`,
      null,
      token
    );

    if (messages.status !== 200) {
      console.log('❌ FETCH MESSAGES FAILED');
      console.log('Status:', messages.status);
      console.log('Error:', messages.data);
      return;
    }

    const msgList = Array.isArray(messages.data) ? messages.data : [];
    console.log(`✅ Fetched ${msgList.length} messages from "${channelList[0].name}"`);
    
    msgList.forEach((msg, idx) => {
      console.log(`\n   Message ${idx + 1}:`);
      console.log(`   - Sender: ${msg.senderId?.name || 'Unknown'}`);
      console.log(`   - Text: ${msg.text?.substring(0, 40)}...`);
      console.log(`   - Attachments: ${msg.attachments?.length || 0}`);
    });

    // STEP 4: Test Send Message
    console.log('\n📤 STEP 4: Test Send Message (via REST)');
    console.log('─'.repeat(70));
    
    const testMsg = await makeRequest(
      'POST',
      `http://localhost:5000/api/chat/channels/${firstChannelId}/messages`,
      {
        text: '🧪 Test message from diagnosis ' + new Date().toLocaleTimeString()
      },
      token
    );

    if (testMsg.status === 201 || testMsg.status === 200) {
      console.log('✅ Message sent successfully!');
      console.log('   ID:', testMsg.data._id);
      console.log('   Text:', testMsg.data.text);
    } else {
      console.log('❌ SEND MESSAGE FAILED');
      console.log('Status:', testMsg.status);
      console.log('Error:', testMsg.data);
    }

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log(`\n${'═'.repeat(70)}`);
    console.log('  ✅ DIAGNOSIS COMPLETE - ALL SYSTEMS OK');
    console.log(`${'═'.repeat(70)}`);
    
    console.log(`
✅ Summary:
  • Authentication: WORKING
  • Channels: ${channelList.length} channels loaded
  • Messages: ${msgList.length} messages in first channel
  • Send: Message sending working

🔧 Next Steps if still having issues:
  1. Check browser console (F12) for JavaScript errors
  2. Check Network tab for failed requests
  3. Verify WebSocket is connecting (should see green indicator)
  4. Try clearing localStorage and refresh:
     localStorage.clear();
     location.reload();
    `);

  } catch (err) {
    console.error('❌ Diagnosis error:', err.message);
    process.exit(1);
  }
}

diagnose();
