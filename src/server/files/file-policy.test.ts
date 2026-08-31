import { describe, expect, it } from "vitest";

import { validateUploadFile } from "./file-policy";

describe("validateUploadFile", () => {
  it("accepts a permitted 20 MB document and rejects executable or oversized files", () => {
    expect(
      validateUploadFile({
        originalName: "assignment.docx",
        bytes: 20 * 1024 * 1024,
      }),
    ).toEqual({ format: "docx" });

    expect(() =>
      validateUploadFile({ originalName: "run.exe", bytes: 1 }),
    ).toThrow("FILE_FORMAT_NOT_ALLOWED");
    expect(() =>
      validateUploadFile({
        originalName: "large.pdf",
        bytes: 20 * 1024 * 1024 + 1,
      }),
    ).toThrow("FILE_TOO_LARGE");
  });
});
