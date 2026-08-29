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

## Contracts

- Nghiệp vụ và scope: `docs/brief.md`
- Quy chuẩn kỹ thuật: `docs/team/engineering-rules.md`
- Dev A: `docs/team/dev-a-assignment.md`
- Dev B: `docs/team/dev-b-assignment.md`
- Checklist Dev A: `docs/team/dev-a-tasks.md`
