# MinBack — Phân Công Dev A

Dev A sở hữu chính luồng Teacher/Admin, Class/Import, Assignment và API tổng hợp Student Profile theo Sprint Plan trong `docs/brief.md`.

Mọi implementation và review phải tuân thủ `docs/team/engineering-rules.md`.

## 1. Trách nhiệm tổng quát

- Hoàn thành các deliverable Dev A đúng sprint.
- Tuân thủ nguyên trạng schema/API/module contract đã khóa trong file này; không yêu cầu Dev B quyết định thêm.
- Viết unit/integration test cho code mình sở hữu.
- Là QA/reviewer chính cho feature của Dev B.
- Không tự merge PR của mình khi chưa có Dev B review.

## 2. Contract triển khai đã khóa

Phần này là quyết định cuối cho MVP. Dev A code theo đúng contract; không đổi tên route, field, status hoặc ownership trong lúc triển khai.

### 2.1. Ownership thư mục

Dev A sở hữu và được quyền triển khai chính:

```text
src/app/(teacher)/teacher/login/**
src/app/(teacher)/teacher/dashboard/**
src/app/(teacher)/teacher/class-sections/**        (trừ **/students/**)
src/app/(teacher)/teacher/assignments/**
src/app/(teacher)/teacher/evaluations/**
src/app/api/v1/teacher/auth/**
src/app/api/v1/teacher/class-sections/**   (trừ **/students/**)
src/app/api/v1/teacher/assignments/**
src/app/api/v1/teacher/evaluations/**      (trừ **/history/**)
src/app/api/v1/student/profile/**
src/server/auth/teacher-auth.ts
src/server/services/class-section-service.ts
src/server/services/import-service.ts
src/server/services/assignment-service.ts
src/server/services/evaluation-service.ts
src/server/services/student-profile-service.ts
src/server/repositories/class-section-repository.ts
src/server/repositories/assignment-repository.ts
src/server/repositories/evaluation-repository.ts
src/server/repositories/student-profile-repository.ts
src/lib/api/**
src/lib/supabase/**
supabase/migrations/**
supabase/seed.sql
```

Dev A không sửa implementation thuộc ownership Dev B. Khi cần chức năng StudentSession hoặc Notification, chỉ import public function đã khóa tại mục 2.4.

### 2.2. Database schema Dev A phải tạo ở Sprint 0

Migration dùng PostgreSQL UUID, `timestamptz` UTC và snake_case. Schema MVP cố định:

```text
teachers
  id uuid PK FK auth.users(id)
  display_name varchar(100) not null
  email_notification_enabled boolean not null default false
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()

class_sections
  id uuid PK
  code varchar(50) not null unique
  name varchar(150) not null
  teacher_id uuid not null FK teachers(id)
  created_at, updated_at timestamptz

students
  id uuid PK
  class_section_id uuid not null FK class_sections(id)
  mssv varchar(50) not null
  full_name varchar(150) not null
  email varchar(254) null
  nickname varchar(50) not null
  pin_hash text not null
  must_change_nickname boolean not null default true
  must_change_pin boolean not null default true
  failed_login_count integer not null default 0 check >= 0
  locked_until timestamptz null
  created_at, updated_at timestamptz
  unique(class_section_id, mssv)
  unique(class_section_id, nickname)

student_sessions
  id uuid PK
  student_id uuid not null FK students(id) on delete cascade
  token_hash text not null unique
  access_level varchar(30) not null check in ('credential_change','full')
  last_activity_at timestamptz not null
  expires_at timestamptz not null
  revoked_at timestamptz null
  created_at timestamptz not null default now()

login_rate_limits
  id uuid PK
  scope varchar(20) not null check in ('identifier','ip')
  key_hash char(64) not null
  attempt_count integer not null default 0 check >= 0
  window_started_at timestamptz not null
  blocked_until timestamptz null
  updated_at timestamptz not null default now()
  unique(scope, key_hash)

assignments
  id uuid PK
  class_section_id uuid not null FK class_sections(id)
  title varchar(200) not null
  description text not null default ''
  assigned_date date not null
  due_date date not null
  status varchar(20) not null check in ('draft','published','closed')
  max_score numeric(5,1) not null default 10.0 check > 0
  created_at, updated_at timestamptz

evaluations
  id uuid PK
  student_id uuid not null FK students(id)
  assignment_id uuid not null FK assignments(id)
  score numeric(5,1) null check >= 0
  feedback text not null default ''
  status varchar(20) not null check in ('pending','graded','returned')
  created_at, updated_at timestamptz
  unique(student_id, assignment_id)

evaluation_history
  id uuid PK
  evaluation_id uuid not null FK evaluations(id) on delete cascade
  old_score numeric(5,1) null
  old_feedback text not null
  old_status varchar(20) not null
  changed_at timestamptz not null default now()
  changed_by uuid not null FK teachers(id)

notifications
  id uuid PK
  student_id uuid not null FK students(id) on delete cascade
  evaluation_id uuid null FK evaluations(id) on delete cascade
  type varchar(30) not null check in ('evaluation_created','evaluation_updated')
  message varchar(500) not null
  created_at timestamptz not null default now()
  read_at timestamptz null
```

Quy ước chung cho schema:

- Mọi `created_at`/`updated_at` đều `not null default now()`; trigger chung cập nhật `updated_at` khi row thay đổi.
- Constraint liên lớp của Evaluation được enforce bằng trigger: Student và Assignment phải có cùng `class_section_id`.
- Trigger history chạy `BEFORE UPDATE`, chỉ insert khi score/feedback/status thực sự thay đổi và lấy `changed_by = auth.uid()`; Evaluation mutation bắt buộc dùng Supabase client của Teacher hiện hành, không dùng secret/service-role client.
- Score `<= assignments.max_score` được kiểm tra lại trong transaction trước khi insert/update Evaluation.
- `login_rate_limits` lưu HMAC key, không lưu IP hoặc nickname/class code dạng đọc được.

RLS/grants cố định:

- `anon`: không có quyền đọc/ghi bất kỳ bảng nghiệp vụ nào.
- Teacher `authenticated`: `teachers` chỉ row `id=auth.uid()`; `class_sections` chỉ `teacher_id=auth.uid()`.
- Quyền Teacher trên Student/Assignment/Evaluation/History/Notification phải đi qua quan hệ tới ClassSection có `teacher_id=auth.uid()`.
- `student_sessions` và `login_rate_limits`: không cấp quyền trực tiếp cho `anon/authenticated`; chỉ Next.js server credential truy cập.
- Student browser không dùng Supabase client để đọc bảng. Student API dùng server credential nhưng service/repository bắt buộc nhận `studentId/classSectionId` từ `requireFullStudentSession` và đưa trực tiếp vào điều kiện query.
- Mỗi policy có database test cho phép đúng Teacher và từ chối Teacher khác trước khi Sprint 0 hoàn tất.

### 2.3. Endpoint Dev A phải cung cấp

Tất cả dùng response/error envelope trong `engineering-rules.md`.

| Method | Endpoint | Request chính | Response `data` |
|---|---|---|---|
| POST | `/api/v1/teacher/auth/login` | `{ email, password }` | `{ teacher: { id, displayName } }` |
| POST | `/api/v1/teacher/auth/logout` | Không có | `{ success: true }` |
| GET | `/api/v1/teacher/auth/me` | Không có | `{ teacher: { id, displayName, emailNotificationEnabled } }` |
| GET | `/api/v1/teacher/class-sections?page&pageSize` | Query pagination | `ClassSectionDto[]` + `meta` pagination |
| POST | `/api/v1/teacher/class-sections` | `{ code, name }` | `ClassSectionDto` |
| GET | `/api/v1/teacher/class-sections/:classSectionId` | Không có | `ClassSectionDto` |
| PATCH | `/api/v1/teacher/class-sections/:classSectionId` | `{ code?, name? }` | `ClassSectionDto` |
| DELETE | `/api/v1/teacher/class-sections/:classSectionId` | Không có | `204`; trả `409` nếu đã có Student/Assignment |
| POST | `/api/v1/teacher/class-sections/:classSectionId/import` | `multipart/form-data`, field `file` | `ImportResultDto` |
| GET | `/api/v1/teacher/class-sections/:classSectionId/assignments` | Không có | `AssignmentDto[]` |
| POST | `/api/v1/teacher/class-sections/:classSectionId/assignments` | Assignment input | `AssignmentDto` |
| GET | `/api/v1/teacher/assignments/:assignmentId` | Không có | `AssignmentDto` |
| PATCH | `/api/v1/teacher/assignments/:assignmentId` | Partial assignment input | `AssignmentDto` |
| DELETE | `/api/v1/teacher/assignments/:assignmentId` | Không có | `204` nếu draft chưa có Evaluation; trường hợp khác `409` và dùng status `closed` |
| GET | `/api/v1/teacher/assignments/:assignmentId/evaluations` | Không có | `EvaluationWithStudentDto[]` |
| PUT | `/api/v1/teacher/assignments/:assignmentId/students/:studentId/evaluation` | `{ score, feedback, status }` | `EvaluationDto` |
| GET | `/api/v1/student/profile` | Student cookie | `StudentProfileDto` |

DTO cố định:

```ts
type ClassSectionDto = {
  id: string; code: string; name: string; createdAt: string; updatedAt: string;
};

type AssignmentDto = {
  id: string; classSectionId: string; title: string; description: string;
  assignedDate: string; dueDate: string;
  status: 'draft' | 'published' | 'closed'; maxScore: number;
  createdAt: string; updatedAt: string;
};

type EvaluationDto = {
  id: string; studentId: string; assignmentId: string;
  score: number | null; feedback: string;
  status: 'pending' | 'graded' | 'returned';
  createdAt: string; updatedAt: string;
};

type EvaluationWithStudentDto = EvaluationDto & {
  student: { id: string; mssv: string; fullName: string; nickname: string };
};

type ImportResultDto = {
  summary: { total: number; created: number; updated: number; skipped: number };
  rows: Array<{
    row: number; status: 'created' | 'updated' | 'skipped';
    studentId?: string; initialNickname?: string; initialPin?: string;
    errors?: Array<{ field: string; message: string }>;
  }>;
};

type StudentProfileDto = {
  student: { mssv: string; fullName: string; nickname: string };
  classSection: { id: string; code: string; name: string };
  progress: { completed: number; total: number; percentage: number };
  assignments: Array<AssignmentDto & { evaluation: EvaluationDto | null }>;
};
```

Validation cố định:

- `code`: trim, uppercase, 2–50 ký tự, regex `^[A-Z0-9_-]+$`.
- `name/title`: trim, 1–150/200 ký tự.
- `description/feedback`: tối đa 10.000/5.000 ký tự.
- `dueDate >= assignedDate`.
- `maxScore`: `0.1–999.9`, tối đa một chữ số thập phân.
- `pending` cho phép `score=null`; `graded/returned` bắt buộc có score.
- Assignment transition: giữ nguyên status luôn hợp lệ; `draft → published`; `published → closed`; `closed → published`; mọi transition về `draft` từ status khác bị từ chối.
- Evaluation cho phép chuyển giữa ba status; điều kiện score ở dòng trên luôn được enforce.
- Student Profile chỉ trả Assignment `published|closed`; Evaluation hiển thị theo dữ liệu hiện hành đúng brief.
- Progress: số Assignment có Evaluation `graded|returned` chia tổng Assignment `published|closed`; lớp không có Assignment trả `0/0/0`.

### 2.4. Public module Dev A được phép gọi từ Dev B

Dev B phải cung cấp đúng hai module, Dev A chỉ import và không sửa implementation:

```ts
// src/server/auth/student-session.ts
export async function requireFullStudentSession(): Promise<{
  sessionId: string;
  studentId: string;
  classSectionId: string;
}>;

// src/server/services/notification-service.ts
export async function createEvaluationNotification(input: {
  studentId: string;
  evaluationId: string;
  type: 'evaluation_created' | 'evaluation_updated';
  assignmentTitle: string;
}): Promise<void>;
```

Evaluation service gọi notification sau khi transaction Evaluation/History commit thành công. Không gọi nếu payload update không làm thay đổi score, feedback hoặc status. Dev B chịu trách nhiệm tạo message từ `assignmentTitle`; Dev A không tự format notification message.

### 2.5. Thứ tự tích hợp không cần trao đổi

1. Dev A hoàn tất Sprint 0 và merge scaffold + migration.
2. Dev B pull code Sprint 0 rồi triển khai StudentSession theo schema đã có.
3. Mỗi Dev tiếp tục module đúng sprint và endpoint đã khóa.
4. Dev A dùng `requireFullStudentSession` ở Sprint 5; module này đã phải tồn tại từ Sprint 1 của Dev B.
5. Dev A dùng `createEvaluationNotification` ở Sprint 4; module này đã phải tồn tại từ Sprint 3 của Dev B.
6. Nếu module chưa merge, Dev A viết test bằng mock đúng signature trên; không tạo signature thay thế.

## 3. Kế hoạch thực thi theo sprint

### Sprint 0 — Setup và database foundation

Phụ trách:

- Khởi tạo Next.js App Router và cấu trúc thư mục chung.
- Cấu hình TypeScript strict, lint, test runner và environment mẫu không chứa secret.
- Kết nối Supabase cho server/browser đúng phạm vi sử dụng.
- Tạo migration nền tảng cho Teacher, ClassSection, Student, StudentSession, Assignment, Evaluation, EvaluationHistory và Notification.
- Thiết lập foreign key, unique/check constraint, grants và RLS nền tảng.
- Chuẩn bị seed data chỉ dùng cho local/test.

Deliverable:

- Project chạy được trên local từ README.
- Database dựng được từ migration trên database rỗng.
- Lint, type-check và test command chạy được trong CI/local.
- Không có secret hoặc dữ liệu thật trong repository.

Đầu ra cố định cho Dev B sử dụng:

- Kiểu dữ liệu/schema Student và StudentSession.
- Supabase server client utility.
- Quy ước error/response dùng chung.

### Sprint 1 — Teacher authentication

Phụ trách:

- Teacher login/logout bằng Supabase Auth SSR.
- Mapping `Teacher.id` với `auth.users.id`.
- Bảo vệ Teacher/Admin routes và xử lý session hết hạn.
- UI đăng nhập Teacher và trạng thái lỗi an toàn.

Acceptance tối thiểu:

- Login đúng vào được Admin; sai credentials không lộ tài khoản tồn tại.
- Route Admin từ chối request chưa xác thực.
- Logout làm session không còn sử dụng được.
- Query Teacher luôn giữ `teacher_id` context.

### Sprint 2 — Class Section và import

Phụ trách:

- CRUD ClassSection phía Teacher/Admin.
- Import CSV/Excel với MSSV, Họ Tên và Email tùy chọn.
- Validate file/row, báo lỗi theo dòng và bỏ qua dòng lỗi theo brief.
- Sinh nickname/PIN khởi tạo theo business rule hiện hành trong brief.
- Cho phép tải kết quả PIN khởi tạo đúng một lần; không lưu file export trong server/repository.
- Re-import MSSV đã tồn tại chỉ cập nhật Họ Tên/Email.

Giới hạn import cố định:

- Chỉ nhận `.csv` và `.xlsx`, tối đa 5 MB và 2.000 data rows/file.
- Header được trim và đối chiếu không phân biệt hoa thường: `MSSV`, `Họ Tên`; `Email` tùy chọn.
- File thiếu header bắt buộc, sai loại hoặc vượt giới hạn: từ chối toàn file với `VALIDATION_ERROR`.
- Lỗi nội dung từng dòng: bỏ qua dòng đó, tiếp tục các dòng còn lại và đưa lỗi vào `ImportResultDto`.
- Dòng trống bỏ qua, không tính vào `total`; duplicate MSSV trong cùng file: dòng đầu xử lý, các dòng sau `skipped`.
- Danh sách ClassSection mặc định `createdAt desc`; Assignment mặc định `assignedDate desc, createdAt desc`.

Acceptance tối thiểu:

- Không tạo duplicate MSSV/nickname trong cùng lớp.
- Dòng lỗi không làm rollback các dòng hợp lệ.
- Import/re-import không tự reset credentials hiện hành.
- Teacher không thao tác ClassSection ngoài `teacher_id` context.
- Import response chứa PIN phải có `Cache-Control: no-store`; CSV PIN được tạo ở browser từ response và không có endpoint tải lại.

Ranh giới đã khóa với Dev B:

- Dev B sở hữu màn hình/quy trình quản lý Student và nickname trong lớp.
- Dev B sử dụng nguyên DTO và endpoint tại mục 2.3; không cần thiết kế lại trước khi nối UI.

### Sprint 3 — Assignment management

Phụ trách:

- CRUD Assignment theo ClassSection.
- Assigned date, due date, max score và status `draft | published | closed`.
- Validate date, max score và status transition.
- UI Teacher/Admin quản lý Assignment.

Acceptance tối thiểu:

- Assignment luôn thuộc đúng ClassSection/Teacher context.
- Student không nhìn thấy Assignment `draft`.
- Chỉ xóa cứng Assignment `draft` chưa có Evaluation; mọi trường hợp khác trả `409` và Teacher phải chuyển status sang `closed`.
- API trả error/status đúng `engineering-rules.md` và mục 2.3, không tự chọn format khác.

### Sprint 4 — Evaluation hiện hành

Phụ trách:

- Teacher nhập/sửa `score`, `feedback`, `status` theo từng Student/Assignment.
- Enforce Student và Assignment thuộc cùng ClassSection.
- Validate score theo `max_score` và tối đa một chữ số thập phân.
- UI Teacher chọn lớp → assignment → student → lưu evaluation.
- Gọi `createEvaluationNotification` đúng signature tại mục 2.4 sau khi transaction thành công.

Acceptance tối thiểu:

- Chỉ có một Evaluation hiện hành cho một cặp Student/Assignment.
- Update Evaluation và EvaluationHistory chạy trong cùng transaction/trigger.
- Không tạo Notification sai Student hoặc khi transaction Evaluation thất bại.
- Không lộ Evaluation qua lỗi hoặc response ngoài context.

Ranh giới đã khóa với Dev B:

- Dev B sở hữu EvaluationHistory API/view và Notification.
- Payload/type/điều kiện chống gửi trùng đã cố định tại mục 2.4.

### Sprint 5 — Student Profile API

Phụ trách:

- API tổng hợp hồ sơ học tập cho Student hiện hành.
- Trả ClassSection, Assignment được phép hiển thị, Evaluation, feedback và progress.
- Tính progress đúng công thức trong brief.
- Scope toàn bộ query bằng StudentSession; không dùng `studentId` do browser gửi để xác định quyền.

Acceptance tối thiểu:

- Student chỉ nhận đúng một learning profile của session hiện hành.
- Assignment `draft` không xuất hiện.
- Progress xử lý đúng lớp chưa có assignment và trường hợp `published/closed`.
- Student A dùng ID của Student B vẫn nhận 403/404, không có dữ liệu.

### Sprint 6 — Hardening và báo cáo

Phụ trách:

- Fix bug thuộc module sở hữu.
- Tối ưu query/import/profile API dựa trên kết quả test.
- Hỗ trợ regression toàn hệ thống.
- Cập nhật tài liệu setup, schema/API và phần báo cáo kỹ thuật liên quan.

## 4. Nhiệm vụ QA chéo đối với Dev B

Dev A là reviewer/QA chính cho:

- Student login, StudentSession, PIN lifecycle và rate limit.
- Student management/nickname trong lớp.
- Notification API/polling và email adapter/config.
- EvaluationHistory.
- Student Profile UI và progress presentation.

Checklist trọng tâm:

- Thử login sai class/nickname/PIN, account lock, session timeout và reset PIN.
- Thử replay session đã logout/reset.
- Gọi trực tiếp API bằng session Student A với ID của Student B.
- Kiểm tra notification chỉ đến đúng Student và `read_at` hoạt động.
- Kiểm tra UI không hiển thị dữ liệu cũ của Student trước sau logout/login.
- Kiểm tra email không gửi khi tắt hoặc Student không có email.

## 5. Gói bàn giao bắt buộc

Khi feature được merge, repository phải có sẵn các artifact sau; không cần họp bàn giao:

- OpenAPI/test fixture khớp contract tại mục 2.3.
- Migration/schema liên quan.
- Danh sách error code và status.
- Test data/seed không chứa dữ liệu thật.
- Test command và các case đã kiểm tra.
- Giới hạn hoặc rủi ro còn lại.

## 6. Definition of Done riêng cho Dev A

Ngoài Definition of Done chung:

- Teacher/Class context được enforce tại API/database phù hợp.
- Import có báo cáo theo dòng và không làm lộ/lưu lại raw PIN sau bước cấp ban đầu.
- Evaluation không thể liên kết Student và Assignment khác lớp.
- Student Profile API đã có privacy regression test.
- Dev B đã review code/test theo contract đã khóa; không mở lại quyết định thiết kế.
