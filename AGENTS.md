# MinBack Agent Guide

## Agent skills

### Issue tracker

Dev A work is tracked by checkboxes in `docs/team/dev-a-tasks.md`. See `docs/agents/issue-tracker.md`.

### Triage labels

This repository does not use triage labels; task state is represented only by checklist progress. See `docs/agents/triage-labels.md`.

### Domain docs

MinBack is a single-context repository. Read `CONTEXT.md` and then the linked contracts. See `docs/agents/domain.md`.

## Nguồn sự thật

Khi tài liệu mâu thuẫn, áp dụng theo thứ tự:

1. `docs/brief.md`
2. `docs/team/engineering-rules.md`
3. File assignment của Dev A hoặc Dev B
4. Checklist task tương ứng

## Nguyên tắc quyết định

- Mọi quyết định thiết kế chưa có trong brief hoặc contract phải hỏi trước.
- Không tự quyết định rồi chỉ báo cáo sau khi đã implementation.

## Môi trường test integration (Supabase local)

### Khi nào chạy `npm run test:setup`

Chạy khi:

- Đổi `supabase/seed.sql` hoặc thêm/sửa migration.
- Lần đầu clone repo hoặc sau `supabase stop`.
- Gặp lỗi 401 khi login demo account hoặc DB trạng thái không xác định.

Script thực hiện: `supabase db reset` → verify auth teacher-a, teacher-b.

### Khi nào chạy `npm run test:health`

Chạy khi:

- Muốn xác nhận nhanh Supabase local + seed accounts vẫn hoạt động.
- Không đổi seed/migration — chỉ cần verify trước khi chạy `test:integration`.

Script KHÔNG reset DB, chỉ gọi auth API để kiểm tra.

### Chạy integration test

```bash
npm run test:health        # verify nhanh
npm run test:integration   # chạy test
```

Nếu `test:health` fail → chạy `test:setup` trước.

### Lưu ý kỹ thuật

- `vitest.integration.config.ts` đã set `fileParallelism: false` để tránh EADDRINUSE (nhiều file cùng spawn Next server trên port 3099).
- `setup.ts` truyền env Supabase local tường minh vào child process — `.env.local` (remote) không ảnh hưởng integration test.
- Seed accounts: `teacher-a@minback.local` / `DemoTeacherA123!` và `teacher-b@minback.local` / `DemoTeacherB123!`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
