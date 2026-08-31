# Assignment attachments và Student submissions

## Contract đã triển khai

- Binary là Cloudinary `raw` + `authenticated`; Supabase chỉ lưu ID asset, `public_id`, version, URL metadata, format và dung lượng. Không trả Cloudinary URL bền vững cho browser.
- Các mutation đều yêu cầu same Origin. Download qua API đã authorize, trả redirect URL ký tối đa 5 phút và `Cache-Control: no-store`.
- Attachment: tối đa 5 file active/Assignment, chỉ Teacher sở hữu Assignment được tạo/xóa; `closed` chỉ đọc. Xóa trước hết ghi audit (`deletion_pending`), sau đó destroy với `invalidate=true`; lỗi destroy giữ `delete_failed` để cleanup.
- Submission: một root cho Student/Assignment; attempt bất biến 1–5 file, tối đa 10. RPC khóa root và đánh số trong transaction. `draft` ẩn, `published` nhận bài, `closed` chặn bài mới. Trễ sau 23:59:59.999 giờ `Asia/Ho_Chi_Minh` được ghi `isLate=true` nhưng vẫn hợp lệ.
- Hai progress độc lập: `progress` = Evaluation `graded|returned`; `submissionProgress` = Assignment visible có attempt cuối.

## Routes

- Teacher: ký/finalize/xóa/list/download attachment tại `/api/v1/teacher/assignments/:assignmentId/attachments`; list submission, history từng Student và download file đều scope bởi ownership Assignment.
- Student: ký/finalize/lịch sử submission tại `/api/v1/student/assignments/:assignmentId/submissions`; chỉ session đầy đủ và Assignment cùng ClassSection được truy cập/tải.

## Giới hạn và rủi ro chấp nhận

- Allowlist: `pdf, docx, xlsx, pptx, txt, zip, jpg, jpeg, png`; mỗi file tối đa 20 MB. ZIP được chấp nhận nhưng chưa antivirus/malware scanning. Không nhận executable, HTML, SVG, audio hoặc video.
- Cần chạy `npm run cloudinary:setup` một lần ở mỗi môi trường để tạo/cập nhật preset `minback_authenticated_files`. Script chưa được chạy trong workspace này để tránh tự ý thay đổi tài khoản Cloudinary.
- Script cleanup orphan/pending Cloudinary cần chạy trong môi trường có Supabase local/credential hoạt động; không được xác minh vì Docker Desktop/Supabase local đang unavailable.

## Verification thực tế — 2026-08-31

- `npm test`: 18/18 files, 54/54 tests pass.
- `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`: pass.
- `npm audit` sau khi thêm `cloudinary@2.11.0`: còn 2 moderate advisories duy nhất từ `exceljs@4.4.0 -> uuid@8.3.2`, GHSA-w5hq-g745-h8pq. Luồng `workbook.xlsx.load` không dùng UUID v3/v5/v6 với `buf`; không chạy audit fix vì phương án là downgrade major `exceljs@3.4.0`.
- Chưa chạy DB test/lint, health hoặc integration cho migration mới: Docker engine đã không khả dụng sau 3 lượt chẩn đoán trước đó. Không reset DB trong lần này.
