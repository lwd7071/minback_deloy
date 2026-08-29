# MinBack — Engineering Rules

Tài liệu này là quy chuẩn kỹ thuật chung bắt buộc cho cả Dev A và Dev B. Hai file phân công chỉ xác định phạm vi sở hữu; mọi code, test và pull request đều phải tuân thủ tài liệu này.

## 1. Nguồn sự thật và thứ tự ưu tiên

Khi tài liệu mâu thuẫn, áp dụng theo thứ tự:

1. `docs/brief.md` — nghiệp vụ, phạm vi MVP và acceptance criteria.
2. `docs/team/engineering-rules.md` — quy chuẩn kỹ thuật và chất lượng.
3. `docs/team/dev-a-assignment.md` hoặc `docs/team/dev-b-assignment.md` — execution plan, ownership và contract đã khóa.

Không tự thay đổi business rule hoặc contract trong lúc code. Hai execution plan đã khóa sẵn quyết định tích hợp; Dev triển khai đúng plan, không mở lại thảo luận thiết kế trong từng sprint. Chỉ dừng task khi có mâu thuẫn trực tiếp với brief, lỗi bảo mật nghiêm trọng hoặc thiếu credential/hạ tầng bên ngoài.

## 2. Nguyên tắc làm việc

- Mỗi feature phải có một owner chính và một reviewer/QA chéo.
- Ownership là trách nhiệm hoàn thành, không phải quyền độc quyền sửa code.
- Người viết code không tự approve pull request của mình.
- Không merge code khi test bắt buộc chưa chạy, review chưa hoàn tất hoặc API/schema chưa đồng bộ tài liệu.
- Ưu tiên pull request nhỏ, có một mục tiêu rõ ràng; không trộn refactor không liên quan vào feature PR.
- Không sửa trực tiếp database production hoặc tạo bảng thủ công trên Supabase Dashboard. Mọi thay đổi schema phải đi qua migration được commit.

## 3. Kiến trúc và ranh giới trách nhiệm

Luồng xử lý chuẩn:

```text
UI / Client
    ↓
Next.js Route Handler / Server Action
    ↓
Authentication → Authorization → Validation
    ↓
Service / Business Logic
    ↓
Repository / Supabase Client
    ↓
PostgreSQL
```

- UI không truy cập dữ liệu riêng tư của Student trực tiếp từ Supabase.
- Student chỉ truy cập dữ liệu qua Next.js API sau khi xác thực `StudentSession`.
- Teacher dùng Supabase Auth SSR; truy vấn phải giữ đúng `teacher_id` context.
- Route Handler chỉ điều phối request/response. Business rule đặt trong service để có thể unit test.
- Không gọi database rải rác trong component React.
- Không để một service truy cập trực tiếp dữ liệu ngoài domain nếu đã có service/repository sở hữu domain đó.

## 4. Quy chuẩn TypeScript và code sạch

- Bật TypeScript `strict`; không tắt type-check cho toàn file.
- Không dùng `any`. Trường hợp bất khả kháng phải dùng `unknown`, validate/narrow type trước khi sử dụng và giải thích trong code review.
- Tên biến, hàm và type dùng tiếng Anh, diễn đạt đúng nghiệp vụ.
- Component/type/class: `PascalCase`; hàm/biến: `camelCase`; constant: `UPPER_SNAKE_CASE` khi thực sự bất biến toàn cục.
- Hàm chỉ nên làm một nhiệm vụ. Tách logic khi hàm vừa validate, vừa truy vấn, vừa biến đổi và vừa tạo response.
- Tránh magic number/string; đưa status, timeout và giới hạn vào enum hoặc constant dùng chung.
- Không duplicate business rule giữa FE và BE. FE có thể validate để cải thiện UX, nhưng BE/API luôn là nơi enforce cuối cùng.
- Chỉ comment để giải thích lý do hoặc constraint khó thấy; không comment lặp lại điều code đã thể hiện.
- Xóa code chết, debug log và TODO không có issue trước khi merge.

## 5. Quy chuẩn API

### 5.1. URL và dữ liệu

- API nội bộ dùng prefix `/api/v1`.
- Resource dùng danh từ số nhiều, chữ thường và kebab-case khi cần, ví dụ `/api/v1/class-sections`.
- JSON field dùng `camelCase`.
- ID dùng UUID.
- Thời gian trả về theo ISO 8601 UTC, ví dụ `2026-08-29T10:30:00Z`.
- Danh sách có khả năng lớn phải hỗ trợ pagination; không trả toàn bộ dữ liệu không giới hạn.
- Pagination mặc định `page=1`, `pageSize=20`, tối đa `pageSize=100`; page bắt đầu từ 1.

### 5.2. Response thống nhất

Thành công:

```json
{
  "data": {}
}
```

Danh sách có pagination:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

Lỗi:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": []
  }
}
```

- `code` ổn định để FE xử lý; `message` an toàn để hiển thị; `details` chỉ chứa lỗi field, không chứa stack trace hoặc dữ liệu nhạy cảm.
- Không trả raw error từ Supabase/PostgreSQL cho client.

### 5.3. HTTP status

- `200`: đọc/cập nhật thành công.
- `201`: tạo mới thành công.
- `204`: xóa thành công và không có response body.
- `400`: request sai định dạng hoặc business input không hợp lệ.
- `401`: chưa xác thực hoặc session hết hạn.
- `403`: đã xác thực nhưng không có quyền.
- `404`: resource không tồn tại hoặc cần che giấu sự tồn tại vì privacy.
- `409`: xung đột unique/state.
- Toàn dự án dùng `400` cho validation/business input; không trộn thêm `422` nếu chưa có quyết định thay đổi rule chung.
- `429`: vượt rate limit.
- `500`: lỗi ngoài dự kiến; response không được lộ chi tiết nội bộ.
- `502`: dịch vụ email bên ngoài từ chối/timeout, chỉ dùng cho thao tác gửi thử đồng bộ.

Một loại lỗi phải dùng nhất quán cùng status trong toàn hệ thống.

Error code cố định cho MVP:

| Code | HTTP | Khi dùng |
|---|---:|---|
| `VALIDATION_ERROR` | 400 | Params/query/body/file không hợp lệ |
| `INVALID_STATE_TRANSITION` | 400 | Chuyển status không được phép |
| `INVALID_CREDENTIALS` | 401 | Teacher/Student credentials sai; message chung |
| `UNAUTHENTICATED` | 401 | Không có session |
| `SESSION_EXPIRED` | 401 | Session hết hạn hoặc revoked |
| `CREDENTIAL_CHANGE_REQUIRED` | 403 | Student session chỉ được đổi credentials |
| `FORBIDDEN` | 403 | Có session nhưng sai quyền/context |
| `NOT_FOUND` | 404 | Không tồn tại hoặc cần che giấu resource ngoài quyền |
| `CONFLICT` | 409 | Unique conflict hoặc không thể xóa resource đang được dùng |
| `LOGIN_RATE_LIMITED` | 429 | Login bucket đang bị block |
| `EMAIL_NOT_CONFIGURED` | 400 | Admin bật/test email nhưng thiếu Brevo server env hợp lệ |
| `EMAIL_DELIVERY_FAILED` | 502 | Endpoint gửi thử bị Brevo từ chối, timeout hoặc response không hợp lệ |
| `INTERNAL_ERROR` | 500 | Lỗi ngoài dự kiến; không lộ chi tiết |

### 5.4. Thứ tự xử lý request

```text
Parse → Authenticate → Authorize context → Validate input
→ Execute business rule/transaction → Map response
```

- Dùng Zod cho `params`, `query`, body và dữ liệu import.
- Không tin ID, status, score hoặc role do client gửi lên.
- Trim chuỗi phù hợp trước khi validate; không tự ý thay đổi nội dung feedback.
- Score phải thỏa `0 ≤ score ≤ assignment.maxScore` và tối đa một chữ số thập phân.
- Enum chỉ nhận đúng giá trị được định nghĩa trong brief/schema.

## 6. Authentication, authorization và privacy

### 6.1. Student

- Xác định Student từ `StudentSession`; không nhận `studentId` từ body/query để quyết định quyền truy cập.
- Mọi query Student phải scope theo `student_id` và khi liên quan lớp phải kiểm tra thêm `class_section_id`.
- Browser Student không được nhận Supabase secret key hoặc gọi trực tiếp bảng dữ liệu riêng tư.
- Raw session token chỉ nằm trong cookie `HttpOnly + Secure + SameSite=Lax`; database chỉ lưu token hash.
- Logout, reset PIN và khóa tài khoản phải thu hồi session theo business rule.

### 6.2. Teacher/Admin

- Xác thực bằng Supabase Auth SSR.
- `Teacher.id` phải ánh xạ `auth.users.id`.
- Dù MVP chỉ có một Teacher, query vẫn phải filter/authorize theo `teacher_id` để tránh bỏ quên scope khi mở rộng.

### 6.3. Quy tắc bảo mật bắt buộc

- PIN hash bằng BCrypt; không log hoặc trả PIN sau thời điểm cấp PIN khởi tạo.
- Login error dùng thông báo chung, không tiết lộ class code/nickname có tồn tại.
- Rate limit theo cả IP và định danh đăng nhập.
- Request thay đổi dữ liệu phải có kiểm tra `Origin` và CSRF protection.
- Không log PIN, password, cookie, token, secret, raw authorization header hoặc toàn bộ hồ sơ sinh viên.
- Secret chỉ lưu trong environment variable phía server; không dùng prefix public cho secret.
- Bảng public phải có grants/RLS phù hợp; `anon` mặc định không được đọc dữ liệu học tập.

## 7. Database và data integrity

- Migration phải có tên rõ nghĩa và có thể chạy lại từ database rỗng theo đúng thứ tự.
- Mọi foreign key, unique constraint và check constraint trong brief phải enforce tại database, không chỉ ở code.
- Bắt buộc có tối thiểu:
  - `UNIQUE(code)` cho ClassSection.
  - `UNIQUE(class_section_id, mssv)`.
  - `UNIQUE(class_section_id, nickname)`.
  - `UNIQUE(student_id, assignment_id)`.
  - Check score và các enum/status hợp lệ.
- Khi tạo Evaluation phải xác minh Student và Assignment thuộc cùng ClassSection.
- Update Evaluation và ghi EvaluationHistory phải nằm trong cùng transaction; ưu tiên database trigger.
- Timestamps lưu UTC; dùng `created_at`, `updated_at`, `read_at`, `revoked_at` nhất quán.
- Xóa dữ liệu có liên kết phải xác định rõ restrict, cascade hay soft delete trước khi viết migration.
- Re-import MSSV đã tồn tại trong lớp chỉ cập nhật `full_name`/`email`; không tự reset nickname, PIN hoặc session.

## 8. Error handling và logging

- Dùng error code có type/constant dùng chung; không so sánh bằng message tự do.
- Log server phải có request/correlation ID khi phù hợp.
- Log đủ context kỹ thuật để debug nhưng không chứa dữ liệu nhạy cảm.
- Expected error như validation, unauthorized và conflict không được log như crash hệ thống.
- Unexpected error phải được bắt ở boundary, log server-side và trả response `500` an toàn.
- Không dùng `console.log` tùy tiện trong code production.

## 9. Testing và QA chéo

### 9.1. Trách nhiệm tác giả

- Viết unit test cho business rule và validation do mình triển khai.
- Viết integration/API test cho success case và các lỗi chính.
- Chạy lint, type-check và test liên quan trước khi mở PR.
- Ghi rõ cách test thủ công và dữ liệu test trong PR.

### 9.2. Trách nhiệm reviewer/QA chéo

- Review code, migration, API contract và khả năng lộ dữ liệu.
- Bổ sung hoặc yêu cầu negative test mà tác giả bỏ sót.
- Kiểm tra ít nhất: sai quyền, sai class context, resource không tồn tại, boundary value, duplicate và session hết hạn.
- Không chỉ test UI; phải thử API trực tiếp để chắc chắn backend enforce quyền.

### 9.3. Test bắt buộc theo tầng

- Unit: service, progress formula, score validation, import parser, status transition.
- Integration/API: auth, authorization, database constraint, transaction/history, notification.
- E2E: hai core workflow trong brief.
- Privacy regression: Student A không đọc/sửa được bất kỳ dữ liệu nào của Student B, kể cả khi biết ID và kể cả hai Student trùng nickname ở lớp khác nhau.

Test phải độc lập, có dữ liệu setup/cleanup rõ ràng và không phụ thuộc thứ tự chạy.

## 10. Git và pull request

- Branch gợi ý: `feature/<scope>`, `fix/<scope>`, `test/<scope>`, `docs/<scope>`.
- Commit có nội dung rõ ràng; không dùng message chung chung như `update`, `fix bug`, `done`.
- PR phải mô tả: mục tiêu, thay đổi chính, API/schema ảnh hưởng, test đã chạy, ảnh UI nếu có và rủi ro còn lại.
- Thay đổi API/schema phải được reviewer đồng ý trước khi merge.
- Không commit `.env`, secret, file export chứa PIN khởi tạo hoặc dữ liệu sinh viên thật.
- Resolve toàn bộ review comment; nếu không sửa phải ghi rõ lý do và được reviewer chấp nhận.

## 11. Definition of Done

Một task chỉ được đánh dấu Done khi:

- Đúng scope và acceptance criteria trong brief/file phân công.
- Code tuân thủ architecture, naming và API rule.
- Backend validate và authorize đầy đủ; không chỉ chặn ở UI.
- Migration/constraint đã có nếu thay đổi dữ liệu.
- Unit/integration test liên quan đã pass.
- QA chéo đã kiểm tra cả happy path và negative/privacy case.
- Lint và type-check pass.
- API/schema/tài liệu được cập nhật.
- Không còn debug code, secret, dữ liệu thật hoặc TODO không có issue.
- PR được người còn lại approve.
