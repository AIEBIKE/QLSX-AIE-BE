# Hướng dẫn Test API bằng Postman

## Bước 1: Tạo Request mới

1. Mở Postman
2. Click **"+"** hoặc **"New" → "HTTP Request"**

---

## Bước 2: Test Login

### Cấu hình Request:

- **Method:** `POST`
- **URL:** `http://localhost:7000/api/auth/login`

### Thiết lập Body:

1. Click tab **"Body"**
2. Chọn **"raw"**
3. Dropdown bên phải chọn **"JSON"**
4. Paste nội dung:

```json
{
  "code": "CN001",
  "password": "123456"
}
```

### Click "Send"

### Response mong đợi:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1...",
    "user": {
      "id": "...",
      "name": "Nguyễn Văn A",
      "code": "CN001",
      "role": "worker"
    }
  }
}
```

---

## Bước 3: Lưu Token để dùng cho API khác

1. Copy giá trị `token` từ response
2. Khi gọi API cần auth, vào tab **"Authorization"**
3. Type chọn **"Bearer Token"**
4. Paste token vào ô **"Token"**

---

## Các API có thể test

### 🔓 Không cần Token:

| Method | URL                  | Body                                                 |
| ------ | -------------------- | ---------------------------------------------------- |
| POST   | `/api/auth/login`    | `{"code":"CN001","password":"123456"}`               |
| POST   | `/api/auth/register` | `{"code":"CN002","name":"Test","password":"123456"}` |
| GET    | `/api/health`        | -                                                    |

### 🔐 Cần Token (Bearer):

| Method | URL                      | Mô tả                   |
| ------ | ------------------------ | ----------------------- |
| GET    | `/api/auth/me`           | Thông tin user hiện tại |
| GET    | `/api/vehicle-types`     | Danh sách loại xe       |
| GET    | `/api/processes`         | Danh sách công đoạn     |
| GET    | `/api/operations`        | Danh sách thao tác      |
| GET    | `/api/production-orders` | Danh sách lệnh SX       |

---

## Tài khoản test

| Role   | Mã NV   | Mật khẩu |
| ------ | ------- | -------- |
| Admin  | `ADMIN` | `123456` |
| Worker | `CN001` | `123456` |

---

## Lưu ý

- Port: `7000` (hoặc theo `.env`)
- Tất cả API path bắt đầu bằng `/api`
- Header `Content-Type: application/json` cho POST/PUT
