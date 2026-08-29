# Supabase migrations

Dev A thêm migration SQL theo thứ tự thời gian tại đây. Không chỉnh schema thủ công mà không có migration tương ứng.

Kiểm tra migration trên database local bằng `npm run db:reset` và `npm run db:test` trước khi dùng `supabase db push`. Không chạy `db reset` trên remote.
