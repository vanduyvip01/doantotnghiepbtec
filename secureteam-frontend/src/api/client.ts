// ============================================================
//  src/api/client.ts
//  HTTP client dùng chung — tự gắn token, tự handle lỗi
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const REQUEST_TIMEOUT = 10000; // 10 seconds

const getToken = () => localStorage.getItem('token');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  console.log(`📤 [API] ${options.method || 'GET'} ${BASE_URL}${path}`);
  
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    let data;
    try {
      data = await res.json();
    } catch {
      console.error(`❌ Failed to parse JSON response from ${path}`);
      throw new Error('Phản hồi từ máy chủ không hợp lệ');
    }
    
    if (!res.ok) {
      console.error(`❌ API Error [${res.status}] ${path}:`, data);
      
      // Don't auto-redirect on 401 for 2FA endpoints - let them handle it
      if (res.status === 401 && !path.includes('/verify-2fa')) {
        console.log(`🔄 Unauthorized access, redirecting to login...`);
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      
      // Use backend error message if available, otherwise generic message
      const errorMsg = data.message || `Lỗi: ${res.status} ${res.statusText}`;
      throw new Error(errorMsg);
    }
    
    console.log(`✅ [API] ${res.status} Response OK`);
    return data as T;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error(`⏱️ Request timeout for ${path} after ${REQUEST_TIMEOUT}ms`);
      throw new Error('Yêu cầu hết thời gian chờ. Kiểm tra kết nối mạng.');
    }
    
    // Log network errors clearly
    console.error(`❌ [API] Fetch failed for ${path}:`, err.message);
    
    if (err.message === 'Failed to fetch') {
      console.error(`⚠️ Cannot reach server at ${BASE_URL} - is backend running on port 5000?`);
      throw new Error('Không thể kết nối tới máy chủ. Kiểm tra backend đang chạy không?');
    }
    
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get:    <T>(path: string)                     => request<T>(path),
  post:   <T>(path: string, body: unknown)      => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)      => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)      => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string)                     => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    console.log(`📤 [API] POST ${BASE_URL}${path} (file upload)`);
    
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${getToken() || ''}` },
      body: formData,
    })
      .then(r => {
        if (!r.ok) {
          throw new Error(`API Error [${r.status}] ${r.statusText}`);
        }
        return r.json();
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          console.error(`⏱️ Upload timeout for ${path}`);
          throw new Error('Upload timeout - file too large or slow connection');
        }
        if (err.message === 'Failed to fetch') {
          console.error(`⚠️ Cannot reach server at ${BASE_URL}`);
          throw new Error('Không thể kết nối tới máy chủ. Kiểm tra backend đang chạy không?');
        }
        console.error(`❌ [API] Upload failed:`, err.message);
        throw err;
      })
      .finally(() => clearTimeout(timeoutId)) as Promise<T>;
  },
};
