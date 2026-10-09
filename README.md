# Money Management

Ứng dụng quản lý tài chính cá nhân.

## Cấu trúc

```
money-management/
├── web/    # Frontend: React + TypeScript + Vite
└── api/    # Backend: Go + Gin + GORM + MySQL
```

## Bắt đầu

```bash
make install    # cài dependencies cho web
make dev-web    # chạy frontend tại http://localhost:5173
```

Xem thêm trong README của từng thư mục.

Backend (cần Docker):

```bash
cp .env.example .env    # sửa mật khẩu và JWT_SECRET
make up                 # MySQL + API tại http://localhost:8080
make test-api           # chạy test Go
```
