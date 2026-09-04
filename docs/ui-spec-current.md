# MinBack — Đặc tả UI hiện tại (UI Specification)

Phiên bản: 2026-09-04. Nguồn đối chiếu: Codebase thực tế Next.js App Router (commit hiện hành).  
Mục đích: Bản chụp lại hiện trạng 100% chính xác theo source code để phục vụ redesign — KHÔNG tự thêm ý tưởng, KHÔNG cải tiến.

---

## 0. KIẾN TRÚC VÀ RANH GIỚI HỆ THỐNG

- **Student Workspace**: Prefix `/class/[code]/*`; xác thực và identity dựa trên HttpOnly cookie `StudentSession` (quản lý qua `src/server/auth/student-session.ts`). Session có 2 cấp độ: `credential_change` (buộc onboarding) và `full`.
- **Teacher/Admin Workspace**: Prefix `/admin/*`; xác thực và identity thông qua Supabase Auth SSR (`src/server/auth/teacher-auth.ts`). Chưa đăng nhập tự động redirect `/admin/login`.
- **Public & Auth Routes**: Không render `WorkspaceHeader`. Nền sử dụng `public-shell` với radial gradient gold nhẹ trên nền surface.
- **Rendering & Data Fetching Model**:
  - Initial data được tải hoàn toàn ở Server Component / service layer (`server-only`).
  - Client-side fetch chỉ dùng cho mutation (POST/PATCH/PUT/DELETE), polling thông báo (`useNotificationPolling`), search debounce (`useRouter().replace`), upload file (Cloudinary qua signed URL), và trigger re-render (`router.refresh()`).
- **Styling Architecture**: Dự án KHÔNG sử dụng Tailwind CSS. Dự án sử dụng **Vanilla CSS thuần** tập trung trong file `src/app/globals.css` (2689 dòng) kết hợp CSS custom properties (variables) và các class tiện ích BEM-like/utility-hybrid.
- **Lưu ý chuyển tiếp (Feedback-first)**: UI hiện tại vẫn còn code và component phục vụ cho submission, upload file và attachment từ sinh viên và giảng viên. Các trang này vẫn tồn tại trong code và được chụp lại đầy đủ bên dưới.

---

## PHẦN 1 — DESIGN TOKENS CHUNG (TỪ `globals.css` & `src/app/layout.tsx`)

### 1.1. Bảng màu (Color Tokens)
Hệ thống màu được khai báo tại `:root` trong `src/app/globals.css`. Hiện tại codebase CHỈ CÓ 1 THEME (Light theme phong cách Academic Editorial), chưa có dark mode riêng biệt.

| Tên biến CSS | Mã HEX / RGBA | Vai trò trực quan |
|---|---|---|
| `--navy-900` | `#1e3a4a` | Màu nhận diện chính, nền header, heading chính, primary button text |
| `--navy-700` | `#2c5468` | Hover background, border header, secondary navy, text phụ |
| `--navy-100` | `#e7eef1` | Row hover table, background badge info/published, ghost button hover |
| `--gold-500` | `#f5b400` | Accent vàng kim, nút CTA chính, brand mark, focus indicator |
| `--gold-600` | `#dfa300` | Hover trạng thái nút primary/accent |
| `--gold-700` | `#c99200` | Active (click) trạng thái nút primary |
| `--gold-800` | `#8a5a00` | Chữ cảnh báo, eyebrow label, status pending text |
| `--gold-100` | `#fff3cc` | Background thông báo (notice), badge warning/pending |
| `--surface` | `#fbfaf7` | Canvas background toàn trang (màu kem sáng) |
| `--surface-raised` | `#ffffff` | Background thẻ card, table container, dialog modal, input |
| `--surface-subtle` | `#f3f6f7` | Background disabled button, table header `th`, skeleton placeholder |
| `--text-primary` | `#16303d` | Màu chữ nội dung chính, độ tương phản cao |
| `--text-secondary` | `#2c5468` | Màu chữ nhãn phụ, mô tả, timestamp, metadata |
| `--text-disabled` | `#7b898f` | Màu chữ disabled |
| `--border` | `#e1e6e9` | Viền kẻ thẻ card, đường phân cách table, viền input form |
| `--success` | `#417a61` | Màu xanh lá trạng thái thành công, bài tập đã nộp/đã chấm |
| `--success-soft` | `#e5f1eb` | Nền xanh lá nhạt cho badge success/graded |
| `--danger` | `#b55249` | Màu đỏ trạng thái lỗi, nút danger, xóa lớp, deadline gấp |
| `--danger-soft` | `#f8e8e6` | Nền đỏ nhạt cho thông báo lỗi, badge danger |
| `--neutral` | `#56666e` | Màu xám trung tính cho trạng thái đóng (closed) |
| `--neutral-soft` | `#f1f3f4` | Nền xám nhạt cho badge closed |
| `--header-text` | `#fbfaf7` | Màu chữ trên nền header tối |
| `--header-muted` | `#c9d4d9` | Màu icon và nhãn inactive trên header |
| `--focus-ring` | `rgba(245, 180, 0, 0.45)` | Viền focus-visible (outline 3px) |
| `--overlay` | `rgba(22, 48, 61, 0.48)` | Nền backdrop khi mở modal |
| `--shadow-color` | `rgba(30, 58, 74, 0.12)` | Màu bóng đổ cơ sở |

### 1.2. Typography
Khai báo tại `src/app/layout.tsx` sử dụng `next/font/google`:
- **Body Font (`--font-body`)**: `Be_Vietnam_Pro` (subsets: `latin`, `vietnamese`), font weights sử dụng: `400`, `500`, `600`, `700`. Size cơ sở: `15px`, line-height `1.55`.
- **Display / Heading Font (`--font-display`)**: `Lora` (subsets: `latin`, `vietnamese`), font weights: `500`, `600`, `700`. Letter-spacing `-0.035em`, line-height `1.12`. Sử dụng cho `h1`, `h2`, `h3`, `.wordmark`, `.brand-lockup`.
- **Monospace Font (`--font-mono`)**: `IBM_Plex_Mono` (subsets: `latin`, `vietnamese`), font weights: `400`, `500`, `600`. Dùng cho MSSV, mã lớp, PIN, step counter, eyebrow tag, table header.
- **Heading Scale**:
  - `h1`: `clamp(2rem, 4vw, 3.5rem)`
  - `h2`: `clamp(1.35rem, 2vw, 2rem)`
  - `h3`: `1.12rem`
  - `.eyebrow`, `.auth-eyebrow`: `0.73rem`, uppercase, letter-spacing `0.12em`
  - `.wordmark`: `1.35rem`, weight `700`, letter-spacing `-0.05em`

### 1.3. Spacing Scale
- Layout gutter desktop: `24px` (hai bên màn hình, `width: calc(100% - 48px)`).
- Layout gutter mobile: `16px` hoặc `12px` (`width: calc(100% - 32px)` hoặc `calc(100% - 24px)`).
- Workspace main padding: `44px 0 72px` (desktop), `30px 0` (mobile).
- Card padding: `22px` (card chuẩn), `26px` (modal), `clamp(26px, 6vw, 48px)` (auth-card).
- Common gaps: `4px` (tabs, nav links), `8px` (icon + label, tags), `10px` (avatar cluster), `12px` (control groups), `16px` (grid gap, form fields), `20px` (stack chuẩn), `24px` (bố cục lớn), `36px` (header elements).

### 1.4. Border-radius Scale
- `--radius-control`: `8px` (nút button, ô nhập input/select/textarea, tab con).
- `--radius-card`: `12px` (thẻ card, khung table wrap, panel container, mobile nav drawer).
- `--radius-dialog`: `16px` (hộp thoại modal, auth-wrap card).
- Badge / Pill: `999px` (viền bo tròn hoàn toàn).
- Brand mark icon box: `9px 9px 9px 2px` (bo góc bất đối xứng đặc trưng của MinBack).

### 1.5. Shadow / Elevation Scale
- `--shadow-sm`: `0 1px 2px rgba(30, 58, 74, 0.08)` (card tĩnh).
- `--shadow-md`: `0 10px 28px rgba(30, 58, 74, 0.12)` (card hover, modal dialog, popover).
- `--shadow-lg`: `0 20px 56px rgba(30, 58, 74, 0.16)`.
- Landing preview box shadow: `13px 13px 0 var(--gold-500)` (mobile: `8px 8px 0 var(--gold-500)`).

### 1.6. Responsive Breakpoints
Hệ thống sử dụng các mốc media query CSS trực tiếp:
- **`max-width: 800px`** (Chuyển đổi giao diện chính giữa Desktop và Tablet/Mobile):
  - Ẩn `workspace-nav-desktop`, `header-logout`, `workspace-role-label`.
  - Hiển thị nút hamburger `mobile-menu-toggle` (38x38px) và menu trượt dạng panel `workspace-mobile-panel`.
  - Giảm gutter màn hình (`calc(100% - 32px)`).
  - Chuyển `lp-hero`, `teacher-class-grid`, `class-overview-grid`, `student-dashboard-panels` từ 2 cột sang 1 cột.
  - Chuyển `teacher-metrics-grid` và `student-summary-strip` thành grid 2 cột.
- **`max-width: 720px`**: Chuyển wizard tạo lớp `class-create-stepper` thành grid 2x2.
- **`max-width: 480px`** (Mobile nhỏ):
  - Chiều cao header giảm còn `62px`.
  - Gutter giảm xuống `calc(100% - 24px)`.
  - Grid số liệu metric chuyển về 1 cột duy nhất.
  - Landing preview shadow co về `8px 8px 0`.
- **`prefers-reduced-motion: reduce`**: Tắt toàn bộ transition và animation.

### 1.7. Icon Set
- Sử dụng thư viện `lucide-react` (phiên bản `^1.38.0`).
- Được chuẩn hóa qua wrapper component `AppIcon` (`src/components/ui/app-icon.tsx`) với strokeWidth cố định `1.8`.

---

## PHẦN 2 — SHARED COMPONENTS (`src/components/ui/**`)

### 2.1. Button
- **File:** `src/components/ui/button.tsx`
- **Props:**
  - `variant`: `"primary"` (default) | `"secondary"` | `"ghost"` | `"danger"`
  - `size`: `"md"` (default) | `"sm"`
  - `loading`: `boolean` (default `false`)
  - Kế thừa mọi `ButtonHTMLAttributes<HTMLButtonElement>`
- **Visual & States:**
  - Kích thước: `min-height: 42px`, padding `9px 15px`, radius `8px`, font-weight `700`. Size `sm`: `min-height: 34px`, padding `6px 10px`.
  - `primary`: Background `--gold-500`, chữ `--text-primary`. Hover: background `--gold-600`, translateY(-1px). Active: background `--gold-700`.
  - `secondary`: Nền trắng `--surface-raised`, viền `--border`, chữ `--navy-900`.
  - `ghost`: Nền trong suốt, chữ `--navy-700`. Hover: nền `--navy-100`.
  - `danger`: Nền `--danger` (`#b55249`), chữ trắng.
  - `disabled` hoặc `loading`: Nền `--surface-subtle`, chữ `--text-disabled`, con trỏ `not-allowed`, không transform. Khi loading hiển thị chữ `"Đang xử lý…"`.
- **Code JSX thực tế:**
```tsx
<button
  className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${className}`}
  disabled={disabled || loading}
  {...props}
>
  {loading ? "Đang xử lý…" : children}
</button>
```

### 2.2. AppIcon
- **File:** `src/components/ui/app-icon.tsx`
- **Props:**
  - `name`: `AppIconName` (`"bell"`, `"book"`, `"calendar"`, `"check"`, `"classes"`, `"clock"`, `"download"`, `"eye"`, `"fileCheck"`, `"gradebook"`, `"home"`, `"logout"`, `"search"`, `"settings"`, `"star"`, `"students"`, `"study"`, `"upload"`, `"close"`)
  - `size`: `number` (default `18`)
  - `label`: `string` (optional, nếu có gán `aria-label`, nếu không gán `aria-hidden="true"`)
- **Code JSX thực tế:**
```tsx
<Icon
  aria-hidden={label ? undefined : true}
  aria-label={label}
  size={size}
  strokeWidth={1.8}
/>
```

### 2.3. Avatar
- **File:** `src/components/ui/avatar.tsx`
- **Props:**
  - `name`: `string` (họ tên đầy đủ để cắt lấy 2 chữ cái viết tắt cuối cùng)
  - `size`: `number` (default `48` px)
- **Visual:** Render thẻ `<span className="avatar">` với style inline width/height bằng `size`.
- **Code JSX thực tế:**
```tsx
<span
  className="avatar"
  style={{ width: size, height: size }}
  aria-label={name}
>
  {initials}
</span>
```

### 2.4. Badge
- **File:** `src/components/ui/badge.tsx`
- **Props:**
  - `variant`: `string` (default `"info"`, nhận các giá trị `"info"`, `"success"`, `"graded"`, `"warning"`, `"pending"`, `"danger"`, `"draft"`, `"published"`, `"closed"`, `"returned"`, v.v.)
  - `children`: `ReactNode`
- **Visual:** Bo tròn pill `border-radius: 999px`, padding `4px 8px`, font-size `0.75rem`, font-weight `700`.
  - `badge-info`, `badge-published`: Nền `--navy-100`, chữ `--navy-700`.
  - `badge-success`, `badge-graded`: Nền `--success-soft`, chữ `--success`.
  - `badge-warning`, `badge-pending`, `badge-amber`: Nền `--gold-100`, chữ `--gold-800`.
  - `badge-danger`: Nền `--danger-soft`, chữ `--danger`.
  - `badge-draft`: Nền trắng, viền `--border`, chữ `--navy-700`.
  - `badge-closed`: Nền `--neutral-soft`, chữ `--neutral`.
  - `badge-returned`: Nền `--navy-900`, chữ `--header-text`.
- **Code JSX thực tế:**
```tsx
<span className={`badge badge-${variant}`}>{children}</span>
```

### 2.5. Card
- **File:** `src/components/ui/card.tsx`
- **Props:**
  - `hover`: `boolean` (optional, thêm hiệu ứng hover nâng card)
  - `glass`: `boolean` (optional)
  - `className`: `string`
- **Visual:** Nền trắng `--surface-raised`, viền 1px `--border`, bo góc 12px `--radius-card`, đổ bóng `--shadow-sm`, padding `22px`. Khi hover (`card-hover`): viền chuyển `--gold-500`, bóng `--shadow-md`.
- **Code JSX thực tế:**
```tsx
<div
  className={`card ${hover ? "card-hover" : ""} ${glass ? "glass" : ""} ${className}`}
  {...props}
/>
```

### 2.6. DataTable
- **File:** `src/components/ui/data-table.tsx`
- **Props:**
  - `columns`: mảng object `{ key: string, header: string, render: (row: T) => ReactNode }`
  - `data`: mảng dữ liệu `T[]`
  - `getKey`: hàm trích xuất string key duy nhất `(row: T) => string`
- **Visual:** Bọc trong `.table-wrap` (overflow-x auto, viền bo 12px). Thẻ `th` có nền `--surface-subtle`, chữ in hoa font mono `0.7rem`. Dòng `tr` khi hover có background `--navy-100`.
- **Code JSX thực tế:**
```tsx
<div className="table-wrap">
  <table>
    <thead>
      <tr>{columns.map(col => <th key={col.key}>{col.header}</th>)}</tr>
    </thead>
    <tbody>
      {data.map(row => (
        <tr key={getKey(row)}>
          {columns.map(col => <td key={col.key}>{col.render(row)}</td>)}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### 2.7. Dropdown
- **File:** `src/components/ui/dropdown.tsx`
- **Props:** `label: string`, kế thừa `SelectHTMLAttributes<HTMLSelectElement>`.
- **Visual:** Bọc trong label `.form-field`. Ô select bo góc 8px, viền `--border`, min-height `43px`, focus viền vàng gold và outline ring.
- **Code JSX thực tế:**
```tsx
<label className="form-field">
  <span>{label}</span>
  <select {...props}>{children}</select>
</label>
```

### 2.8. Input
- **File:** `src/components/ui/input.tsx`
- **Props:** `label: string`, `hint?: string`, `error?: string`, kế thừa `InputHTMLAttributes<HTMLInputElement>`.
- **Visual:** Chứa nhãn `.form-label`, chú thích mờ `.form-label-hint`, ô nhập `.input`, và thông báo lỗi màu đỏ `.form-error` ở dưới cùng. Có hỗ trợ `aria-invalid` và `aria-describedby`.
- **Code JSX thực tế:**
```tsx
<label className="form-field" htmlFor={id}>
  <span className="form-label">{label}</span>
  {hint ? <span className="form-label-hint">{hint}</span> : null}
  <input
    className="input"
    id={id}
    aria-invalid={Boolean(error)}
    aria-describedby={error ? `${id}-error` : undefined}
    {...props}
  />
  {error ? <span className="form-error" id={`${id}-error`}>{error}</span> : null}
</label>
```

### 2.9. Modal
- **File:** `src/components/ui/modal.tsx`
- **Props:** `open: boolean`, `onClose: () => void`, `title: string`, `size?: "sm" | "md" | "lg"` (tương ứng `440px`, `640px`, `860px`, default `640px`), `children: ReactNode`.
- **Behavior & Visual:**
  - Render bằng React `createPortal` vào `document.body`.
  - Backdrop `.modal-backdrop` cố định fixed inset 0, nền `var(--overlay)` kết hợp `backdrop-filter: blur(4px)`. Click ra ngoài tự đóng.
  - Hộp thoại `.modal-content` bo góc 16px, đổ bóng lớn `--shadow-md`, max-height `min(780px, 92vh)`, scroll dọc nội dung.
  - Bắt sự kiện phím `Escape` để đóng; có Focus Trap giữ phím `Tab` tuần hoàn bên trong modal.
- **Code JSX thực tế:**
```tsx
createPortal(
  <div className="modal-backdrop modal-overlay" role="presentation" onMouseDown={...}>
    <div className={`modal modal-content modal-${size} stack`} role="dialog" aria-modal="true" ref={panelRef} tabIndex={-1}>
      <div className="modal-header split">
        <h2 id="modal-title">{title}</h2>
        <button className="modal-close btn btn-ghost" onClick={onClose} aria-label="Đóng">
          <AppIcon name="close" />
        </button>
      </div>
      {children}
    </div>
  </div>,
  document.body
)
```

### 2.10. NotificationBell
- **File:** `src/components/ui/notification-bell.tsx`
- **Props:** `unreadCount: number`, `notifications: NotificationDto[]`, `onMarkRead: (id: string) => void`.
- **Visual:** Nút icon chuông (`AppIcon name="bell"`), badge đỏ hiển thị số lượng chưa đọc. Khi click mở popup Card `.notification-popover` chứa danh sách thông báo hoặc dòng "Chưa có thông báo".

### 2.11. OtpInput
- **File:** `src/components/ui/otp-input.tsx`
- **Props:** `value: string`, `onChange: (val: string) => void`, `disabled?: boolean`, `length?: number` (default `6`).
- **Visual & Interaction:**
  - Chứa 6 ô input độc lập (`.otp-digit`), mỗi ô rộng `40px`, cao `48px`, căn giữa text, có thuộc tính bảo mật `-webkit-text-security: disc`.
  - Tự động nhảy focus sang ô tiếp theo khi nhập số; tự động lùi ô khi bấm Backspace hoặc mũi tên trái/phải.
  - Hỗ trợ paste chuỗi số 6 ký tự: tự động phân bổ vào từng ô.
- **Code JSX thực tế:**
```tsx
<div className="otp-input" onPaste={...}>
  {Array.from({ length }, (_, index) => (
    <input
      key={index}
      aria-label={`Chữ số PIN ${index + 1}`}
      className="otp-digit"
      inputMode="numeric"
      type="tel"
      maxLength={1}
      value={value[index] ?? ""}
      onChange={...}
      onKeyDown={...}
    />
  ))}
</div>
```

### 2.12. Pagination
- **File:** `src/components/ui/pagination.tsx`
- **Props:** `page: number`, `pageSize: number`, `total: number`, `onPageChange: (p: number) => void`, `onPageSizeChange?: (size: number) => void`, `pageSizeOptions?: number[]` (default `[20, 50, 100]`), `disabled?: boolean`.
- **Visual:**
  - Bên trái: Text thông tin `"Hiển thị X–Y trên tổng số Z sinh viên"`, kèm dropdown chọn số mục trên trang nếu có `onPageSizeChange`.
  - Bên phải: Cụm nút chuyển trang với icon `ChevronsLeft`, `ChevronLeft`, các số trang và dấu `…` (`.pagination-ellipsis`), `ChevronRight`, `ChevronsRight`.
  - Nút trang active có nền `--navy-900`, chữ vàng `--gold-400`.
- **Code JSX thực tế:**
```tsx
<nav aria-label="Phân trang danh sách" className="pagination-wrap">
  <div className="pagination-info">...</div>
  <div className="pagination-controls">
    {/* Các nút first/prev/numbers/next/last */}
  </div>
</nav>
```

### 2.13. ProgressBar
- **File:** `src/components/ui/progress-bar.tsx`
- **Props:** `value: number`, `max?: number` (default `100`), `showLabel?: boolean` (default `false`).
- **Visual:** Khung rãnh `.progress-track` có nền nhạt, thanh fill `.progress-fill` bên trong tính theo tỷ lệ `%`, chiều cao thanh bo tròn.
- **Code JSX thực tế:**
```tsx
<div className="progress-stack">
  <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
    <div className="progress-fill" style={{ width: `${percentage}%` }} />
  </div>
  {showLabel ? <small className="muted">{percentage}%</small> : null}
</div>
```

### 2.14. SearchInput
- **File:** `src/components/ui/search-input.tsx`
- **Props:** `value: string`, `onChange: (val: string) => void`, `placeholder?: string` (default `"Tìm kiếm…"`).
- **Code JSX thực tế:**
```tsx
<input
  className="input"
  type="search"
  value={value}
  placeholder={placeholder}
  aria-label={placeholder}
  onChange={(event) => onChange(event.target.value)}
/>
```

### 2.15. StatCard
- **File:** `src/components/ui/stat-card.tsx`
- **Props:** `value: ReactNode`, `label: string`, `children?: ReactNode`.
- **Visual:** Card chứa số liệu in đậm lớn `<strong>`, nhãn mô tả xám `.muted` ở dưới.

### 2.16. Tabs
- **File:** `src/components/ui/tabs.tsx`
- **Props:** `tabs: Array<{ id: string; label: string }>`, `activeTab: string`, `onTabChange: (id: string) => void`.
- **Visual:** Khung `.tabs` có `role="tablist"`. Nút active mang class `.tab-active` với viền gạch dưới hoặc highlight.

### 2.17. Toggle
- **File:** `src/components/ui/toggle.tsx`
- **Props:** `checked: boolean`, `onChange: (val: boolean) => void`, `label: string`, `disabled?: boolean`.
- **Visual:** Render `<input type="checkbox" role="switch">` nằm cạnh nhãn text trong cụm `.cluster`.

---

## PHẦN 3 — LAYOUT KHUNG CHUNG

### 3.1. Teacher Workspace Layout
- **File:** `src/app/admin/(protected)/layout.tsx`
- **Cấu trúc:**
  ```tsx
  <div className="workspace-page teacher-workspace">
    <WorkspaceHeader role="teacher" />
    <main className="workspace-main">{children}</main>
  </div>
  ```
- **Xác thực Server:** Gọi `requireTeacher()`. Nếu ném lỗi `ApiError` code `UNAUTHENTICATED` thì tự động `redirect("/admin/login")`.
- **Header (`WorkspaceHeader role="teacher"`):**
  - Chiều cao tối thiểu 70px, dính trên cùng (`sticky top: 0, z-index: 20`), nền xanh đen `--navy-900`, viền dưới `--navy-700`.
  - Bên trái: Brand wordmark (icon mũ cử nhân `GraduationCap` trong ô vàng + chữ "MinBack") liên kết tới `/admin/dashboard`.
  - Giữa: Desktop Nav gồm 3 mục:
    1. **Tổng quan** (`/admin/dashboard` - Icon `LayoutDashboard`)
    2. **Lớp học** (`/admin/classes` - Icon `Users`, giữ active nếu pathname bắt đầu bằng `/admin/classes`)
    3. **Cài đặt** (`/admin/settings` - Icon `Settings`)
  - Bên phải:
    - Nhãn role: `"Giảng viên"` (chữ mono in hoa).
    - Nút Đăng xuất: gọi `POST /api/v1/teacher/auth/logout` rồi điều hướng về `/admin/login`.
    - Nút Hamburger Toggle: hiện khi màn hình `<= 800px`.
- **Mobile Navigation Drawer (`<= 800px`):** Panel nền `--navy-900` trượt xuống ngay dưới header, bo góc 12px, chứa 3 link điều hướng lớn và nút đăng xuất. Nhấn phím `Escape` hoặc click vào link sẽ tự động đóng.

### 3.2. Teacher Class Sub-Layout (Ngữ cảnh Lớp học phần)
- **File:** `src/app/admin/(protected)/classes/[id]/layout.tsx`
- **Cấu trúc:** Bọc quanh tất cả các trang con của một lớp học:
  ```tsx
  <div className="class-section-layout">
    <ClassContextNav classSectionId={id} code={section.code} name={section.name} />
    <div className="class-section-content">{children}</div>
  </div>
  ```
- **Component `ClassContextNav` (`src/components/class-sections/teacher/class-context-nav.tsx`):**
  - Nút quay lại: `<Link href="/admin/classes"> ← Danh sách lớp học</Link>`.
  - Khối tiêu đề: Huy hiệu mã lớp `.class-code-badge` (nền vàng gold, chữ navy) đặt cạnh tiêu đề tên lớp `h1.class-name-heading`.

### 3.3. Student Workspace Layout
- **File:** `src/app/class/[code]/(workspace)/layout.tsx` và `src/components/layout/student/student-workspace.tsx`
- **Cấu trúc:**
  ```tsx
  <StudentWorkspaceContext.Provider value={{ profile, loading, error, refresh }}>
    <div className="workspace-page student-workspace">
      <WorkspaceHeader classCode={canonicalCode} role="student" />
      <main className="workspace-main">{children}</main>
    </div>
  </StudentWorkspaceContext.Provider>
  ```
- **Xác thực Server & Phục hồi phiên:**
  - Kiểm tra `requireFullStudentSession()`. Nếu session chưa đủ quyền (cần đổi PIN/nickname), redirect `/class/[code]/onboarding`.
  - Canonicalize mã lớp: Nếu mã lớp trên URL không khớp với `classSectionId` trong cookie, hệ thống tự redirect về đúng URL chuẩn của sinh viên.
  - Tải trước toàn bộ `StudentProfileDto` từ server và truyền qua React Context `useStudentWorkspace()`.
- **Header (`WorkspaceHeader role="student"`):**
  - Menu Items:
    1. **Tổng quan** (`/class/[code]/profile` - Icon `LayoutDashboard`)
    2. **Bài tập** (`/class/[code]/assignments` - Icon `BookOpen`)
    3. **Thông báo** (`/class/[code]/notifications` - Icon `Bell`)
  - Chuông thông báo header (`StudentNotificationBell`): Sử dụng hook `useNotificationPolling` tự động kiểm tra thông báo mới. Hiển thị chấm đỏ nếu có tin chưa đọc. Click mở popover hiển thị tối đa 3 thông báo mới nhất kèm link "Xem tất cả".
  - Nhãn mã lớp: Hiển thị mã lớp (VD: `SWE201_02`).
  - Nút Đăng xuất: gọi `POST /api/v1/student/auth/logout` rồi đưa về `/class/[code]/login`.

---

## PHẦN 4 — ĐẶC TẢ TỪNG TRANG (19 ROUTES HIỆN HÀNH)

---

### 1. Trang chủ (Landing Page) — `/`
- **File:** `src/app/page.tsx`
- **Mục đích:** Giới thiệu nền tảng MinBack cho sinh viên tra cứu lớp và dẫn lối đăng nhập cho giảng viên.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:**
  - Container chính: `<main className="landing-page">`
  - Khối 1 — Header công khai: `<header className="public-header">` gồm Wordmark bên trái và nút giảng viên `<Link className="btn btn-secondary" href="/admin/login">` bên phải.
  - Khối 2 — Hero 2 cột: `<section className="lp-hero">`
    - Cột trái: Pill tag `<p className="lp-pill">Hồ sơ học tập theo từng lớp học phần</p>`, Tiêu đề `<h1>Một nơi rõ ràng<br />cho từng tiến bộ.</h1>`, Mô tả `<p className="lead">`, Form tra cứu `<ClassLookupForm />`, Ghi chú bảo mật `<p className="hero-note">` có icon `LockKeyhole`.
    - Cột phải: Khối xem trước `<div className="landing-preview">` đổ bóng vàng `13px 13px 0`, hiển thị 4 hàng dữ liệu mô phỏng (Lớp: SWE201, Đã chấm: 7/9, Điểm gần nhất: 8.5, Nhận xét mới: 2 thông báo).
  - Khối 3 — Nguyên tắc cốt lõi: `<section className="landing-principles">` gồm 3 thẻ `<article>` (Một hồ sơ một lớp, Phản hồi có ngữ cảnh, Thiết kế riêng tư).
- **Component con sử dụng:**
  - `ClassLookupForm` (`src/components/auth/student/class-lookup-form.tsx`)
- **API gọi trên trang này:** Không gọi API trực tiếp (Client navigation thuần).
- **Form / Input:**
  - Ô nhập mã lớp trong `ClassLookupForm`: `<input placeholder="Nhập mã lớp học phần, ví dụ: SWE201_02" autoCapitalize="characters" />`.
  - Nút submit: `<button className="btn btn-primary" type="submit">Vào lớp →</button>`, bị disable nếu chuỗi rỗng.
  - Khi submit: Chuyển trang client-side `router.push("/class/" + encodeURIComponent(code.trim().toUpperCase()))`.
- **Empty state:** Không có.
- **Responsive:** Khi `<= 800px`, `lp-hero` và `landing-principles` chuyển từ 2/3 cột sang 1 cột xếp chồng dọc.

---

### 2. Đăng nhập Giảng viên — `/admin/login`
- **File:** `src/app/admin/(auth)/login/page.tsx`
- **Mục đích:** Cung cấp biểu mẫu xác thực bằng Email/Mật khẩu cho giảng viên vào hệ thống quản lý.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:** Căn giữa màn hình trong thẻ `<main className="public-shell">` chứa `<Card className="auth-wrap stack">`. Bên trong gồm header có link quay về trang chủ, tiêu đề `h1` "Đăng nhập giảng viên", mô tả `.muted`, form `TeacherLoginForm`, và footer link "Về trang chủ MinBack".
- **Component con sử dụng:**
  - `TeacherLoginForm` (`src/components/auth/teacher/teacher-login-form.tsx`)
  - `Card` (`src/components/ui/card.tsx`)
- **API gọi trên trang này:**
  - `POST /api/v1/teacher/auth/login`
  - Trigger: Khi submit form.
  - Payload: `{ email: string, password: string }`.
  - Response xử lý: Nếu status 200 OK -> `router.push("/admin/dashboard")`. Nếu lỗi (401, 400, 500) -> hiển thị thông báo lỗi inline qua thẻ `<p className="form-error">{error}</p>`. Nút submit chuyển trạng thái loading "Đang đăng nhập…".
- **Form / Input:**
  - Email: `<input id="email" type="email" required autoComplete="email" />`
  - Password: `<input id="password" type="password" required autoComplete="current-password" />`
  - Nút submit: `<button type="submit" className="button" disabled={loading}>`
- **Empty state:** Không áp dụng.
- **Responsive:** Trên mobile co padding thẻ card theo `clamp(26px, 6vw, 48px)`.

---

### 3. Bảng điều khiển Tổng quan Giảng viên — `/admin/dashboard`
- **File:** `src/app/admin/(protected)/dashboard/page.tsx`
- **Mục đích:** Màn hình điều khiển trung tâm hiển thị KPI tổng quan, danh sách bài tập cần chấm gấp, tiến độ các lớp và dòng hoạt động chấm điểm gần đây.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh kết nối dữ liệu server.
- **Bố cục:**
  - Container: `<div className="teacher-dash">`
  - Khối 1: Tiêu đề trang `<header className="teacher-dash-header">` kèm icon `study`.
  - Khối 2 — Metric Grid: `<div className="teacher-metrics-grid">` chứa 4 ô `DashboardMetric`:
    1. Lớp (icon `classes`, tone `blue`)
    2. Sinh viên (icon `students`, tone `green`)
    3. Bài mở (icon `book`, tone `amber`)
    4. Đã chấm (icon `check`, tone `violet`, hiển thị %)
  - Khối 3 — Cột đôi Panels: `<div className="teacher-overview-panels">`
    - Cột trái: `<section className="overview-panel">` chứa "Bài cần chấm", danh sách thẻ `pending-grading-card` có badge mã lớp, hạn chốt, tên bài và số bài nộp chờ chấm. Click dẫn tới màn hình chấm bài.
    - Cột phải: `<section className="overview-panel">` chứa "Tiến độ chấm theo lớp", danh sách dòng lớp học kèm vòng tròn % `MiniProgressRing` và thanh `ProgressBar`.
  - Khối 4 — Dòng hoạt động: `<section className="overview-panel activity-panel">` chiếm toàn bộ chiều rộng, hiển thị feed chấm bài/nộp bài kèm phân trang client (5 mục/trang).
- **Component con sử dụng:**
  - `TeacherOverviewDashboard` (`src/components/class-sections/teacher/teacher-overview-dashboard.tsx`)
  - `Card`, `ProgressBar`, `AppIcon`
- **API & Dữ liệu:**
  - Server fetch: `getTeacherDashboardOverview({ classPage })` từ `teacher-dashboard-service.ts`.
  - Phân trang tiến độ lớp đổi qua URL query `?classPage=N`.
- **Empty state:**
  - Không có bài cần chấm: `<p className="muted">Không có bài tập nào đang chờ chấm.</p>`
  - Chưa có lớp: `<p className="muted">Chưa có lớp học nào.</p>`
  - Chưa có hoạt động: `<p className="muted">Chưa có hoạt động nào.</p>`
- **Responsive:** Khi `<= 800px`, lưới 2 cột panels chuyển thành 1 cột dọc; metrics grid chuyển thành 2 cột.

---

### 4. Danh sách Lớp học phần — `/admin/classes`
- **File:** `src/app/admin/(protected)/classes/page.tsx`
- **Mục đích:** Danh sách thẻ lớp học phần của giảng viên, hỗ trợ tìm kiếm theo mã/tên lớp và phân trang.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:**
  - Tiêu đề "Lớp học phần" có eyebrow "Quản lý lớp học".
  - Dải 4 chỉ số metric tổng quan: Tổng số lớp, tổng sinh viên, tổng bài tập mở, tỷ lệ đã chấm trung bình.
  - Thanh công cụ: Ô tìm kiếm `SearchInput` (max-width 400px) bên trái và nút `+ Tạo lớp mới` (`.btn.btn-primary`) bên phải.
  - Lưới thẻ lớp học: `<div className="teacher-class-grid">` hiển thị danh sách `teacher-class-card` (mã lớp badge info, vòng tròn tiến độ MiniProgressRing, tên lớp, số lượng SV & bài tập, thanh ProgressBar).
  - Phân trang ở chân trang: Nút "Trang trước", summary `X / Y`, "Trang sau".
- **Component con sử dụng:**
  - `ClassSummaryDashboard` (`src/components/class-sections/teacher/class-summary-dashboard.tsx`)
  - `SearchInput`, `Card`, `ProgressBar`, `AppIcon`
- **API & Tương tác:**
  - Server load: `getTeacherClassSectionSummaries({ page, pageSize: 6, search })`.
  - Tìm kiếm client debounce 300ms, tự động cập nhật URL `?q=...`.
- **Empty state:**
  - Khi không tìm thấy lớp: Thẻ `.teacher-empty-state` chứa icon classes màu xanh và text `"Chưa có lớp phù hợp. Tạo lớp đầu tiên để bắt đầu."`.
- **Responsive:** Lưới thẻ lớp chuyển từ 2 cột sang 1 cột khi `<= 800px`.

---

### 5. Tạo lớp học phần mới (Wizard 4 bước) — `/admin/classes/new`
- **File:** `src/app/admin/(protected)/classes/new/page.tsx`
- **Mục đích:** Quy trình wizard 4 bước thiết lập lớp học mới và nhập danh sách sinh viên từ file Excel/CSV.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh với đầy đủ kiểm tra bảo mật PIN.
- **Bố cục:**
  - Khung bao: `<div className="stack">` chứa `<div className="class-create-wizard">`.
  - Thanh chỉ báo bước: `<ol className="class-create-stepper">` gồm 4 bước:
    1. Thông tin lớp -> 2. Danh sách sinh viên -> 3. Xác nhận -> 4. Hoàn tất.
  - **Bước 1 — details:** Form nhập Mã lớp (uppercase) và Tên lớp. Validation client dùng `classSectionCreateSchema` (Zod).
  - **Bước 2 — roster:** Khu vực tải tệp sinh viên (.csv, .xlsx). Có nút "Kiểm tra tệp", bảng xem trước số lượng hợp lệ/lỗi, và nút "Bỏ qua bước này (chưa có danh sách)".
  - **Bước 3 — review:** Thẻ tóm tắt thông tin lớp và tổng số sinh viên sẽ được tạo. Nút bấm "Xác nhận tạo lớp".
  - **Bước 4 — complete:** Thông báo thành công, nút tải file CSV chứa PIN khởi tạo (`downloadPins()`), cảnh báo `beforeunload` chặn rời trang nếu chưa bấm tải PIN, và link dẫn vào lớp vừa tạo.
- **Component con sử dụng:**
  - `ClassCreateFlow` (`src/components/class-sections/teacher/class-create-flow.tsx`)
  - `Button`, `Card`
- **API gọi trên trang:**
  - Preview tệp: `POST /api/v1/teacher/class-section-import-previews` (FormData: `file`)
  - Tạo lớp chính thức: `POST /api/v1/teacher/class-section-setups` (FormData: `code`, `name`, `file` optional)
  - Xử lý lỗi 409 Conflict: Tự động quay về bước 1 và focus vào ô mã lớp báo lỗi trùng lặp.
- **Responsive:** Khi `<= 720px`, thanh stepper chuyển thành grid 2x2.

---

### 6. Chi tiết Lớp học phần (Overview Hub) — `/admin/classes/[id]`
- **File:** `src/app/admin/(protected)/classes/[id]/page.tsx`
- **Mục đích:** Trung tâm điều hướng nhanh vào 3 phân hệ của lớp: Sinh viên, Bài tập, Bảng điểm và cung cấp tính năng Xóa lớp.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:**
  - Được bọc bởi `ClassSectionLayout` có sẵn `ClassContextNav`.
  - Đoạn text giới thiệu: "Chọn khu vực quản lý bạn muốn làm việc cho lớp học phần này:".
  - Lưới 3 thẻ Card điều hướng: `<div className="class-overview-grid">`
    1. **Sinh viên** (Icon `students`, dẫn tới `/admin/classes/[id]/students`)
    2. **Bài tập** (Icon `book`, dẫn tới `/admin/classes/[id]/assignments`)
    3. **Bảng điểm** (Icon `gradebook`, dẫn tới `/admin/classes/[id]/gradebook`)
  - Vùng nguy hiểm (Danger Zone): Khung viền nét đứt đỏ `.class-danger-zone` chứa thông tin "Xóa lớp học phần" và nút `<button className="btn btn-outline-danger"> Xóa lớp học này</button>`.
  - Modal xác nhận xóa: Mở hộp thoại `Modal` giải thích hậu quả và gọi API xóa.
- **Component con sử dụng:**
  - `ClassOverviewView` (`src/components/class-sections/teacher/class-overview-view.tsx`)
  - `Modal`, `Card`, `AppIcon`
- **API gọi trên trang:**
  - `DELETE /api/v1/teacher/class-sections/:id`
  - Trigger: Khi bấm nút "Xác nhận xóa lớp" trong Modal.
  - Thành công: Redirect về `/admin/classes`. Lỗi (nếu lớp đã có SV/bài tập): Hiển thị thông báo lỗi inline trong modal.
- **Responsive:** Grid 3 thẻ card chuyển thành 1 cột khi `<= 800px`.

---

### 7. Quản lý Sinh viên trong lớp — `/admin/classes/[id]/students`
- **File:** `src/app/admin/(protected)/classes/[id]/students/page.tsx`
- **Mục đích:** Quản lý danh sách sinh viên ghi danh trong lớp, chỉnh sửa thông tin cá nhân, cấp lại mã PIN và xem hồ sơ học tập chi tiết của từng sinh viên.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:**
  - Nằm trong `ClassSectionLayout`.
  - Thanh công cụ: Ô tìm kiếm text hỗ trợ tìm theo MSSV, Họ tên, Nickname.
  - Bảng dữ liệu sinh viên: Table gồm các cột MSSV, Họ và tên, Nickname, Email, Trạng thái PIN (Badge xanh "Đã đổi PIN" hoặc vàng "PIN ban đầu"), Thao tác.
  - Cột thao tác gồm 3 nút: "Sửa", "Reset PIN", "Xem hồ sơ".
  - Chân bảng: Component `Pagination` đầy đủ (số mục/trang, chuyển trang, tổng số).
  - 3 Modal con tích hợp:
    1. **Modal Sửa thông tin:** Form sửa Họ tên, Email, Nickname.
    2. **Modal Reset PIN:** Xác nhận reset và hiển thị popup chứa mã PIN mới gồm 6 chữ số.
    3. **Modal Xem hồ sơ học tập:** Xem bảng điểm và nhận xét của sinh viên đó trong lớp hiện hành.
- **Component con sử dụng:**
  - `StudentManagementView` (`src/components/students/teacher/student-management-view.tsx`)
  - `Modal`, `Pagination`
- **API gọi trên trang:**
  - Tải danh sách: `GET /api/v1/teacher/class-sections/:id/students?page=...&pageSize=...&search=...`
  - Cập nhật thông tin: `PATCH /api/v1/teacher/class-sections/:id/students/:studentId` (Payload: `{ fullName, email, nickname }`)
  - Cấp lại PIN: `POST /api/v1/teacher/class-sections/:id/students/:studentId/reset-pin`
  - Lấy hồ sơ học tập: `GET /api/v1/teacher/class-sections/:id/students/:studentId/profile`
- **Empty state:** Khi không có dữ liệu hiển thị dòng thông báo không có sinh viên phù hợp.
- **Responsive:** Bảng tự động cuộn ngang trong `.table-wrap`.

---

### 8. Quản lý Bài tập của lớp — `/admin/classes/[id]/assignments`
- **File:** `src/app/admin/(protected)/classes/[id]/assignments/page.tsx`
- **Mục đích:** Quản lý toàn bộ bài tập trong lớp, tạo đề bài mới, chỉnh sửa trạng thái công bố/đóng và đính kèm tài nguyên hướng dẫn.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:**
  - Thanh công cụ trên: Thanh tab trạng thái `assignment-status-tabs` (Tất cả, Bản nháp, Đã công bố, Đã đóng kèm số đếm) và nút `+ Tạo bài tập mới`.
  - Danh sách bài tập: Hiển thị dạng danh sách Card lớn. Mỗi card gồm tiêu đề bài tập, Badge trạng thái, thông tin hạn nộp (`formatDeadlineInfo`), thang điểm tối đa, nút "Chấm bài" dẫn sang trang chấm, và nút "Chi tiết & Tệp đính kèm".
  - **Modal Tạo bài tập:** Form nhập Tiêu đề, Mô tả, Ngày giao (`datetime-local`), Hạn nộp (`datetime-local`), Điểm tối đa (default 10).
  - **Modal Chi tiết & Đính kèm (`AssignmentDetailView`):**
    - Sửa thông tin bài tập (PUT)
    - Thay đổi trạng thái: Công bố (Published), Đóng bài (Closed)
    - Quản lý tệp đính kèm (`AttachmentUploadPanel`): Upload file qua Cloudinary và lưu attachment.
    - Nút Xóa bài tập (DELETE).
- **Component con sử dụng:**
  - `ClassAssignmentsView` (`src/components/assignments/teacher/class-assignments-view.tsx`)
  - `AssignmentDetailView` (`src/components/assignments/teacher/assignment-detail-view.tsx`)
  - `AttachmentUploadPanel`, `Modal`, `Button`, `Badge`, `Card`
- **API gọi trên trang:**
  - Danh sách: `GET /api/v1/teacher/class-sections/:id/assignments`
  - Tạo mới: `POST /api/v1/teacher/class-sections/:id/assignments`
  - Cập nhật: `PUT /api/v1/teacher/assignments/:assignmentId`
  - Xóa: `DELETE /api/v1/teacher/assignments/:assignmentId`
  - Upload đính kèm: `POST /api/v1/teacher/assignments/:assignmentId/attachments/sign` -> Cloudinary -> `POST .../attachments`
- **Empty state:** "Chưa có bài tập nào thuộc trạng thái này."
- **Responsive:** Khi co màn hình nhỏ, các nút thao tác xếp chồng, status tabs cuộn ngang ẩn thanh scroll.

---

### 9. Chấm điểm bài tập — `/admin/classes/[id]/assignments/[aid]/grade`
- **File:** `src/app/admin/(protected)/classes/[id]/assignments/[aid]/grade/page.tsx`
- **Mục đích:** Giao diện chấm điểm tập trung (Bulk Grading) cho toàn bộ sinh viên trong một bài tập, nhập điểm số, trạng thái và viết lời nhận xét chi tiết.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:**
  - Nút quay lại: `← Quay lại lớp`.
  - Khối Header bài tập: Thẻ Card hiển thị Tên bài tập, Hạn nộp, Thang điểm và Thanh tiến độ đã chấm `ProgressBar`.
  - Thanh công cụ: Bộ lọc Tab (Tất cả, Chưa chấm, Đã chấm, Chưa nộp) và ô tìm kiếm tên/MSSV.
  - Bảng chấm điểm:
    - Cột Sinh viên: Avatar, Họ tên, MSSV.
    - Cột Bài nộp: Tên file đính kèm kèm link tải (hoặc nhãn "Chưa nộp").
    - Cột Điểm số: Ô `<input type="number">` (tự động chuyển trạng thái sang "graded" khi nhập điểm).
    - Cột Trạng thái: Dropdown select (Chưa chấm / Đã chấm / Đã công bố).
    - Cột Lời nhận xét: Ô `<textarea>` để nhập feedback phản hồi cho sinh viên.
  - Thanh lưu dính đáy màn hình (Sticky Bottom Bar): Hiển thị số lượng thay đổi chưa lưu và nút `Lưu bảng điểm` (`.btn.btn-primary`). Có chặn rời trang nếu chưa lưu.
- **Component con sử dụng:**
  - `BulkGradeView` (`src/components/evaluations/teacher/bulk-grade-view.tsx`)
  - `ProgressBar`, `Button`, `AppIcon`
- **API gọi trên trang:**
  - Tải ban đầu (Server): Gom đồng thời `getTeacherAssignment`, `listStudentsInClass`, `listTeacherEvaluations`, `listTeacherSubmissions`.
  - Lưu bảng điểm: `PUT /api/v1/teacher/assignments/:assignmentId/evaluations/bulk` (Payload: `{ evaluations: Array<{ studentId, score, feedback, status }> }`).
- **Responsive:** Bảng cuộn ngang, thanh Sticky Save Bar luôn cố định ở đáy viewport mobile và desktop.

---

### 10. Bảng điểm tổng hợp của lớp — `/admin/classes/[id]/gradebook`
- **File:** `src/app/admin/(protected)/classes/[id]/gradebook/page.tsx`
- **Mục đích:** Ma trận bảng điểm 2 chiều (Sinh viên × Bài tập) của lớp học phần.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:**
  - Tiêu đề `h1` "Bảng điểm".
  - Ma trận bảng dữ liệu trong `.table-wrap`:
    - Cột đầu: Danh sách sinh viên (MSSV in đậm, Họ tên).
    - Các cột sau: Tương ứng từng bài tập trong lớp (header hiển thị tên bài).
    - Mỗi ô (cell): Hiển thị điểm số dạng `X/Max` kèm `Badge` thể hiện trạng thái (pending, graded, returned), hoặc dấu `—` nếu chưa có điểm.
  - Phân trang độc lập 2 chiều dưới chân bảng: Phân trang danh sách sinh viên (`studentPage`) và phân trang danh sách bài tập (`assignmentPage`).
- **Component con sử dụng:**
  - `GradebookView` (`src/components/evaluations/teacher/gradebook-view.tsx`)
  - `Badge`
- **API gọi trên trang:**
  - Server fetch: `getTeacherGradebook(classSectionId, { studentPage, studentPageSize: 20, assignmentPage, assignmentPageSize: 20 })`.
- **Empty state:** Render bảng rỗng hoặc dấu `—` tại các cell chưa có điểm.
- **Responsive:** Bảng ma trận tự động cuộn ngang mượt mà khi số lượng cột bài tập vượt quá độ rộng màn hình.

---

### 11. Cài đặt Thông báo & Email — `/admin/settings`
- **File:** `src/app/admin/(protected)/settings/page.tsx`
- **Mục đích:** Cấu hình tự động gửi email thông báo qua Brevo tới sinh viên khi công bố kết quả học tập và gửi email kiểm tra thử.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:**
  - Nằm trong thẻ Card chính.
  - Phần 1 — Bật/Tắt gửi email: Dòng công tắc kèm mô tả về việc gửi email bảo mật khi bài tập đổi trạng thái sang "Công bố (returned)". Nút Toggle chuyển đổi trạng thái Bật/Tắt.
  - Phần 2 — Chi tiết cấu hình Brevo: Danh sách định nghĩa `<dl>` hiển thị: Trạng thái Brevo (Đã cấu hình / Chưa cấu hình), Tên người gửi, Địa chỉ email người gửi.
  - Phần 3 — Thử nghiệm: Nút "Gửi email thử nghiệm" (icon `Send`).
  - Hộp thông báo kết quả: Banner alert xanh khi thành công hoặc đỏ khi có lỗi.
- **Component con sử dụng:**
  - `NotificationSettingsForm` (`src/components/notifications/teacher/notification-settings-form.tsx`)
- **API gọi trên trang:**
  - Lấy cài đặt (Server): `getNotificationSettings()`.
  - Cập nhật bật/tắt: `PATCH /api/v1/teacher/settings/notifications` (Payload: `{ emailEnabled: boolean }`).
  - Gửi email test: `POST /api/v1/teacher/settings/notifications/test`.
- **Responsive:** Trên mobile nút toggle và nút gửi test tự căn lề lại.

---

### 12. Trang đăng nhập sinh viên vào lớp — `/class/[code]`
- **File:** `src/app/class/[code]/page.tsx`
- **Mục đích:** Điểm chạm đầu tiên của sinh viên khi vào lớp: xác nhận mã lớp học phần và cung cấp form đăng nhập bằng Nickname/MSSV + mã PIN 6 số.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:** Nền `public-shell`. Thẻ căn giữa `public-record-card stack`. Hiển thị nhãn eyebrow "Đăng nhập", tên lớp học phần `h2`, mã lớp, và form `PinLoginForm`.
- **Component con sử dụng:**
  - `PublicClassView` (`src/components/class-sections/student/public-class-view.tsx`)
  - `PinLoginForm` (`src/components/auth/student/pin-login-form.tsx`)
  - `OtpInput`, `Button`
- **API gọi trên trang:**
  - Xác nhận thông tin lớp: `GET /api/v1/public/class-sections/:code` (client fetch, `no-store`).
  - Đăng nhập: `POST /api/v1/student/auth/login` (Payload: `{ classCode, nickname, pin }`).
  - Xử lý điều hướng sau đăng nhập:
    - Nếu `session.accessLevel === "credential_change"` hoặc `mustChangeNickname` / `mustChangePin`: Điều hướng sang `/class/[code]/onboarding`.
    - Nếu đã hoàn tất (`full`): Điều hướng thẳng vào `/class/[code]/profile`.
  - Xử lý Rate Limit (429): Hiển thị đếm ngược thời gian khóa đăng nhập `.auth-lockout`.
- **Empty / Error state:** Nếu mã lớp không tồn tại: hiển thị thông báo "Mã lớp chưa đúng" kèm nút quay lại trang chủ.
- **Responsive:** Co dãn vừa vặn màn hình từ 320px trở lên.

---

### 13. Redirect đăng nhập lớp — `/class/[code]/login`
- **File:** `src/app/class/[code]/login/page.tsx`
- **Mục đích:** Route chuyển tiếp cũ, tự động điều hướng về `/class/[code]`.
- **Trạng thái hiện tại:** Chỉ có logic redirect server-side `redirect("/class/" + encodeURIComponent(code))`, không có UI riêng biệt.

---

### 14. Hoàn tất tài khoản Sinh viên (Onboarding) — `/class/[code]/onboarding`
- **File:** `src/app/class/[code]/onboarding/page.tsx`
- **Mục đích:** Bắt buộc sinh viên lần đầu đăng nhập bằng PIN mặc định phải đổi Nickname mới và/hoặc đổi mã PIN cá nhân 6 số trước khi truy cập dữ liệu học tập.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:** Nền `public-shell`. Thẻ `auth-wrap stack` căn giữa gồm tiêu đề `h1` "Hoàn tất tài khoản", mô tả, và form `ChangeCredentialsForm`.
- **Component con sử dụng:**
  - `ChangeCredentialsForm` (`src/components/auth/student/change-credentials-form.tsx`)
  - `Card`
- **API gọi trên trang:**
  - Kiểm tra phiên: `GET /api/v1/student/auth/session` để biết sinh viên đang cần đổi nickname hay đổi PIN.
  - Cập nhật thông tin: `PATCH /api/v1/student/auth/credentials` (Payload: `{ nickname?, pin? }`).
  - Sau khi hoàn tất nâng cấp lên quyền `full`: Chuyển tiếp vào `/class/[code]/profile`.
- **Validation Form:**
  - Nickname mới: 3–50 ký tự, chỉ gồm chữ cái, số, dấu chấm, gạch dưới hoặc gạch ngang.
  - PIN mới: Đúng 6 chữ số (`maxLength={6}`, `inputMode="numeric"`).
  - Xác nhận PIN mới: Phải trùng khớp chính xác với PIN mới.
- **Responsive:** Thẻ card tự co theo chiều ngang màn hình.

---

### 15. Hồ sơ học tập Sinh viên (Tổng quan) — `/class/[code]/profile`
- **File:** `src/app/class/[code]/(workspace)/profile/page.tsx`
- **Mục đích:** Màn hình chính của sinh viên trong lớp học phần, hiển thị tiến độ học tập, bài tập gần đây và cảnh báo hạn chốt gần nhất.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:** Render `<StudentWorkspaceView section="overview" />`.
  - Khối 1 — Topbar cá nhân: Avatar ký tự đầu, Lời chào `"Chào [Tên]!"`, Mã lớp và MSSV.
  - Khối 2 — Dải tóm tắt tiến độ: `<section className="student-summary-strip">` gồm:
    - Thẻ nhận diện lớp (Mã lớp, tên lớp).
    - 4 ô metric: Tổng bài tập, Đã nộp, Đã chấm, % Tiến độ hoàn thành lớp học.
  - Khối 3 — Cặp panel chính:
    - Panel trái: "Bài tập gần đây" (tối đa 4 bài), click vào mở modal nộp bài/xem chi tiết.
    - Panel phải: "Hạn nộp gần nhất" (cảnh báo bài sắp hết hạn, badge urgency đỏ/vàng kèm thời gian còn lại, nút "Nộp bài ngay").
  - Modal nộp bài / xem bài tập (`StudentAssignmentModal`).
- **Component con sử dụng:**
  - `StudentWorkspaceView` (`src/components/students/student/student-workspace-view.tsx`)
  - `StudentAssignmentModal` (`src/components/assignments/student/student-assignment-modal.tsx`)
  - `Card`, `AppIcon`
- **API gọi trên trang:** Sử dụng dữ liệu profile có sẵn từ `StudentWorkspaceLayout`. Khi nộp bài thành công gọi `refresh()`.
- **Responsive:** Dải summary và 2 panels chuyển thành 1 cột trên mobile.

---

### 16. Danh sách Bài tập của Sinh viên — `/class/[code]/assignments`
- **File:** `src/app/class/[code]/(workspace)/assignments/page.tsx`
- **Mục đích:** Hiển thị danh sách toàn bộ các bài tập được giao cho sinh viên trong lớp học phần này kèm trạng thái nộp bài và hạn chốt.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:** Render `<StudentWorkspaceView section="assignments" />`.
  - Bảng danh sách bài tập `.workspace-table-panel`:
    - Mỗi hàng bài tập gồm: Tiêu đề bài tập, Hạn chốt (ngày giờ), số lượng tài liệu đính kèm (nếu có), thang điểm, thông báo đếm ngược hạn nộp, và Badge trạng thái ở bên phải ("Chưa nộp", "Đã nộp", "X điểm" hoặc "Đang chấm").
    - Click vào bất kỳ hàng nào sẽ mở `StudentAssignmentModal` để xem đề bài, tải tài liệu đính kèm hoặc nộp bài.
- **Component con sử dụng:**
  - `StudentWorkspaceView`, `StudentAssignmentModal`
- **API & Tương tác:** Tải dữ liệu từ profile context. Click bài tập mở modal xem chi tiết và lịch sử nộp bài.
- **Empty state:** `<p className="muted">Chưa có dữ liệu để hiển thị.</p>`.

---

### 17. Bảng điểm cá nhân của Sinh viên — `/class/[code]/grades`
- **File:** `src/app/class/[code]/(workspace)/grades/page.tsx`
- **Mục đích:** Hiển thị danh sách các bài tập đã được chấm điểm kèm điểm số chính xác và phản hồi từ giảng viên.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:** Render `<StudentWorkspaceView section="grades" />`.
  - Tương tự danh sách bài tập nhưng tự động lọc ra các bài tập đã có kết quả đánh giá (`evaluation !== null`).
  - Hiển thị rõ số điểm đạt được trên thang điểm tối đa (VD: `8.5 điểm`).
  - Click vào hàng mở modal xem chi tiết lời nhận xét (feedback) của giảng viên.
- **Component con sử dụng:**
  - `StudentWorkspaceView`, `StudentAssignmentModal`
- **Empty state:** "Chưa có dữ liệu để hiển thị." khi chưa có bài nào được chấm.

---

### 18. Thông báo của Sinh viên — `/class/[code]/notifications`
- **File:** `src/app/class/[code]/(workspace)/notifications/page.tsx`
- **Mục đích:** Trang xem toàn bộ lịch sử thông báo của sinh viên (nhắc hạn nộp bài, thông báo có điểm bài tập mới) và đánh dấu đã đọc.
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh.
- **Bố cục:** Render `<StudentWorkspaceView section="notifications" />`.
  - Card `.workspace-panel.notification-page`:
  - Danh sách nút thông báo `.notification-item`: Hiển thị nội dung thông điệp `message` và thời gian tạo định dạng ngày tháng tiếng Việt.
  - Click vào thông báo sẽ tự động đánh dấu đã đọc.
- **Component con sử dụng:**
  - `StudentWorkspaceView`, `AppIcon`, `Card`
- **API gọi trên trang:**
  - Hook `useNotificationPolling`: Polling danh sách thông báo mỗi 30 giây (`GET /api/v1/student/notifications?page=1&pageSize=50`).
  - Đánh dấu đã đọc: `PATCH /api/v1/student/notifications/:id/read`.
- **Empty state:** `<p className="muted">Chưa có thông báo nào.</p>`.

---

### 19. Danh sách bài đã nộp của Sinh viên (Legacy) — `/class/[code]/submissions`
- **File:** `src/app/class/[code]/(workspace)/submissions/page.tsx`
- **Mục đích:** Hiển thị danh sách lọc các bài tập mà sinh viên đã thực hiện nộp bài (`latestAttempt !== null`).
- **Trạng thái hiện tại:** Đã implement UI hoàn chỉnh (thuộc diện Feedback-first sẽ ẩn bớt điều hướng, nhưng code vẫn hoạt động 100%).
- **Bố cục:** Render `<StudentWorkspaceView section="submissions" />`.
  - Lọc và hiển thị danh sách các bài có bài nộp kèm nhãn trạng thái "Đã nộp" hoặc điểm số.
- **Component con sử dụng:**
  - `StudentWorkspaceView`, `StudentAssignmentModal`

---

## PHẦN 5 — TỔNG HỢP ROUTE MAP

| STT | Route Path | File Path | Trạng thái Implement | API chính sử dụng |
|---|---|---|---|---|
| 1 | `/` | `src/app/page.tsx` | Đã implement hoàn chỉnh | Không gọi API (Client Navigation) |
| 2 | `/admin/login` | `src/app/admin/(auth)/login/page.tsx` | Đã implement hoàn chỉnh | `POST /api/v1/teacher/auth/login` |
| 3 | `/admin/dashboard` | `src/app/admin/(protected)/dashboard/page.tsx` | Đã implement hoàn chỉnh | Server Service: `getTeacherDashboardOverview` |
| 4 | `/admin/classes` | `src/app/admin/(protected)/classes/page.tsx` | Đã implement hoàn chỉnh | Server Service: `getTeacherClassSectionSummaries` |
| 5 | `/admin/classes/new` | `src/app/admin/(protected)/classes/new/page.tsx` | Đã implement hoàn chỉnh | `POST /api/v1/teacher/class-section-import-previews`<br/>`POST /api/v1/teacher/class-section-setups` |
| 6 | `/admin/classes/[id]` | `src/app/admin/(protected)/classes/[id]/page.tsx` | Đã implement hoàn chỉnh | `DELETE /api/v1/teacher/class-sections/:id` |
| 7 | `/admin/classes/[id]/students` | `src/app/admin/(protected)/classes/[id]/students/page.tsx` | Đã implement hoàn chỉnh | `GET/PATCH /api/v1/teacher/class-sections/:id/students`<br/>`POST .../reset-pin`<br/>`GET .../profile` |
| 8 | `/admin/classes/[id]/assignments` | `src/app/admin/(protected)/classes/[id]/assignments/page.tsx` | Đã implement hoàn chỉnh | `GET/POST /api/v1/teacher/class-sections/:id/assignments`<br/>`PUT/DELETE /api/v1/teacher/assignments/:aid` |
| 9 | `/admin/classes/[id]/assignments/[aid]/grade` | `src/app/admin/(protected)/classes/[id]/assignments/[aid]/grade/page.tsx` | Đã implement hoàn chỉnh | Server Services gom Promise<br/>`PUT /api/v1/teacher/assignments/:aid/evaluations/bulk` |
| 10 | `/admin/classes/[id]/gradebook` | `src/app/admin/(protected)/classes/[id]/gradebook/page.tsx` | Đã implement hoàn chỉnh | Server Service: `getTeacherGradebook` |
| 11 | `/admin/settings` | `src/app/admin/(protected)/settings/page.tsx` | Đã implement hoàn chỉnh | `PATCH /api/v1/teacher/settings/notifications`<br/>`POST /api/v1/teacher/settings/notifications/test` |
| 12 | `/class/[code]` | `src/app/class/[code]/page.tsx` | Đã implement hoàn chỉnh | `GET /api/v1/public/class-sections/:code`<br/>`POST /api/v1/student/auth/login` |
| 13 | `/class/[code]/login` | `src/app/class/[code]/login/page.tsx` | Đã implement (Server Redirect) | Server redirect về `/class/[code]` |
| 14 | `/class/[code]/onboarding` | `src/app/class/[code]/onboarding/page.tsx` | Đã implement hoàn chỉnh | `GET /api/v1/student/auth/session`<br/>`PATCH /api/v1/student/auth/credentials` |
| 15 | `/class/[code]/profile` | `src/app/class/[code]/(workspace)/profile/page.tsx` | Đã implement hoàn chỉnh | Server Service: `getStudentProfile`<br/>Notification Polling |
| 16 | `/class/[code]/assignments` | `src/app/class/[code]/(workspace)/assignments/page.tsx` | Đã implement hoàn chỉnh | Profile Context Data<br/>`GET .../submissions` & Cloudinary upload |
| 17 | `/class/[code]/grades` | `src/app/class/[code]/(workspace)/grades/page.tsx` | Đã implement hoàn chỉnh | Profile Context Data |
| 18 | `/class/[code]/notifications` | `src/app/class/[code]/(workspace)/notifications/page.tsx` | Đã implement hoàn chỉnh | `GET /api/v1/student/notifications`<br/>`PATCH /api/v1/student/notifications/:id/read` |
| 19 | `/class/[code]/submissions` | `src/app/class/[code]/(workspace)/submissions/page.tsx` | Đã implement hoàn chỉnh | Profile Context Data (Legacy route) |

---

## 8. BACKLOG FEEDBACK-FIRST (LƯU Ý KHI REDESIGN)

1. **Khởi tạo PIN & Quản lý thông tin**: Đảm bảo quy trình PIN 111111 ban đầu, quy trình onboarding buộc đổi thông tin, cơ chế reset PIN từ giảng viên và forgot PIN qua OTP.
2. **Ẩn Submission/Attachment ở Sinh viên**: Định hướng feedback-first tập trung vào nhận phản hồi từ giảng viên thay vì nộp bài phức tạp. Bỏ dần filter/upload/attachment trên giao diện sinh viên.
3. **Chấm điểm theo lô (Bulk Grading)**: Ưu tiên trải nghiệm import/export danh sách điểm từ Excel, lưu bản chấm nháp (`graded`) và công bố chính thức (`returned`).
4. **Deep-link thông báo Email**: Email gửi từ Brevo cần dẫn thẳng vào URL kết quả bài tập `/class/{code}/grades?assignment={assignmentId}`.
5. **Bảo mật phản hồi**: Sinh viên chỉ xem được điểm và nhận xét khi trạng thái đánh giá đã chuyển sang `returned`. Không để lộ feedback qua các selector client-side.

---

## 9. ACCEPTANCE CHECKLIST CHO REDESIGN

- [ ] Toàn bộ các route đều có đầy đủ Heading ngữ cảnh, trạng thái Loading, Empty state và Error boundary.
- [ ] Tuân thủ triệt để nguyên tắc không fetch trùng dữ liệu đã có sẵn từ Server Component.
- [ ] Header active state chuẩn xác theo từng cấp route; phím `Escape` đóng mượt mà mọi popover/modal/mobile drawer.
- [ ] Không phụ thuộc vào Student ID truyền trên URL; mọi bảo mật sinh viên dựa vào HttpOnly session cookie.
- [ ] Token màu sắc, typography (Be Vietnam Pro + Lora + IBM Plex Mono), border radius và focus ring dùng đúng biến CSS token quy định.
- [ ] Kiểm thử responsive đầy đủ trên 3 độ phân giải tiêu chuẩn: Mobile `375px–390px`, Tablet `768px`, và Desktop `1440px`.
