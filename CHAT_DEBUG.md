/**
 * Chat Debug Instructions
 * 
 * Open browser DevTools (F12) and run these commands to debug
 */

console.log(`
════════════════════════════════════════════════════════════
  🔧 CHAT DEBUG SCRIPT
════════════════════════════════════════════════════════════

Copy & paste the following commands into Browser Console (F12)
to check for issues:

1️⃣  Check if user is logged in:
────────────────────────────────────────────────────────────
localStorage.getItem('token')
localStorage.getItem('userId') 
localStorage.getItem('userName')

If all return null → You are not logged in
If you have values → User is saved

2️⃣  Check Zustand store:
────────────────────────────────────────────────────────────
useAuthStore.getState()
useAppStore.getState()

3️⃣  Check WebSocket connection:
────────────────────────────────────────────────────────────
useChatStore.getState()

Will display:
  - isConnected: true/false
  - channels: []
  - activeChannel: string or null
  - messages: {...}

4️⃣  View full chat store state:
────────────────────────────────────────────────────────────
console.log(useChatStore.getState())

5️⃣  Check Network errors:
────────────────────────────────────────────────────────────
- Open DevTools → "Network" Tab
- Action: Do something in chat (send message, upload file)
- Check if request is sent
- If error (404, 500, 401) → Report back

════════════════════════════════════════════════════════════

If you cannot resolve it, please provide output from:
  a) localStorage check (step 1)
  b) useChatStore.getState() (step 4)
  c) Browser console errors (step 5)

════════════════════════════════════════════════════════════
`);
