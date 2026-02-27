# QLSX Backend - Hệ thống Quản lý Sản xuất

Backend API cho hệ thống quản lý sản xuất và công nhân.

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Copy file cấu hình
cp .env.example .env
```

## Cấu hình

Chỉnh sửa file `.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/quanlycongnhan
JWT_SECRET=your-secret-key
```

## Khởi chạy

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm run start
```

## ⚠️ Khởi tạo dữ liệu (Quan trọng!)

**Nếu database mới (chưa có dữ liệu), chạy 1 trong 2 lệnh sau:**

### Option 1: Seed đầy đủ (khuyến nghị)

```bash
npm run seed:full
```

Tạo đầy đủ: Users, Loại xe, Công đoạn, Thao tác, Định mức, Lệnh SX mẫu

### Option 2: Seed AIE MS1

```bash
npm run seed:aiems1
```

Tạo dữ liệu mẫu cho xe AIE MS1

---

## Tài khoản mặc định sau khi seed

| Role   | Mã nhân viên | Mật khẩu   |
| ------ | ------------ | ---------- |
| Admin  | `admin`      | `admin123` |
| Worker | `CN001`      | `123456`   |
| Worker | `CN002`      | `123456`   |

## API Endpoints

### Auth

- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký
- `GET /api/auth/me` - Thông tin user hiện tại
- `POST /api/auth/logout` - Đăng xuất

### Vehicle Types

- `GET /api/vehicle-types` - Danh sách loại xe
- `POST /api/vehicle-types` - Tạo loại xe

### Processes

- `GET /api/processes` - Danh sách công đoạn
- `POST /api/processes` - Tạo công đoạn

### Operations

- `GET /api/operations` - Danh sách thao tác
- `POST /api/operations` - Tạo thao tác

### Production Orders

- `GET /api/production-orders` - Danh sách lệnh SX
- `POST /api/production-orders` - Tạo lệnh SX
- `PUT /api/production-orders/:id/status` - Cập nhật trạng thái

### Registrations

- `GET /api/registrations/today` - Đăng ký hôm nay
- `POST /api/registrations` - Đăng ký thao tác
- `PUT /api/registrations/:id/complete` - Hoàn thành

### Health Check

- `GET /api/health` - Kiểm tra server

## License

AI EBIKE & BLUERA © 2026
