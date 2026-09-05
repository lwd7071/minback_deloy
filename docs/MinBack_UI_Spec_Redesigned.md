# MinBack — Đặc tả UI nâng cấp (Redesigned UI Specification)

Phiên bản: 2026-09-04 · Trạng thái: **FINAL SOURCE OF TRUTH cho UI redesign và product-facing behavior được mô tả trong tài liệu này**.

Tài liệu này kế thừa toàn bộ yêu cầu đang đúng của bản UI specification hiện tại và các thay đổi sản phẩm đã được xác nhận trước đó. **Không tự ý thêm feature, không tự ý xóa feature, không tự ý thay đổi API/backend/data model chỉ vì một phần UI bị ẩn.** Các thay đổi được ghi rõ trong section **Functional & Visibility Changes** là intentional và được phép áp dụng; khi một page/component cũ mâu thuẫn với section đó, section này được ưu tiên.

Sau lần cập nhật này, `MinBack_UI_Spec_Redesigned.md` là **source of truth cuối cùng cho bước lập `UI_REDESIGN_PLAN.md`**. Codebase được dùng để đối chiếu implementation hiện trạng; không được dùng để reinterpret hoặc vô hiệu hóa các quyết định đã ghi rõ trong spec này.

Nguyên tắc xuyên suốt: **COHERENCE + HIERARCHY + USABILITY + CONSISTENCY + BRAND IDENTITY**. Không trang trí thừa, không gradient lạm dụng, không glassmorphism tùy tiện, không style một lần cho từng trang.

---

## Functional & Visibility Changes

Section này là **SOURCE OF TRUTH** cho mọi thay đổi ảnh hưởng đến feature visibility, user access, UI behavior và workflow. Các quyết định trong section này là **intentional**; implementation plan/coding agent không được tự reinterpret thành xóa backend/API/data nếu tài liệu không nói rõ.

### F.1. Quy tắc phân loại thay đổi

- **Visual Change**: chỉ thay layout, color, typography, spacing, component styling, visual hierarchy hoặc responsive presentation; không tự thay functionality.
- **Functional / Behavior Change**: thay đổi user có thể làm gì, workflow, action hoặc interaction. Chỉ áp dụng khi tài liệu này ghi rõ.
- **Visibility / Access Change**: functionality/backend có thể vẫn tồn tại nhưng một role không được expose trên UI. **UI-hidden ≠ feature deleted.**
- Nếu một requirement chỉ nói "ẩn", "không expose", "không có CTA/navigation", thì **không được suy diễn** thành xóa route, API, database field, data, migration hoặc backend logic.

### F.2. Student Submission — visibility/access change bắt buộc

**Student UI KHÔNG được expose chức năng nộp bài.** Đây là **Visibility / Access Change**, không phải yêu cầu xóa backend submission feature.

Student-facing UI phải tuân thủ toàn bộ các điểm sau:

- Không hiển thị nút **"Nộp bài ngay"**.
- Không hiển thị CTA dẫn tới chức năng nộp bài.
- Không hiển thị submission/upload form trong `StudentAssignmentModal` hoặc modal tương đương.
- Không expose submission functionality qua Student navigation.
- Không expose submission functionality qua card, dashboard, assignment list, deep-link CTA hoặc entry point khác trên Student UI.
- Không hiển thị UI cho phép Student upload file và submit assignment.
- Student vẫn được xem các thông tin assignment/result mà các section khác của specification cho phép.
- Các chức năng assignment khác không liên quan đến submission vẫn hoạt động bình thường.

**Không được tự động thực hiện các việc sau chỉ vì Student submission bị ẩn khỏi UI:**

- Không xóa backend API submission.
- Không xóa database field/table submission.
- Không xóa submission data hiện có.
- Không xóa backend submission logic.
- Không thay API contract submission.
- Không xóa route compatibility/internal chỉ vì route không xuất hiện trong navigation.

Nếu một thay đổi backend/submission đã được một functional requirement khác trong chính tài liệu này chỉ định rõ, requirement cụ thể đó vẫn có hiệu lực. Nếu không có chỉ định rõ, mặc định **backend/API/data được giữ nguyên**.

### F.3. Route visibility & compatibility

| Route / Area | Role | Visible in normal navigation | Usable from normal UI | Contract |
|---|---|---:|---:|---|
| Student dashboard/profile | Student | Có | Có | Không có submission CTA/form |
| Student assignments | Student | Có | Có | Chỉ expose assignment/result UI được mô tả; không expose submit/upload |
| Student assignment modal/detail | Student | Có khi đi từ assignment/result UI | Có | Không có submission/upload form |
| `/class/[code]/submissions` | Student | **Không** | **Không qua normal Student UI** | **Route retained for compatibility / internal use, but not exposed through normal Student navigation.** |
| Submission backend/API/data | Backend/internal | N/A | N/A | Giữ nguyên trừ khi một functional requirement khác ghi rõ thay đổi |
| Teacher submission-related area | Teacher | Theo các section Teacher hiện hành | Theo các section Teacher hiện hành | Không suy diễn thêm permission/visibility mới từ F.2 |

### F.4. Role clarification

- **Teacher**: role giảng viên; các route hiện mang prefix `/admin/...` vẫn được hiểu là teacher workspace theo specification hiện tại.
- **Student**: role sinh viên; F.2 áp dụng bắt buộc cho toàn bộ Student UI.
- **Admin**: tài liệu hiện tại **không thiết lập một role Admin độc lập với Teacher chỉ dựa trên prefix `/admin`**. Không được tự tạo permission Admin mới nếu codebase/spec khác không xác nhận.

### F.5. Functional changes đã được xác nhận trước đó và vẫn giữ nguyên

Các thay đổi functional đã được ghi rõ ở các page section hiện tại tiếp tục có hiệu lực, bao gồm các flow credential, OTP, feedback-first, grade import và publish. Việc bổ sung F.2 **không tự động hoàn tác** những thay đổi đã được mô tả rõ ở các section khác; nó chỉ khóa semantics rằng **Student submission là hidden/not exposed trên UI, không đồng nghĩa xóa backend**.

### F.6. Quy tắc xử lý ambiguity

Nếu implementation plan gặp behavior chưa được tài liệu này quyết định rõ, không được tự bịa. Ghi:

> **OPEN QUESTION / DECISION REQUIRED**

và mô tả chính xác quyết định còn thiếu. Chỉ được tự áp dụng khi quyết định đã có trong section Functional & Visibility Changes hoặc một requirement cụ thể khác của tài liệu.

---

## PHẦN A — DESIGN SYSTEM NỀN TẢNG

### A.1. Định hướng thị giác (Visual Direction)

MinBack là công cụ học thuật cho giảng viên và sinh viên: **trang trọng, rõ ràng, đáng tin** — cảm giác "sổ điểm số hiện đại", không phải dashboard SaaS generic.

- Giữ tinh thần **Academic Editorial** của brand (navy sâu + gold kim) nhưng nâng cấp thành **semantic token system** hoàn chỉnh.

- Nền sáng trung tính, chữ đậm nét, đường viền 1px rõ ràng; **shadow chỉ dùng cho layering** (popover, modal, sticky bar), không dùng để trang trí card tĩnh.

- Một sản phẩm, một ngôn ngữ thị giác: mọi trang — public, teacher, student — đều dùng chung token, component, và quy tắc layout.

### A.2. Color System (Semantic Tokens)

Thay thế toàn bộ biến mô tả cũ (`--navy-900`, `--gold-500`…) bằng token ngữ nghĩa. Giá trị HEX bên dưới là **quyết định thiết kế mới**, được tinh chỉnh từ bảng màu hiện tại để đạt contrast AA và nhất quán vai trò. **Cấm** hardcode màu ngoài bảng này; cấm thêm màu mới vì "một trang cần khác đi".

#### A.2.1. Brand & Action

| Token | HEX | Vai trò ngữ nghĩa |

|---|---|---|

| `--color-primary` | `#1E3A4A` | Hành động chính (nút primary), header workspace, chữ nhấn mạnh thương hiệu |

| `--color-primary-hover` | `#2C5468` | Hover của primary |

| `--color-primary-active` | `#16303D` | Active/pressed của primary |

| `--color-primary-foreground` | `#FBFAF7` | Chữ/icon trên nền primary |

| `--color-accent` | `#F5B400` | Điểm nhấn brand: brand mark, focus ring, highlight tiến độ, CTA phụ nổi bật |

| `--color-accent-hover` | `#DFA300` | Hover của phần tử accent |

| `--color-accent-foreground` | `#16303D` | Chữ trên nền accent (đảm bảo contrast) |

| `--color-secondary` | `#E7EEF1` | Nền tương tác trung tính (hover ghost, badge info, vùng chọn) |

| `--color-secondary-foreground` | `#2C5468` | Chữ trên nền secondary |

*> Thay đổi lớn so với hiện tại:* **nút CTA chính chuyển từ nền vàng gold sang nền navy** *(*`primary`*). Gold chỉ giữ vai trò accent (brand mark, focus, highlight) để giảm nhiễu thị giác và chuẩn hóa hierarchy hành động trên toàn app.*

#### A.2.2. Surface & Text

| Token | HEX | Vai trò |

|---|---|---|

| `--color-background` | `#FBFAF7` | Canvas toàn trang |

| `--color-surface` | `#FFFFFF` | Card, table container, input, dialog |

| `--color-surface-elevated` | `#FFFFFF` | Popover, dropdown, modal, sticky bar (đi kèm shadow layering) |

| `--color-surface-subtle` | `#F3F6F7` | Table header, skeleton, track của progress, vùng disabled |

| `--color-border` | `#E1E6E9` | Viền card, divider, input mặc định |

| `--color-border-strong` | `#C9D4D9` | Viền input hover, viền cần nhấn nhẹ |

| `--color-text-primary` | `#16303D` | Nội dung chính |

| `--color-text-secondary` | `#4A6472` | Label phụ, mô tả, metadata (nâng từ #2C5468 để tách bậc rõ hơn) |

| `--color-text-muted` | `#7B898F` | Placeholder, timestamp, chữ disabled |

#### A.2.3. Feedback (Status)

Mỗi trạng thái có cặp `solid` (chữ/icon) + `soft` (nền badge/alert). Cặp này là **cách duy nhất** biểu đạt trạng thái trong toàn app.

| Token | HEX | Dùng cho |

|---|---|---|

| `--color-success` / `--color-success-soft` | `#3D7A5F` / `#E5F1EB` | `graded` (đã lưu bản chấm), thao tác thành công |

| `--color-warning` / `--color-warning-soft` | `#8A5A00` / `#FFF3CC` | PIN mặc định/chưa đổi, dữ liệu import cần chú ý, kết quả chưa công bố |

| `--color-error` / `--color-error-soft` | `#B55249` / `#F8E8E6` | Lỗi form, dòng import không hợp lệ, thao tác destructive, OTP/rate-limit lỗi |

| `--color-info` / `--color-info-soft` | `#2C5468` / `#E7EEF1` | Trạng thái thông tin trung lập, assignment `published`, dữ liệu đã đối chiếu |

| `--color-neutral` / `--color-neutral-soft` | `#56666E` / `#F1F3F4` | Trạng thái đóng/không hoạt động |

#### A.2.4. Overlays & Focus

| Token | Giá trị | Dùng cho |

|---|---|---|

| `--color-overlay` | `rgba(22, 48, 61, 0.48)` | Backdrop modal/drawer |

| `--color-focus-ring` | `rgba(245, 180, 0, 0.45)` | Outline focus-visible 3px, thống nhất toàn app |

Quy tắc: dark mode **không** nằm trong phạm vi redesign này (spec hiện tại chỉ có light theme); kiến trúc token semantic được thiết kế sẵn để bổ sung dark theme sau mà không đổi component.

### A.3. Typography System

Theo quyết định UI consistency mới, **bỏ hoàn toàn Lora/serif**. Toàn bộ heading, body và control dùng `Be Vietnam Pro`; `IBM Plex Mono` chỉ dùng cho **MSSV và mã lớp**. PIN, điểm số, step counter, table header và eyebrow không còn mặc định dùng mono nếu không thuộc hai nhóm dữ liệu này.

- **Heading / Body / UI / Control**: `Be Vietnam Pro` — weights dùng: **400, 500, 700**.
- **Mono / Identity data**: `IBM Plex Mono` — weights: **400, 500**. Chỉ dùng cho MSSV và mã lớp.
- **Wordmark**: ưu tiên `Be Vietnam Pro` 700 để giữ hệ chữ thống nhất; brand mark hình học vẫn giữ nguyên.

| Cấp | Font | Size / Line-height | Weight | Letter-spacing | Dùng cho |
|---|---|---|---|---|---|
| Display | Be Vietnam Pro | `clamp(2.25rem, 4vw, 3.5rem)` / 1.12 | 700 | -0.035em | Hero landing |
| H1 | Be Vietnam Pro | `1.75rem` / 1.2 | 700 | -0.02em | Tiêu đề trang (mỗi trang đúng 1 H1) |
| H2 | Be Vietnam Pro | `1.375rem` / 1.25 | 700 | -0.015em | Tiêu đề section/panel |
| H3 | Be Vietnam Pro | `1.125rem` / 1.35 | 700 | 0 | Tiêu đề card, modal title |
| H4 | Be Vietnam Pro | `0.9375rem` / 1.4 | 700 | 0 | Tiêu đề nhóm nhỏ trong panel |
| Body Large | Be Vietnam Pro | `1.0625rem` / 1.55 | 400 | 0 | Đoạn mô tả dẫn |
| Body | Be Vietnam Pro | `0.9375rem` / 1.55 | 400 | 0 | Nội dung mặc định |
| Body Small | Be Vietnam Pro | `0.8125rem` / 1.5 | 400 | 0 | Metadata, mô tả phụ, table cell |
| Caption | Be Vietnam Pro | `0.75rem` / 1.4 | 500 | 0 | Timestamp, chú thích dưới field |
| Label | Be Vietnam Pro | `0.73rem` / 1.3 | 700 | +0.08em, uppercase | Eyebrow, table header, nhãn role |
| Identity Data | IBM Plex Mono | theo ngữ cảnh | 500 | 0 | MSSV, mã lớp |

Quy tắc hierarchy: trang không được dùng màu/đổ bóng để tạo bậc — bậc thông tin được lập bằng **cấp chữ + spacing + nhóm nội dung**. Mỗi màn hình phải trả lời được bằng mắt thường: (1) đang ở đâu, (2) trang này để làm gì, (3) thông tin quan trọng nhất, (4) hành động tiếp theo.

### A.4. Spacing System

Thang chuẩn duy nhất: **4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 80**. Mọi giá trị lẻ của hệ cũ được map về thang:

| Hệ cũ | Hệ mới | Vai trò |

|---|---|---|

| 4px | 4 | gap tabs, nav links |

| 8px | 8 | icon + label, tag gap |

| 10px | 8 hoặc 12 | avatar cluster |

| 12px | 12 | control groups, gap field nhỏ |

| 16px | 16 | grid gap, form field gap |

| 20px | 24 | stack chuẩn trong panel |

| 22px (card padding) | 24 | padding card chuẩn |

| 26px (modal padding) | 32 | padding modal/dialog |

| 24px gutter | 24 | gutter desktop |

| 36px | 32 | cụm header |

| 44px/72px main padding | 48/64 | section spacing trang workspace |

Quy tắc: khoảng cách giữa 2 section lớn trong một trang = **48px** (desktop) / **32px** (mobile); padding trong card = **24px**; padding modal = **32px**. Không dùng giá trị ngoài thang trừ khi có lý do layout thực sự (phải ghi chú trong review).

### A.5. Border Radius Scale

| Token | Giá trị | Áp dụng |

|---|---|---|

| `--radius-sm` | 6px | badge kỹ thuật, tag nhỏ, ô OTP digit |

| `--radius-md` | 8px | button, input, select, textarea, tab |

| `--radius-lg` | 12px | card, table container, panel, drawer |

| `--radius-xl` | 16px | modal/dialog, auth card |

| `--radius-full` | 999px | badge pill, avatar, progress track/fill |

Ngoại lệ brand duy nhất: brand mark MinBack giữ bo góc bất đối xứng `9px 9px 9px 2px`. Không thêm ngoại lệ khác.

### A.6. Elevation

| Cấp | Giá trị | Dùng khi |

|---|---|---|

| `--elevation-0` | none | Mặc định mọi card/panel (phân tách bằng border 1px) |

| `--elevation-1` | `0 1px 2px rgba(30,58,74,0.08)` | Sticky header, sticky save bar |

| `--elevation-2` | `0 10px 28px rgba(30,58,74,0.12)` | Popover, dropdown menu, notification panel |

| `--elevation-3` | `0 20px 56px rgba(30,58,74,0.16)` | Modal, drawer |

Quy tắc: **card tĩnh không có shadow**. Hover card tương tác chỉ đổi `border-color` sang `--color-accent`, không nâng shadow. Bỏ hoàn toàn hiệu ứng hard-shadow vàng `13px 13px 0` ở landing hiện tại (xem C.1).

### A.7. Grid & Layout

| Quy tắc | Giá trị |

|---|---|

| Max content width | `1120px`, căn giữa |

| Gutter desktop (>800px) | 24px mỗi bên |

| Gutter tablet (481–800px) | 16px mỗi bên |

| Gutter mobile (≤480px) | 12px mỗi bên |

| Workspace main padding | `48px 0 64px` (desktop), `32px 0 48px` (mobile) |

| Grid desktop | 12 cột, gap 16px; panel đôi chia 7/5 hoặc 6/6 |

| Section spacing | 48px desktop / 32px mobile |

| Card/grid gap | 16px (lưới thẻ), 24px (panel lớn) |

Mọi trang workspace (teacher và student) dùng chung khung: `WorkspaceHeader` → `PageHeader` (eyebrow + H1 + mô tả + actions) → vùng nội dung. Public route dùng `public-shell` (nền background + vệt accent radial rất nhẹ ở góc, opacity ≤ 6%).

### A.8. Iconography

- Giữ `lucide-react` qua wrapper `AppIcon`, **strokeWidth thống nhất 1.8**, size mặc định 18px (16px trong control nhỏ, 20px trong empty state).

- Icon không bao giờ là nguồn ý nghĩa duy nhất: luôn kèm label text hoặc `aria-label`.

- Icon trạng thái phải đi kèm màu feedback tương ứng (A.2.3).

---

## PHẦN B — COMPONENT SYSTEM NÂNG CẤP

Quy ước chung cho mọi component: dùng đúng token Phần A; trạng thái bắt buộc gồm **default / hover / focus-visible (ring 3px accent) / active / disabled / loading** (nếu tương tác); touch target tối thiểu **44×44px** trên mobile; radius theo A.5; không style ad-hoc ở trang cụ thể.

### B.1. Button

- **Variants**: `primary` (nền `--color-primary`, chữ primary-foreground), `secondary` (nền surface, viền border, chữ primary), `outline` (trong suốt, viền border-strong), `ghost` (trong suốt, hover nền secondary), `destructive` (nền `--color-error`, chữ trắng), `destructive-outline` (viền error, chữ error — dùng cho Danger Zone).

- **Sizes**: `md` (min-height 42px, padding 9px 16px, radius-md, weight 700), `sm` (min-height 34px, padding 6px 12px). Full-width khi nằm trong form mobile.

- **States**: hover = đổi nền theo token hover (không translateY); disabled/loading = nền surface-subtle, chữ text-muted, cursor not-allowed; loading hiển thị spinner nhỏ + nhãn ngữ cảnh ("Đang xử lý…", "Đang đăng nhập…").

- Mapping từ hệ cũ: `btn-primary` (vàng) → `primary` (navy); `btn-outline-danger` → `destructive-outline`.

### B.2. Input / SearchInput / Dropdown (Select) / Textarea

- Khung chung `.form-field`: Label (Body Small, weight 700) → hint (Caption, text-muted) → control → error (Caption, `--color-error`).

- Control: min-height 44px, radius-md, viền `--color-border`, nền surface; hover viền border-strong; focus viền `--color-accent` + focus ring; `aria-invalid` → viền error + error text, liên kết `aria-describedby`.

- Variants: `default`, `error`, `disabled`, `success` (viền success khi validate pass ở form cần xác nhận mạnh như đổi PIN).

- SearchInput: Input kèm icon search 16px, hỗ trợ clear button khi có giá trị; dùng cho mọi ô tìm kiếm (classes, students, grading) — không tự chế ô search riêng.

### B.3. OtpInput

- Giữ interaction hiện tại (auto-advance, backspace lùi, paste 6 số, `-webkit-text-security: disc`).

- Nâng cấp: ô 44×52px (đạt touch target), radius-sm, font Be Vietnam Pro 1.25rem weight 700; trạng thái error đổi viền toàn bộ cụm + rung nhẹ 120ms (tôn trọng reduced-motion); trạng thái locked (rate-limit 429) chuyển cụm sang disabled + banner countdown. OtpInput được dùng cho Forgot PIN và xác minh đổi email; PIN đăng nhập vẫn là input bí mật 6 số, không coi PIN là dữ liệu mono.

### B.4. Badge

- Pill radius-full, padding 4px 10px, Caption weight 700. Variants map thẳng cặp feedback: `info`, `success`, `warning`, `error`, `neutral`, `draft` (surface + border), `returned` (nền primary, chữ primary-foreground).

- Quy tắc ngữ nghĩa cố định toàn app: `graded / Đã lưu bản chấm` → success nhưng **chỉ GV thấy**; `returned / Đã công bố kết quả` → returned và là trạng thái duy nhất SV được xem điểm/feedback; `PIN mặc định/chưa đổi` → warning; Assignment `published` → info; `closed` → neutral; `draft` → draft. **Cấm** dùng badge màu khác cho cùng một trạng thái ở trang khác.

### B.5. Card

- Variants: `default` (surface + border + padding 24, radius-lg, **không shadow**), `interactive` (hover: viền accent, cursor pointer — dùng cho card điều hướng/click), `highlighted` (viền trái 3px accent — dùng cho panel cần chú ý, cảnh báo import/credential), `compact` (padding 16 — dùng trong danh sách dày như activity feed).

- Bỏ prop `glass` khỏi hệ thống (không glassmorphism).

### B.6. DataTable

- Container: surface + border + radius-lg, overflow-x auto; header `th`: nền surface-subtle, Label Be Vietnam Pro uppercase; row hover: nền secondary; cell padding 12px 16px; phân cách bằng border-bottom 1px (không zebra striping).

- Cột hành động luôn nằm cuối, căn phải; nút hành động dùng Button `ghost` size `sm`.

- Trên mobile: cuộn ngang + cột đầu tiên sticky (áp dụng cho Students table, Gradebook matrix, ImportPreviewTable).

### B.7. Modal

- Giữ hành vi hiện tại: portal, backdrop `--color-overlay` + blur 4px, click-outside đóng, Escape đóng, focus trap tuần hoàn.

- Kích thước: `sm` 440px / `md` 640px / `lg` 860px; padding 32px; radius-xl; elevation-3; max-height `min(780px, 92vh)`.

- Chuẩn hóa cấu trúc: Header (H3 + nút close ghost) → Body (stack 16px) → Footer (actions căn phải, destructive nằm trái nếu có).

- **Mobile (≤800px): modal chuyển thành bottom-sheet drawer** — trượt từ đáy, radius-xl chỉ ở 2 góc trên, có grab handle; đây là quy tắc toàn cục, không phải từng modal tự quyết.

### B.8. Drawer

- Component mới chuẩn hóa 2 dạng đang tồn tại rời rạc: mobile nav panel (trượt từ trên xuống dưới header) và bottom-sheet (modal trên mobile). Cùng token nền, elevation-2, đóng bằng Escape/click-outside.

### B.9. Toast & Alert (mới chuẩn hóa)

- **Alert (inline)**: banner trong luồng nội dung, radius-md, padding 12px 16px, icon + text; variants `success/info/warning/error` dùng cặp soft/solid. Dùng cho: kết quả gửi email test, lỗi form tổng, thông báo lockout.

- **Toast (global)**: góc dưới-phải desktop / đáy mobile, auto-dismiss 4s, nút đóng; dùng cho xác nhận mutation thành công (lưu bảng điểm, cập nhật sinh viên, reset PIN). Thay thế các thông báo ad-hoc hiện tại.

### B.10. Tabs

- Thanh `role="tablist"`, gạch chân active 2px `--color-accent`, label Body weight 700 khi active; kèm số đếm dạng Caption text-muted trong ngoặc — chuẩn cho `assignment-status-tabs` và tab lọc chấm bài.

- Mobile: cuộn ngang, ẩn scrollbar, giữ target 44px.

### B.11. Pagination

- Giữ cấu trúc hiện tại (info text + page-size dropdown + cụm nút first/prev/numbers/next/last); nút active dùng nền `--color-primary` + chữ primary-foreground (thay nền navy + chữ vàng cũ); nút icon dùng ghost sm.

- Info text chuẩn: "Hiển thị X–Y trên tổng số Z [thực thể]".

### B.12. ProgressBar & MiniProgressRing

- Track: surface-subtle, radius-full, cao 8px; fill: `--color-accent` (mặc định) hoặc `--color-success` khi 100%. `role="progressbar"` đầy đủ aria.

- MiniProgressRing: 40px, stroke 4px, số % Caption mono ở giữa; màu theo cùng quy tắc fill.

### B.13. StatCard / DashboardMetric

- Chuẩn hóa thành **một** component `StatCard`: icon trong ô nền soft (tone map: blue→info, green→success, amber→warning, violet→primary), value Be Vietnam Pro 1.5rem weight 700, label Body Small text-muted, delta/hint Caption.

- Bỏ biến thể tone tùy ý: tone phải gắn ngữ nghĩa (VD: "Đã chấm" luôn success).

### B.14. Avatar

- Circle radius-full, initials 2 ký tự cuối của họ tên, nền secondary, chữ primary weight 700; sizes: 32 (table row), 40 (list), 48 (profile). `aria-label` = tên đầy đủ.

### B.15. Toggle (Switch)

- `role="switch"`, track 44×24px radius-full; on: nền `--color-success`; off: nền neutral-soft + viền border; thumb trắng; kèm label text bắt buộc (không switch trơn).

### B.16. NotificationBell & Popover

- Nút icon ghost 40px, chấm đỏ 8px góc phải khi có unread (kèm số nếu >9 hiển thị "9+").

- Popover: surface-elevated, elevation-2, radius-lg, rộng 360px (mobile: full-width dưới header); item chưa đọc có chấm accent + nền secondary; footer link "Xem tất cả".

### B.17. Breadcrumb / Back-link

- Mỗi route chỉ render tối đa một `BackLink`; component dùng icon `ChevronLeft` duy nhất trong vùng bấm 44×44px, có `aria-label` và tooltip `title`, không dùng ký tự `←` hoặc `router.back()`.
- API: `BackLinkProps = { fallbackHref, ariaLabel?, title?, className? }`. Nút ưu tiên history nội bộ; `fallbackHref` dùng khi mở trực tiếp hoặc không có history phù hợp.
- BackLink nằm trong `.page-back-slot`, là phần tử đầu tiên của vùng nội dung trước eyebrow/H1, căn theo góc trái container; không fixed/absolute.
- `ClassContextNav` là owner cho class subtree; `AuthCard` là owner cho auth/public route; `PageHeader` là owner cho teacher standalone route. Child view/form không tự render BackLink.
- Điều hướng trong wizard/OTP (ví dụ “Quay lại bước trước”) là điều hướng nội bộ và không tính là BackLink cấp trang.

### B.18. Empty / Loading / Error / Confirmation states

- **EmptyState**: icon 20px trong ô surface-subtle 48px, tiêu đề H4, mô tả Body Small text-muted, CTA optional (VD: "Tạo lớp đầu tiên"). Mọi danh sách/bảng/panel đều phải có.

- **Loading**: skeleton block radius-md nền surface-subtle (pulse 1.2s, tôn trọng reduced-motion) đúng hình dáng nội dung sẽ render — không dùng spinner toàn trang trong workspace.

- **Error**: Alert error inline + nút thử lại; route-level dùng error boundary với EmptyState variant error.

- **Confirmation**: mọi destructive action (xóa lớp, xóa bài tập) dùng Modal size sm: tiêu đề nêu hậu quả, mô tả chi tiết, nút destructive ghi rõ hành động ("Xóa lớp học này"), nút secondary "Hủy". Reset PIN dùng confirmation riêng nhưng phải mô tả rõ PIN sẽ trở về `111111`, session/recovery challenge cũ bị thu hồi và response không hiển thị PIN. Công bố kết quả cũng dùng confirmation vì tạo notification/email cho sinh viên.

---

## PHẦN C — REDESIGN TỪNG TRANG (ROUTE MAP CẬP NHẬT THEO LUỒNG FEEDBACK-FIRST)

Quy ước đọc: mỗi trang liệt kê **Giữ nguyên** (chức năng/API/flow) và **Thay đổi thiết kế** (bố cục/component/token mới). Layout khung (WorkspaceHeader teacher/student, ClassContextNav, mobile drawer) tuân theo Phần A.7 + B.8/B.17; header workspace giữ nền primary với chữ primary-foreground, nav active gạch chân accent 2px.

### C.0. Canonical page-review rule

Mỗi page dưới đây phải được đọc cùng section **Functional & Visibility Changes**. Khi một page cũ có wording khiến Student có thể submit/upload, wording đó được override bởi F.2 và phải triển khai theo hướng **không expose UI**. Khi wording chỉ liên quan backend/API/data mà F.2 không yêu cầu xóa, backend/API/data được giữ nguyên.

Mọi route phải phân biệt ba câu hỏi: **route có tồn tại không / route có được expose trong navigation không / role có được dùng action trên UI không**. Không dùng một câu "bỏ route" để đại diện cho cả ba khái niệm.

### C.1. Landing — `/`

- **Giữ nguyên**: header public + nút giảng viên, hero 2 cột, ClassLookupForm (nhập mã lớp → `/class/[CODE]`), 3 thẻ nguyên tắc, không gọi API.
- **Thay đổi thiết kế**:
  - Hero dùng Display `Be Vietnam Pro` + Body Large lead; pill tag → Badge `info`.
  - Bỏ hard-shadow vàng `13px 13px 0`: `landing-preview` trở thành Card `default` với viền trái 3px accent; dữ liệu mô phỏng dùng DataRow.
  - Form tra cứu: Input + Button primary nối liền (input group), nút "Vào lớp →" rộng tối thiểu 120px.
  - 3 thẻ nguyên tắc → Card `compact`, icon tone info, grid 3 cột → 1 cột ở ≤800px.
  - Ghi chú bảo mật: Caption + icon LockKeyhole 16px, text-muted.

### C.2. Đăng nhập giảng viên —** `/admin/login`

- **Giữ nguyên**: form email/password, `POST /api/v1/teacher/auth/login`, xử lý lỗi inline và loading "Đang đăng nhập…".
- Sau khi đăng nhập thành công, Teacher chuyển tới `/admin/classes`; `/admin/dashboard` chỉ còn là compatibility redirect.

- **Thay đổi thiết kế**: auth card radius-xl padding 32px (mobile 24px), max-width 440px căn giữa trong public-shell; tiêu đề H1 + mô tả Body Small; lỗi chuyển từ `form-error` lẻ sang **Alert error** phía trên form; nút submit primary full-width; footer link dùng BackLink.

### C.3. Dashboard giảng viên — `/admin/dashboard` (compatibility redirect)

- `/admin/dashboard` không còn là màn hình UI độc lập; truy cập route này redirect về `/admin/classes`.
- API/service dashboard vẫn được giữ cho compatibility và không thay đổi backend/data contract.
- Teacher landing page canonical là `/admin/classes`, không hiển thị các panel bài cần chấm, tiến độ theo lớp hoặc activity feed cũ.

### C.4. Danh sách lớp —** `/admin/classes`

- **Giữ nguyên**: 4 metric tổng quan, search debounce 300ms cập nhật `?q=`, lưới thẻ lớp, phân trang trước/sau, server load `pageSize: 6`.

- **Thay đổi thiết kế**:

  - Toolbar: SearchInput (max-width 400px) trái, Button primary "+ Tạo lớp mới" phải; trên mobile xếp dọc full-width.

  - `teacher-class-card` → Card `interactive` (toàn thẻ click vào lớp): hàng đầu Badge info mã lớp + MiniProgressRing; tên lớp H3; metadata Body Small (SV · bài tập); ProgressBar cuối thẻ.

  - Empty state → EmptyState chuẩn với CTA tạo lớp.

  - Phân trang đổi sang component Pagination chuẩn (B.11) thay nút trước/sau tự chế.

### C.5. Wizard tạo lớp — `/admin/classes/new`

- **Cập nhật theo contract mới**:
  - Giữ 4 bước `details → roster → review → complete`, validation Zod, preview file qua `POST /api/v1/teacher/class-section-import-previews`, tạo lớp qua `POST /api/v1/teacher/class-section-setups`, xử lý 409 quay về bước 1 và focus ô mã.
  - File roster chỉ bắt buộc `MSSV`, `Họ Tên`; cột Email cũ có thể được backend chấp nhận để tương thích nhưng UI không yêu cầu.
  - Sinh viên mới nhận nickname mặc định bằng MSSV, PIN mặc định `111111`, email suy ra `{lowercase-mssv}@student.hcmute.edu.vn`; import response không chứa PIN thô.
  - **Bỏ hoàn toàn tải CSV PIN và gate `beforeunload` "phải tải PIN trước khi rời trang".**
  - Re-import chỉ cập nhật họ tên; UI không được ám chỉ rằng re-import sẽ reset credential/email/session.
- **Thay đổi thiết kế**:
  - Wizard desktop căn giữa trong khung **760–840px**; 4 bước cân đối.
  - Stepper: 4 bước dạng số trong vòng tròn 32px — active viền accent, complete nền success + icon check, pending nền surface-subtle; ≤720px grid 2×2.
  - Mỗi bước là Card default với H2 + mô tả; footer wizard: trái "Quay lại" (ghost), phải primary ("Tiếp tục" / "Xác nhận tạo lớp").
  - Bước roster: FileImportPanel, mô tả format tối thiểu `MSSV | Họ Tên`; preview dùng DataTable với Badge success/error và lỗi MSSV không hợp lệ.
  - Bước review: có Alert info nêu rõ credential mặc định: nickname = MSSV, PIN = `111111`, email trường được suy ra từ MSSV.
  - Bước complete: EmptyState success + Button primary "Vào lớp"; thêm Alert info nhắc sinh viên đăng nhập lần đầu bằng MSSV + `111111` và bắt buộc đổi nickname/PIN. Không có nút tải PIN.

### C.6. Chi tiết lớp (Hub) —** `/admin/classes/[id]`

- **Giữ nguyên**: 3 thẻ điều hướng Sinh viên/Bài tập/Bảng điểm, Danger Zone xóa lớp, modal xác nhận, `DELETE /class-sections/\:id`, lỗi inline khi lớp đã có dữ liệu.

- **Thay đổi thiết kế**:

  - ClassContextNav: BackLink "← Danh sách lớp học" + hàng tiêu đề gồm Badge mã lớp (nền accent, chữ accent-foreground, Data mono) + H1 tên lớp.

  - 3 thẻ → Card `interactive` có icon 20px + H3 + mô tả Body Small + chevron phải; grid 3 cột → 1 cột ≤800px.

  - Danger Zone: Card viền `--color-error` dashed (thay nét đứt đỏ tự do), H4 error + mô tả + Button `destructive-outline`; modal xác nhận theo B.18 Confirmation.

### C.7. Quản lý sinh viên — `/admin/classes/[id]/students`

- **Cập nhật theo contract mới**:
  - Giữ search theo MSSV/tên/nickname, bảng sinh viên, modal sửa, reset PIN, xem hồ sơ, Pagination và API quản lý hiện có.
  - Reset PIN gọi `POST /api/v1/teacher/class-sections/:classSectionId/students/:studentId/reset-pin`: reset hash về `111111`, bật `must_change_pin`, giữ nickname, thu hồi StudentSession và recovery challenge.
  - Response reset **chỉ trả `studentId` và `mustChangePin: true`; không trả PIN thô**.
- **Thay đổi thiết kế**:
  - DataTable chuẩn B.6 với cột MSSV dùng `IBM Plex Mono`; trạng thái credential dùng Badge success ("Đã đổi PIN") / warning ("PIN mặc định").
  - Cột thao tác: Button ghost sm ("Sửa", "Reset PIN", "Hồ sơ"); mobile thu gọn dropdown "···".
  - Modal Sửa: form B.2, footer Hủy/Lưu; lưu thành công → Toast success.
  - Modal Reset PIN: Confirmation sm, nội dung ghi rõ "Đặt lại PIN về 111111" + cảnh báo session hiện tại của sinh viên sẽ bị thu hồi. Sau thành công chỉ Toast/Alert success "Đã đặt lại PIN về mặc định"; **không có block hiển thị/copy PIN mới**.
  - Modal Xem hồ sơ: size lg, ưu tiên thông tin tài khoản, email hiện hành/xác minh và kết quả `returned`; không hiển thị submission.

### C.8. Quản lý bài tập — `/admin/classes/[id]/assignments`

- **Cập nhật theo contract mới**:
  - Assignment được tối giản thành khóa nhóm cho một lần chấm/import kết quả.
  - UI tạo/sửa chỉ còn **title, maxScore, status**.
  - **Loại description, deadline và attachment khỏi Teacher/Student UI**; LMS giữ đề/nội dung chi tiết.
  - Teacher UI không expose attachment upload qua Cloudinary trong flow assignment redesign hiện tại. Field/database/API cũ **không bị yêu cầu xóa bởi UI spec này**; chỉ thay đổi backend nếu một functional contract riêng ghi rõ.
  - Draft không xuất hiện với Student; `published/closed` chỉ biểu đạt trạng thái assignment/kết quả, không mang nghĩa có đề/tệp để nộp.
- **Thay đổi thiết kế**:
  - Toolbar: Tabs chuẩn B.10 trái, Button primary "+ Tạo bài tập mới" phải.
  - Assignment card → Card default: H3 + Badge status; metadata chỉ còn mã lớp và **thang điểm**; bỏ deadline/countdown/file count.
  - Action chính: Button secondary "Nhập điểm & feedback"; action phụ ghost "Chỉnh sửa".
  - Modal Tạo/Sửa: form B.2 chỉ gồm `Tên bài`, `Điểm tối đa`, `Trạng thái`; Điểm tối đa default 10 nếu contract hiện hành giữ mặc định.
  - Xóa bài tập ở footer trái dạng destructive-outline + Confirmation.
  - Empty state theo tab: "Chưa có bài tập nào thuộc trạng thái này."

### C.9. Import điểm & feedback — `/admin/classes/[id]/assignments/[aid]/grade`

- **Cập nhật theo contract mới**:
  - Thay flow chấm tay/bulk evaluation cũ bằng **import một file CSV/XLSX 4 cột**.
  - Contract file bắt buộc đúng bốn cột: `MSSV | Họ tên | Điểm | Feedback`; header không phân biệt hoa thường.
  - Giới hạn: **5 MB / 2.000 dòng**; MSSV là khóa ghép Student; họ tên chỉ dùng đối chiếu/cảnh báo; score `0..maxScore`, tối đa một chữ số thập phân; feedback tối đa 5.000 ký tự; phát hiện duplicate MSSV.
  - Preview: `POST /api/v1/teacher/assignments/:assignmentId/evaluations/import-preview`, không mutation, phân loại `create/update/unchanged/invalid`.
  - Preview gửi file bằng `FormData` tới `POST /api/v1/teacher/assignments/:assignmentId/evaluations/import-preview`; không mutation.
  - Sau preview, endpoint `POST /api/v1/teacher/assignments/:assignmentId/evaluations/import` nhận JSON `{ mode, evaluations }`; UI không gửi lại file. Server vẫn parse/validate lại payload trước khi ghi.
  - Lưu bản chấm: `mode=save_draft`; chỉ dòng hợp lệ được ghi thành `graded`, không notification/email.
  - Công bố: `mode=publish`; Evaluation thành `returned`; notification sau commit, email sau notification; email lỗi không rollback điểm/notification.
  - UI grade flow chính không expose filter `unsubmitted`, file nộp, input điểm theo từng row, textarea nhận xét inline hoặc sticky save bar. Việc endpoint cũ có còn tồn tại hay không là backend compatibility concern; UI spec không tự yêu cầu xóa endpoint chỉ vì không còn entry point.
- **Thay đổi thiết kế**:
  - BackLink "← Quay lại lớp" + PageHeader H1 tên bài tập; metadata chỉ còn thang điểm + trạng thái assignment.
  - Card "Định dạng tệp": bảng ví dụ 4 cột + Caption nêu MSSV là khóa ghép; **không có endpoint/nút tải template**.
  - FileImportPanel B.19: drop CSV/XLSX, hiển thị file, thay file, lỗi kích thước/định dạng.
  - Preview summary dùng 4 StatCard/Badge count: Create / Update / Unchanged / Invalid.
  - ImportPreviewTable: cột MSSV (mono), Họ tên, Điểm, Feedback, Kết quả; warning khi họ tên lệch; invalid có lý do cụ thể.
  - Có action "Tải dòng lỗi" khi có dữ liệu lỗi hỗ trợ từ backend.
  - Footer action cố định trong Card: secondary/outline "Lưu bản chấm" và primary "Công bố kết quả".
  - Click publish mở Confirmation: "Công bố kết quả cho N sinh viên?" + giải thích sinh viên sẽ nhận notification/email và xem được điểm/feedback.
  - Sau `save_draft`: Toast success "Đã lưu bản chấm"; sau publish: Toast success "Đã công bố kết quả". Nếu email có lỗi sau publish, Alert warning nêu rõ kết quả vẫn đã được công bố.
  - Thay file phải xóa preview cũ; submit state khóa action chống double-submit.

### C.10. Bảng điểm lớp — `/admin/classes/[id]/gradebook`

- **Giữ nguyên / cập nhật**: ma trận Sinh viên × Bài tập, cell điểm + trạng thái, dấu `—` khi chưa có, phân trang 2 chiều (`studentPage`, `assignmentPage`, pageSize 20), server fetch `getTeacherGradebook` nếu contract loader vẫn giữ.
- **Thay đổi thiết kế**:
  - DataTable ma trận — cột sinh viên sticky trái (MSSV `IBM Plex Mono` + tên Body Small), header bài tập Label Be Vietnam Pro truncate + tooltip.
  - Cell: điểm dùng Be Vietnam Pro weight 700 + Badge `graded` hoặc `returned`; `graded` chỉ là nội bộ GV, `returned` là đã công bố.
  - 2 Pagination chuẩn dưới chân, nhãn "Sinh viên" / "Bài tập". Mobile cuộn ngang mượt.
  - Khi quay lại từ grade import thành công, gradebook phải refresh để phản ánh trạng thái mới.

### C.11. Cài đặt thông báo —** `/admin/settings`

- **Giữ nguyên**: toggle bật/tắt email, thông tin cấu hình Brevo, gửi email thử, API PATCH/POST test.

- **Thay đổi thiết kế**: một Card default max-width 720px; Phần 1 hàng Toggle (B.15) + mô tả Body Small; Phần 2 `<dl>` trình bày dạng DataRow (label Caption / value Body); Phần 3 Button secondary icon Send "Gửi email thử nghiệm"; kết quả → Alert success/error ngay dưới nút (thay banner tự chế).

### C.12. Đăng nhập sinh viên — `/class/[code]` hoặc `/class/[code]/login` theo route triển khai

- **Cập nhật theo contract mới**:
  - Login dùng **MSSV + PIN**, không dùng nickname làm định danh đăng nhập ban đầu.
  - Sinh viên mới đăng nhập lần đầu bằng **MSSV + `111111`** và nhận session `credential_change`.
  - Giữ xác thực lớp bằng `GET /api/v1/public/class-sections/:code`, `POST /api/v1/student/auth/login`, rate-limit 429 và xử lý lớp không tồn tại.
  - Phải giữ/validate deep-link đích để sau login có thể quay lại `/class/{code}/grades?assignment={assignmentId}`.
  - Thêm link "Quên PIN?" sang `/class/[code]/forgot-pin`.
- **Thay đổi thiết kế**:
  - public-shell, card radius-xl max-width 440px; eyebrow "Đăng nhập" + H1 tên lớp + Badge info mã lớp (mono).
  - Form: Input MSSV + input PIN 6 số bí mật + Button primary full-width "Vào lớp".
  - Alert info nhỏ: "Lần đầu đăng nhập: dùng MSSV và PIN 111111. Bạn sẽ được yêu cầu đổi nickname và PIN."
  - lockout 429 → Alert error + countdown; lỗi tài khoản trả thông báo chung, tránh tiết lộ tài khoản tồn tại.
  - mã lớp sai → EmptyState error + BackLink về trang chủ.

### C.13. Route login tương thích — `/class/[code]/login`

- Route này được dùng như entrypoint login trong kế hoạch mới. Nếu codebase vẫn redirect về `/class/[code]`, phải giữ deep-link query an toàn và không làm mất đích sau đăng nhập.
- UI dùng cùng LoginCard với C.12; không tạo hai implementation khác nhau cho cùng một flow.

### C.13A. Quên PIN — `/class/[code]/forgot-pin`

- **Flow mới bắt buộc**: `MSSV → gửi OTP → nhập OTP + PIN mới`.
- Endpoint:
  - `POST /api/v1/student/auth/forgot-pin/request` với `{ classCode, mssv }`.
  - `POST /api/v1/student/auth/forgot-pin/confirm` với `{ classCode, mssv, otp, newPin }`.
- OTP 6 số, hết hạn 10 phút, dùng một lần; resend/rate-limit phải có loading/countdown rõ ràng.
- Response request không được tiết lộ tài khoản tồn tại; UI luôn dùng thông báo chung kiểu "Nếu thông tin hợp lệ, mã xác minh đã được gửi".
- Thiết kế dạng auth card 440px, step indicator 3 bước gọn; OtpInput B.3 ở bước xác minh; PIN mới + xác nhận ở bước cuối.
- Validate PIN mới không được là `111111`; hiển thị error inline + Alert tổng khi lỗi server.
- Thành công → Toast/Alert success rồi điều hướng về login, giữ deep-link nếu có.

### C.14. Onboarding sinh viên — `/class/[code]/onboarding`

- **Cập nhật theo contract mới**:
  - Sinh viên có session `credential_change` **bắt buộc đổi cả nickname và PIN** trước khi có `full` access.
  - Không cho hoàn tất nếu nickname vẫn bằng MSSV hoặc PIN vẫn là `111111`.
  - Chỉ đổi một trong hai vẫn bị giới hạn; đổi cả hai thành công mới rotate session thành `full`.
  - `PATCH /api/v1/student/auth/credentials`; giữ và validate deep-link để sau onboarding quay lại đúng trang kết quả.
- **Thay đổi thiết kế**:
  - Auth card như C.12; H1 "Hoàn tất tài khoản" + mô tả Body.
  - Luôn render cả hai nhóm field: nickname mới và PIN mới + xác nhận PIN.
  - Helper text nêu rõ nickname phải khác MSSV; PIN mới phải 6 số và khác `111111`.
  - Khi validate pass, field có thể dùng variant success; submit primary full-width "Hoàn tất".
  - Không hiển thị email/PIN mặc định trong URL hoặc log UI.

### C.15. Tổng quan sinh viên — `/class/[code]/profile`

- **Cập nhật theo Functional & Visibility Changes**:
  - Student Profile **không expose** submission metadata/file hoặc action nộp bài. Điều này là UI visibility/access rule; không yêu cầu xóa submission backend/data.
  - Progress chỉ tính Evaluation `returned`.
  - Dashboard sinh viên tập trung vào assignment và trạng thái kết quả, không có panel hạn nộp hay nút "Nộp bài".
  - Email mặc định được suy ra từ MSSV; email cá nhân chỉ trở thành email chính sau OTP xác minh.
- **Thay đổi thiết kế**:
  - Topbar: Avatar 48 + H1 "Chào [Tên]!" + Caption mã lớp · MSSV (MSSV/mã lớp dùng mono).
  - Metric strip chuyển sang các số phù hợp feedback-first, ví dụ Tổng bài / Chưa công bố / Đã công bố / % kết quả đã trả.
  - Panel "Kết quả gần đây": danh sách Card compact interactive, ưu tiên assignment `returned`; click mở đúng kết quả.
  - Panel "Đang xử lý": hiển thị các assignment đã có `graded` nhưng chưa `returned` dưới dạng trạng thái "Chưa công bố", không lộ điểm/feedback.
  - `StudentAssignmentModal`/detail modal không render submission/upload form, nút submit hoặc CTA nộp bài. Không suy diễn điều này thành xóa backend submission API/data.
  - Thêm vùng "Email nhận thông báo" trong profile/settings cá nhân: hiển thị email hiện hành + trạng thái verified/source và action "Đổi email".


### C.15A. Đổi email cá nhân — trong Student profile/settings

- Email mặc định của sinh viên mới là `{lowercase-mssv}@student.hcmute.edu.vn`.
- Email cá nhân chỉ thay email chính sau khi OTP xác minh thành công.
- Endpoint:
  - `POST /api/v1/student/profile/email-change/request` với `{ email }`.
  - `POST /api/v1/student/profile/email-change/confirm` với `{ otp }`; email mới được giữ trong challenge phía server, không gửi lại trong bước confirm.
- Flow UI: nhập email mới → gửi OTP → xác minh OTP → cập nhật email hiện hành.
- Email cũ tiếp tục nhận notification cho đến khi xác minh thành công; UI không được cập nhật optimistic thành email mới trước confirm.
- Card/dialog dùng form B.2 + OtpInput B.3; trạng thái verified hiển thị Badge success, email suy ra mặc định dùng Badge info/neutral.
- Lỗi OTP/replay/rate-limit hiển thị inline + Alert; resend có countdown/loading; thành công Toast success.

### C.16. Bài tập / Trạng thái kết quả sinh viên — `/class/[code]/assignments`

- **Cập nhật theo Functional & Visibility Changes**:
  - Không expose file nộp, submission state, upload form hoặc action nộp bài trên Student UI. Các metadata assignment khác chỉ bị loại nếu section functional khác trong tài liệu này đã quyết định rõ.
  - Draft không xuất hiện với Student.
  - Assignment `published/closed` chỉ hiển thị tên, thang điểm và trạng thái kết quả; nội dung chi tiết nằm ở LMS.
  - `graded` nếu được biểu diễn ra Student UI chỉ được hiển thị dạng **"Đang xử lý / Chưa công bố"**, tuyệt đối không lộ điểm/feedback.
- **Thay đổi thiết kế**:
  - Card default chứa danh sách row: tên bài H4 + thang điểm + Badge trạng thái kết quả.
  - `returned`: row có action "Xem kết quả" và điều hướng/open modal tương ứng.
  - Chưa có `returned`: row trung tính, có thể click xem metadata được phép nhưng **không có submission UI/CTA/upload**.
  - Empty → EmptyState chuẩn.

### C.17. Kết quả cá nhân — `/class/[code]/grades`

- **Cập nhật theo contract mới**:
  - Đây là màn hình trọng tâm của Student results.
  - Bảng/row chuẩn: **`Bài tập | Trạng thái | Điểm | Ngày công bố`**.
  - `graded` chỉ hiển thị "Đang xử lý / Chưa công bố"; **không hiển thị điểm, feedback hoặc ngày công bố**.
  - Chỉ `returned` hiển thị điểm, feedback và thời điểm công bố.
  - Hỗ trợ deep-link chính thức `/class/{code}/grades?assignment={assignmentId}`.
  - Full session mở thẳng bài; chưa login → login → quay lại đúng bài; credential_change → onboarding → quay lại đúng bài; chặn open redirect và cross-student/cross-class access.
- **Thay đổi thiết kế**:
  - Desktop ưu tiên DataTable 4 cột; mobile chuyển card row nhưng giữ cùng thông tin.
  - MSSV không cần xuất hiện trong bảng kết quả; mã assignment/Student ID không đưa vào URL ngoài `assignmentId` cần cho deep-link.
  - Row `returned` hiển thị điểm Be Vietnam Pro 700 + Badge returned; row `graded` chỉ Badge warning/info "Chưa công bố".
  - Modal chi tiết: block điểm lớn, thang điểm, ngày công bố, feedback dạng quote block viền trái accent.
  - Khi mở bằng query `assignment`, modal mở đúng bài rồi URL có thể được giữ nguyên để reload/deep-link vẫn hoạt động.

### C.18. Thông báo sinh viên — `/class/[code]/notifications`

- **Giữ nguyên / cập nhật**: polling 30s (`GET /api/v1/student/notifications?page=1&pageSize=50`), click đánh dấu đã đọc (`PATCH .../read`), empty state.
- Chỉ Evaluation `returned` tạo notification/email cho sinh viên; `graded` không được phát thông báo.
- Click notification phải mark-read và mở đúng deep-link `/class/{code}/grades?assignment={assignmentId}`.
- **Thay đổi thiết kế**:
  - Card default chứa `notification-item`; chưa đọc: chấm accent + nền secondary + Body weight 500; đã đọc: text-secondary; timestamp Caption.
  - Toàn item là button target ≥56px.
  - Header panel chỉ có "Đánh dấu tất cả đã đọc" nếu API thực sự hỗ trợ; không tự thêm endpoint.

### C.19. Student Submissions compatibility route — `/class/[code]/submissions`

- **Visibility contract**: route này **không xuất hiện trong normal Student navigation** và không có CTA/card/link từ Student dashboard, assignment list, profile, notification hoặc modal dẫn tới submission functionality.
- **Canonical wording**: **"Route retained for compatibility / internal use, but not exposed through normal Student navigation."**
- Việc ẩn route khỏi Student UI **không yêu cầu** xóa route handler, backend API, database field/table, submission data hoặc backend logic.
- Student-facing UI tại các route bình thường không được gọi submission upload/submit actions vì không có UI entry point cho các action đó.
- Teacher/backend behavior liên quan submission không được thay đổi chỉ từ requirement F.2; phải theo các Teacher functional requirements khác nếu có.

> **Canonical direct-access decision**
> Khi Student nhập trực tiếp URL `/class/[code]/submissions`, route được giữ để compatibility nhưng phải redirect về `/class/[code]/assignments`. Không xóa route handler, backend API, database table hoặc dữ liệu submission.

---

## PHẦN D — UX PATTERNS, RESPONSIVE, ACCESSIBILITY, QA

### D.1. UX Patterns toàn cục

- **Form**: label luôn phía trên control; required đánh dấu `*` error-color; validate on-blur + on-submit; lỗi inline dưới field + Alert tổng nếu lỗi server; helper text Caption; nút submit có loading state đổi nhãn theo ngữ cảnh; thành công → Toast success (mutation) hoặc điều hướng (flow).

- **Destructive actions**: luôn qua Confirmation modal (B.18), nút destructive mô tả hành động cụ thể, không dùng chữ chung chung "Xác nhận".

- **Feedback**: thành công tức thì → Toast; lỗi trong ngữ cảnh form → inline; lỗi hệ thống → Alert + retry; thông tin dài hạn → Badge/Alert inline, không Toast.

- **Điều hướng**: active state nav = gạch chân accent + weight 700; BackLink cho mọi trang sâu hơn cấp 1; Escape đóng mọi modal/popover/drawer (giữ nguyên hành vi hiện tại, mở rộng cho đồng nhất).

- **Polling & freshness**: chuông thông báo giữ polling 30s; không fetch lại dữ liệu đã có từ server component (giữ nguyên tắc spec cũ).

**- **Import & publish**: thay file phải xóa preview cũ; preview không mutation; `save_draft` và `publish` phải parse/validate lại server-side. UI không được xem preview là dữ liệu đã lưu.
- **Privacy**: `graded` là nội bộ GV; Student UI chỉ được biết trạng thái chung "chưa công bố" và chỉ `returned` mới hiển thị điểm/feedback.
- **Visibility semantics**: `hidden/not exposed` luôn mô tả presentation/access từ UI; không được dịch thành delete/deprecate backend/API/data nếu không có functional requirement riêng.
- **Credential flows**: login lần đầu bằng MSSV + `111111`, onboarding đổi cả nickname + PIN; forgot PIN và email change dùng OTP 6 số, có rate-limit/resend/countdown và thông báo không tiết lộ tài khoản tồn tại.

### D.2. Responsive Rules (thay thế hệ breakpoint rời rạc)

| Vùng | Mobile ≤480px | Tablet 481–800px | Desktop >800px |

|---|---|---|---|

| Header workspace | cao 62px, hamburger mở Drawer | như mobile | cao 70px, nav ngang |

| Gutter | 12px | 16px | 24px |

| Grid metric (4 ô) | 1 cột | 2 cột | 4 cột |

| Panel đôi | 1 cột | 1 cột | 7/5 |

| Lưới thẻ lớp | 1 cột | 1 cột | 2 cột |

| Stepper wizard | 2×2 | 2×2 | 1×4 ngang, content 760–840px căn giữa |

| DataTable | cuộn ngang + cột đầu sticky | như mobile | full; ImportPreviewTable ưu tiên 5 cột rõ ràng |

| Modal | bottom-sheet drawer | bottom-sheet drawer | centered dialog |

| Touch target | ≥44px mọi control | ≥44px | ≥34px (sm) / 42px (md) |

| Typography | Display/H1 co theo clamp, body không đổi | — | — |

Nguyên tắc: không "thu nhỏ desktop" — mỗi vùng có hành vi chủ định theo bảng trên; `prefers-reduced-motion` tắt toàn bộ transition/animation (giữ từ hệ cũ).

### D.3. Accessibility

- Contrast tối thiểu AA: text-primary trên background 13.9:1; text-secondary 7.0:1; mọi cặp soft/solid của feedback đạt ≥4.5:1 cho chữ.

- Focus-visible: outline 3px `--color-focus-ring` offset 2px trên mọi control; không xóa outline khi chưa có thay thế.

- Semantic hierarchy: đúng 1 H1/trang; heading không nhảy cấp; table có `<th scope>`; landmark `header/main/nav`.

- Icon luôn kèm label/`aria-label` (qua AppIcon); trạng thái không truyền đạt bằng màu một mình (badge luôn có chữ).

- Touch target ≥44px mobile; modal/drawer focus trap + Escape; thông báo lỗi liên kết `aria-describedby` (giữ và nhân rộng từ Input hiện tại).

### D.4. Final Quality Checklist (áp dụng trước khi nghiệm thu implement)

Trước khi dùng file này để tạo implementation plan, phải chạy consistency review như một **Design + Product Contract**, không chỉ visual QA.


- [ ] Functional changes được ghi rõ và không bị page-level wording vô tình đảo ngược.
- [ ] Visibility changes được ghi rõ; **UI-hidden ≠ feature deleted**.
- [ ] Student submission không xuất hiện ở navigation, dashboard/profile CTA, assignment list, modal/detail hoặc entry point Student khác.
- [ ] `/class/[code]/submissions` được mô tả là retained compatibility/internal route nhưng không expose trong normal Student navigation.
- [ ] Không có requirement nào yêu cầu xóa submission backend/API/data chỉ vì Student UI ẩn feature.
- [ ] Role Teacher/Student không mâu thuẫn; không tự tạo role/permission Admin mới từ prefix `/admin`.
- [ ] Mọi route phân biệt existence / navigation visibility / UI usability.
- [ ] Mọi ambiguity chưa được quyết định được đánh dấu `OPEN QUESTION / DECISION REQUIRED`, không tự suy diễn.
- [ ] Mọi trang dùng chung token Phần A — không có màu/spacing/radius hardcode.

- [ ] Mọi danh sách/bảng/panel có EmptyState, skeleton Loading, và Error state chuẩn B.18.

- [ ] Cùng một trạng thái nghiệp vụ = cùng một Badge variant ở mọi trang (B.4).

- [ ] Button/Input/Card/Table không có biến thể một lần; mọi variant có ngữ nghĩa.

- [ ] Header/nav active đúng từng cấp route; Escape đóng mọi lớp nổi.

- [ ] Modal → bottom-sheet trên mobile toàn cục; bảng cuộn ngang + cột sticky.

- [ ] Contrast AA đo kiểm trên các cặp màu chính; focus ring hiện diện 100% control.

- [ ] Chức năng, API, flow, business rule khớp 100% **contract mới feedback-first**; khi mâu thuẫn với spec cũ phải ưu tiên kế hoạch tinh gọn 2026-09-04.

- [ ] Kiểm thử 3 mốc: 375–390px, 768px, 1440px.

- [ ] Bảo mật: sinh viên chỉ thấy điểm/feedback khi `returned`; `graded` không lộ dữ liệu; không Student ID/điểm/feedback trên URL; deep-link chỉ dùng assignmentId và phải kiểm tra cross-student/cross-class; session HttpOnly cookie.

---

## PHỤ LỤC — MAPPING NHANH TỪ HỆ CŨ SANG HỆ MỚI

| Hệ cũ | Hệ mới |

|---|---|

| `--navy-900` / `--navy-700` / `--navy-100` | `--color-primary` / `--color-primary-hover` / `--color-secondary` |

| `--gold-500/600/700` (CTA) | Accent chỉ còn cho brand/focus/highlight; CTA dùng primary |

| `--gold-100` + `--gold-800` | `--color-warning-soft` + `--color-warning` |

| `--success(-soft)`, `--danger(-soft)`, `--neutral(-soft)` | `--color-success(-soft)`, `--color-error(-soft)`, `--color-neutral(-soft)` |

| Card hover shadow-md | Card interactive: chỉ đổi border accent |

| Landing hard-shadow `13px 13px 0` | Bỏ; dùng viền trái accent 3px |

| Padding 22/26px | 24/32px (thang spacing A.4) |

| Nút trang active navy + chữ vàng | Nền primary + chữ primary-foreground |

| Banner kết quả tự chế | Alert component (B.9) |

| Thông báo thành công ad-hoc | Toast component (B.9) |

| Modal trên mobile = dialog thu nhỏ | Bottom-sheet drawer (B.7/B.8) |

### Mapping bổ sung theo contract BE mới

| Hệ/flow cũ | Hệ/flow mới |
|---|---|
| Lora cho Display/H1/H2 | Bỏ hoàn toàn; Be Vietnam Pro cho heading/body/control |
| Mono cho PIN/điểm/table header | IBM Plex Mono chỉ còn MSSV/mã lớp |
| PIN ngẫu nhiên + tải CSV PIN | PIN mặc định `111111`; không trả/tải PIN thô |
| Login nickname + PIN | Login MSSV + PIN; lần đầu dùng `111111` |
| Reset PIN hiển thị PIN mới | Reset về `111111`; response không chứa PIN |
| Student submission UI | Không expose qua normal Student UI/navigation; route/backend/API/data retained unless a separate functional requirement changes them |
| Assignment có mô tả/deadline/attachment | Chỉ `title + maxScore + status` |
| Bulk grading nhập tay | Import CSV/XLSX 4 cột + preview |
| Sticky save bar | Hai action `Lưu bản chấm` / `Công bố kết quả` |
| `graded` hiển thị cho SV | Nội bộ GV; SV chỉ thấy "chưa công bố" |
| Deep-link backlog | Trở thành contract chính `/grades?assignment={id}` |

---

## FINAL SOURCE OF TRUTH DECLARATION

## FEEDBACK-FIRST TEACHER FLOW — CANONICAL

Teacher tạo Assignment chỉ nhập tên. UI dùng thang 10 ẩn và trạng thái `published` kỹ thuật để Assignment xuất hiện trong danh sách Student. Teacher nhập một file gồm `MSSV | Họ tên | Điểm | Feedback`, xem preview, sau đó chọn lưu chưa công bố hoặc công bố ngay. Bản `graded` luôn hiển thị lại trong bảng kết quả của Teacher; chỉ bản `returned` mới xuất hiện điểm và feedback trên Student UI. Attachment, deadline, submission và các ô chấm tay không được render trong UI, nhưng API/schema/database tương ứng được giữ lại cho compatibility. Teacher protected pages không dùng page header; Back chỉ là một icon 44px ở góc trái content.

Sau lần cập nhật này, **`MinBack_UI_Spec_Redesigned.md` là FINAL SOURCE OF TRUTH cho UI redesign**. `UI_REDESIGN_PLAN.md` phải được tạo bằng cách đọc file này cùng codebase để map requirement → implementation, nhưng **không được thay đổi intent của Functional & Visibility Changes**. Nếu codebase và spec khác nhau, plan phải ghi discrepancy; không tự sửa spec bằng suy đoán.
