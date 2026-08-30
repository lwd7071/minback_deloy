# Dev A Sprint 2 Handoff — ClassSection và Import

## Phạm vi bàn giao

Sprint 2 cung cấp ClassSection CRUD theo Teacher context và import Student từ CSV/XLSX. Mọi endpoint Teacher dùng Supabase Auth SSR; browser không được gửi hoặc quyết định `teacherId`.

## API và error contract

| Method | Endpoint | Success | Lỗi chính |
|---|---|---:|---|
| `GET` | `/api/v1/teacher/class-sections?page&pageSize` | `200`, `ClassSectionDto[]` + pagination meta | `400`, `401` |
| `POST` | `/api/v1/teacher/class-sections` | `201`, `ClassSectionDto` | `400`, `401`, `403` Origin, `409` duplicate code |
| `GET` | `/api/v1/teacher/class-sections/:classSectionId` | `200`, `ClassSectionDto` | `400`, `401`, `404` |
| `PATCH` | `/api/v1/teacher/class-sections/:classSectionId` | `200`, `ClassSectionDto` | `400`, `401`, `403` Origin, `404`, `409` duplicate code |
| `DELETE` | `/api/v1/teacher/class-sections/:classSectionId` | `204` | `400`, `401`, `403` Origin, `404`, `409` nếu đã có Student/Assignment |
| `POST` | `/api/v1/teacher/class-sections/:classSectionId/import` | `200`, `ImportResultDto` | `400`, `401`, `403` Origin, `404` |

- Error dùng envelope `{ error: { code, message, details? } }`; cross-Teacher direct-ID operations dùng `404 NOT_FOUND` để che giấu resource.
- Mutation bắt buộc same-origin. `teacherId` trong browser payload không được dùng để xác định owner.
- Import response có `Cache-Control: no-store`.

## Import fixtures và hành vi

- CSV/XLSX dùng cùng normalized-row model. Header được trim và so khớp không phân biệt hoa thường: `MSSV`, `Họ Tên`; `Email` tùy chọn.
- Whole-file `400 VALIDATION_ERROR`: sai đuôi, lớn hơn 5 MB, thiếu header bắt buộc hoặc hơn 2.000 dòng dữ liệu không trống. Validation này hoàn tất trước Student mutation.
- Row-level errors là partial success: dòng trống không tính `total`; dữ liệu sai hoặc duplicate MSSV sau dòng đầu trả `skipped` kèm `errors`.
- Re-import cùng `(class_section_id, mssv)` chỉ cập nhật `full_name`/`email`; không đổi nickname, PIN hash, credential flags hoặc session. Cùng MSSV ở lớp khác là enrollment độc lập.
- Integration fixtures dùng seed Teacher/ClassSection A/B và dữ liệu synthetic có suffix UUID; mọi Student/ClassSection tạo trong test được xóa trong cùng `afterEach`.

## One-time PIN

- Student mới có `nickname=MSSV`, PIN CSPRNG sáu chữ số, BCrypt-only storage, `must_change_nickname=true` và `must_change_pin=true`.
- Plain PIN chỉ có trong row `created` của response import đầu tiên. Row `updated`/`skipped` không có PIN và không có endpoint tải lại.
- UI tạo CSV PIN ngay trong browser từ response tức thời; server không lưu file export. API danh sách Student không trả PIN hoặc hash.

## Test và vận hành local

```text
npm run test:setup        # đúng một lần khi cần DB sạch; reset + verify Teacher A/B
npm run db:test
npm run db:lint
npm run test:health
npm run test:integration
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Integration harness chạy một Next test server trên port 3099 qua Vitest `globalSetup`, pin Supabase local và teardown process tree trên Windows.

## Rủi ro còn lại

- Dependency `exceljs@4.4.0` kéo theo `uuid@8.3.2` có advisory `GHSA-w5hq-g745-h8pq` (buffer bounds, `CWE-787`/`CWE-1285`), chỉ ảnh hưởng API UUID v3/v5/v6 khi gọi kèm `buf`.
- Đã xác nhận luồng đọc XLSX (`workbook.xlsx.load`) không đi qua path lỗi này; ExcelJS chỉ dùng `uuid.v4()` cho conditional-formatting extension.
- Không áp dụng `npm audit fix` vì remediation duy nhất là đổi major/downgrade sang `exceljs@3.4.0`, đánh đổi không hợp lý so với rủi ro thực tế.
- Cần theo dõi lại nếu ExcelJS có bản vá mới thay thế UUID, hoặc nếu code sau này dùng thêm tính năng ExcelJS động chạm tới path lỗi trên.

## Trạng thái review

Code, privacy regression và quality gate do Dev A chuẩn bị. A2.6 chỉ được đóng sau khi người dùng xác nhận handoff thay Dev B theo quyết định ngày 2026-08-30.
