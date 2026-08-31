# Frontend rebuild handoff

## Routes và contract

- Student: `/class/:code`, `/login`, `/onboarding`, `/profile`. Identity luôn lấy từ StudentSession; server canonicalize class code trước khi render protected page.
- Admin: `/admin/login`, `/admin/dashboard`, `/admin/classes/:id`, `/admin/classes/:id/assignments/:aid/grade`, `/admin/settings`.
- UI route `/student/*` và `/teacher/*` cũ bị xóa, không redirect. API prefix cũ giữ nguyên.
- API mới: public class lookup (code/name only), class summaries, parse-only import preview, paginated gradebook và atomic bulk Evaluation.

## UI behavior

- Student Profile giữ grading progress và submission progress độc lập; điểm trung bình là trung bình phần trăm của Evaluation graded/returned có score.
- Assignment modal hiển thị attachment authenticated download, Evaluation/feedback, latest submission và toàn bộ immutable attempt history; upload hiển thị trạng thái riêng cho từng file.
- Teacher grade page hiển thị latest submission trước khi chấm; bulk save gọi một RPC atomic và chỉ phát notification cho Evaluation thực sự thay đổi sau commit.
- Soft neumorphism chỉ dùng cho shell/card; focus ring, border, keyboard flow và reduced-motion không phụ thuộc shadow.

## Verification 2026-08-31

- Checkpoint Cloudinary riêng: `092c60c`.
- `npm run lint`: pass, 0 errors; `npm run typecheck`: pass.
- `npm test -- --run`: 65/65 pass across 21 files, gồm bulk privacy ordering, no-op và post-commit notification regression.
- `npm run build`: pass sau cleanup; route table chỉ còn `/admin/*`, `/class/[code]/*` và API routes, không còn UI `/student/*` hoặc `/teacher/*`.
- `git diff --check`: pass. `npm audit --json`: 0 vulnerabilities trên 664 dependencies.
- `npm run format:check`: source/docs thay đổi đều pass; repository check còn fail duy nhất `AGENTS.md`, là generated baseline ngoài frontend diff.
- Browser visual inspection chưa chạy được vì browser runtime local không tạo được assets directory.
- DB test/lint, health và integration của migration mới đang pending: Docker/Supabase local không khả dụng sau ba lần chẩn đoán trước đó; chưa chạy reset mới.
