# Release rút gọn Assignment/Evaluation

## Phạm vi

- Teacher: chọn ClassSection → chọn Assignment → import điểm/feedback → lưu nháp hoặc công bố.
- Student: chọn ClassSection → xem Evaluation đã công bố → xem điểm/feedback.
- Ngày thực hiện: 2026-09-15.
- Người thực hiện: Codex/Luna.

## Tính năng ẩn khỏi UI

### Teacher

- Deadline, ngày giao, filter/sort theo hạn nộp và badge quá hạn.
- Technical Assignment status `draft/published/closed`.
- Description, attachment upload/download và submission tracking.
- Xóa Assignment.
- Gradebook matrix; route cũ redirect về danh sách Assignment.

### Student

- Assignment catalog chưa có kết quả.
- Filter `pending/submitted/graded/overdue`.
- Deadline, trạng thái nộp bài, upload/download submission và attachment.
- Route `/assignments` và `/submissions` redirect về `/grades`.
- Student chỉ nhận Evaluation `returned`; `graded` vẫn là trạng thái nội bộ Teacher.

Schema, dữ liệu, repository, route handler và logic backend cũ không bị xóa.

## Filter còn giữ lại

### Teacher

- `Tất cả`.
- `Chưa chấm` — Assignment chưa có Evaluation `graded/returned` cho toàn bộ Student trong lớp.
- `Đã chấm` — 100% Student trong lớp đã có Evaluation `graded/returned`.
- Tìm theo tên Assignment.
- Sắp xếp mới nhất hoặc tên A–Z.

### Student

- Tìm theo tên Assignment trong danh sách kết quả đã công bố.
- Không còn filter trạng thái nộp bài hoặc deadline.

## Loading và transition

- Active Student workspace dùng Student Results thay vì profile payload có submission/attachment.
- Route loading dùng trạng thái chờ không truy cập dữ liệu ngoài core.
- Filter/search giữ danh sách hiện tại trong lúc chuyển trạng thái, tránh remount toàn trang.
- Active route loading dùng skeleton; transition giữ vùng dữ liệu hiện tại và dùng progress semantics, không đưa spinner vào Assignment/Evaluation UI.

## Interface và privacy

- Capability profile `feedback-first` nằm tại `src/config/product-capabilities.ts`.
- Teacher Assignment list có `gradingSummary` aggregate theo batch.
- Student Results chỉ trả Assignment `published|closed` và Evaluation `returned`, scoped theo StudentSession + ClassSection.
- Notification DTO có thêm `assignmentId`; deep-link dùng Assignment ID, còn `evaluationId` giữ tương thích.
- Không có migration/schema deletion trong đợt này.

### Performance hardening release note (2026-09-20)

- Đã thêm intent prefetch, server initial DTO cho Results/public lookup, shared notification coordinator, joined-query scoping, additive snapshot RPC, telemetry và request-budget E2E.
- Static evidence: format, typecheck, lint không lỗi, production build và request-budget Playwright pass. Chưa ghi percentile before/after vì benchmark ba batch và DB/pgTAP còn chờ Supabase local/Docker; không coi rollout production hoàn tất trước khi có artifacts thật.

## Kiểm thử

- Targeted Teacher Assignment/Evaluation/Student Results/notification tests đã được cập nhật theo release profile.
- Baseline Vitest chạy pass: `53 test files`, `214 tests` với `--pool=threads --fileParallelism=false`; fork pool có thể timeout khi khởi động worker trên môi trường local.
- Đã xác nhận pass: `npm run typecheck`, `npm run lint` (chỉ còn 5 warning tồn tại trước đó), `npm run build`, targeted tests và format check trên các file thuộc thay đổi.
- `npm run test:health` và `npm run test:integration` chưa đạt release gate do Supabase local chưa khởi động ổn định: Docker container lỗi `exit 139`/Docker API trả `500`, sau đó integration trả `AuthRetryableFetchError` và các HTTP `500` dây chuyền. Đây là blocker môi trường, chưa phải kết luận lỗi business code.
- Chưa chạy `test:setup` vì không thay đổi migration/seed; cần chạy sau khi Docker ổn định và DB đã được dọn lại.
- Release gate còn lại cần chạy sau khi phục hồi Supabase: format check toàn repo, test health/integration, database test/lint.

## Trạng thái bàn giao

- Đã hoàn thành implementation feedback-first cho Teacher Assignment/Evaluation và Student Results, capability/redirect, notification deep-link, loading skeleton/progress và tài liệu liên quan.
- Backend/schema tương thích vẫn được giữ nguyên; không có migration hoặc seed thay đổi trong đợt này.
- Commit/push: sẽ được ghi nhận ở commit release feedback-first sau khi đối chiếu diff; file `simpleplan.md` là untracked có sẵn và không thuộc commit này.
