import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { ClassCreateFlow } from "./class-create-flow";

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn(async () => data),
  } as unknown as Response;
}

function enterDetails() {
  fireEvent.change(screen.getByLabelText("Mã lớp"), {
    target: { value: "CS101" },
  });
  fireEvent.change(screen.getByLabelText("Tên lớp"), {
    target: { value: "Nhập môn" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
}

describe("ClassCreateFlow", () => {
  beforeEach(() => {
    push.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:pins"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not create a class before the final confirmation", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          data: {
            classSection: {
              id: "class-1",
              code: "CS101",
              name: "Nhập môn",
              createdAt: "2026-09-02T00:00:00.000Z",
              updatedAt: "2026-09-02T00:00:00.000Z",
            },
            import: null,
          },
        },
        201,
      ),
    );

    render(<ClassCreateFlow />);
    enterDetails();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua, thêm sau" }));

    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Tạo lớp không có sinh viên" }),
    );

    await screen.findByText("Đã tạo lớp CS101");
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/teacher/class-section-setups",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.getByRole("button", { name: "Đi tới lớp" })).toBeEnabled();
  });

  it("requires a PIN download before opening a class with new students", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            summary: { total: 1, valid: 1, skipped: 0 },
            rows: [
              {
                row: 2,
                status: "valid",
                student: { mssv: "SV01", fullName: "Nguyễn An" },
              },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            data: {
              classSection: {
                id: "class-1",
                code: "CS101",
                name: "Nhập môn",
                createdAt: "2026-09-02T00:00:00.000Z",
                updatedAt: "2026-09-02T00:00:00.000Z",
              },
              import: {
                summary: { total: 1, created: 1, updated: 0, skipped: 0 },
                rows: [
                  {
                    row: 2,
                    status: "created",
                    studentId: "student-1",
                    initialNickname: "SV01",
                    initialPin: "123456",
                  },
                ],
              },
            },
          },
          201,
        ),
      );

    render(<ClassCreateFlow />);
    enterDetails();
    const file = new File(["MSSV,Họ Tên\nSV01,Nguyễn An\n"], "students.csv");
    fireEvent.change(screen.getByLabelText(/Tệp danh sách/), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra tệp" }));
    await screen.findByText("Nguyễn An");
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục xác nhận" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Tạo lớp và thêm 1 sinh viên" }),
    );

    await screen.findByText("Đã tạo lớp CS101");
    const goToClass = screen.getByRole("button", { name: "Đi tới lớp" });
    expect(goToClass).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Tải danh sách PIN" }));
    await waitFor(() => expect(goToClass).toBeEnabled());
  });
});
