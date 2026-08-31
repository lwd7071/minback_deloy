/**
 * src/server/repositories/login-rate-limit-repository.ts
 *
 * Repository quản lý bảng `login_rate_limits`.
 * Dùng createAdminClient() vì bảng này không cấp quyền cho anon/authenticated.
 *
 * Chiến lược rate-limit (contract mục 2.3):
 * - Scope 'identifier': HMAC-SHA256(classCode:nickname) — block 15 phút sau 5 lần sai
 * - Scope 'ip': HMAC-SHA256(normalizedIp) — block 15 phút khi có 30 lần sai trong 15 phút
 * - Key lưu dưới dạng HMAC hash — không lưu IP hay nickname dạng đọc được
 * - Cleanup: row không hoạt động >24h được xóa bởi job hằng ngày
 */

import "server-only";

import { createHmac } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import type { LoginRateLimitRow } from "@/types/student";

// Giới hạn rate-limit (cố định theo contract)
const IDENTIFIER_MAX_ATTEMPTS = 5;
const IP_MAX_ATTEMPTS_PER_WINDOW = 30;
const BLOCK_DURATION_MINUTES = 15;
const IP_WINDOW_MINUTES = 15;

/**
 * Tạo HMAC-SHA256 hex từ một chuỗi đầu vào và secret.
 * Secret lấy từ RATE_LIMIT_HMAC_SECRET trong env.
 * Không log hoặc trả giá trị plaintext đầu vào.
 */
export function hashRateLimitKey(plaintext: string): string {
  const secret = process.env.RATE_LIMIT_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("RATE_LIMIT_HMAC_SECRET chưa được cấu hình (>= 32 ký tự)");
  }
  return createHmac("sha256", secret).update(plaintext).digest("hex");
}

/** Tạo hash cho bucket identifier từ classCode + nickname */
export function buildIdentifierHash(
  classCode: string,
  nickname: string,
): string {
  // classCode đã được normalize (uppercase, trim) trước khi gọi hàm này
  return hashRateLimitKey(`${classCode}:${nickname}`);
}

/** Tạo hash cho bucket IP từ IP address */
export function buildIpHash(normalizedIp: string): string {
  return hashRateLimitKey(normalizedIp);
}

/**
 * Lấy bản ghi rate-limit cho một scope + key_hash cụ thể.
 * Trả null nếu chưa có bản ghi.
 */
async function getRateLimitRow(
  scope: "identifier" | "ip",
  keyHash: string,
): Promise<LoginRateLimitRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("login_rate_limits")
    .select("*")
    .eq("scope", scope)
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error) {
    console.error(`[RateLimitRepo] Lỗi khi đọc rate-limit:`, error.message);
    return null;
  }

  return data as LoginRateLimitRow | null;
}

/**
 * Kiểm tra xem một bucket có đang bị block hay không.
 * Trả true nếu đang bị block (blocked_until > now).
 */
export async function isRateLimitBlocked(
  scope: "identifier" | "ip",
  keyHash: string,
): Promise<boolean> {
  const row = await getRateLimitRow(scope, keyHash);
  if (!row || !row.blocked_until) return false;

  const now = new Date();
  return new Date(row.blocked_until) > now;
}

/**
 * Kiểm tra đồng thời cả hai bucket (IP + identifier).
 * Trả { ipBlocked, identifierBlocked }.
 * Rate-limit check luôn thực hiện trước khi verify credentials.
 */
export async function checkBothBuckets(
  ipHash: string,
  identifierHash: string,
): Promise<{ ipBlocked: boolean; identifierBlocked: boolean }> {
  const [ipBlocked, identifierBlocked] = await Promise.all([
    isRateLimitBlocked("ip", ipHash),
    isRateLimitBlocked("identifier", identifierHash),
  ]);
  return { ipBlocked, identifierBlocked };
}

/**
 * Tăng attempt_count cho một bucket và set blocked_until nếu vượt ngưỡng.
 * Sử dụng upsert để xử lý row chưa tồn tại.
 *
 * Logic per scope:
 * - 'identifier': block sau IDENTIFIER_MAX_ATTEMPTS lần sai
 * - 'ip': reset window nếu window_started_at + 15 phút đã qua;
 *          block sau IP_MAX_ATTEMPTS_PER_WINDOW trong cùng window
 */
export async function incrementFailedAttempt(
  scope: "identifier" | "ip",
  keyHash: string,
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date();

  // Lấy row hiện tại để quyết định logic
  const existing = await getRateLimitRow(scope, keyHash);

  let attemptCount: number;
  let windowStartedAt: Date;
  let blockedUntil: Date | null = null;

  if (!existing) {
    // Row mới — lần sai đầu tiên
    attemptCount = 1;
    windowStartedAt = now;
  } else if (scope === "ip") {
    // IP: kiểm tra xem có cần reset window không
    const windowStart = new Date(existing.window_started_at);
    const windowAgeMs = now.getTime() - windowStart.getTime();
    const windowExpiredMs = IP_WINDOW_MINUTES * 60 * 1000;

    if (windowAgeMs > windowExpiredMs) {
      // Window cũ đã hết — bắt đầu window mới
      attemptCount = 1;
      windowStartedAt = now;
    } else {
      // Vẫn trong window hiện tại
      attemptCount = existing.attempt_count + 1;
      windowStartedAt = windowStart;
    }

    if (attemptCount >= IP_MAX_ATTEMPTS_PER_WINDOW) {
      blockedUntil = new Date(
        now.getTime() + BLOCK_DURATION_MINUTES * 60 * 1000,
      );
    }
  } else {
    // Identifier: chỉ đếm tổng, không có window
    attemptCount = existing.attempt_count + 1;
    windowStartedAt = new Date(existing.window_started_at);

    if (attemptCount >= IDENTIFIER_MAX_ATTEMPTS) {
      blockedUntil = new Date(
        now.getTime() + BLOCK_DURATION_MINUTES * 60 * 1000,
      );
    }
  }

  const { error } = await supabase.from("login_rate_limits").upsert(
    {
      scope,
      key_hash: keyHash,
      attempt_count: attemptCount,
      window_started_at: windowStartedAt.toISOString(),
      blocked_until: blockedUntil?.toISOString() ?? null,
      updated_at: now.toISOString(),
    },
    { onConflict: "scope,key_hash" },
  );

  if (error) {
    // Lỗi không nghiêm trọng với rate-limit — log nhưng không block request
    console.error(
      `[RateLimitRepo] Không thể tăng attempt_count cho ${scope}:`,
      error.message,
    );
  }
}

/**
 * Tăng cả hai bucket (IP + identifier) trong cùng một lần gọi.
 * Dùng khi login thất bại (sai credentials hoặc bất kỳ bước nào).
 */
export async function incrementBothBuckets(
  ipHash: string,
  identifierHash: string,
): Promise<void> {
  await Promise.all([
    incrementFailedAttempt("ip", ipHash),
    incrementFailedAttempt("identifier", identifierHash),
  ]);
}

/**
 * Reset bucket identifier khi login thành công.
 * Xóa bản ghi hoặc reset count về 0 và xóa blocked_until.
 * Không reset bucket IP (theo contract).
 */
export async function resetIdentifierBucket(
  identifierHash: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("login_rate_limits")
    .delete()
    .eq("scope", "identifier")
    .eq("key_hash", identifierHash);

  if (error) {
    console.error(
      `[RateLimitRepo] Không thể reset identifier bucket:`,
      error.message,
    );
  }
}

/**
 * Cleanup: Xóa các row không hoạt động quá 24 giờ.
 * Dùng cho cron job / scheduled task.
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("login_rate_limits")
    .delete()
    .lt("updated_at", cutoff.toISOString())
    .select("id");

  if (error) {
    console.error(`[RateLimitRepo] Cleanup thất bại:`, error.message);
    return 0;
  }

  return data?.length ?? 0;
}
