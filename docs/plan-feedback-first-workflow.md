# MinBack — Kế hoạch tinh gọn theo luồng phản hồi bài tập

## Mục tiêu

Tập trung MinBack vào luồng:

```text
GV import lớp → SV đăng nhập → GV tạo bài tập
→ GV import một file Excel 4 cột → lưu điểm/feedback
→ SV nhận kết quả qua web/email → SV xem riêng kết quả
```

Quyết định sản phẩm:

- Sinh viên mới có nickname mặc định bằng MSSV.
- PIN ban đầu là `111111`, chỉ lưu dưới dạng BCrypt hash.
- Lần đầu đăng nhập bắt buộc đổi nickname và PIN.
- Email mặc định là `{lowercase-mssv}@student.hcmute.edu.vn`.
- Email cá nhân chỉ có hiệu lực sau khi xác minh OTP.
- Quên PIN dùng OTP 6 số gửi qua email.
- Chỉ Evaluation `returned` được sinh viên xem và nhận thông báo; `graded` là nội bộ GV.
- Submission không còn thuộc luồng sản phẩm: SV không nộp bài, GV không upload đề. Bảng/API cũ được giữ dormant rồi cleanup riêng.

> Vì PIN mặc định dùng chung và lần đầu không OTP, người biết mã lớp và MSSV có thể kích hoạt hồ sơ trước chủ thật. Đây là rủi ro được chấp nhận theo quyết định sản phẩm; hệ thống vẫn áp dụng rate-limit, session giới hạn và reset/recovery.

## Nguyên tắc triển khai

Mỗi task làm theo TDD dạng vertical slice:

1. RED: viết một test qua public API/UI mô tả một hành vi.
2. Chạy test, xác nhận thất bại đúng lý do.
3. GREEN: viết tối thiểu code để test pass.
4. Lặp lại từng hành vi.
5. REFACTOR sau khi toàn bộ test của task xanh.
6. Chạy regression trước khi đóng task.

Không viết toàn bộ test trước rồi mới implementation; không test private helper hoặc mock internal collaborator. Chỉ mock boundary như email, thời gian và randomness.

## Epic A — PIN, login và email

### A0 — Cập nhật contract

- Cập nhật `docs/brief.md`, `CONTEXT.md`, checklist và API contract.
- Bỏ mô tả PIN ngẫu nhiên khi import và tải file PIN.
- Ghi rõ default PIN, email suy ra, OTP recovery và trạng thái `graded/returned`.
- Bổ sung tài liệu `docs/agents/*` đang được `AGENTS.md` tham chiếu nếu chưa tồn tại.

### A1 — Import roster với PIN mặc định

**Endpoint:**

- `POST /api/v1/teacher/class-section-import-previews`
- `POST /api/v1/teacher/class-section-setups`
- `POST /api/v1/teacher/class-sections/:classSectionId/import/preview`
- `POST /api/v1/teacher/class-sections/:classSectionId/import`
- `POST /api/v1/student/auth/login`
- `PATCH /api/v1/student/auth/credentials`

**Thay đổi:**

- File chỉ bắt buộc `MSSV`, `Họ Tên`; cột Email cũ được chấp nhận để tương thích nhưng email của SV mới được suy ra từ MSSV.
- Student mới nhận nickname=MSSV, hash PIN `111111`, email `{lowercase-mssv}@student.hcmute.edu.vn`, và hai cờ `must_change_* = true`.
- `ImportRowDto` không còn `initialPin`/`initialNickname`.
- Re-import chỉ cập nhật họ tên; không reset credential, email cá nhân hoặc session.
- Bỏ download PIN và gate “tải PIN trước khi rời trang” trong wizard.

**RED → GREEN:**

1. Import response không chứa PIN thô.
2. MSSV không hợp lệ để tạo email bị loại ở preview.
3. SV mới login bằng MSSV + `111111` nhận `credential_change` session.
4. Chỉ đổi nickname hoặc chỉ đổi PIN vẫn bị giới hạn.
5. Nickname vẫn là MSSV hoặc PIN vẫn là `111111` bị từ chối.
6. Đổi cả hai thành công rotate session thành `full`.
7. Re-import không reset tài khoản đã kích hoạt.

### A2 — GV reset về PIN mặc định

**Endpoint:** `POST /api/v1/teacher/class-sections/:classSectionId/students/:studentId/reset-pin`

- Reset hash về `111111`, bật `must_change_pin`, giữ nickname.
- Thu hồi mọi StudentSession và recovery challenge.
- Response chỉ trả `studentId` và `mustChangePin: true`; không trả PIN.
- Test cross-teacher/cross-class, session cũ, lỗi mutation và login lại.

### A3 — Quên PIN bằng OTP

**Migration:** bảng challenge có Student, purpose, destination, OTP hash, expiry, consumedAt, failedAttempts.

**Endpoint:**

- `POST /api/v1/student/auth/forgot-pin/request` với `{ classCode, mssv }`.
- `POST /api/v1/student/auth/forgot-pin/confirm` với `{ classCode, mssv, otp, newPin }`.

**Quy tắc:** OTP 6 số, CSPRNG, hash-only, hết hạn 10 phút, dùng một lần, mã mới vô hiệu hóa mã cũ; rate-limit gửi và nhập; response không tiết lộ tài khoản tồn tại.

**Test:** gửi thành công qua email boundary; tài khoản không tồn tại trả thông báo chung; OTP đúng/sai/hết hạn/replay; OTP khác Student; khóa sau nhiều lần sai; reset thu hồi session; email lỗi không để lại challenge dùng được.

### A4 — Đổi email cá nhân

**Endpoint:**

- `POST /api/v1/student/profile/email-change/request` với `{ newEmail }`.
- `POST /api/v1/student/profile/email-change/confirm` với `{ newEmail, otp }`.

- Thêm `email_source` và `email_verified_at`.
- Email mới chỉ thay email chính sau OTP đúng.
- Email cũ tiếp tục nhận notification cho đến khi xác minh thành công.
- Test OTP đúng/sai/replay, session bắt buộc full, và notification tới email mới.

### A5 — UI credential

**Routes:** `/class/[code]/login`, `/class/[code]/onboarding`, `/class/[code]/forgot-pin`.

- Login ghi rõ lần đầu dùng MSSV.
- Onboarding bắt buộc nickname mới + PIN mới.
- Forgot PIN gồm MSSV → OTP → PIN mới.
- Giữ và validate deep-link sau login/onboarding.
- Component test cho validation, loading, resend và lỗi chung.

## Epic B — Luồng bài tập feedback-first

### B1 — Student

- Bỏ route/navigation `/class/[code]/submissions` khỏi trải nghiệm.
- Không gọi các API sign/upload/list/download submission.
- `StudentProfileAssignment` bỏ `submission`; progress chỉ tính Evaluation `returned`.
- Test profile không trả submission metadata/file và UI không còn nút upload.

### B2 — Teacher

- Bỏ submission loaders, bảng bài nộp, download file, upload attachment và filter `unsubmitted`.
- Khi tạo bài, GV chỉ nhập tên bài và điểm tối đa; LMS giữ đề/nội dung chi tiết.
- Dashboard đổi sang chưa chấm/đã chấm/đã công bố.
- `BulkGradeView` chỉ còn filter all/pending/graded/returned.
- Giai đoạn đầu giữ bảng/API cũ dormant; chưa xóa migration.

### B3 — Assignment tối giản

- UI chỉ nhập title, maxScore, status.
- Loại description, deadline và attachment khỏi luồng Teacher/Student UI.
- Database field cũ giữ tương thích trong giai đoạn đầu.
- Một Assignment chỉ là khóa để nhóm một lần import điểm/feedback; không đại diện cho file đề hay bài nộp.
- Draft không xuất hiện với Student; published/closed chỉ hiển thị tên và trạng thái kết quả.

## Epic C — Import một file Excel 4 cột và công bố kết quả

### C1 — Contract file Excel

Mỗi Assignment nhận một file CSV/XLSX cho mỗi lần import, gồm đúng bốn cột:

- `MSSV | Họ tên | Điểm | Feedback`
- Bốn header là bắt buộc, không phân biệt hoa thường.
- Họ tên dùng để đối chiếu/cảnh báo; MSSV là khóa ghép Student.
- Không có cột file nộp, link đề, PIN, email hoặc Student ID.
- Không cần endpoint tải template; UI hiển thị format bốn cột để GV dùng file đã chấm từ LMS.
- Không chứa PIN, email hoặc Student ngoài lớp.
- Formula và giá trị bắt đầu bằng ký tự nguy hiểm phải được xử lý như text.

### C2 — Preview file 4 cột

**Endpoint:** `POST /api/v1/teacher/assignments/:assignmentId/evaluations/import-preview`

- Multipart CSV/XLSX, giới hạn 5 MB/2.000 dòng, đúng bốn cột MSSV/Họ tên/Điểm/Feedback.
- Phân loại create/update/unchanged/invalid.
- Validate MSSV cùng lớp, cảnh báo họ tên lệch, score 0..maxScore, một chữ số thập phân, feedback tối đa 5.000 ký tự, duplicate MSSV.
- Preview không mutation.
- TDD từng hành vi: hợp lệ, thiếu/thừa header, không tồn tại, họ tên lệch, duplicate, score boundary, feedback dài, no-op và cross-teacher.

### C3 — Lưu bản chấm

**Endpoint:** `POST /api/v1/teacher/assignments/:assignmentId/evaluations/import` với `mode=save_draft`.

- Parse/validate lại file.
- Chỉ ghi dòng hợp lệ thành `graded` trong transaction.
- Không notification/email.
- No-op không tạo history; lỗi transaction rollback tập dòng hợp lệ.

### C4 — Công bố

Cùng endpoint với `mode=publish`:

- Ghi Evaluation thành `returned`.
- History atomically.
- Notification sau commit, email sau notification.
- Email lỗi không rollback điểm/notification.
- Không gửi lại cho no-op; `returned → graded → returned` gửi lại.

### C5 — UI grade import

- Nút hiển thị format 4 cột, import file, preview, tải dòng lỗi.
- Hai action “Lưu bản chấm” và “Công bố kết quả”.
- Publish bắt buộc confirmation và hiển thị số SV sẽ nhận kết quả.
- Test thay file xóa preview, chống double-submit, refresh gradebook và báo cáo email failure.

## Epic D — Deep-link, Student results và UI

### D1 — Deep-link

Email dùng `/class/{code}/grades?assignment={assignmentId}`.

- Full session mở thẳng bài.
- Chưa login redirect login rồi quay lại đúng bài.
- Credential-change redirect onboarding rồi quay lại đúng bài.
- Chặn open redirect; không đưa điểm/feedback/Student ID vào URL.
- Test cross-student/cross-class privacy.

### D2 — Student results

- Bảng `Bài tập | Trạng thái | Điểm | Ngày công bố`.
- `graded` chỉ hiển thị “đang xử lý/chưa công bố”.
- `returned` hiển thị điểm, feedback và thời điểm công bố.
- Notification click mark-read và mở đúng bài.

### D3 — UI consistency

- Be Vietnam Pro cho toàn bộ heading/body/control.
- IBM Plex Mono chỉ cho MSSV/mã lớp.
- Bỏ Lora/serif.
- Wizard tạo lớp căn giữa trong khung 760–840px, bốn bước cân đối.
- Responsive QA tại 375px, 768px và 1440px.

## Thứ tự commit/task đề xuất

1. `A0` — contract/documentation.
2. `A1.1` → `A1.7` — từng vòng TDD của import/login/credential.
3. `A2` — reset PIN.
4. `A3` — forgot PIN OTP.
5. `A4` → `A5` — đổi email và UI credential.
6. `B1` → `B3` — ẩn Submission và đơn giản Assignment.
7. `C1` → `C4` — Excel 4 cột preview/save/publish/UI.
8. `D1` → `D3` — deep-link, Student results, typography.
9. Cleanup migration Submission/Cloudinary sau release xác nhận.

## Release gate

```text
npm run test:setup
npm run db:test
npm run db:lint
npm run test:health
npm run test:integration
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

Core acceptance flow:

```text
tạo lớp → import MSSV/Họ tên → login MSSV + 111111 → đổi credential
→ tạo bài → import một file Excel (MSSV/Họ tên/Điểm/Feedback)
→ lưu graded → SV chưa thấy điểm
→ publish returned → email/notification → mở deep-link → xem feedback
→ Student khác không truy cập được
```
