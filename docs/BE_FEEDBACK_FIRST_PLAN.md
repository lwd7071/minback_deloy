# Backend Plan — Feedback-first workflow

Mục tiêu: giữ nguyên dữ liệu Submission/Attachment để tương thích và rollback, nhưng backend mới chỉ phục vụ luồng `Teacher import điểm + feedback` và `Student xem kết quả riêng tư`. UI sẽ được redesign ở phase sau.

## Quy ước chung

- [ ] Mỗi task làm theo thứ tự RED → GREEN → REFACTOR.
- [ ] Không xóa bảng, migration, route hoặc service Submission/Attachment; chỉ ngừng dùng trong luồng mới.
- [ ] Student identity luôn lấy từ `requireFullStudentSession()`, không nhận `studentId` từ request body/query.
- [ ] Evaluation `graded` chỉ là trạng thái nội bộ; Student chỉ thấy `returned`.
- [ ] Email lỗi không rollback Evaluation/Notification web.
- [ ] Không trả `initialPin` sau khi import/reset; PIN chỉ tồn tại dạng hash.

## BE-01 — Khóa contract backend và DTO mới

**Mục tiêu:** chuẩn hóa contract trước khi sửa implementation.

**Files:** `src/types/student-results.ts` (mới), `src/types/evaluation-import.ts`, `src/types/import.ts`, `docs/plan-feedback-first-workflow.md`.

**Việc cần làm:**

- [ ] Định nghĩa `StudentResultDto`: assignment id/title, score/max score, feedback, status `returned`, graded/returned timestamps.
- [ ] Preview row có `rowNumber`, MSSV, họ tên, score, feedback, `valid|invalid`, `create|update|unchanged`, errors/warnings.
- [ ] Import result có số dòng đọc hợp lệ/lỗi, số Evaluation tạo/cập nhật/không đổi, notification/email delivery summary.
- [ ] Xác nhận không có field submission/attachment trong DTO Student mới.

**Tests:** type-level/fixture tests cho DTO và privacy contract.

**Done khi:** các task sau dùng cùng một DTO, không tự tạo response shape khác.

## BE-02 — Import roster: email mặc định và PIN mặc định

**Endpoint liên quan:**

- `POST /api/v1/teacher/class-sections/:classSectionId/import/preview`
- `POST /api/v1/teacher/class-sections/:classSectionId/import`

**Files:** `src/server/services/class-sections/import-service.ts`, parser/repository liên quan, `src/types/import.ts`.

**Quy tắc:**

- [ ] Input tối thiểu `MSSV`, `Họ tên`; Email trong file là tùy chọn.
- [ ] Nếu thiếu Email, derive `${normalizedMssv.toLowerCase()}@student.hcmute.edu.vn`.
- [ ] Student mới có nickname mặc định = MSSV, PIN mặc định = `111111`, lưu hash, bật `mustChangePin`/`mustChangeNickname`.
- [ ] Re-import cùng MSSV chỉ cập nhật họ tên (và email explicit nếu contract cho phép); không reset PIN, nickname, session.
- [ ] Preview không trả PIN plain text. Import response không có `initialPin`.

**TDD cases:** derive email; normalize MSSV; create default credentials; re-import không reset credential; duplicate/invalid row; no raw PIN in response/log.

**Done khi:** import thành công và response không làm lộ PIN; test service + integration pass.

## BE-03 — Reset PIN an toàn về `111111`

**Endpoint:** `POST /api/v1/teacher/class-sections/:classSectionId/students/:studentId/reset-pin`

**Files:** route hiện tại reset-pin, student-management-service/repository, migration/RPC nếu cần.

**Quy tắc:**

- [ ] Teacher chỉ reset Student thuộc ClassSection của mình.
- [ ] Hash `111111` server-side; set `mustChangePin=true`.
- [ ] Revoke Student sessions và challenge đang hoạt động trong cùng transaction.
- [ ] Response chỉ `{ studentId, mustChangePin: true }`; tuyệt đối không trả `initialPin`.
- [ ] Giữ compatibility route cũ nếu đang được UI dùng, nhưng sửa response/schema.

**TDD cases:** scope 404; hash không phải plain text; session revoke; idempotent reset; unauthorized teacher.

## BE-04 — Đổi email bằng OTP

**Endpoints mới:**

- `POST /api/v1/student/profile/email-change/request`
- `POST /api/v1/student/profile/email-change/confirm`

**Files:** migration; `password-reset-challenge-repository.ts`; student auth/profile service; schemas; routes.

**Quy tắc:**

- [ ] Thêm `email_source` (`institutional_derived|student_verified`) và `email_verified_at`.
- [ ] Dùng challenge purpose riêng `change_email`, TTL/attempt/rate-limit giống forgot PIN.
- [ ] Request nhận email mới, validate domain/format, tạo challenge và gửi OTP qua email.
- [ ] Confirm OTP rồi update email atomically; invalidate challenge cũ; không đổi nếu OTP sai/hết hạn.
- [ ] Email mới trở thành nơi nhận thông báo sau khi verify.

**TDD cases:** request/confirm success; wrong/expired/replayed OTP; rate limit; duplicate email policy; no partial update.

## BE-05 — Parser Excel đúng 4 cột

**Endpoint:** `POST /api/v1/teacher/assignments/:assignmentId/evaluations/import-preview`

**Files:** `src/server/services/evaluations/evaluation-import-service.ts`, `src/schemas/evaluation-import.ts`, `src/types/evaluation-import.ts`.

**Contract file:** `MSSV | Họ tên | Điểm | Feedback`.

- [ ] Bốn semantic columns là bắt buộc; hỗ trợ alias/case/whitespace tiếng Việt đã thống nhất.
- [ ] Cột thừa chỉ cảnh báo và bỏ qua; thiếu/duplicate semantic header là lỗi toàn file.
- [ ] MSSV phải thuộc ClassSection của Assignment; score nằm trong `0..maxScore`; feedback được trim nhưng giữ Unicode.
- [ ] Preview toàn bộ file; dòng lỗi không làm mất dòng hợp lệ.
- [ ] Phân loại `create`, `update`, `unchanged`, `invalid`; không ghi DB ở preview.
- [ ] Giới hạn file/row hiện có vẫn được giữ.

**TDD cases:** exact headers; alias headers; missing/duplicate headers; empty feedback; invalid score/MSSV; duplicate MSSV rows; partial valid preview; XLSX và CSV.

## BE-06 — Chuẩn hóa file template

**Endpoint:** `GET /api/v1/teacher/assignments/:assignmentId/evaluations/import-template`

- [ ] Header đúng `MSSV`, `Họ tên`, `Điểm`, `Feedback`.
- [ ] Không nhúng max score vào tên cột.
- [ ] Có một sample row tùy chọn, không chứa PII thật.
- [ ] Template dùng chung cho preview/import và không chứa trường submission.

**Tests:** workbook header/order/content và download response headers.

## BE-07 — Save draft / Publish transaction và delivery summary

**Endpoint:** `POST /api/v1/teacher/assignments/:assignmentId/evaluations/import`

**Body:** file + `mode: save_draft | publish`.

- [ ] Revalidate toàn bộ payload ở server dù đã preview.
- [ ] `save_draft` ghi Evaluation `graded`; `publish` ghi `returned`.
- [ ] Evaluation + EvaluationHistory nằm cùng transaction/RPC.
- [ ] Chỉ tạo web Notification và gửi email sau commit cho dòng thay đổi sang `returned`.
- [ ] Không dùng `void Promise.all` không quan sát kết quả; collect success/failed delivery counts.
- [ ] Response báo `rows`, `created`, `updated`, `unchanged`, `notifications`, `emails`, `errors`.
- [ ] Import idempotent: chạy lại cùng file không tạo duplicate Evaluation/Notification.

**TDD cases:** draft visibility; publish visibility; atomic rollback; notification only after commit; email failure không rollback; idempotency; cross-class/assignment rejection.

## BE-08 — Student Results API riêng tư

**Endpoint:** `GET /api/v1/student/results` và tùy chọn `?assignmentId=`.

**Files mới:** `src/server/repositories/student-results-repository.ts`, `src/server/services/students/student-results-service.ts`, route; tests.

- [ ] Scope theo session Student + ClassSection.
- [ ] Chỉ lấy Assignment `published|closed` và Evaluation hiện hành.
- [ ] Chỉ trả Evaluation `returned`; `graded`/chưa chấm không xuất hiện.
- [ ] Response chỉ gồm assignment/result/feedback/timestamps; không có submission, attachment, internal IDs không cần thiết.
- [ ] `Cache-Control: no-store`; assignmentId ngoài scope trả 404/empty theo convention hiện tại.
- [ ] Không tin `studentId` từ query/body.

**TDD/integration cases:** private result; cross-student denial; graded hidden; returned visible; no submission fields; no-store; assignment filter.

## Thứ tự thực hiện và commit đề xuất

1. [ ] BE-01 — `docs: lock feedback-first backend contracts`
2. [ ] BE-02 — `feat: derive student institutional email on import`
3. [ ] BE-03 — `feat: reset student PIN to default safely`
4. [ ] BE-04 — `feat: verify student email changes with OTP`
5. [ ] BE-05 — `feat: enforce four-column evaluation imports`
6. [ ] BE-06 — `feat: align evaluation import template`
7. [ ] BE-07 — `feat: report bulk publication delivery outcomes`
8. [ ] BE-08 — `feat: add private student results API`

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
