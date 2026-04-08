/**
 * WebSocket Backend Test
 * Check if backend receives socket events or not
 */

const io = require('socket.io-client');

async function testWebSocket() {
  console.log(`
${'═'.repeat(70)}
  🔗 WEBSOCKET BACKEND TEST
${'═'.repeat(70)}
  `);

  const socket = io('http://localhost:5000', {
    transports: ['websocket'],
    reconnection: true
  });

  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket\n');
    
    // Join as user
    socket.emit('user:join', {
      userId: '69b900dd4a727b044a4df01f',
      userName: 'Test User'
    });
    console.log('📍 Emitted user:join\n');
    
    // Wait 1 second for server to process
    setTimeout(() => {
      const channelId = '69cb6a12f7f6dd00b2c52115'; // General channel
      
      // First join channel
      console.log(`📌 Joining channel ${channelId}...\n`);
      socket.emit('channel:join', { channelId });
      
      // Wait a bit then send message
      setTimeout(() => {
        console.log(`📤 Emitting message:send...\n`);
        
        socket.emit('message:send', {
          channelId,
          text: '🧪 WebSocket test message ' + new Date().toLocaleTimeString(),
          attachments: [],
          senderId: '69b900dd4a727b044a4df01f',
          senderName: 'Test User',
          senderAvatar: ''
        });
      }, 500);
      
      // Listen for message:receive
      socket.on('message:receive', (msg) => {
        console.log('📨 Received message:receive event!');
        console.log('   Message:', msg);
        console.log('\n✅ BACKEND WEBSOCKET WORKING!\n');
        
        setTimeout(() => {
          socket.disconnect();
          console.log('Disconnected');
        }, 1000);
      });
      
      // Timeout
      setTimeout(() => {
        console.log('\n⚠️ No message:receive event after 5 seconds');
        console.log('   This might mean:');
        console.log('   1. Backend not broadcasting message:receive');
        console.log('   2. Socket not in channel room');
        console.log('   3. WebSocket handler not listening\n');
        socket.disconnect();
      }, 5000);
    }, 1000);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Connection error:', err);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from WebSocket');
  });
}

testWebSocket();
