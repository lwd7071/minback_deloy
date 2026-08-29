# MinBack — Phân Công Dev B

Dev B sở hữu chính Student authentication/session, Student management, Notification, EvaluationHistory và giao diện Student Profile theo Sprint Plan trong `docs/brief.md`.

Mọi implementation và review phải tuân thủ `docs/team/engineering-rules.md`.

## 1. Trách nhiệm tổng quát

- Hoàn thành các deliverable Dev B đúng sprint.
- Tuân thủ nguyên trạng schema/API/module contract đã khóa trong file này; không yêu cầu Dev A quyết định thêm.
- Viết unit/integration test cho code mình sở hữu.
- Là QA/reviewer chính cho feature của Dev A.
- Không tự merge PR của mình khi chưa có Dev A review.

## 2. Contract triển khai đã khóa

Phần này là quyết định cuối cho MVP. Dev B code theo đúng contract; không đổi tên route, field, status hoặc ownership trong lúc triển khai.

### 2.1. Ownership thư mục

Dev B sở hữu và được quyền triển khai chính:

```text
src/app/(student)/student/**
src/app/(teacher)/teacher/class-sections/[classSectionId]/students/**
src/app/(teacher)/teacher/settings/notifications/**
src/app/api/v1/student/auth/**
src/app/api/v1/student/notifications/**
src/app/api/v1/teacher/class-sections/[classSectionId]/students/**
src/app/api/v1/teacher/students/**
src/app/api/v1/teacher/evaluations/[evaluationId]/history/**
src/app/api/v1/teacher/settings/notifications/**
src/server/auth/student-session.ts
src/server/services/student-auth-service.ts
src/server/services/student-management-service.ts
src/server/services/notification-service.ts
src/server/services/email-notification-service.ts
src/server/services/evaluation-history-service.ts
src/server/repositories/student-repository.ts
src/server/repositories/student-session-repository.ts
src/server/repositories/login-rate-limit-repository.ts
src/server/repositories/notification-repository.ts
src/server/repositories/evaluation-history-repository.ts
src/components/student/**
src/components/teacher/student-management/**
src/components/teacher/notification-settings/**
```

Dev B không sửa migration/core API thuộc ownership Dev A. Database schema sử dụng nguyên trạng mục 2.2 trong plan Dev A; các field Student, StudentSession, EvaluationHistory và Notification đã đầy đủ cho MVP.

### 2.2. Endpoint Dev B phải cung cấp

Tất cả dùng response/error envelope trong `engineering-rules.md`.

| Method | Endpoint | Request chính | Response `data` |
|---|---|---|---|
| POST | `/api/v1/student/auth/login` | `{ classCode, nickname, pin }` | `{ requiresCredentialChange, requiredFields }` + set cookie |
| GET | `/api/v1/student/auth/session` | Student cookie | `StudentSessionDto` |
| PATCH | `/api/v1/student/auth/credentials` | `{ nickname?, pin? }` | `StudentSessionDto` |
| POST | `/api/v1/student/auth/logout` | Không có | `{ success: true }` + revoke/clear cookie |
| GET | `/api/v1/teacher/class-sections/:classSectionId/students?page&pageSize&search` | Pagination/search | `StudentAdminDto[]` + `meta` pagination |
| GET | `/api/v1/teacher/class-sections/:classSectionId/students/:studentId` | Không có | `StudentAdminDto` |
| PATCH | `/api/v1/teacher/class-sections/:classSectionId/students/:studentId` | `{ fullName?, email?, nickname? }` | `StudentAdminDto` |
| POST | `/api/v1/teacher/class-sections/:classSectionId/students/:studentId/reset-pin` | Không có | `{ initialPin: string }` trả đúng một lần |
| GET | `/api/v1/student/notifications?page&pageSize&unreadOnly` | Student cookie | `NotificationDto[]` + `meta` pagination có `unreadCount` |
| PATCH | `/api/v1/student/notifications/:notificationId/read` | Không có | `NotificationDto` |
| GET | `/api/v1/teacher/evaluations/:evaluationId/history` | Không có | `EvaluationHistoryDto[]` |
| GET | `/api/v1/teacher/settings/notifications` | Không có | `{ emailEnabled: boolean }` |
| PATCH | `/api/v1/teacher/settings/notifications` | `{ emailEnabled: boolean }` | `{ emailEnabled: boolean }` |

DTO cố định:

```ts
type StudentSessionDto = {
  student: {
    id: string; classSectionId: string; mssv: string;
    fullName: string; nickname: string;
  };
  accessLevel: 'credential_change' | 'full';
  mustChangeNickname: boolean;
  mustChangePin: boolean;
  expiresAt: string;
};

type StudentAdminDto = {
  id: string; classSectionId: string; mssv: string;
  fullName: string; email: string | null; nickname: string;
  mustChangeNickname: boolean; mustChangePin: boolean;
  lockedUntil: string | null; createdAt: string; updatedAt: string;
};

type NotificationDto = {
  id: string; type: 'evaluation_created' | 'evaluation_updated';
  message: string; evaluationId: string | null;
  createdAt: string; readAt: string | null;
};

type EvaluationHistoryDto = {
  id: string; evaluationId: string; oldScore: number | null;
  oldFeedback: string; oldStatus: 'pending' | 'graded' | 'returned';
  changedAt: string;
  changedBy: { id: string; displayName: string };
};
```

### 2.3. Auth flow cố định

1. Login normalize `classCode=trim().toUpperCase()`, `nickname=trim()`; PIN giữ dạng string.
2. Trước khi query Student, kiểm tra hai bucket trong `login_rate_limits`: `scope='ip'` với `HMAC-SHA256(normalizedIp)` và `scope='identifier'` với `HMAC-SHA256(classCode:nickname)`. HMAC dùng secret server `RATE_LIMIT_HMAC_SECRET`.
3. Query Student bằng `class_sections.code + students.nickname`; verify BCrypt PIN.
4. Sai ở bất kỳ bước nào trả `401 INVALID_CREDENTIALS` cùng message; tăng cả hai bucket trong transaction. Bucket identifier bị block 15 phút ở lần sai thứ 5; bucket IP bị block 15 phút khi có 30 lần sai trong cùng cửa sổ 15 phút. Request trong thời gian block trả `429 LOGIN_RATE_LIMITED`.
5. Login đúng reset `failed_login_count/locked_until`.
6. Nếu còn cờ đổi credentials, tạo session `access_level='credential_change'`; session này chỉ gọi được session, credentials và logout.
7. Sau khi đổi đủ field bắt buộc, set cả cờ tương ứng false, rotate session token và đổi `access_level='full'`.
8. Session timeout sau 30 phút không hoạt động. Request hợp lệ cập nhật `last_activity_at` với write throttling tối đa một lần/phút.
9. Logout/reset PIN set `revoked_at`; cookie tên `minback_student_session`, raw token 32 bytes ngẫu nhiên base64url, DB lưu SHA-256 hash.
10. Reset PIN sinh PIN 6 số bằng CSPRNG, hash BCrypt, `must_change_pin=true`, không đổi nickname và revoke toàn bộ session cũ.

Rate-limit cleanup cố định: khi login thành công, reset bucket identifier và `students.failed_login_count`; không reset bucket IP. Row rate-limit không hoạt động quá 24 giờ được xóa bởi cleanup job hoặc cron hằng ngày.

Validation cố định:

- `classCode`: 2–50 ký tự, `^[A-Z0-9_-]+$`.
- `nickname`: 3–50 ký tự, `^[A-Za-z0-9._-]+$`, unique trong lớp.
- `pin`: đúng 6 chữ số, regex `^\d{6}$`.
- `fullName`: trim, 1–150 ký tự.
- `email`: null/chuỗi rỗng chuyển thành null; nếu có phải là email hợp lệ ≤254 ký tự.
- Search Student trim, tối đa 100 ký tự; server tìm theo MSSV/fullName/nickname trong đúng lớp.
- Student list sắp xếp mặc định `mssv asc`; Notification `createdAt desc`; EvaluationHistory `changedAt desc`.
- Pagination dùng `page=1`, `pageSize=20`, tối đa 100 theo rule chung.

### 2.4. Notification contract cố định

Dev B phải export nguyên signature:

```ts
// src/server/services/notification-service.ts
export async function createEvaluationNotification(input: {
  studentId: string;
  evaluationId: string;
  type: 'evaluation_created' | 'evaluation_updated';
  assignmentTitle: string;
}): Promise<void>;
```

Quy tắc:

- `evaluation_created`: Evaluation mới được tạo với status `graded|returned`.
- `evaluation_updated`: score, feedback hoặc status thay đổi và kết quả sau update có status `graded|returned`.
- Module tạo message server-side từ `assignmentTitle`: `Kết quả bài tập "{assignmentTitle}" đã được cập nhật.`; title phải escape khi render UI.
- Không tạo notification cho update no-op hoặc Evaluation còn `pending`.
- Email chỉ gửi sau khi Notification đã insert thành công, cấu hình bật và Student có email.
- Email lỗi không rollback Evaluation/Notification; log an toàn và để web notification tiếp tục hoạt động.
- Polling chạy mỗi 10 giây khi tab visible, dừng khi hidden/logout/unmount và fetch ngay khi tab visible lại.

### 2.5. Contract Dev B tiêu thụ từ Dev A

Dev B dùng nguyên các endpoint/DTO trong mục 2.3 plan Dev A. Đặc biệt Student Profile UI chỉ gọi:

```text
GET /api/v1/student/profile
```

Không tự ghép profile bằng nhiều Supabase query và không gửi `studentId` từ browser.

EvaluationHistory đọc bảng/endpoint theo `evaluationId`, nhưng Teacher authorization phải đi qua Evaluation → Assignment → ClassSection → `teacher_id`.

### 2.6. Public module Dev B phải cung cấp cho Dev A

```ts
// src/server/auth/student-session.ts
export async function requireFullStudentSession(): Promise<{
  sessionId: string;
  studentId: string;
  classSectionId: string;
}>;
```

Hàm đọc cookie từ request context, verify token hash/expiry/revocation/access level, cập nhật activity theo throttle và throw typed error chuẩn. Không nhận session/student ID làm argument từ client.

### 2.7. Thứ tự tích hợp không cần trao đổi

1. Dev B có thể dựng UI/type/service test bằng DTO cố định trong file này ngay từ đầu.
2. Khi Dev A merge Sprint 0, Dev B pull migration/scaffold và nối repository thật; không đổi schema.
3. Sprint 1 phải merge `requireFullStudentSession` trước khi Dev A bắt đầu Profile API Sprint 5.
4. Sprint 3 phải merge `createEvaluationNotification` trước khi Dev A nối Evaluation Sprint 4.
5. Nếu endpoint Dev A chưa merge, dùng MSW/mock fixture đúng DTO; khi endpoint có sẵn chỉ thay data source, không đổi UI contract.

## 3. Kế hoạch thực thi theo sprint

### Sprint 0 — Authentication foundation

Phụ trách:

- Thiết kế auth flow chung cho Teacher và Student dựa trên schema/utility của Dev A.
- Implement StudentSession bằng opaque token; database chỉ lưu token hash.
- Cookie `HttpOnly + Secure + SameSite=Lax`, session timeout và logout/revoke.
- CSRF protection và kiểm tra Origin cho mutation request.
- Rate limit theo IP + định danh đăng nhập.
- Error code/auth middleware dùng chung cho Student routes.

Deliverable:

- Auth/session service có unit test.
- Middleware/helper lấy Student identity từ session.
- Session hết hạn/revoked không truy cập được API.
- Không có PIN/token/secret trong log hoặc response.

Đầu ra cố định cho Dev A sử dụng:

- Hàm xác thực StudentSession dùng cho Student Profile API.
- Auth error contract `401/403/429`.
- Helper thu hồi session khi reset PIN.

### Sprint 1 — Student login và credential lifecycle

Phụ trách:

- Student login bằng ClassSection code + nickname + PIN.
- First-login flow đổi thông tin theo `must_change_nickname`/`must_change_pin`.
- Validate nickname unique trong lớp và PIN theo brief.
- Logout, timeout, account lock và reset-PIN integration.
- UI login/đổi credentials với thông báo lỗi chung.

Acceptance tối thiểu:

- Sai credentials không tiết lộ field nào đúng/sai.
- Đủ số lần sai bị khóa/rate limit đúng thời gian.
- First login chưa đổi credentials không vào được learning profile.
- Reset PIN thu hồi toàn bộ session cũ và không bắt đổi lại nickname nếu brief không yêu cầu.
- StudentSession chỉ mở đúng một Student enrollment.

### Sprint 2 — Student management và nickname

Phụ trách:

- UI/API Teacher quản lý Student trong một ClassSection theo endpoint tại mục 2.2.
- Xem danh sách, cập nhật Họ Tên/Email và trạng thái credentials phù hợp.
- Đổi/reset PIN từ Admin theo business rule.
- Enforce nickname/MSSV unique trong lớp.

Acceptance tối thiểu:

- Không sửa Student ngoài ClassSection/Teacher context.
- Reset PIN không trả hoặc lưu raw PIN quá thời điểm cấp một lần.
- Không tự thay đổi credentials khi cập nhật Họ Tên/Email.
- Trùng nickname/MSSV trả conflict/error đúng chuẩn.

### Sprint 3 — Notification

Phụ trách:

- Notification table access/service theo schema cố định trong plan Dev A.
- API lấy notification của StudentSession hiện hành.
- Đánh dấu đã đọc bằng `read_at`.
- Polling web tối đa mỗi 10 giây; cleanup polling khi logout/unmount.
- Email adapter và trang Admin bật/tắt email.
- Chỉ gửi email khi cấu hình bật và Student có email.

Acceptance tối thiểu:

- Notification xuất hiện cho đúng Student trong ≤ 10 giây.
- Student không đọc/mark-read Notification của Student khác.
- Không tạo/gửi email nếu Evaluation transaction thất bại.
- Email secret chỉ nằm ở environment phía server.
- Polling không tạo request trùng vô hạn hoặc tiếp tục sau logout.

Ranh giới đã khóa với Dev A:

- Dev A sở hữu điểm phát sinh Notification khi Evaluation thay đổi.
- Loại notification, payload và điều kiện chống gửi trùng đã cố định tại mục 2.4.

### Sprint 4 — EvaluationHistory và Admin email config

Phụ trách:

- EvaluationHistory query/API và UI xem lịch sử.
- Hiển thị giá trị cũ, thời điểm thay đổi và Teacher thay đổi.
- Đọc history do trigger cố định trong migration Dev A tạo; không viết logic history thứ hai ở application layer.
- Hoàn thiện Admin email config on/off.

Acceptance tối thiểu:

- Update Evaluation thành công tạo đúng một history record chứa giá trị cũ.
- Update thất bại không để lại history record mồ côi.
- History bị scope theo Teacher/Class/Student đúng quyền.
- Thay đổi email config không làm lộ provider secret.

### Sprint 5 — Student Profile UI

Phụ trách:

- FE hiển thị hồ sơ học tập từ API do Dev A cung cấp.
- Hiển thị ClassSection, danh sách Assignment, score, feedback, status và progress.
- Loading, empty, error và session-expired state.
- Notification indicator phù hợp với polling API.
- Không cache/chia sẻ dữ liệu riêng tư giữa hai session Student.

Acceptance tối thiểu:

- Student thấy đúng profile của session hiện hành, không có selector/parameter đổi sang Student khác.
- Feedback/score/status khớp API và xử lý giá trị chưa chấm.
- Progress hiển thị đúng khi chưa có Assignment.
- Logout rồi login Student khác không còn dữ liệu Student trước.
- UI hoạt động ở kích thước màn hình mục tiêu của demo.

### Sprint 6 — Hardening và báo cáo

Phụ trách:

- Fix bug thuộc module sở hữu.
- Tối ưu auth/session, polling và Student UI dựa trên kết quả test.
- Hỗ trợ regression hai core workflow.
- Cập nhật tài liệu auth, notification và hướng dẫn demo.

## 4. Nhiệm vụ QA chéo đối với Dev A

Dev B là reviewer/QA chính cho:

- Project setup, migration, grants/RLS và Teacher auth.
- ClassSection CRUD và import CSV/Excel.
- Assignment management.
- Evaluation hiện hành.
- Student Profile API và progress calculation.

Checklist trọng tâm:

- Dựng database mới hoàn toàn từ migration.
- Thử Teacher chưa login, session hết hạn và sai `teacher_id` context.
- Import file sai header, sai kiểu, duplicate, file rỗng và re-import.
- Thử date/max score/status boundary của Assignment.
- Thử score âm, vượt max, quá một chữ số thập phân và Student/Assignment khác lớp.
- Dùng Student A gọi profile/evaluation của Student B trực tiếp qua API.
- Kiểm tra progress với lớp rỗng, Assignment draft, published và closed.

## 5. Gói bàn giao bắt buộc

Khi feature được merge, repository phải có sẵn các artifact sau; không cần họp bàn giao:

- Type/export implementation khớp contract tại mục 2.4 và 2.6.
- API request/response và danh sách error code.
- Migration/schema cần thiết nếu có.
- Test data/seed không chứa dữ liệu thật.
- Test command và các case đã kiểm tra.
- Cách revoke/cleanup session, polling hoặc notification.
- Giới hạn hoặc rủi ro còn lại.

## 6. Definition of Done riêng cho Dev B

Ngoài Definition of Done chung:

- Student identity luôn lấy từ StudentSession, không lấy từ client input.
- Rate limit, timeout, logout và reset PIN có integration test.
- Notification/history không lộ chéo Student/Class.
- Student UI không giữ dữ liệu riêng tư sau khi đổi session.
- Dev A đã review code/test theo contract đã khóa; không mở lại quyết định thiết kế.
