/**
 * src/types/rate-limit.ts
 *
 * Types cho Rate Limit domain.
 */

// ─── DB Row Shapes ────────────────────────────────────────────────────────────
// Phản chiếu trực tiếp schema database (snake_case) của bảng login_rate_limits.
export type LoginRateLimitRow = {
  id: string;
  scope: "identifier" | "ip";
  key_hash: string; // HMAC-SHA256 hex của IP hoặc "classCode:nickname"
  attempt_count: number;
  window_started_at: string;
  blocked_until: string | null;
  updated_at: string;
};
