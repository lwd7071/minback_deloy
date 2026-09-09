import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkBothBuckets,
  incrementFailedAttempt,
} from "../login-rate-limit-repository";

function lookupClient(result: { data: unknown; error: unknown }) {
  const query = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.eq.mockReturnValue(query);
  return {
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(query) }),
  };
}

describe("login rate-limit repository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fails closed when either rate-limit bucket cannot be read", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      lookupClient({
        data: null,
        error: { message: "database unavailable" },
      }) as never,
    );

    await expect(
      checkBothBuckets("ip-hash", "identifier-hash"),
    ).rejects.toThrow("RATE_LIMIT_LOOKUP_FAILED");
  });

  it("does not silently accept a failed attempt counter write", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ error: { message: "write failed" } }),
    };
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    await expect(
      incrementFailedAttempt("identifier", "identifier-hash"),
    ).rejects.toThrow("RATE_LIMIT_INCREMENT_FAILED");
  });
});
