# SecureTeam Backend API

Backend Node.js + Express + MongoDB cho dự án SecureTeam.

## Cài đặt & chạy

```bash
npm install
cp .env.example .env    # Điền MONGODB_URI và JWT_SECRET
npm run dev             # Development (nodemon)
npm start               # Production
```

## Danh sách API

### Auth
| Method | Endpoint                    | Mô tả              | Auth  |
|--------|-----------------------------|--------------------|-------|
| POST   | /api/auth/login             | Đăng nhập          | No    |
| POST   | /api/auth/verify-2fa        | Xác nhận mã 2FA    | No    |
| GET    | /api/auth/me                | Lấy thông tin tôi  | Yes   |
| POST   | /api/auth/logout            | Đăng xuất          | Yes   |
| PUT    | /api/auth/change-password   | Đổi mật khẩu       | Yes   |

### Users (Nhân viên)
| Method | Endpoint        | Mô tả              | Role         |
|--------|-----------------|--------------------|--------------|
| GET    | /api/users      | Danh sách          | ADMIN, PM    |
| GET    | /api/users/:id  | Chi tiết           | All          |
| POST   | /api/users      | Thêm mới           | ADMIN        |
| PUT    | /api/users/:id  | Cập nhật           | ADMIN / Self |
| DELETE | /api/users/:id  | Xóa                | ADMIN        |

### Departments (Phòng ban)
| Method | Endpoint              | Role  |
|--------|-----------------------|-------|
| GET    | /api/departments      | All   |
| POST   | /api/departments      | ADMIN |
| PUT    | /api/departments/:id  | ADMIN |
| DELETE | /api/departments/:id  | ADMIN |

### Projects (Dự án)
| Method | Endpoint           | Role        |
|--------|--------------------|-------------|
| GET    | /api/projects      | All         |
| GET    | /api/projects/:id  | All         |
| POST   | /api/projects      | ADMIN, PM   |
| PUT    | /api/projects/:id  | ADMIN, PM   |
| DELETE | /api/projects/:id  | ADMIN       |

### Tasks (Công việc)
| Method | Endpoint                  | Role      |
|--------|---------------------------|-----------|
| GET    | /api/tasks                | All       |
| POST   | /api/tasks                | ADMIN, PM |
| PATCH  | /api/tasks/:id/status     | All       |
| PUT    | /api/tasks/:id            | ADMIN, PM |
| DELETE | /api/tasks/:id            | ADMIN, PM |

### Documents (Tài liệu)
| Method | Endpoint            | Mô tả           |
|--------|---------------------|-----------------|
| GET    | /api/documents      | Danh sách       |
| POST   | /api/documents      | Upload file     |
| DELETE | /api/documents/:id  | Xóa             |

### Attendance (Chấm công)
| Method | Endpoint                  | Mô tả        |
|--------|---------------------------|--------------|
| GET    | /api/attendance           | Danh sách    |
| POST   | /api/attendance/check-in  | Check in     |
| POST   | /api/attendance/check-out | Check out    |
| PUT    | /api/attendance/:id       | Sửa (ADMIN)  |

### Security Logs
| Method | Endpoint             | Mô tả      |
|--------|----------------------|------------|
| GET    | /api/security        | Danh sách  |
| GET    | /api/security/stats  | Thống kê   |

### Chat
| Method | Endpoint                              | Mô tả           |
|--------|---------------------------------------|-----------------|
| GET    | /api/chat/channels                    | Danh sách kênh  |
| POST   | /api/chat/channels                    | Tạo kênh mới    |
| GET    | /api/chat/channels/:id/messages       | Tin nhắn kênh   |
| POST   | /api/chat/channels/:id/messages       | Gửi vào kênh    |
| GET    | /api/chat/dm/:userId                  | DM với user     |
| POST   | /api/chat/dm/:userId                  | Gửi DM          |
| DELETE | /api/chat/messages/:id                | Xóa tin nhắn    |

### Dashboard
| Method | Endpoint                          | Mô tả           |
|--------|-----------------------------------|-----------------|
| GET    | /api/dashboard/stats              | Thống kê tổng   |
| GET    | /api/dashboard/recent-activity    | Hoạt động gần đây|
| GET    | /api/dashboard/upcoming-deadlines | Deadline sắp tới|

## Query filters

```
GET /api/users?search=alex&role=MEMBER&status=ACTIVE
GET /api/tasks?projectId=xxx&status=IN_PROGRESS&priority=HIGH
GET /api/attendance?month=2026-03&userId=xxx
GET /api/security?status=FAILED&limit=50
```

## Header xác thực

```
Authorization: Bearer <token>
```
