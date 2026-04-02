/**
 * Chat Debug Instructions
 * 
 * Mở browser DevTools (F12) và chạy các lệnh này để debug
 */

console.log(`
════════════════════════════════════════════════════════════
  🔧 CHAT DEBUG SCRIPT
════════════════════════════════════════════════════════════

Hãy copy & paste những dòng lệnh sau vào Browser Console (F12)
để kiểm tra vấn đề:

1️⃣  Kiểm tra xem user đã login chưa:
────────────────────────────────────────────────────────────
localStorage.getItem('token')
localStorage.getItem('userId') 
localStorage.getItem('userName')

Nếu tất cả trả về null → Bạn chưa login
Nếu có giá trị → User đã được lưu

2️⃣  Kiểm tra Zustand store:
────────────────────────────────────────────────────────────
useAuthStore.getState()
useAppStore.getState()

3️⃣  Kiểm tra WebSocket connection:
────────────────────────────────────────────────────────────
useChatStore.getState()

Sẽ hiển thị:
  - isConnected: true/false
  - channels: []
  - activeChannel: string hoặc null
  - messages: {...}

4️⃣  Xem full chat store state:
────────────────────────────────────────────────────────────
console.log(useChatStore.getState())

5️⃣  Kiểm tra Network errors:
────────────────────────────────────────────────────────────
- Mở DevTools → Tab "Network"
- Action: Làm gì đó ở chat (gửi message, upload file)
- Xem request gửi đi hay không
- Nếu error (404, 500, 401) → Report lại

════════════════════════════════════════════════════════════

Nếu bạn không thể làm gì cả, hãy cung cấp output của:
  a) localStorage check (bước 1)
  b) useChatStore.getState() (bước 4)
  c) Browser console errors (bước 5)

════════════════════════════════════════════════════════════
`);
