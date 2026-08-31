# MinBack Domain Context

MinBack giúp Teacher/Admin quản lý lớp học phần, bài tập và kết quả học tập; Student truy cập đúng một hồ sơ trong một lớp để xem điểm, feedback và notification.

## Glossary

- **Teacher/Admin**: một role dùng Supabase Auth SSR. MVP có một Teacher nhưng mọi truy vấn vẫn giữ `teacher_id` context.
- **ClassSection**: một lớp học phần do Teacher quản lý.
- **Student enrollment**: một record Student trong đúng một ClassSection, không phải hồ sơ Person dùng chung toàn hệ thống.
- **Assignment**: bài tập thuộc một ClassSection, có trạng thái `draft`, `published` hoặc `closed`.
- **Evaluation**: kết quả hiện hành duy nhất của một Student cho một Assignment.
- **EvaluationHistory**: giá trị Evaluation cũ được ghi atomically khi Evaluation thay đổi.
- **StudentSession**: opaque server-side session mở đúng một Student enrollment; Student browser không dùng Supabase Auth/JWT để đọc dữ liệu.

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
- **Student Profile API (Sprint 5)**: `GET /api/v1/student/profile` chỉ nhận identity từ `requireFullStudentSession()`. Repository scope Student và ClassSection theo session, chỉ aggregate Assignment `published|closed` cùng Evaluation hiện hành của chính Student bằng tập ID (không N+1). Response có `Cache-Control: no-store`; progress đếm `graded|returned` và dùng `Math.round`, với không Assignment là `0/0/0`. Handoff: `docs/team/dev-a-sprint-5-handoff.md`.
- **Hardening/release gate (Sprint 6)**: Benchmark local tái lập được bằng `npm run benchmark:local`; lookup MSSV import được batch 100 phần tử để hỗ trợ import giới hạn 2,000 rows. `EXPLAIN` baseline không chứng minh cần index mới. Core workflow synthetic và cleanup cùng test được kiểm tra trong integration suite. Handoff: `docs/team/dev-a-sprint-6-handoff.md`.
- **Assignment files and submissions (post-MVP extension)**: Assignment attachment và Student submission dùng Cloudinary authenticated raw assets qua signed direct upload; Supabase chỉ giữ metadata/Cloudinary identifiers. Student Profile giữ grading progress và thêm submission progress. File binary không được trả qua API public URL.
- **Frontend rebuild**: UI công khai dùng `/class/[code]/*`, Teacher dùng `/admin/*`; URL UI cũ không có redirect. Public lookup chỉ lộ code/name. Dashboard summary, import preview, paginated gradebook và atomic bulk Evaluation là API server-side có Teacher/privacy scope.

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
