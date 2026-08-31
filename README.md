# MinBack

MinBack là ứng dụng Next.js hỗ trợ giáo viên quản lý và sinh viên theo dõi kết quả học tập theo từng lớp học phần.

## Yêu cầu

- Node.js 20.9 trở lên
- npm
- Docker Desktop
- Một Supabase project

## Chạy local

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Điền credential Supabase vào `.env.local` trước khi chạy các chức năng kết nối database/auth. Không commit `.env.local`.

## Supabase local

```powershell
npm run db:start
npm run db:reset
npm run db:test
npm run db:lint
```

`db:reset` chỉ dùng cho Docker local. Không chạy reset trên Supabase remote. Seed local chỉ chứa dữ liệu demo tổng hợp trong `supabase/seed.sql`.

## Kiểm tra chất lượng

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:health
npm run test:integration
npm run build
npm audit
git diff --check
```

Để tái lập baseline hiệu năng local (tạo rồi tự dọn fixture 2.000 Student), chạy:

```powershell
npm run benchmark:local
```

`npm run test:setup` reset database local và chỉ dùng khi cần một trạng thái sạch; `npm run test:health` chỉ kiểm tra Supabase/Teacher seed, không reset dữ liệu.

## Tài liệu team

- `docs/brief.md`
- `docs/team/engineering-rules.md`
- `docs/team/dev-a-assignment.md`
- `docs/team/dev-b-assignment.md`

## Kiến trúc

```text
UI → Route Handler/Server Action → Auth/Validation → Service → Repository → Supabase
```

Các trang và API trong scaffold chỉ xác lập route/boundary. Dev A và Dev B triển khai nghiệp vụ theo ownership trong tài liệu phân công.
