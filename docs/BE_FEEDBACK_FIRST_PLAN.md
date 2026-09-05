# Backend Plan — Feedback-first workflow

Mục tiêu: giữ nguyên dữ liệu Submission/Attachment để tương thích và rollback, nhưng backend mới chỉ phục vụ luồng `Teacher import điểm + feedback` và `Student xem kết quả riêng tư`. UI sẽ được redesign ở phase sau.

## Quy ước chung

- [x] Mỗi task làm theo thứ tự RED → GREEN → REFACTOR ở các lát cắt đã triển khai.
- [x] Không xóa bảng, migration, route hoặc service Submission/Attachment; chỉ ngừng dùng trong luồng mới.
- [x] Student identity luôn lấy từ `requireFullStudentSession()`, không nhận `studentId` từ request body/query.
- [x] Evaluation `graded` chỉ là trạng thái nội bộ; Student chỉ thấy `returned`.
- [x] Email lỗi không rollback Evaluation/Notification web.
- [x] Không trả `initialPin` sau khi import/reset; PIN chỉ tồn tại dạng hash.

## BE-01 — Khóa contract backend và DTO mới

**Mục tiêu:** chuẩn hóa contract trước khi sửa implementation.

**Files:** `src/types/student-results.ts` (mới), `src/types/evaluation-import.ts`, `src/types/import.ts`, `docs/plan-feedback-first-workflow.md`.

**Việc cần làm:**

- [x] Định nghĩa `StudentResultDto`: assignment id/title, score/max score, feedback, status `returned`, graded/returned timestamps.
- [x] Preview row có `rowNumber`, MSSV, họ tên, score, feedback, `valid|invalid`, `create|update|unchanged`, errors/warnings.
- [x] Import result có số dòng đọc hợp lệ/lỗi, số Evaluation tạo/cập nhật/không đổi, notification/email delivery summary.
- [x] Xác nhận không có field submission/attachment trong DTO Student mới.

**Tests:** type-level/fixture tests cho DTO và privacy contract.

**Done khi:** các task sau dùng cùng một DTO, không tự tạo response shape khác.

## BE-02 — Import roster: email mặc định và PIN mặc định

**Endpoint liên quan:**

- `POST /api/v1/teacher/class-sections/:classSectionId/import/preview`
- `POST /api/v1/teacher/class-sections/:classSectionId/import`

**Files:** `src/server/services/class-sections/import-service.ts`, parser/repository liên quan, `src/types/import.ts`.

**Quy tắc:**

- [x] Input tối thiểu `MSSV`, `Họ tên`; Email trong file là tùy chọn.
- [x] Nếu thiếu Email, derive `${normalizedMssv.toLowerCase()}@student.hcmute.edu.vn`.
- [x] Student mới có nickname mặc định = MSSV, PIN mặc định = `111111`, lưu hash, bật `mustChangePin`/`mustChangeNickname`.
- [x] Re-import cùng MSSV chỉ cập nhật họ tên (và email explicit nếu contract cho phép); không reset PIN, nickname, session.
- [x] Preview không trả PIN plain text. Import response không có `initialPin`.

**TDD cases:** derive email; normalize MSSV; create default credentials; re-import không reset credential; duplicate/invalid row; no raw PIN in response/log.

**Done khi:** import thành công và response không làm lộ PIN; test service + integration pass.

## BE-03 — Reset PIN an toàn về `111111`

**Endpoint:** `POST /api/v1/teacher/class-sections/:classSectionId/students/:studentId/reset-pin`

**Files:** route hiện tại reset-pin, student-management-service/repository, migration/RPC nếu cần.

**Quy tắc:**

- [x] Teacher chỉ reset Student thuộc ClassSection của mình.
- [x] Hash `111111` server-side; set `mustChangePin=true`.
- [x] Revoke Student sessions và challenge đang hoạt động trong cùng transaction.
- [x] Response chỉ `{ studentId, mustChangePin: true }`; tuyệt đối không trả `initialPin`.
- [x] Giữ compatibility route cũ nếu đang được UI dùng, nhưng sửa response/schema.

**TDD cases:** scope 404; hash không phải plain text; session revoke; idempotent reset; unauthorized teacher.

## BE-04 — Đổi email bằng OTP

**Endpoints mới:**

- `POST /api/v1/student/profile/email-change/request`
- `POST /api/v1/student/profile/email-change/confirm`

**Files:** migration; `password-reset-challenge-repository.ts`; student auth/profile service; schemas; routes.

**Quy tắc:**

- [x] Thêm `email_source` (`institutional_derived|student_verified`) và `email_verified_at`.
- [x] Dùng challenge purpose riêng `change_email`, TTL/attempt/rate-limit giống forgot PIN.
- [x] Request nhận email mới, validate domain/format, tạo challenge và gửi OTP qua email.
- [x] Confirm OTP rồi update email atomically; invalidate challenge cũ; không đổi nếu OTP sai/hết hạn.
- [x] Email mới trở thành nơi nhận thông báo sau khi verify.

**TDD cases:** request/confirm success; wrong/expired/replayed OTP; rate limit; duplicate email policy; no partial update.

## BE-05 — Parser Excel đúng 4 cột

**Endpoint:** `POST /api/v1/teacher/assignments/:assignmentId/evaluations/import-preview`

**Files:** `src/server/services/evaluations/evaluation-import-service.ts`, `src/schemas/evaluation-import.ts`, `src/types/evaluation-import.ts`.

**Contract file:** `MSSV | Họ tên | Điểm | Feedback`.

- [x] Bốn semantic columns là bắt buộc; hỗ trợ alias/case/whitespace tiếng Việt đã thống nhất.
- [x] Cột thừa chỉ cảnh báo và bỏ qua; thiếu/duplicate semantic header là lỗi toàn file.
- [x] MSSV phải thuộc ClassSection của Assignment; score nằm trong `0..maxScore`; feedback được trim nhưng giữ Unicode.
- [x] Preview toàn bộ file; dòng lỗi không làm mất dòng hợp lệ.
- [x] Phân loại `create`, `update`, `unchanged`, `invalid`; không ghi DB ở preview.
- [x] Giới hạn file/row hiện có vẫn được giữ.

**TDD cases:** exact headers; alias headers; missing/duplicate headers; empty feedback; invalid score/MSSV; duplicate MSSV rows; partial valid preview; XLSX và CSV.

## BE-06 — Chuẩn hóa file template

**Endpoint:** `GET /api/v1/teacher/assignments/:assignmentId/evaluations/import-template`

- [x] Header đúng `MSSV`, `Họ tên`, `Điểm`, `Feedback`.
- [x] Không nhúng max score vào tên cột.
- [x] Có một sample row tùy chọn, không chứa PII thật.
- [x] Template dùng chung cho preview/import và không chứa trường submission.

**Tests:** workbook header/order/content và download response headers.

## BE-07 — Save draft / Publish transaction và delivery summary

**Endpoint:** `POST /api/v1/teacher/assignments/:assignmentId/evaluations/import`

**Body:** file + `mode: save_draft | publish`.

- [x] Revalidate toàn bộ payload ở server dù đã preview.
- [x] `save_draft` ghi Evaluation `graded`; `publish` ghi `returned`.
- [x] Evaluation + EvaluationHistory nằm cùng transaction/RPC.
- [x] Chỉ tạo web Notification và gửi email sau commit cho dòng thay đổi sang `returned`.
- [x] Không dùng `void Promise.all` không quan sát kết quả; collect success/failed delivery counts.
- [x] Response báo `rows`, `created`, `updated`, `unchanged`, `notifications`, `emails`, `errors`.
- [x] Import idempotent: chạy lại cùng file không tạo duplicate Evaluation/Notification.

**TDD cases:** draft visibility; publish visibility; atomic rollback; notification only after commit; email failure không rollback; idempotency; cross-class/assignment rejection.

## BE-08 — Student Results API riêng tư

**Endpoint:** `GET /api/v1/student/results` và tùy chọn `?assignmentId=`.

**Files mới:** `src/server/repositories/student-results-repository.ts`, `src/server/services/students/student-results-service.ts`, route; tests.

- [x] Scope theo session Student + ClassSection.
- [x] Chỉ lấy Assignment `published|closed` và Evaluation hiện hành.
- [x] Chỉ trả Evaluation `returned`; `graded`/chưa chấm không xuất hiện.
- [x] Response chỉ gồm assignment/result/feedback/timestamps; không có submission, attachment, internal IDs không cần thiết.
- [x] `Cache-Control: no-store`; assignmentId ngoài scope trả 404/empty theo convention hiện tại.
- [x] Không tin `studentId` từ query/body.

**TDD/integration cases:** private result; cross-student denial; graded hidden; returned visible; no submission fields; no-store; assignment filter.

## Thứ tự thực hiện và commit đề xuất

1. [x] BE-01 — `docs: lock feedback-first backend contracts`
2. [x] BE-02 — `feat: derive student institutional email on import`
3. [x] BE-03 — `feat: reset student PIN to default safely`
4. [x] BE-04 — `feat: verify student email changes with OTP`
5. [x] BE-05 — `feat: enforce four-column evaluation imports`
6. [x] BE-06 — `feat: align evaluation import template`
7. [x] BE-07 — `feat: report bulk publication delivery outcomes`
8. [x] BE-08 — `feat: add private student results API`

## Quality gate cuối phase backend

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `git diff --check`
- [ ] Nếu có migration: `npm run test:setup`, `npm run test:health`, `npm run test:integration`, `npm run db:lint`.
- [ ] Kiểm tra thủ công: import 4 cột → save draft → publish → Student nhận email/link → xem điểm/feedback; Student không thấy submission UI/API mới.

## Không làm trong phase này

- [ ] Không xóa Submission/Attachment schema, repository, service hoặc dữ liệu cũ.
- [ ] Không redesign UI trong các task BE.
- [ ] Không tạo rubric/criteria mới.
- [ ] Không cho Student đặt PIN chỉ bằng MSSV/nickname; forgot PIN và đổi email phải qua OTP.

## Trạng thái thực thi

- [x] BE-01: DTO và privacy contract đã có, server-side tests pass.
- [x] BE-02: Email mặc định/PIN mặc định và không lộ `initialPin` đã triển khai; integration còn chờ Supabase local.
- [x] BE-03: Reset PIN mặc định, revoke session/challenge, response không lộ PIN.
- [x] BE-04: OTP email-change đã có route/service/test và challenge purpose riêng.
- [x] BE-05: Parser 4 cột, preview partial-success và action classification đã triển khai.
- [x] BE-06: Template đã chuẩn hóa đúng header.
- [x] BE-07: Save/publish transaction qua RPC, idempotent upsert và delivery summary đã triển khai; integration gate còn chờ Supabase local.
- [x] BE-08: Student Results API riêng tư và service test đã triển khai.
- [x] Quality gate migration/database: `db:lint`, `db:test` (11 files/38 tests), `test:health` pass sau khi Docker khởi động.
- [ ] Integration harness: `test:integration` chưa có test file trong `test/integration/**/*.test.ts`, nên chưa thể báo pass.
