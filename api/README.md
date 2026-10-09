# api

Backend Go: Gin + GORM + MySQL, tổ chức theo Clean Architecture.

## Cấu trúc

```
api/
├── cmd/server/            # main: đọc cấu hình, nối các tầng, chạy HTTP server
└── internal/
    ├── domain/            # entity, quy tắc nghiệp vụ, interface repository (không phụ thuộc gì)
    ├── usecase/           # nghiệp vụ (đăng ký, đăng nhập…), chỉ phụ thuộc domain
    ├── repository/mysql/  # cài đặt repository bằng GORM + MySQL
    ├── infrastructure/
    │   └── security/      # bcrypt (mật khẩu), JWT (token)
    ├── delivery/http/     # Gin: router, handler, middleware
    ├── config/            # đọc biến môi trường
    └── testutil/          # fake dùng chung cho test
```

Phụ thuộc chỉ đi từ ngoài vào trong: `delivery` → `usecase` → `domain` ← `repository`.

## API

Mọi lỗi trả về dạng `{"error": {"code": "...", "message": "..."}}`, `message` bằng tiếng Việt để hiển thị luôn.

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/api/v1/auth/register` | `{fullName, username, password}` → `201 {token, expiresAt, refreshToken, user}` |
| `POST` | `/api/v1/auth/login` | `{username, password}` → `200 {token, expiresAt, refreshToken, user}` |
| `POST` | `/api/v1/auth/refresh` | `{refreshToken}` → `200 {token, expiresAt, refreshToken, user}`; không cần header `Authorization`. Mỗi refresh token chỉ dùng được **một lần**, phải lưu token mới (`401` nếu sai, đã dùng hoặc hết hạn) |
| `GET` | `/api/v1/auth/me` | Header `Authorization: Bearer <token>` → `200 {user}` |
| `PUT` | `/api/v1/auth/password` | `{currentPassword, newPassword}` → `200 {token, expiresAt, refreshToken, user}` (`400 current_password_wrong` nếu sai mật khẩu hiện tại). Mọi phiên đăng nhập khác bị huỷ |
| `PATCH` | `/api/v1/auth/me` | `{cycleStartDay}` (1–31) → `200 {user}` — ngày bắt đầu chu kỳ tháng của user |
| `GET` | `/api/v1/categories` | Danh mục của user (theo thứ tự tạo) → `{categories}` |
| `POST` | `/api/v1/categories` | `{type, name, icon, color}` → `201 {category}` |
| `POST` | `/api/v1/categories/defaults` | Thêm các danh mục mặc định còn thiếu → `{created, categories}` (gọi lại không tạo trùng) |
| `DELETE` | `/api/v1/categories/:id` | Xoá danh mục của user → `204` (`404` nếu không tồn tại hoặc của người khác) |
| `GET` | `/api/v1/transactions?from=&to=` | Giao dịch của user, mới nhất trước → `{transactions}`. `from`/`to` (`YYYY-MM-DD`, tính cả hai đầu) đều không bắt buộc |
| `POST` | `/api/v1/transactions` | `{type, amount, categoryId, date, note?, occurredAt?}` → `201 {transaction}` |
| `PUT` | `/api/v1/transactions/:id` | Cùng body như khi tạo → `200 {transaction}`; thay toàn bộ, bỏ `occurredAt` thì giữ giá trị cũ (`404` nếu không tồn tại hoặc của người khác) |
| `DELETE` | `/api/v1/transactions/:id` | Xoá giao dịch của user → `204` (`404` nếu không tồn tại hoặc của người khác) |
| `GET` | `/api/v1/budgets?month=YYYY-MM&startDay=` | Ngân sách của user kèm `spent` (đã chi trong chu kỳ đó) và `remaining` (= `limit − spent`, có thể âm) → `{month, budgets}`. `startDay` không bắt buộc, mặc định 1 |
| `POST` | `/api/v1/budgets` | `{categoryId, limit}` → `201 {budget}` (hạn mức mỗi tháng cho một danh mục chi tiêu) |
| `PUT` | `/api/v1/budgets/:id` | `{limit}` → `200 {budget}` |
| `DELETE` | `/api/v1/budgets/:id` | Xoá ngân sách → `204` (`404` nếu không tồn tại hoặc của người khác) |
| `GET` | `/api/v1/goals` | Mục tiêu tiết kiệm của user, mới nhất trước → `{goals}` |
| `POST` | `/api/v1/goals` | `{name, target, saved?, deadline?, color, image?}` → `201 {goal}` |
| `PUT` | `/api/v1/goals/:id` | Cùng các trường như khi tạo → `200 {goal}`; thay **toàn bộ**, bỏ `deadline`/`image` là xoá chúng |
| `POST` | `/api/v1/goals/:id/deposit` | `{amount}` → `200 {goal}` (nạp thêm vào `saved`) |
| `POST` | `/api/v1/goals/:id/withdraw` | `{amount}` → `200 {goal}` (rút ra; vượt `saved` → `400 withdraw_too_large`) |
| `DELETE` | `/api/v1/goals/:id` | Xoá mục tiêu → `204` (`404` nếu không tồn tại hoặc của người khác) |
| `GET` | `/api/v1/assets` | Tài sản của user (tiết kiệm, chứng chỉ quỹ), mới nhất trước → `{assets}` |
| `POST` | `/api/v1/assets` | `{kind, name, details}` → `201 {asset}` |
| `PUT` | `/api/v1/assets/:id` | Cùng body như khi tạo → `200 {asset}`; thay toàn bộ `kind`, `name`, `details` |
| `DELETE` | `/api/v1/assets/:id` | Xoá tài sản → `204` (`404` nếu không tồn tại hoặc của người khác) |
| `GET` | `/healthz` | Kiểm tra server + kết nối database |

Phiên đăng nhập: `token` (JWT, sống `JWT_TTL`, mặc định 15 phút) gửi kèm mọi request; khi hết hạn, gọi `/auth/refresh` với `refreshToken` (sống `REFRESH_TTL`, mặc định 30 ngày, tính từ lần refresh gần nhất) để lấy cặp mới. Server chỉ lưu hash SHA-256 của refresh token. Đổi mật khẩu xoá mọi refresh token của user: thiết bị khác bị đăng xuất khi access token của chúng hết hạn (≤ `JWT_TTL`).

Quy tắc giống web: username 3–20 ký tự `[a-zA-Z0-9_]`, không phân biệt hoa thường; mật khẩu ≥ 8 ký tự; họ tên ≤ 50 ký tự.

Các API `categories`, `transactions`, `budgets`, `goals` và `assets` cần header `Authorization: Bearer <token>`. Danh mục: `type` là `expense`/`income`; `name` ≤ 30 ký tự, không trùng trong cùng loại (không phân biệt hoa thường, **có** phân biệt dấu: "Ga" ≠ "Gà"); `icon` là tên icon lucide-react (vd. `Utensils`); `color` dạng `#rrggbb`.

Giao dịch: `amount` là số nguyên VND, 1 → 999 tỷ; `categoryId` phải là danh mục của user và **cùng loại** với giao dịch; `date` là ngày theo lịch `YYYY-MM-DD`; `occurredAt` (RFC 3339, mặc định là lúc gọi) là thời điểm xảy ra; `note` ≤ 100 ký tự. Server lưu kèm `categoryName` lúc tạo: nếu danh mục bị xoá, giao dịch vẫn còn, `categoryId` thành `null` nhưng `categoryName` giữ nguyên.

Chu kỳ tháng: `user.cycleStartDay` (mặc định 1 = tháng dương lịch) là ngày mỗi chu kỳ bắt đầu, ví dụ ngày nhận lương. Chu kỳ `month=2026-09` với `startDay=25` là 25/09 → 24/10. Tháng ngắn hơn thì bắt đầu vào ngày cuối tháng (31 → 30/04, 28/02). Server chỉ lưu giá trị này; web tự truyền `startDay` khi gọi `budgets`.

Ngân sách: hạn mức (`limit`, số nguyên VND, 1 → 999 tỷ) áp dụng cho **mọi chu kỳ**; chỉ đặt cho danh mục **chi tiêu** của user; mỗi danh mục một ngân sách (tạo lần nữa → `409 budget_exists`). Xoá danh mục thì ngân sách của nó cũng bị xoá.

Mục tiêu: `name` ≤ 40 ký tự; `target` 1 → 999 tỷ; `saved` 0 → 999 tỷ (được vượt `target` — tức là đã đạt); `deadline` dạng `YYYY-MM` (không bắt buộc); `color` là một trong `blue`, `orange`, `violet`, `pink`, `teal`, `green`; `image` (không bắt buộc) là data URL `data:image/jpeg|png|webp;base64,…`, tối đa ~800 KB. `saved` do người dùng tự nạp/rút, không liên quan tới giao dịch. Nạp/rút khoá dòng trong DB nên nhiều lần nạp cùng lúc đều được cộng đủ. Trong response, `deadline`/`image` không có mặt khi chưa đặt.

Không có gì được "reset" mỗi tháng: ngân sách chỉ lưu hạn mức, còn `spent` được cộng lại từ các khoản **chi** của đúng danh mục (theo `categoryId`) có `date` trong tháng được hỏi. Tạo/xoá giao dịch không sửa bảng `budgets`; lần đọc sau tự phản ánh.

| Mã lỗi | HTTP |
|---|---|
| `invalid_request`, `username_*`, `password_*`, `full_name_*`, `name_*`, `type_invalid`, `icon_invalid`, `color_invalid`, `amount_*`, `category_required`, `category_not_found`, `category_type_mismatch`, `date_invalid`, `date_range_invalid`, `note_too_long`, `limit_*`, `budget_category_not_expense`, `month_invalid`, `target_*`, `saved_*`, `deadline_invalid`, `image_*`, `withdraw_too_large` | 400 |
| `invalid_credentials`, `unauthorized` | 401 |
| `username_taken`, `category_name_taken`, `budget_exists` | 409 |

## Chạy

Từ thư mục gốc repo (cần Docker):

```bash
cp .env.example .env   # rồi sửa mật khẩu DB và JWT_SECRET
make up                # build + chạy MySQL và API ở http://localhost:8080
make status            # container nào đang chạy + API có nối được MySQL không
make logs              # log API
make down              # tắt và xóa cả hai container (dữ liệu MySQL vẫn giữ)
```

Bật/tắt từng cái (dữ liệu vẫn giữ):

```bash
make stop-api   /  make start-api
make stop-db    /  make start-db
```

Tắt MySQL thì `/healthz` trả 503; bật lại là API tự kết nối lại, không cần khởi động lại API.

Test (không cần database):

```bash
make test-api
```

Tài sản: phần chung (`kind`, `name` ≤ 60 ký tự) là cột thường; phần riêng của từng loại nằm trong `details` (cột `JSON` của MySQL). Server kiểm tra `details` theo `kind`, từ chối field lạ (`400 details_invalid`) và lưu lại ở dạng chuẩn. Ngày tháng dạng `YYYY-MM-DD`, được phép muộn hơn ngày UTC của server tối đa 1 ngày (giờ Việt Nam đi trước). Lãi, ngày đáo hạn, số CCQ đang giữ, giá vốn… **không lưu**, web tự tính từ `details`.

- `kind: "savings"` (sổ tiết kiệm): `{bank, amount, rate, termMonths, openedAt, interestPayout, onMaturity}`. `bank` ≤ 40 ký tự; `amount` 1 → 999 tỷ; `rate` 0 → 100 (%/năm); `termMonths` 0 → 120 (0 = không kỳ hạn); `interestPayout` là `maturity`/`monthly`/`upfront`; `onMaturity` là `rollover_all`/`rollover_principal`/`close`.
- `kind: "fund"` (chứng chỉ quỹ mở): `{code, manager, nav, navDate, transactions}`. `code` ≤ 15 ký tự (tự viết hoa); `nav` ≥ 0 (VND/CCQ, được có số lẻ), `navDate` có thể rỗng; `transactions` tối đa 1000 dòng `{id, type: buy|sell, date, units, amount, nav}` với `id` không trùng, `units` > 0 (được có số lẻ), `amount` 1 → 999 tỷ, `nav` > 0. Xếp theo ngày mà có lần bán vượt số CCQ đang có lúc đó → `400 fund_oversold`.
