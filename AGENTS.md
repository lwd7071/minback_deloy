# MinBack Agent Guide

## Agent skills

### Issue tracker

Dev A work is tracked by checkboxes in `docs/team/dev-a-tasks.md`. See `docs/agents/issue-tracker.md`.

### Triage labels

This repository does not use triage labels; task state is represented only by checklist progress. See `docs/agents/triage-labels.md`.

### Domain docs

MinBack is a single-context repository. Read `CONTEXT.md` and then the linked contracts. See `docs/agents/domain.md`.

## Nguồn sự thật

Khi tài liệu mâu thuẫn, áp dụng theo thứ tự:

1. `docs/brief.md`
2. `docs/team/engineering-rules.md`
3. File assignment của Dev A hoặc Dev B
4. Checklist task tương ứng

## Nguyên tắc quyết định

- Mọi quyết định thiết kế chưa có trong brief hoặc contract phải hỏi trước.
- Không tự quyết định rồi chỉ báo cáo sau khi đã implementation.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
