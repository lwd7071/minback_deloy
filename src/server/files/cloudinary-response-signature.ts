import "server-only";

import { timingSafeEqual } from "crypto";
import { v2 as cloudinary } from "cloudinary";

type SignatureAlgorithm = "sha1" | "sha256";

type ApiSignRequest = (
  params: { public_id: string; version: number },
  apiSecret: string,
  signatureAlgorithm: SignatureAlgorithm,
  signatureVersion: 1,
) => string;

export function verifyCloudinaryResponseSignature(
  input: { publicId: string; version: number; signature: string },
  apiSecret: string,
): boolean {
  const signatureAlgorithm: SignatureAlgorithm | null =
    input.signature.length === 40
      ? "sha1"
      : input.signature.length === 64
        ? "sha256"
        : null;

  if (!signatureAlgorithm || !/^[a-f0-9]+$/i.test(input.signature)) {
    return false;
  }

  const apiSignRequest = cloudinary.utils
    .api_sign_request as unknown as ApiSignRequest;
  const expectedSignature = apiSignRequest(
    { public_id: input.publicId, version: input.version },
    apiSecret,
    signatureAlgorithm,
    1,
  );
  const expected = Buffer.from(expectedSignature, "utf8");
  const actual = Buffer.from(input.signature, "utf8");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
