import { createHash } from "crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { verifyCloudinaryResponseSignature } from "@/server/files/cloudinary-response-signature";

const apiSecret = "test-secret";
const publicId = "minback/development/submissions/assignment/file.pdf";
const version = 123456;

function responseSignature(algorithm: "sha1" | "sha256"): string {
  return createHash(algorithm)
    .update(`public_id=${publicId}&version=${version}${apiSecret}`)
    .digest("hex");
}

describe("verifyCloudinaryResponseSignature", () => {
  it.each(["sha1", "sha256"] as const)(
    "accepts a valid %s Cloudinary response signature",
    (algorithm) => {
      expect(
        verifyCloudinaryResponseSignature(
          { publicId, version, signature: responseSignature(algorithm) },
          apiSecret,
        ),
      ).toBe(true);
    },
  );

  it("rejects a modified response signature", () => {
    expect(
      verifyCloudinaryResponseSignature(
        { publicId, version, signature: "0".repeat(40) },
        apiSecret,
      ),
    ).toBe(false);
  });
});
