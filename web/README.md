# web

Frontend React + TypeScript + Vite.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build ra dist/
npm run lint
```

## Cấu trúc `src/`

Chia theo tính năng: mỗi tính năng tự chứa trang, component và logic của nó.

```
src/
├── features/
│   ├── auth/          # đăng nhập/đăng ký: AuthProvider, useAuth, RouteGuards, authService
│   ├── transactions/  # dữ liệu giao dịch dùng chung + trang Giao dịch, Lịch, Thêm giao dịch
│   ├── categories/    # danh mục của user (từ API, tải một lần, dùng chung) + trang Danh mục
│   ├── home/
│   ├── analytics/
│   ├── budgets/
│   ├── goals/
│   └── profile/
│       (mỗi tính năng: pages/, components/ và các file logic ở gốc thư mục)
├── shared/
│   ├── ui/            # Button, Text, TextField, BottomSheet…
│   ├── layout/        # PageHeader, BottomNav, TabLayout
│   ├── api/           # axios client, lưu token
│   ├── hooks/
│   ├── utils/
│   └── pages/         # ComingSoonPage
├── App.tsx            # định tuyến
└── main.tsx
```

- Import khác thư mục dùng alias `@/` (= `src/`), ví dụ `import Text from '@/shared/ui/Text'`; trong cùng thư mục dùng `./`.
- `shared/` không import từ `features/`.
- `features/transactions/` (`useTransactions`, `stats`) và `features/categories/` (`useCategories`, `lookup` icon/màu theo tên danh mục) là dữ liệu gốc mà các tính năng khác đọc.
- Không còn danh sách danh mục cố định trong client: danh mục mặc định nằm ở server (`POST /api/v1/categories/defaults`).
