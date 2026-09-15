# MinBack Domain Context

MinBack giúp Teacher/Admin quản lý lớp học phần, bài tập và kết quả học tập; Student truy cập đúng một hồ sơ trong một lớp để xem điểm, feedback và notification.

## Glossary

- **Teacher/Admin**: một role dùng Supabase Auth SSR. MVP có một Teacher nhưng mọi truy vấn vẫn giữ `teacher_id` context.
- **ClassSection**: một lớp học phần do Teacher quản lý.
- **Student enrollment**: một record Student trong đúng một ClassSection, không phải hồ sơ Person dùng chung toàn hệ thống.
- **Assignment**: khóa nhóm Evaluation thuộc một ClassSection. Schema vẫn giữ trạng thái kỹ thuật và field tương thích, nhưng release feedback-first chỉ expose tên và thang điểm cần cho việc nhập kết quả.
- **Evaluation**: kết quả hiện hành duy nhất của một Student cho một Assignment; `graded` là trạng thái nội bộ Teacher và `returned` là trạng thái duy nhất Student được xem.
- **EvaluationHistory**: giá trị Evaluation cũ được ghi atomically khi Evaluation thay đổi.
- **StudentSession**: opaque server-side session mở đúng một Student enrollment; Student browser không dùng Supabase Auth/JWT để đọc dữ liệu.
- **Feedback-first release profile**: profile sản phẩm chỉ expose Teacher import/save/publish điểm-feedback và Student xem kết quả đã công bố; Submission, Attachment, Deadline và Gradebook được giữ tương thích nhưng ẩn khỏi active UI.

## System boundaries

- Teacher đăng nhập bằng Supabase Auth SSR và truy cập dữ liệu qua Next.js server/API với RLS.
- Student đăng nhập bằng mã lớp, nickname và PIN; browser chỉ gọi Next.js API bằng cookie HttpOnly.
- Supabase PostgreSQL là nguồn dữ liệu; migration, constraints, grants và RLS là lớp bảo vệ bắt buộc.
- Email Brevo là external boundary; lỗi email không rollback Evaluation hoặc web Notification.

## Invariants

- Teacher và Student không được đọc hoặc sửa dữ liệu ngoài context được cấp.
- PIN chỉ lưu dạng hash; PIN khởi tạo/reset chỉ được xuất plain text một lần.
- Evaluation phải nối Student và Assignment thuộc cùng ClassSection.
- Evaluation update và EvaluationHistory phải cùng transaction.
- Student không bao giờ nhận Evaluation khác `returned` qua active Results interface.
- Notification kết quả deep-link bằng `assignmentId`; `evaluationId` chỉ giữ cho compatibility.
- Ẩn capability khỏi UI không đồng nghĩa xóa authorization, endpoint, schema hoặc dữ liệu backend.
- Email lỗi không rollback Evaluation hoặc web Notification.
- Student rate limit có ba lớp: Student enrollment, HMAC identifier bucket và HMAC IP bucket.
- Mọi quyết định thiết kế chưa có trong contract phải được hỏi trước khi implementation.

## Ngoài phạm vi MVP

Không tạo `EvaluationCriteria`, `RubricTemplate` hoặc `RubricCriterion` trong migration MVP. Rubric là migration sau MVP; hiện tại Teacher nhập trực tiếp `Evaluation.score`.

## Implemented Components

- **Teacher Authentication (Sprint 1)**: Đã triển khai luồng đăng nhập Supabase Auth SSR bằng Next.js App Router; implementation và test artifact đã có, nhưng quality gate/runtime integration cần được xác nhận sau khi môi trường local Supabase và dependency đầy đủ.
  - Các route công khai (login) nằm ở route group `(teacher-auth)`.
  - Các route bảo mật (dashboard) nằm ở route group `(teacher)` và được bảo vệ bởi layout chung bằng hàm `requireTeacher()`.
  - Hàm `requireTeacher()` giữ vai trò gatekeeper để map `auth.users.id` với `public.teachers`, đảm bảo Teacher context luôn hợp lệ.
  - Verification hiện tại: `npm run typecheck` pass; Teacher Auth integration regression pass 12/12 sau khi seed và test harness được cố định cho Supabase local.
- **ClassSection management (Sprint 2 — A2.1/A2.2)**: Đã hoàn thành list/create và detail/update/delete theo Teacher context, kèm API, repository/service, validation và UI list/detail. Targeted integration tests pass 11/11; Teacher Auth regression pass 12/12.
- **ClassSection CSV import (Sprint 2 — A2.3)**: Đã hoàn thành import CSV hợp lệ theo Teacher/ClassSection context. Parser hỗ trợ header `MSSV`/`Họ Tên` không phân biệt hoa thường và `Email` tùy chọn; Student mới có nickname bằng MSSV, PIN CSPRNG sáu chữ số chỉ trả ở response đầu tiên, BCrypt-only storage và cờ bắt buộc đổi nickname/PIN. UI tạo file PIN ngay trên browser, không lưu hay có endpoint tải lại. Full integration regression pass 25/25.
- **ClassSection CSV partial import (Sprint 2 — A2.4)**: Import giữ các dòng hợp lệ khi có dòng trống, dữ liệu sai hoặc MSSV trùng trong file; mọi row outcome có thứ tự xác định và summary đếm đúng. Re-import trong cùng ClassSection chỉ cập nhật tên/email, không reset credential/session; cùng MSSV ở ClassSection khác không bị ảnh hưởng. Full integration regression pass 27/27.
- **ClassSection XLSX import and whole-file limits (Sprint 2 — A2.5)**: Import hỗ trợ CSV và XLSX qua một normalized-row model dùng chung. Endpoint từ chối toàn file trước mutation nếu sai đuôi, quá 5 MB, thiếu header bắt buộc hoặc quá 2.000 dòng dữ liệu; row-level errors vẫn partial-success. ExcelJS 4.4.0 được dùng chỉ để đọc XLSX buffer; rủi ro UUID transitive được ghi ở handoff A2.6. Full integration regression pass 29/29.
- **Assignment management (Sprint 3 — A3.1–A3.3)**: Teacher quản lý Assignment theo ClassSection qua API list/create/detail/update/delete và UI `/teacher/assignments`. DTO, date/max-score validation, status transitions và deletion restriction được enforce tại service/repository; direct API privacy tests che giấu cross-Teacher resources bằng `404` và yêu cầu Origin cho mutations. Handoff: `docs/team/dev-a-sprint-3-handoff.md`.
- **Current Evaluation management (Sprint 4 — A4.1–A4.5)**: Teacher list/upsert Evaluation theo Assignment/Student trong cùng ClassSection qua API và UI `/teacher/evaluations`. Score/feedback/status được validate theo Assignment; update dùng authenticated Teacher client để trigger ghi EvaluationHistory atomically và Notification chỉ được gọi sau commit khi payload thay đổi. Evaluation responses dùng `Cache-Control: no-store`. Handoff: `docs/team/dev-a-sprint-4-handoff.md`.
- **Student Profile API (Sprint 5, compatibility)**: `GET /api/v1/student/profile` vẫn nhận identity từ `requireFullStudentSession()` và giữ contract cũ cho compatibility. Active feedback-first Student workspace dùng identity + `GET /api/v1/student/results`, không tải submission/attachment.
- **Hardening/release gate (Sprint 6)**: Benchmark local tái lập được bằng `npm run benchmark:local`; lookup MSSV import được batch 100 phần tử để hỗ trợ import giới hạn 2,000 rows. `EXPLAIN` baseline không chứng minh cần index mới. Core workflow synthetic và cleanup cùng test được kiểm tra trong integration suite. Handoff: `docs/team/dev-a-sprint-6-handoff.md`.
- **Assignment files and submissions (post-MVP extension)**: Assignment attachment và Student submission dùng Cloudinary authenticated raw assets qua signed direct upload; Supabase chỉ giữ metadata/Cloudinary identifiers. Backend và file binary policy được giữ, nhưng active release không gọi các module này.
- **Frontend rebuild**: UI công khai dùng `/class/[code]/*`, Teacher dùng `/admin/*`; release feedback-first redirect các route UI legacy `/assignments`, `/submissions` và Gradebook về luồng active tương ứng. Public lookup chỉ lộ code/name. Dashboard summary, import preview, paginated gradebook và atomic bulk Evaluation là server-side modules có Teacher/privacy scope.
- **Feedback-first release (2026-09-15)**: capability profile tại `src/config/product-capabilities.ts` ẩn deadline, attachment, submission, technical Assignment status, delete và Gradebook khỏi active UI. Teacher Assignment list dùng `gradingSummary` aggregate theo batch, chỉ còn filter `Tất cả/Chưa chấm/Đã chấm`, search tên và sort mới nhất/A–Z.
- **Student Results workspace (2026-09-15)**: active Student layout chỉ tải identity; `/profile` và `/grades` đọc Student Results scoped theo StudentSession + ClassSection, chỉ hiển thị Evaluation `returned`. `/assignments` và `/submissions` redirect về `/grades`; notification dùng Assignment ID.
- **Compatibility retention (2026-09-15)**: Submission, Attachment, deadline fields, Assignment status, Gradebook repository/route handler và Student profile implementation cũ không bị xóa; chúng không được import vào active feedback-first Student flow.
- **Release documentation (2026-09-15)**: chi tiết tính năng ẩn, filter còn lại, interface và verification nằm trong `docs/RUT-GON-RELEASE.md`.
- **Release verification status (2026-09-15)**: typecheck, lint, build, targeted tests và full unit baseline (`53 test files/214 tests`) đã pass. Integration chưa đạt vì Supabase local/Docker container crash (`exit 139`, Docker API `500`); các lỗi `AuthRetryableFetchError`/HTTP `500` trong log là hậu quả môi trường. Cần rerun health, integration và database gates sau khi Docker ổn định.

## Contracts

- Nghiệp vụ và scope: `docs/brief.md`
- Quy chuẩn kỹ thuật: `docs/team/engineering-rules.md`
- Dev A: `docs/team/dev-a-assignment.md`
- Sprint 2 handoff: `docs/team/dev-a-sprint-2-handoff.md`
- Sprint 3 handoff: `docs/team/dev-a-sprint-3-handoff.md`
- Sprint 4 handoff: `docs/team/dev-a-sprint-4-handoff.md`
- Sprint 5 handoff: `docs/team/dev-a-sprint-5-handoff.md`
- Sprint 6/release handoff: `docs/team/dev-a-sprint-6-handoff.md`
- Dev B: `docs/team/dev-b-assignment.md`
- Checklist Dev A: `docs/team/dev-a-tasks.md`
- Release rút gọn: `docs/RUT-GON-RELEASE.md`
