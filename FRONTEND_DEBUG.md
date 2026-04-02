/**
 * Frontend Debug Instructions for Chat
 * 
 * Copy & paste vào Browser Console (F12)
 */

console.log(`
════════════════════════════════════════════════════════════
  🔍 FRONTEND CHAT DEBUG
════════════════════════════════════════════════════════════

Chạy các lệnh sau một cái một để debug:

1️⃣  CHECK AUTH:
────────────────────────────────────────────────────────────
const authState = useAuthStore.getState();
console.log('Auth State:', authState);
console.log('User:', authState.user);
console.log('Is Auth:', authState.isAuthenticated);

2️⃣  CHECK CHAT STATE:
────────────────────────────────────────────────────────────
const chatState = useChatStore.getState();
console.log('=== CHAT STORE ===');
console.log('Socket:', chatState.socket ? '✅ EXISTS' : '❌ NULL');
console.log('Is Connected:', chatState.isConnected);
console.log('Channels:', chatState.channels.length);
console.log('Active Channel:', chatState.activeChannel);
console.log('Messages:', Object.keys(chatState.messages));
console.log('Full State:', chatState);

3️⃣  TEST SEND MESSAGE VIA SOCKET:
────────────────────────────────────────────────────────────
const state = useChatStore.getState();
if (state.socket && state.activeChannel) {
  console.log('Emitting test message...');
  state.socket.emit('message:send', {
    channelId: state.activeChannel,
    text: '🧪 Test from console ' + new Date().toLocaleTimeString(),
    attachments: [],
    senderId: localStorage.getItem('userId'),
    senderName: localStorage.getItem('userName') || 'Unknown'
  });
  console.log('✅ Emitted!');
} else {
  console.log('❌ Cannot send - Socket or ActiveChannel missing');
}

4️⃣  LISTEN TO SOCKET EVENTS:
────────────────────────────────────────────────────────────
const state = useChatStore.getState();
const socket = state.socket;

if (socket) {
  // Remove old listeners
  socket.removeAllListeners();
  
  // Add listeners
  socket.on('connect', () => console.log('✅ SOCKET CONNECTED'));
  socket.on('disconnect', () => console.log('❌ SOCKET DISCONNECTED'));
  socket.on('message:receive', (msg) => console.log('📨 MESSAGE RECEIVED:', msg));
  socket.on('error', (err) => console.log('⚠️ SOCKET ERROR:', err));
  socket.on('users:online', (users) => console.log('👥 ONLINE USERS:', users));
  
  console.log('✅ Listeners setup complete - check console for events');
} else {
  console.log('❌ No socket');
}

5️⃣  CHECK NETWORK REQUESTS:
────────────────────────────────────────────────────────────
DevTools → Network tab
- Try sending message
- Look for requests to /api/chat/*
- Check Status (should be 200/201)
- Check Response

6️⃣  LOOK FOR ERRORS:
────────────────────────────────────────────────────────────
- Console tab: any red errors?
- Application tab → Local Storage: check token, userId, userName
- Network tab: any failed requests (404, 500)?

════════════════════════════════════════════════════════════
`);
