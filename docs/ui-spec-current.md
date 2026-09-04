# MinBack — Đặc tả UI hiện tại

Phiên bản: 2026-09-04. Nguồn đối chiếu: route/component tại commit e763b5d.

## 1. Kiến trúc và ranh giới

- Student workspace: /class/[code]/*; identity lấy từ HttpOnly StudentSession.
- Teacher/Admin workspace: /admin/*; identity lấy từ Supabase Auth SSR.
- Public/auth route không render WorkspaceHeader.
- Initial data tải bằng Server Component/service; client fetch chỉ dùng cho mutation, polling, search debounce, upload và refresh.
- API kiểm tra quyền ở server; UI không dùng Student ID từ URL.
- UI hiện tại vẫn còn Submission, attachment và upload. Feedback-first sẽ ẩn trước; chỉ xóa schema/storage ở cleanup riêng.

## 2. Visual system

### Color tokens (src/app/globals.css)

| Token | Hex | Vai trò |
|---|---|---|
| navy-900 | #1e3a4a | header, heading, primary action |
| navy-700 | #2c5468 | hover, secondary navy, text phụ |
| navy-100 | #e7eef1 | row hover, highlight |
| gold-500 | #f5b400 | accent, active underline, focus |
| gold-600 | #dfa300 | accent hover |
| gold-700 | #c99200 | accent đậm |
| gold-800 | #8a5a00 | warning/accent text |
| gold-100 | #fff3cc | notice, preview |
| surface | #fbfaf7 | canvas |
| surface-raised | #ffffff | card, table, form, dialog |
| surface-subtle | #f3f6f7 | skeleton, vùng phụ |
| text-primary | #16303d | nội dung chính |
| text-secondary | #2c5468 | mô tả, metadata |
| text-disabled | #7b898f | disabled |
| border | #e1e6e9 | border/ledger rule |
| success / success-soft | #417a61 / #e5f1eb | thành công |
| danger / danger-soft | #b55249 / #f8e8e6 | lỗi/destructive |
| neutral / neutral-soft | #56666e / #f1f3f4 | trung tính |
| header-text / header-muted | #fbfaf7 / #c9d4d9 | chữ trên header |

Shadows: shadow-sm 0 1px 2px rgba(30,58,74,.08); shadow-md 0 10px 28px rgba(30,58,74,.12); shadow-lg 0 20px 56px rgba(30,58,74,.16). Radius: control 8px, card 12px, dialog 16px.

### Typography

- Body: Be Vietnam Pro, weights 400/500/600/700, 15px, line-height 1.55.
- Heading/wordmark/KPI: Lora, weights 500/600/700, navy-900, letter-spacing -0.035em, line-height 1.12.
- MSSV, mã lớp, step index, metadata ngắn: IBM Plex Mono, weights 400/500/600.
- h1 clamp(2rem, 4vw, 3.5rem); h2 clamp(1.35rem, 2vw, 2rem); h3 1.12rem.
- Feature không hard-code brand color hoặc font family.
- Focus-visible outline 3px focus-ring, offset 2px; modal đóng bằng Escape; icon quan trọng có text/aria-label.

### Layout

- Canvas tối thiểu 320px; desktop gutter 24px; mobile gutter 12–16px.
- workspace-main rộng calc(100% - 48px), padding 44px 0 72px.
- Header sticky top, z-index 20, cao tối thiểu 70px.
- Table scroll ngang trong vùng có border; empty/loading/error giữ cấu trúc và nói action kế tiếp.
- Mobile nav là panel; tôn trọng prefers-reduced-motion.

## 3. Shared shells và API

Public shell dùng cho landing, class lookup, login, onboarding; nền surface, card căn giữa, không authenticated header.

Teacher shell gọi requireTeacher; chưa login redirect /admin/login; render WorkspaceHeader role=teacher và workspace-main. Nav: Tổng quan, Lớp học phần, Cài đặt; có logout.

Student shell gọi requireFullStudentSession, canonicalize class code, tải profile server-side và truyền vào StudentWorkspaceLayout. Sai code redirect canonical.

Notification polling:
- GET /api/v1/student/notifications?page=1&pageSize=50
- PATCH /api/v1/student/notifications/:notificationId/read

## 4. Public pages

### / — Landing

Header wordmark MinBack trái, CTA giảng viên phải. Hero hai cột: copy + ClassLookupForm bên trái; landing-preview (lớp, bài đã chấm, điểm, thông báo) bên phải; ba principle cards về hồ sơ, feedback, riêng tư. Không gọi API khi render; submit chỉ điều hướng /class/[code].

### /class/[code] — Class lookup/login

public-shell + public-record-card. Loading xác nhận lớp; error báo mã lớp sai; success hiển thị tên/code và PinLoginForm.

- GET /api/v1/public/class-sections/:code, client fetch no-store, chỉ code/name.
- POST /api/v1/student/auth/login, body classCode/nickname/pin, set HttpOnly cookie.
- credential_change → onboarding; full → profile.
- Mục tiêu mới thêm hint lần đầu dùng MSSV và link forgot PIN.

### /class/[code]/login

Redirect về /class/[code], không có UI riêng.

### /class/[code]/onboarding

Card auth-wrap căn giữa: heading Hoàn tất tài khoản, mô tả, ChangeCredentialsForm. GET /api/v1/student/auth/session; PATCH /api/v1/student/auth/credentials.

## 5. Student pages

Layout tải profile server-side; page con dùng cùng profile. Feedback-first ẩn Submission.

### /class/[code] và /profile

Profile header (tên, MSSV, lớp), KPI progress, recent activity, notification preview, assignment ledger. Profile có credential form và logout.

- GET /api/v1/student/profile qua full session/service.
- GET notifications và PATCH read.
- POST /api/v1/student/auth/logout.
- Dự kiến email: POST /api/v1/student/profile/email-change/request và confirm.

Chỉ Assignment published/closed và Evaluation của Student hiện tại; profile private/no-store.

### /class/[code]/assignments

Hiện tại StudentWorkspaceView/StudentAssignmentModal gọi submission history, attachment download và upload/sign/finalize API. Mục tiêu bỏ filter/upload/attachment; chỉ giữ title, trạng thái kết quả và detail score/maxScore/feedback khi returned.

### /class/[code]/grades

Ledger Bài tập / Trạng thái / Điểm / Ngày công bố. pending/graded không lộ score/feedback; returned hiển thị score, feedback, updatedAt. Query assignment chỉ mở đúng detail.

### /class/[code]/notifications

Heading + unread count + list; unread dùng navy-100/chấm indicator; click mark-read và mở kết quả. Dùng notification polling.

### /class/[code]/submissions (legacy)

Route hiện tồn tại; phải ẩn navigation, không gọi từ feedback-first UI và không tạo dữ liệu mới. Chưa xóa schema/Cloudinary.

## 6. Teacher/Admin pages

### /admin/login

Auth card căn giữa, brand lockup, email/password, submit, lỗi chung, link landing. POST /api/v1/teacher/auth/login; logout POST /api/v1/teacher/auth/logout.

### /admin/dashboard

Heading, metric band, panel việc cần xử lý, class progress pagination và activity feed pagination. Server gọi getTeacherDashboardOverview({ classPage }); loader private cache/tag. API tương ứng GET /api/v1/teacher/dashboard-overview.

### /admin/classes

Heading + Tạo lớp, search, metric strip, class cards/rows (code/name/student count/assignment count/grading progress), query q/page. Server gọi getTeacherClassSectionSummaries({ page, pageSize: 6, search }). API GET /api/v1/teacher/class-section-summaries hoặc class-sections.

### /admin/classes/new

Wizard 4 bước: thông tin lớp; danh sách SV CSV/XLSX và preview; xác nhận; hoàn tất summary/link. API POST /api/v1/teacher/class-section-import-previews và POST /api/v1/teacher/class-section-setups. Mục tiêu căn giữa 760–840px, bỏ tải PIN, thay bằng copy class URL.

### /admin/classes/:id

Context heading code/name, summary/action cards, links Students/Assignments/Gradebook; tab query cũ redirect route con. API GET/PATCH/DELETE /api/v1/teacher/class-sections/:id.

### /admin/classes/:id/students

Search, table MSSV/họ tên/nickname/email/actions, pagination 20, edit/reset PIN/profile dialogs. Initial listStudentsInClass(id, page/pageSize/search).

Client:
- GET /api/v1/teacher/class-sections/:id/students
- PATCH /api/v1/teacher/class-sections/:id/students/:studentId
- POST /api/v1/teacher/class-sections/:id/students/:studentId/reset-pin
- GET /api/v1/teacher/class-sections/:id/students/:studentId/profile
- Import/preview routes của class section.

### /admin/classes/:id/assignments

Context heading, create button, assignment ledger/card title/status/max score/actions, create/edit/delete. Server listTeacherAssignments(id).

API:
- GET/POST /api/v1/teacher/class-sections/:id/assignments
- PUT/DELETE /api/v1/teacher/assignments/:assignmentId
- Attachment GET/POST/sign/DELETE/download hiện legacy.

Mục tiêu UI chỉ title, maxScore, status; ẩn description/deadline/attachment nếu LMS giữ đề.

### /admin/classes/:id/gradebook

Heading Bảng điểm; ma trận Student × Assignment; pagination độc lập; cell click grade workspace; table cuộn ngang. Server getTeacherGradebook(id,...). API GET /api/v1/teacher/class-sections/:id/gradebook.

### /admin/classes/:id/assignments/:aid/grade

Hiện tại back link, assignment header, KPI, filter/search, student table score/status/feedback/submission, sticky save bar. Server initial getTeacherAssignment, listStudentsInClass, listTeacherEvaluations, listTeacherSubmissions; loader loadBulkGrade gom Promise và cache private/tag.

Client:
- GET /api/v1/teacher/assignments/:aid/evaluations
- PUT /api/v1/teacher/assignments/:aid/students/:studentId/evaluation
- POST /api/v1/teacher/assignments/:aid/evaluations/bulk
- GET /api/v1/teacher/evaluations/:evaluationId/history
- Submission list/download hiện legacy.

Mục tiêu: tải template, import/preview, Lưu bản chấm và Công bố; bỏ submission column/filter; save → graded, publish → returned.

### /admin/settings

Heading Thông báo, mô tả, card toggle email, test email, inline success/error. GET/PATCH /api/v1/teacher/settings/notifications; POST /api/v1/teacher/settings/notifications/test.

## 7. Error, privacy và responsive

- Success/error envelope thống nhất; không hiển thị raw database/stack trace.
- 401 redirect login/session expired; 403/404 không lộ resource chéo; 409 conflict; 400/422 validation.
- Mutation same-origin, disabled khi pending, invalidate cache/tag phù hợp.
- Profile/Evaluation private responses dùng no-store.
- 375–390px: nav panel, card một cột, CTA full width, table scroll riêng, grade row stack.
- 768px: grid hai cột chỉ khi mỗi cột ≥280px; wizard có thể 2×2.
- 1440px: dashboard hai cột; gradebook ưu tiên chiều rộng; wizard căn giữa.

## 8. Feedback-first backlog

1. PIN 111111, onboarding, reset và forgot PIN OTP.
2. Ẩn Submission/attachment, bỏ trạng thái nộp khỏi progress.
3. Excel template/preview/save graded/publish returned.
4. Email deep-link /class/{code}/grades?assignment={assignmentId}.
5. Student detail chỉ hiển thị feedback khi returned.
6. Chuẩn hóa font nếu quyết định bỏ Lora; code hiện vẫn dùng Lora.

## 9. Acceptance checklist

- Route nào cũng có heading/context/loading/empty/error.
- Không fetch trùng initial server data.
- Header active link/mobile Escape đúng.
- Student/Teacher privacy không phụ thuộc UI selector.
- Feedback chỉ đúng Student và returned.
- Màu/font/radius/border/focus dùng token chung.
- Không còn Submission trong UI sau task ẩn.
- Review 375/768/1440px và keyboard-only.

