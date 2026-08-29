# MinBack — Website Quản Lý & Theo Dõi Thông Tin Học Tập Của Sinh Viên



## 1. Executive Summary

### 1.1. Product Vision

Xây dựng hệ thống web hỗ trợ **giáo viên** theo dõi, đánh giá và đưa ra phản hồi cho quá trình học tập của từng sinh viên trong phạm vi một môn học.

Hệ thống cung cấp cho mỗi sinh viên một **hồ sơ học tập cá nhân**, tập trung thông tin về bài tập, kết quả đánh giá, điểm số và nhận xét từ giáo viên.

Nguyên tắc cốt lõi:

> **Thông tin học tập của mỗi sinh viên là riêng tư và chỉ những người có quyền phù hợp mới được phép truy cập.**

### 1.2. Product Opportunity

```
Assignment + Evaluation + Grade + Teacher Feedback
                     ↓
          Student Academic Profile
```

Sản phẩm hướng đến việc tập trung hóa dữ liệu đánh giá đang bị phân tán giữa nhiều công cụ, đồng thời cho sinh viên một nơi duy nhất để theo dõi kết quả học tập của mình.

---

## 2. Business Problem

### 2.1. Đối với giáo viên
Khó theo dõi lịch sử đánh giá, xem lại feedback đã đưa ra, quản lý kết quả theo từng bài tập, và có cái nhìn tổng quan tiến độ từng sinh viên nếu dữ liệu không tập trung.

### 2.2. Đối với sinh viên
Cần trả lời được: đã hoàn thành bài tập nào, được bao nhiêu điểm, giáo viên nhận xét gì, cần cải thiện điều gì, kết quả hiện tại ra sao.

### 2.3. Privacy Problem
- Sinh viên chỉ xem được dữ liệu của chính mình.
- Sinh viên không truy cập được hồ sơ của sinh viên khác.
- Giáo viên chỉ quản lý sinh viên trong phạm vi phụ trách.
- Phân quyền phải được thực hiện ở cấp **hệ thống và API**, không chỉ trên giao diện.

---

## 3. Product Goal

1. **Centralized Academic Profile** — hồ sơ học tập tập trung theo từng lớp học phần.
2. **Structured Evaluation Management** — công cụ cho giáo viên quản lý đánh giá.
3. **Student Self-Tracking** — sinh viên chủ động xem điểm, feedback, tiến độ.
4. **Academic Data Privacy** — cô lập dữ liệu tuyệt đối giữa các sinh viên.

---

## 4. Product Scope

### Authentication & Authorization
- **Teacher/Admin**: 1 role duy nhất (gộp Admin + Teacher), đăng nhập Email/Password qua Supabase Auth SSR. Hệ thống hiện tại chỉ có **1 Teacher/Admin quản lý toàn bộ dữ liệu** (BRULE-002).
- **Student**: không cần tạo tài khoản truyền thống. Truy cập bằng:
  - Mã lớp học phần
  - Nickname (mặc định = MSSV, unique trong phạm vi lớp, không cần unique toàn hệ thống)
  - **Personal PIN (6 số) — bắt buộc toàn hệ thống**. Khi import, hệ thống sinh PIN ngẫu nhiên riêng cho từng sinh viên và chỉ hiển thị/xuất một lần để Teacher/Admin phân phối riêng.
  - **Lần đăng nhập đầu tiên**: bắt buộc đổi cả Nickname và PIN mới trước khi vào hồ sơ (BRULE-010).

Mỗi lần xác thực thành công chỉ mở **một hồ sơ học tập duy nhất**.

### Class Section & Student Management
- Import danh sách sinh viên từ file Excel/CSV — bắt buộc có cột **MSSV**, **Họ Tên**; cột **Email** là tùy chọn.
- Khởi tạo lớp học phần từ dữ liệu import; tự sinh Nickname=MSSV và PIN ngẫu nhiên 6 số riêng cho từng sinh viên.
- Kết quả import cho phép Teacher/Admin tải danh sách PIN khởi tạo **một lần** để phân phối riêng; hệ thống chỉ lưu PIN dưới dạng hash.
- Quản lý danh sách sinh viên và nickname theo từng lớp.
- Teacher/Admin xem hồ sơ học tập của từng sinh viên.
- **Làm rõ mô hình dữ liệu**: mỗi record `Student` là **1 lượt ghi danh (enrollment) vào 1 lớp**, không phải 1 người duy nhất toàn hệ thống. Nếu cùng 1 người học 2 lớp (VD: `WEB101_01+anthai` và `SWE201_02+anthai`), hệ thống tạo 2 record `Student` độc lập, đúng tinh thần BR-002/BRULE-004 (2 hồ sơ độc lập). Không cần bảng `Person` chung vì hệ thống không yêu cầu nhận diện xuyên lớp.

### Nickname & PIN Lifecycle (làm rõ theo review)
- **Không có bước sinh viên tự đăng ký trước** — toàn bộ do Teacher/Admin import (MSSV + Họ Tên, Email tùy chọn), hệ thống tự sinh Nickname=MSSV và PIN ngẫu nhiên 6 số.
- **Lần đăng nhập đầu**: sinh viên bắt buộc tự đặt Nickname mới + PIN mới (validate lại UNIQUE trong lớp).
- **Quên PIN**: sinh viên không tự reset được — Teacher/Admin sinh một PIN khởi tạo ngẫu nhiên mới, bật `must_change_pin=true` và phân phối riêng; sinh viên chỉ phải đổi PIN ở lần đăng nhập kế tiếp. Mọi session cũ của sinh viên bị thu hồi khi reset.
- **Chống brute-force**: giới hạn theo cả IP và định danh đăng nhập; khóa tạm định danh 15 phút sau 5 lần sai liên tiếp. Thông báo lỗi luôn dùng câu chung ("thông tin đăng nhập không đúng") — không tiết lộ nickname có tồn tại hay không.

### Assignment Management
- Tạo, cập nhật, xóa/đổi trạng thái bài tập.
- Thiết lập ngày giao và hạn nộp.
- Theo dõi bài tập theo từng lớp học phần.

### Evaluation Management
- Nhập/cập nhật điểm.
- Viết nhận xét (feedback).
- Xem lịch sử đánh giá.

### Student Academic Profile
- Thông tin lớp học phần, danh sách kết quả, feedback, điểm, tiến độ học tập.

### Notification (cập nhật theo quyết định nhóm)
- **Mặc định**: thông báo hiển thị trong web khi có feedback/điểm mới.
- **Email**: service gửi mail được xây dựng sẵn ở backend (kiến trúc dạng interface/adapter, có thể bật/tắt độc lập), nhưng **không bắt buộc dùng ở MVP**.
- Teacher/Admin có thể **bật/tắt gửi mail trong trang Admin** nếu muốn dùng; Brevo Transactional Email được cấu hình bằng biến môi trường phía server, không nhập hoặc trả secret qua giao diện.
- Email chỉ được gửi cho Student có `email`; Student không có email vẫn nhận web notification bình thường.

### Privacy & Access Control
- Kiểm soát truy cập dữ liệu ở tầng API.
- Ngăn sinh viên truy cập hồ sơ của nhau.
- Giới hạn phạm vi dữ liệu Teacher/Admin có thể quản lý.

---

## 5. Stakeholder Analysis

| Stakeholder | Persona | Nhu cầu chính | Tiêu chí thành công |
|---|---|---|---|
| Giáo viên | Course Instructor (kiêm Admin) | Quản lý sinh viên, nhập điểm, feedback, cấu hình hệ thống | Theo dõi & đánh giá tập trung |
| Sinh viên | Course Student | Xem kết quả và feedback cá nhân | Truy cập đầy đủ hồ sơ của bản thân |

| Internal Stakeholder | Trách nhiệm |
|---|---|
| Product Owner | Quản lý yêu cầu, phạm vi, ưu tiên sản phẩm |
| Developer (x2) | Phát triển hệ thống |
| QA / Tester (x2) | Kiểm thử, đảm bảo chất lượng, đặc biệt là privacy/isolation |

---

## 6. Actor Identification

**Teacher/Admin**: đăng nhập; xem danh sách lớp & sinh viên; xem hồ sơ học tập sinh viên; quản lý bài tập; nhập/cập nhật điểm; thêm feedback; cấu hình notification (email on/off).

**Student**: đăng nhập bằng mã lớp + nickname + PIN; xem hồ sơ học tập, bài tập, điểm, feedback.

---

## 7. Core Business Model

```
Teacher/Admin (1 duy nhất)
   │
   ├── Class Section 01
   │       ├── Students → Student Learning Profile
   │       └── Assignments → Student Evaluation
   │                            ├── Score
   │                            ├── Feedback
   │                            └── Evaluation Status
   ├── Class Section 02
   └── Class Section...
```

```
Evaluation
├── Student
├── Assignment
├── Score
├── Feedback
├── Status
├── Created At
└── Updated At
```

---

## 8. High-Level Business Requirements

| ID | Nội dung |
|---|---|
| BR-001 | Student truy cập bằng Class Section Code + Nickname + PIN → 1 Student + 1 Class Section = 1 Learning Profile |
| BR-002 | Nickname chỉ cần unique trong 1 lớp học phần: `UNIQUE(class_section_id, nickname)` |
| BR-003 | Mỗi Student có hồ sơ học tập riêng theo từng lớp học phần |
| BR-004 | Teacher/Admin quản lý toàn bộ lớp, sinh viên, bài tập, đánh giá trong phạm vi hệ thống |
| BR-005 | Assignment gồm tên, mô tả, ngày giao, hạn nộp, trạng thái; liên kết với 1 lớp học phần |
| BR-006 | Evaluation gồm tối thiểu Score, Feedback, Evaluation Status. `Score` là nguồn sự thật duy nhất (source of truth) — MVP nhập tay, version sau có thể tự tính từ Rubric mà không đổi cấu trúc bảng (xem mục 14b) |
| BR-007 | Feedback riêng tư — chỉ hiển thị đúng hồ sơ sinh viên tương ứng |
| BR-008 | PIN 6 số, **bắt buộc áp dụng toàn hệ thống**; PIN khởi tạo/reset được sinh ngẫu nhiên riêng cho từng Student và bắt buộc đổi ở lần đăng nhập kế tiếp |
| BR-009 | Notification mặc định qua web; email service dựng sẵn ở BE, bật/tắt qua trang Admin |
| BR-010 *(mới)* | Mỗi record `Student` = 1 lượt ghi danh vào 1 lớp (enrollment), không phải định danh 1 người duy nhất toàn hệ thống |
| BR-011 *(mới)* | Hệ thống phải lưu lại lịch sử thay đổi điểm/feedback (không chỉ giá trị hiện hành) — đáp ứng EVA-005 |
| BR-012 *(mới)* | Tiến độ học tập (progress) được tính từ `Evaluation.status` theo từng Assignment trong lớp, không cần entity Submission riêng ở MVP |

---

## 9. Core User Workflows

### 9.1. Teacher Evaluation Workflow
```
Chuẩn bị danh sách SV (MSSV, Họ Tên, Email tùy chọn) → Import CSV/Excel (tự sinh Nickname=MSSV + PIN ngẫu nhiên)
                                    ↓
Đăng nhập Admin → Chọn lớp → Chọn bài tập → Chọn sinh viên
                                    ↓
Xem hồ sơ học tập → Nhập/cập nhật điểm → Viết feedback → Set status → Lưu
```

### 9.2. Student Academic Tracking Workflow
```
Vào web → Nhập mã lớp + Nickname (lần đầu = MSSV) → Validate
                    ↓
          SV tồn tại? ── Không → Báo lỗi chung ("thông tin không đúng")
                    │
                   Có
                    ↓
          Nhập PIN khởi tạo riêng → Verify PIN (rate limit theo IP + định danh; 5 lần sai → khóa tạm 15 phút)
                    ↓
          Hợp lệ? ── Không → Báo lỗi chung
                    │
                   Có
                    ↓
          must_change_nickname/PIN? ── Có → Đổi thông tin được yêu cầu → Lưu
                    │
                  Không
                    ↓
             Xem hồ sơ học tập
```
**Quên PIN**: sinh viên báo Teacher/Admin → Admin sinh PIN ngẫu nhiên mới + bật `must_change_pin` + thu hồi session cũ → phân phối PIN riêng → sinh viên chỉ đổi PIN ở lần đăng nhập kế tiếp.

---

## 10. Product Modules

| Module | Feature ID | Mô tả |
|---|---|---|
| **Access** | ACCESS-001→005 | Xác thực mã lớp, nickname, PIN; truy cập đúng hồ sơ; bảo vệ dữ liệu riêng tư |
| **Class Mgmt** | CLS-001→005 | Import CSV/Excel, khởi tạo lớp, quản lý SV & nickname, xem hồ sơ SV |
| **Student Profile** | STU-001→006 | Hồ sơ học tập, bài tập, điểm, feedback, tiến độ, lịch sử |
| **Assignment** | ASM-001→005 | Tạo/sửa/xóa bài tập, trạng thái, tracking |
| **Evaluation** | EVA-001→005 | Đánh giá, nhập điểm, feedback, status, lịch sử |
| **Notification** *(mới)* | NOTI-001→002 | Web notification mặc định; email adapter cấu hình qua Admin |

---

## 11. Business Rules

| ID | Nội dung |
|---|---|
| BRULE-001 | Student chỉ truy cập dữ liệu học tập của chính mình |
| BRULE-002 | **MVP: Teacher/Admin có quyền trên toàn bộ dữ liệu hệ thống (chỉ 1 record Teacher).** Schema vẫn giữ `teacher_id` ở `ClassSection` để mở rộng multi-teacher sau này mà không đổi cấu trúc bảng |
| BRULE-003 | Nickname unique theo từng lớp học phần (`UNIQUE(class_section_id, nickname)`), không unique toàn hệ thống |
| BRULE-004 | 1 người có thể tham gia nhiều lớp; mỗi lớp là 1 record `Student` (enrollment) độc lập, có thể dùng cùng hoặc khác nickname (xem BR-010) |
| BRULE-005 | PIN 6 số, bắt buộc, lưu dưới dạng hash (BCrypt), không lưu plain text; PIN khởi tạo/reset phải ngẫu nhiên riêng cho từng Student và chỉ xuất cho Teacher/Admin một lần |
| BRULE-006 | 1 Student chỉ có 1 Evaluation chính thức hiện hành / 1 Assignment tại 1 thời điểm; các thay đổi trước đó lưu ở `EvaluationHistory` (xem mục 14b) |
| BRULE-007 | Dữ liệu học tập cô lập theo từng lớp học phần (Class Section Context Isolation) |
| BRULE-008 | Mỗi lần truy cập thành công chỉ mở 1 hồ sơ học tập duy nhất |
| BRULE-009 | Email notification mặc định tắt; chỉ gửi khi Teacher/Admin bật cấu hình |
| BRULE-010 | Sinh viên import có mặc định Nickname=MSSV và PIN khởi tạo ngẫu nhiên; `must_change_nickname=true` và `must_change_pin=true` nên bắt buộc đổi cả 2 ở lần đăng nhập đầu tiên |
| BRULE-011 *(mới)* | Đăng nhập sai PIN 5 lần liên tiếp theo một định danh → khóa định danh 15 phút; đồng thời rate limit theo IP. Thông báo lỗi không được tiết lộ nickname có tồn tại hay không |
| BRULE-012 *(mới)* | Quên PIN: chỉ Teacher/Admin được sinh PIN khởi tạo ngẫu nhiên mới + bật `must_change_pin=true` + thu hồi mọi session cũ; không bắt đổi lại nickname và sinh viên không tự reset được |

---

## 12. Non-Functional Requirements

**Security**
- PIN/mật khẩu lưu dưới dạng hash (BCrypt).
- API yêu cầu authentication với dữ liệu riêng tư.
- Phân quyền kiểm tra tại backend, không dựa vào ẩn UI.
- Session dùng **cookie `HttpOnly + Secure + SameSite=Lax`** cho cả Teacher và Student (thay cho JWT lưu ở client) — tránh lộ token qua XSS.
- Teacher dùng Supabase Auth SSR; Student dùng opaque session token riêng qua Next.js API. Student không truy cập Supabase Data API/Realtime trực tiếp từ browser.
- Rate limit đăng nhập theo cả IP và định danh: tối đa 5 lần sai/15 phút cho một định danh; giới hạn IP ngăn thử hàng loạt và việc chỉ khóa theo tài khoản.
- Thông báo lỗi đăng nhập dùng chung 1 message, không phân biệt "sai nickname" hay "sai PIN" để tránh dò tài khoản.
- Student session lưu token hash ở DB, tự hết hạn sau 30 phút không hoạt động, có thể thu hồi khi logout/reset PIN; không lưu raw token trong DB.
- Các request thay đổi dữ liệu phải kiểm tra `Origin` và dùng CSRF token (hoặc cơ chế chống CSRF tương đương), không chỉ dựa vào `SameSite`.

**Data Integrity**
- Evaluation phải tham chiếu hợp lệ đến Student và Assignment.
- Không tạo Evaluation cho SV ngoài phạm vi lớp/môn tương ứng.
- `UNIQUE(class_section_id, mssv)`, `UNIQUE(class_section_id, nickname)` và `UNIQUE(student_id, assignment_id)` phải được enforce ở database.
- Score constraint: `0 ≤ score ≤ max_score` (mặc định `max_score = 10`, tối đa 1 chữ số thập phân).
- Enum `Assignment.status`: `draft | published | closed`.
- Enum `Evaluation.status`: `pending | graded | returned`.

**Maintainability**
```
Presentation Layer → Business/Service Layer → Data Access Layer → Database
```
- Notification thiết kế theo pattern Strategy/Adapter để dễ bật thêm kênh gửi (email, sau này có thể mở rộng SMS...).

---

## 13. Acceptance Criteria (cụ thể hóa từ Success Criteria)

| Tiêu chí | Acceptance Criteria đo được |
|---|---|
| Data Privacy | SV A dùng session của mình gọi API tới Evaluation của SV B → luôn nhận 403/404, không trả dữ liệu |
| Access Control | Teacher/Admin chỉ thao tác được trên dữ liệu thuộc `teacher_id` của mình (kể cả khi MVP chỉ có 1 Teacher, logic vẫn phải filter theo `teacher_id`) |
| Import Data | Import CSV có dòng lỗi (thiếu MSSV/trùng dữ liệu) → hệ thống báo lỗi chi tiết theo dòng, **không rollback toàn bộ file**, chỉ bỏ qua dòng lỗi. Re-import MSSV đã có trong cùng lớp chỉ cập nhật Họ Tên/Email, không reset Nickname/PIN |
| Evaluation | Nhập/sửa điểm hợp lệ theo constraint `0 ≤ score ≤ max_score`, sai định dạng bị chặn ở cả FE và API |
| Feedback Delivery | Feedback lưu đúng `student_id` + hiển thị đúng SV tương ứng, không lẫn giữa các lớp |
| Notification | Sau khi Teacher lưu Evaluation, web notification xuất hiện cho đúng SV trong **≤ 10 giây** qua polling; email chỉ gửi khi cấu hình bật và Student có email |
| Login Security | Sai PIN 5 lần liên tiếp → định danh bị khóa tạm, thử lại trong 15 phút bị từ chối; rate limit IP chặn thử hàng loạt |
| Core Workflow | Test end-to-end: Teacher import → tạo assignment → chấm điểm → Student đăng nhập lần đầu đổi Nickname/PIN → xem đúng hồ sơ của mình |

---

## 14. Đề Xuất Tech Stack

| Thành phần | Lựa chọn |
|---|---|
| Framework (Fullstack) | Next.js (App Router) |
| Database & Backend Services | Supabase (PostgreSQL, Row Level Security, Storage) |
| Auth Student | Nickname + PIN (custom logic, hash BCrypt), opaque session token qua cookie `HttpOnly + Secure + SameSite=Lax`; mọi dữ liệu đi qua Next.js API — **không dùng Supabase Auth/JWT ở student browser** |
| Auth Teacher/Admin | Supabase Auth SSR (Email/Password, session cookie) |
| Test | Jest/Vitest (unit), Playwright/Cypress (E2E), Postman (API) |
| Notification | Next.js API + polling tối đa mỗi 10 giây để đọc bảng `Notification`; Email adapter chạy server-side và bật qua Admin config |
| Rate limit | `failed_login_count`/`locked_until` theo Student kết hợp rate limit theo IP ở server/API gateway |
| Data access | Browser Student không truy cập Supabase trực tiếp. Next.js API xác thực StudentSession rồi mới truy vấn bằng server credential và bắt buộc scope mọi query theo `student_id`/`class_section_id`; RLS/grants mặc định từ chối `anon` |

---

## 14b. Data Model Chi Tiết (v2 — đã xử lý các gap từ review kỹ thuật)

```
Teacher (1 record ở MVP — BRULE-002)
├── id (FK → auth.users.id), display_name
├── email_notification_enabled

ClassSection
├── id, code (unique), name, teacher_id

Student                            ← 1 record = 1 lượt ghi danh (enrollment), KHÔNG phải 1 người duy nhất (BR-010)
├── id, class_section_id, mssv, full_name
├── email (nullable)
├── nickname (UNIQUE với class_section_id), pin_hash
├── must_change_nickname (boolean, default true)
├── must_change_pin (boolean, default true)
├── failed_login_count, locked_until   ← chống brute-force (BRULE-011)
├── UNIQUE(class_section_id, mssv)

StudentSession
├── id, student_id, token_hash
├── last_activity_at, expires_at, revoked_at

Assignment
├── id, class_section_id, title, description
├── assigned_date, due_date
├── status: enum('draft','published','closed')
├── max_score (default 10)

Evaluation                         ← MVP dùng ngay, luôn là bản ghi HIỆN HÀNH
├── id, student_id, assignment_id
├── score (0 ≤ score ≤ max_score, 1 chữ số thập phân) ← SOURCE OF TRUTH
├── feedback
├── status: enum('pending','graded','returned')
├── created_at, updated_at
├── UNIQUE(student_id, assignment_id)

EvaluationHistory                  ← MVP dùng ngay (đáp ứng EVA-005 / BR-011)
├── id, evaluation_id (FK)
├── old_score, old_feedback, old_status
├── changed_at, changed_by (teacher_id)

Notification                       ← MVP dùng ngay (đáp ứng NOTI-001, trước đây thiếu)
├── id, student_id, type, message
├── created_at, read_at (null = chưa đọc)

EvaluationCriteria                 ← Migration sau MVP (kết quả chấm theo từng tiêu chí)
├── id, evaluation_id (FK)
├── criteria_name, max_score, score_earned

RubricTemplate                     ← Migration sau MVP (bộ tiêu chí mẫu gắn ở cấp Assignment)
├── id, assignment_id (FK), is_enabled
RubricCriterion
├── id, rubric_template_id (FK)
├── criteria_name, max_score, display_order
```

**Progress / "đã hoàn thành bài nào" (BR-012, giải quyết gap #3 trong review):**
`Progress = số Assignment có Evaluation.status IN ('graded','returned') / tổng số Assignment có status IN ('published','closed') trong lớp.`
→ Không cần entity `Submission` riêng ở MVP vì hệ thống không có tính năng nộp bài (upload file); "hoàn thành" được suy ra trực tiếp từ trạng thái chấm điểm.

**Nguyên tắc mở rộng Rubric (áp dụng sau MVP, không cần đổi bảng đã có):**
- MVP: giáo viên nhập trực tiếp `Evaluation.score`; chưa tạo các bảng rubric trong migration MVP.
- Sau MVP: bật rubric cho 1 assignment → tạo `RubricTemplate` + các `RubricCriterion` mẫu; khi chấm điểm, hệ thống tạo `EvaluationCriteria` tương ứng và `Evaluation.score` được **tính tự động** (tổng `score_earned`) thay vì nhập tay.
- Assignment không có `RubricTemplate` (hoặc `is_enabled=false`) → dùng chấm điểm đơn giản như MVP — 2 kiểu tồn tại song song được.

**Lưu ý khi code EvaluationHistory:** ghi giá trị cũ vào `EvaluationHistory` và update `Evaluation` trong **cùng một database transaction**; ưu tiên PostgreSQL trigger để không có update nào bỏ qua lịch sử. Nếu update thất bại thì cả history và evaluation phải rollback.

---

## 15. Kế Hoạch Triển Khai (Sprint Plan) — Team 2 Dev / 2 QA

| Sprint | Module | Dev A | Dev B | QA A | QA B |
|---|---|---|---|---|---|
| 0 | Setup | Setup Next.js, Supabase, DB schema | Auth flow (Teacher Supabase SSR + StudentSession), rate limit, CSRF | Chuẩn bị test plan tổng | Checklist bảo mật (RLS/grants/API, không dựa UI) |
| 1 | Access | Teacher login | Student login (mã lớp+nickname+PIN) | Test Access: login đúng/sai, PIN sai, lớp không tồn tại | Hỗ trợ QA A + rà lại checklist bảo mật |
| 2 | Class & Student Mgmt | Import CSV/Excel, CRUD lớp | Quản lý SV + nickname trong lớp | Test import lỗi định dạng, trùng nickname trong lớp | Test cô lập dữ liệu giữa các lớp |
| 3 | Assignment + Notification | CRUD assignment, trạng thái | Notification API + polling Web + Email adapter/config | Test CRUD assignment, trạng thái | Test notification: web đúng SV trong ≤10 giây; email chỉ gửi khi bật và có địa chỉ |
| 4 | Evaluation | Nhập/sửa điểm, feedback, status | Lịch sử đánh giá + trang Admin config email | Test nhập/sửa điểm, feedback hiển thị đúng SV | Test isolation: SV A không xem được feedback SV B (BR-007) |
| 5 | Student Profile | API tổng hợp hồ sơ học tập (BE) | FE hiển thị hồ sơ, tiến độ học tập | Regression luồng Teacher Evaluation Workflow | Regression luồng Student Academic Tracking Workflow |
| 6 | Hardening & Báo cáo | Fix bug, tối ưu | Fix bug, tối ưu | Test case cuối cho demo | Viết test report tổng hợp |

**Tài liệu triển khai cho team:**
- [Engineering Rules](team/engineering-rules.md) — quy chuẩn code, API, validation, security, test và review chung.
- [Phân công Dev A](team/dev-a-assignment.md) — deliverable và QA chéo của Dev A theo từng sprint.
- [Phân công Dev B](team/dev-b-assignment.md) — deliverable và QA chéo của Dev B theo từng sprint.

**Lưu ý QA xuyên suốt:** trọng tâm kiểm thử là **student data isolation** — dữ liệu không được lộ chéo giữa các sinh viên, kể cả khi trùng nickname ở lớp khác nhau.

---

## 16. Điểm Cần Thảo Luận Thêm Với Thầy Bảo / Nhóm

**Đã chốt (không cần bàn thêm):**
1. Format cột bắt buộc file import: MSSV, Họ Tên; Email tùy chọn. Mặc định Nickname=MSSV, PIN ngẫu nhiên riêng cho từng Student và bắt buộc đổi ở lần đăng nhập đầu (BRULE-010).
2. Rubric-based evaluation: KHÔNG làm ở MVP; thiết kế dự kiến đã mô tả nhưng các bảng rubric chỉ tạo bằng migration sau MVP (mục 14b).
3. Academic History (STU-006): để version sau, thay bằng `EvaluationHistory` (đáp ứng EVA-005) đã có sẵn trong MVP.
4. Student = record enrollment theo từng lớp, không phải 1 người duy nhất toàn hệ thống (BR-010).
5. Quên PIN: chỉ Teacher/Admin sinh PIN ngẫu nhiên mới và thu hồi session cũ, không có self-service.
6. Teacher dùng Supabase Auth SSR; Student dùng opaque StudentSession và chỉ truy cập dữ liệu qua Next.js API.
7. Ngưỡng khóa tạm theo định danh sau 5 lần sai là 15 phút, kết hợp rate limit theo IP.
8. Thời gian session hết hạn 30 phút không hoạt động
9. Import CSV có dòng lỗi: bỏ qua dòng lỗi và báo chi tiết; re-import MSSV đã có chỉ cập nhật Họ Tên/Email, không reset thông tin đăng nhập.
10. Web notification dùng polling tối đa 10 giây trong MVP; không dùng Supabase Realtime cho Student custom session.



