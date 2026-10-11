import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/evaluations/evaluation-export-service", () => ({
  generateEvaluationExport: vi.fn().mockResolvedValue({
    buffer: Buffer.from("xlsx"),
    fileName: "BangDiem_Bài_tập.xlsx",
  }),
}));

import { GET } from "./route";

describe("Evaluation export route", () => {
  it("returns an XLSX attachment with an RFC 5987 UTF-8 filename", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ assignmentId: "assignment-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      "attachment; filename=\"BangDiem_Bai_tap.xlsx\"; filename*=UTF-8''BangDiem_B%C3%A0i_t%E1%BA%ADp.xlsx",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
