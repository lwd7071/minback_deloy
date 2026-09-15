# Bản bàn giao chi tiết cho Luna — Rút gọn Assignment/Evaluation

## 1. Kết quả cần đạt

Release chỉ còn hai luồng:

- **Teacher:** chọn lớp → chọn Assignment → import điểm và feedback → lưu nháp hoặc công bố.
- **Student:** chọn lớp → xem các Evaluation đã công bố → xem điểm và feedback.

Không xóa schema, dữ liệu hoặc route handler cũ. Submission, attachment, deadline, Gradebook và trạng thái Assignment kỹ thuật chỉ bị loại khỏi trải nghiệm mặc định.

## 2. Thứ tự tài liệu Luna phải đọc

Đọc đúng thứ tự trước khi sửa:

1. `AGENTS.md` — quy tắc repo, nguồn sự thật và cách chạy integration.
2. `CONTEXT.md` — domain, invariant và trạng thái implementation hiện tại.
3. `docs/brief.md` — business contract cấp cao.
4. `docs/team/engineering-rules.md` — quy tắc privacy, transaction, validation và test.
5. `docs/MinBack_UI_Spec_Redesigned.md` — UI source of truth hiện tại, đặc biệt phần feedback-first.
6. `docs/plan-feedback-first-workflow.md` — workflow rút gọn và contract import bốn cột.
7. `docs/BE_FEEDBACK_FIRST_PLAN.md` — xác nhận backend Student Results đã có.
8. Next.js 16.3.3 local docs:
   - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`
   - `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`
   - `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
   - `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`

Điểm xung đột phải xử lý: `docs/brief.md` vẫn liệt kê deadline trong product scope. Luna phải cập nhật brief để nói rõ deadline/schema được giữ cho tương thích nhưng không nằm trong release UI feedback-first.

## 3. Lát 1 — Capability trung tâm

### Code cần đọc

- `src/components/layout/workspace-header.tsx`
- `src/components/class-sections/teacher/class-context-nav.tsx`
- `src/components/class-sections/teacher/class-detail-tabs.tsx`
- Các route Teacher Gradebook và Student Assignments/Submissions.

### Thay đổi

Tạo module mới `src/config/product-capabilities.ts` với interface duy nhất:

- `releaseProfile: "feedback-first"`
- Teacher:
  - `assignmentDeadline: false`
  - `assignmentAttachments: false`
  - `assignmentDelete: false`
  - `assignmentTechnicalStatus: false`
  - `gradebook: false`
  - `evaluationImport: true`
- Student:
  - `assignmentCatalog: false`
  - `submissions: false`
  - `assignmentDeadline: false`
  - `assignmentAttachments: false`
  - `results: true`
  - `resultNotifications: true`

Quy tắc:

- Không dùng biến môi trường hoặc toggle runtime trong đợt này.
- Không comment-out JSX.
- Control nhỏ dùng conditional render.
- Route bị ẩn dùng server-side `redirect()`.
- Module dormant không được import từ client module đang hoạt động để tránh vào bundle.

### Redirect bắt buộc

| Route cũ                        | Route đích                        |
| ------------------------------- | --------------------------------- |
| `/admin/classes/[id]/gradebook` | `/admin/classes/[id]/assignments` |
| `/class/[code]/assignments`     | `/class/[code]/grades`            |
| `/class/[code]/submissions`     | `/class/[code]/grades`            |

Nếu URL Student có `?assignment=...`, phải giữ query này khi redirect.

## 4. Lát 2 — Teacher Assignment summary và filter chấm điểm

### Code cần đọc

- `src/types/assignment.ts`
- `src/server/repositories/assignments/assignment-repository.ts`
- `src/server/services/assignments/assignment-service.ts`
- `src/app/api/v1/teacher/class-sections/[classSectionId]/assignments/route.ts`
- `src/app/admin/(protected)/classes/[id]/assignments/page.tsx`
- `src/components/assignments/teacher/use-class-assignments.ts`

### Interface mới

Bổ sung `TeacherAssignmentSummaryDto`, không xóa hoặc thay đổi nghĩa `AssignmentDto`:

- Dữ liệu Assignment hiện có.
- `gradingSummary`:
  - `totalStudents`
  - `gradedCount`
  - `returnedCount`
  - `evaluatedCount = gradedCount + returnedCount`
  - `percentage`
  - `state: "empty" | "incomplete" | "complete"`

Quy tắc:

- `complete`: có ít nhất một Student và `evaluatedCount === totalStudents`.
- `incomplete`: có Student nhưng chưa đủ Evaluation `graded|returned`.
- `empty`: lớp chưa có Student.
- `empty` chỉ thuộc filter `Tất cả`.
- Repository lấy aggregate theo batch; cấm query một lần cho từng Assignment.
- List route có thể trả thêm trường additive; create/update/delete contract cũ vẫn giữ.

### Sửa hook

Trong `use-class-assignments.ts`:

- Đổi filter từ `AssignmentStatus` sang `all | incomplete | complete`.
- Xóa `DueDateFilter`, `referenceTime`, deadline comparison.
- Sort chỉ còn `newest | title_asc`.
- Search chỉ theo `title`, không theo description.
- Bỏ `handleAssignmentDeleted` khỏi active interface.
- Reset filter về `all`, search rỗng, sort `newest`, page 1.
- Không unmount danh sách khi refresh sau create/rename; dữ liệu cũ tồn tại cho đến khi response mới thành công.
- Response cũ hoặc response hoàn tất sau một request mới phải bị bỏ qua.

## 5. Lát 3 — Rút gọn Teacher UI

### Code cần sửa

| Module                                           | Cách sửa                                                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `class-assignments-view.tsx`                     | Thay status tabs bằng `Tất cả / Chưa chấm / Đã chấm`; bỏ deadline filter/sort/badge, status badge, description và deadline |
| `assignment-detail-view.tsx`                     | Form chỉ cho đổi tên; bỏ nút xóa, status, description, ngày giao, hạn nộp và max score khỏi UI                             |
| `attachment-upload-panel.tsx`                    | Giữ file nhưng không import trong active flow                                                                              |
| `class-overview-view.tsx`                        | Giữ card Sinh viên và Bài tập; ẩn Gradebook theo capability                                                                |
| `class-context-nav.tsx`, `class-detail-tabs.tsx` | Bỏ Gradebook khỏi navigation feedback-first                                                                                |
| Gradebook page                                   | Redirect trước khi tải Gradebook                                                                                           |
| `navigation-loaders.ts`                          | Active grading loader không được tải submission/attachment                                                                 |

### Giao diện danh sách Assignment

Mỗi hàng chỉ hiển thị:

- Tên Assignment.
- `evaluatedCount / totalStudents`.
- Progress bar chấm điểm.
- Trạng thái nghiệp vụ `Chưa chấm` hoặc `Đã chấm`.
- Nút `Đổi tên`.
- CTA `Nhập điểm & feedback`.

Create Assignment chỉ nhập tên. Request nội bộ tiếp tục gửi:

- `description: ""`
- `assignedDate: now`
- `dueDate: now`
- `status: "published"`
- `maxScore: 10`

Các giá trị trên không hiển thị cho người dùng.

## 6. Lát 4 — Giữ và làm mượt Evaluation flow

### Code cần đọc/sửa

- `src/app/admin/(protected)/classes/[id]/assignments/[aid]/grade/page.tsx`
- `src/components/evaluations/teacher/bulk-grade-view.tsx`
- `src/components/evaluations/teacher/use-bulk-grade.ts`
- `src/components/evaluations/teacher/grade-import-modal.tsx`
- `src/components/evaluations/teacher/import-preview-table.tsx`
- `src/server/services/evaluations/evaluation-import-service.ts`
- `src/server/services/evaluations/bulk-evaluation-service.ts`

### Giữ nguyên

- CSV/XLSX bốn cột: `MSSV | Họ tên | Điểm | Feedback`.
- Preview trước mutation.
- Dòng create/update/unchanged/invalid.
- `save_draft` tạo Evaluation `graded`.
- `publish` tạo Evaluation `returned`.
- Evaluation và EvaluationHistory cùng transaction.
- Notification web sau commit; email chạy sau notification.
- Email lỗi không rollback Evaluation hoặc notification web.

### UI rút gọn

- Header chỉ có tên Assignment và CTA import/re-import.
- Metrics:
  - Tổng sinh viên.
  - Chưa chấm.
  - Đã lưu, chưa công bố.
  - Đã công bố.
- Bảng chỉ có MSSV, họ tên, điểm, feedback và trạng thái công bố.
- Không thêm submission state, file bài nộp hoặc deadline.

### Chống khựng

Trong Grade page:

- Bỏ `key` phụ thuộc `page/search` đang làm remount toàn bộ `BulkGradeView`.
- Search thay URL bằng debounce; giữ bảng cũ trong transition.
- Pagination dùng client navigation, không dựng lại modal import.
- Không fetch trùng Student Profile hoặc submission khi mở trang chấm.

## 7. Lát 5 — Student workspace chỉ dùng Results

### Code cần đọc

- `src/components/layout/student/student-workspace.tsx`
- `src/components/students/student/student-workspace-view.tsx`
- `src/components/students/student/student-assignments-view.tsx`
- `src/components/assignments/student/student-assignment-modal.tsx`
- `src/components/students/student/use-student-profile.ts`
- `src/server/repositories/students/student-profile-repository.ts`
- `src/server/services/students/student-profile-service.ts`
- `src/types/student-results.ts`
- `src/server/repositories/students/student-results-repository.ts`
- `src/server/services/students/student-results-service.ts`
- `src/app/api/v1/student/results/route.ts`

### Cấu trúc mới

- Student layout chỉ tải identity:
  - MSSV, họ tên, nickname.
  - ClassSection id, code, name.
- `/profile` và `/grades` dùng Student Results module.
- Active workspace không gọi `getStudentProfile()`.
- Vì vậy active request không được query attachment hoặc submission.
- `student-profile-view.tsx`, `use-student-profile.ts`, `student-assignments-view.tsx` và `submission-upload-panel.tsx` được giữ dormant, không xóa.

### Student Results repository

Giữ privacy scope bằng `studentId + classSectionId` và:

- Chỉ Assignment `published|closed`.
- Chỉ Evaluation `returned`.
- Sort `returnedAt` giảm dần; nếu trùng timestamp, sort tiếp theo `assignmentId` để ổn định.
- Query `assignmentId` không thuộc session trả danh sách rỗng, không tiết lộ tồn tại.
- Không trả evaluation ID, submission hoặc attachment.

### UI mới

`/profile`:

- Thông tin lớp.
- Số kết quả đã công bố.
- Điểm trung bình quy đổi theo phần trăm.
- Bốn kết quả mới nhất.
- CTA `Xem tất cả kết quả`.

`/grades`:

- Search theo tên Assignment.
- Danh sách kết quả mới công bố trước.
- Không filter trạng thái, deadline hoặc submission.
- Click hàng mở result detail gồm tên bài, điểm/thang điểm, feedback và thời điểm công bố.
- Deep link chuẩn: `/class/[code]/grades?assignment={assignmentId}`.
- Assignment ID không hợp lệ hoặc chưa được công bố: giữ danh sách, không mở modal và hiển thị thông báo trung tính.

Navigation đổi thành:

- Tổng quan
- Kết quả
- Thông báo

## 8. Lát 6 — Sửa notification deep link

### Code cần sửa

- `src/types/notification.ts`
- `src/server/repositories/notifications/notification-repository.ts`
- `src/components/layout/workspace-header.tsx`
- `src/components/students/student/student-workspace-view.tsx`
- `src/components/notifications/student/use-notification-polling.ts`

### Thay đổi interface

Bổ sung `assignmentId: string | null` vào `NotificationDto`, giữ `evaluationId` để tương thích.

Repository:

- Khi list/find/mark-read, resolve `assignmentId` qua quan hệ Notification → Evaluation → Assignment.
- Mọi query vẫn phải scope bằng `studentId`.
- Không migration vì `evaluation_id` và quan hệ Evaluation–Assignment đã tồn tại.

UI:

- Click notification đánh dấu đã đọc rồi mở query bằng `assignmentId`.
- Nếu notification legacy không resolve được Assignment, chỉ mark-read và ở lại trang thông báo.
- Không được dùng `evaluationId` làm query `assignment`.

## 9. Lát 7 — Loading và transition

### Module cần sửa

- `src/app/class/[code]/(workspace)/loading.tsx`
- Student workspace layout Suspense fallback.
- Teacher Grade page Suspense fallback.
- `src/components/ui/skeleton.tsx`
- `src/components/ui/progress-bar.tsx`
- CSS liên quan trong `src/app/globals.css`

### Quy tắc

- Lần tải route: skeleton đúng hình dạng card/list/table.
- Transition filter/search/pagination: progress bar mảnh, không thay toàn màn hình.
- Không dùng spinner.
- Chỉ hiện progress cho transition dài hơn khoảng 120 ms để tránh nháy.
- `aria-busy` đặt trên vùng đang cập nhật.
- Skeleton có `aria-hidden`.
- Tôn trọng `prefers-reduced-motion`.
- Button mutation tiếp tục dùng text `Đang xử lý…`; không đổi toàn bộ Button module nếu không cần.

## 10. Test Luna phải sửa/thêm

| Nhóm               | Test bắt buộc                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Capability         | Nav không có Gradebook/Bài tập submission; route cũ redirect đúng và giữ query                 |
| Teacher Assignment | Filter all/incomplete/complete; lớp rỗng; search title; sort; reset; create/rename             |
| Aggregate          | Nhiều Assignment và Student; graded+returned; 100%; thiếu Evaluation; không N+1                |
| Teacher UI         | Không render deadline, status kỹ thuật, attachment, delete hoặc Gradebook                      |
| Evaluation         | Import preview, save draft, publish, idempotency, history atomic, notification sau commit      |
| Student Results    | Chỉ returned; graded/pending bị ẩn; cross-student/class; assignment filter; deterministic sort |
| Student UI         | Overview tối giản; results detail; không submission/deadline/attachment; deep link             |
| Notification       | DTO có assignmentId; privacy scope; mark-read; legacy null; điều hướng đúng Assignment         |
| Loading            | Skeleton và progress accessibility; không spinner; nội dung cũ không biến mất khi transition   |

Các test hiện có cần chuyển đổi:

- `use-class-assignments.test.ts`: bỏ test status/deadline/delete, thay bằng grading state.
- `student-assignments-view.test.tsx`: ngừng coi là test active flow; tạo test Student Results view mới.
- `workspace-header.test.ts`: expected nav thành `Tổng quan / Kết quả / Thông báo`.
- Giữ và mở rộng `use-bulk-grade.test.ts`.
- Giữ regression `student-results-service.test.ts` và `notification-service.test.ts`.
- Thêm route tests cho ba redirect.

Baseline đã xác nhận: 6 file test trọng tâm, 19 test pass khi chạy bằng thread pool tuần tự. Fork pool hiện có thể timeout khởi động worker; Luna dùng:

`npx vitest run --pool=threads --fileParallelism=false ...`

sau đó vẫn phải chạy release gate chuẩn.

## 11. Cập nhật tài liệu trong lúc làm

Không đợi đến cuối mới cập nhật tài liệu.

Sau mỗi lát hoàn thành, Luna cập nhật checklist “đã làm” trong `docs/RUT-GON-RELEASE.md`, gồm:

- Hành vi trước/sau.
- Module đã sửa.
- Capability liên quan.
- Route/interface thay đổi.
- Test đã chạy và kết quả.
- Phần backend/schema cố ý giữ lại.
- Ngày thực hiện: ngày thực tế.
- Người thực hiện: `Luna`.

Cuối đợt cập nhật `docs/brief.md`:

- Assignment trong release là khóa nhóm cho điểm và feedback.
- Deadline, description, attachment và submission không thuộc UI feedback-first.
- Backend/schema cũ được giữ để tương thích.
- Student chỉ thấy Evaluation `returned`.

## 12. Yêu cầu bắt buộc đối với `CONTEXT.md`

Luna phải cập nhật toàn bộ trạng thái thực tế sau implementation, không chỉ thêm một dòng changelog.

### Glossary

Chỉnh định nghĩa:

- **Assignment:** khóa nhóm Evaluation trong một ClassSection; feedback-first UI chỉ expose tên và thang điểm.
- **Evaluation:** kết quả hiện hành; `graded` nội bộ Teacher, `returned` mới hiển thị cho Student.
- Thêm **Feedback-first release profile:** profile sản phẩm chỉ expose luồng công bố/xem điểm và feedback.
- Ghi rõ Submission/Attachment/Deadline là dữ liệu tương thích, không phải active release UI.

### Invariants

Thêm:

- Student không bao giờ nhận Evaluation khác `returned`.
- Notification kết quả phải dẫn bằng Assignment ID.
- Hidden capability không đồng nghĩa xóa authorization hoặc backend.
- Evaluation + EvaluationHistory vẫn atomic.
- Email lỗi không rollback điểm hoặc notification web.

### Implemented Modules

Cập nhật đầy đủ:

- Teacher Assignment summary và filter tiến độ.
- Teacher import/save/publish flow.
- Student Results workspace mới.
- Capability và redirect route legacy.
- Notification assignment deep link.
- Loading skeleton/progress.
- Submission/attachment/Gradebook được giữ dormant.
- Các route thật `/admin/*` và `/class/[code]/*`; loại mô tả route cũ không còn chính xác.

### Contracts và verification

- Link `docs/RUT-GON-RELEASE.md`.
- Link UI spec và feedback-first workflow.
- Ghi ngày, người thực hiện và release gate cuối.
- Ghi rõ schema/migration nào không đổi.
- Ghi kết quả test cụ thể, không dùng câu chung “tests pass”.

Trước commit cuối, Luna phải đối chiếu `CONTEXT.md` với diff. Mọi thay đổi hành vi, interface, route, module dormant và invariant xuất hiện trong diff đều phải được phản ánh trong `CONTEXT.md`.

## 13. Release gate và tiêu chí hoàn tất

Chạy theo thứ tự:

1. Targeted unit tests sau từng lát.
2. `npm run format:check`
3. `npm run lint`
4. `npm run typecheck`
5. `npm test`
6. `npm run test:health`
7. `npm run test:integration`
8. `npm run db:test`
9. `npm run db:lint`
10. `npm run build`

Chỉ hoàn tất khi:

- Hai core flow chạy end-to-end.
- Không còn deadline/submission/attachment/Gradebook trong navigation và UI active.
- Active Student workspace không fetch submission/attachment.
- Notification mở đúng Assignment.
- Direct URL cũ redirect ổn định.
- Backend/schema cũ vẫn còn và regression test pass.
- `docs/brief.md`, `docs/RUT-GON-RELEASE.md` và `CONTEXT.md` khớp hoàn toàn với code sau sửa.
