import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { ClassCreateFlow } from "../class-create-flow";

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

  it("allows navigating to class immediately with default credentials info", async () => {
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
    // Auto-inspect triggers automatically without clicking "Kiểm tra tệp"
    await screen.findByText("Nguyễn An");
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục xác nhận" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Tạo lớp và thêm 1 sinh viên" }),
    );

    await screen.findByText("Đã tạo lớp CS101");
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName.toLowerCase() === "p" &&
          Boolean(
            element.textContent?.includes(
              "kích hoạt tài khoản và tạo mã PIN",
            ),
          ),
      ),
    ).toBeInTheDocument();
    const goToClass = screen.getByRole("button", { name: "Đi tới lớp" });
    expect(goToClass).toBeEnabled();
    fireEvent.click(goToClass);
    expect(push).toHaveBeenCalledWith("/admin/classes/class-1");
  });

  it("does not render obsolete 'Kiểm tra tệp' button and places 'Bỏ qua, thêm sau' directly in actions bar", () => {
    render(<ClassCreateFlow />);
    enterDetails();

    expect(
      screen.queryByRole("button", { name: "Kiểm tra tệp" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bỏ qua, thêm sau" }),
    ).toBeInTheDocument();
  });

  it("displays error and allows retry when auto-inspection fails", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ error: { message: "Tệp không hợp lệ" } }, 400),
      )
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
      );

    render(<ClassCreateFlow />);
    enterDetails();

    const file = new File(["dummy"], "students.csv");
    fireEvent.change(screen.getByLabelText(/Tệp danh sách/), {
      target: { files: [file] },
    });

    await screen.findByText("Tệp không hợp lệ");
    const retryBtn = screen.getByRole("button", { name: /thử lại/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    await screen.findByText("Nguyễn An");
  });

  it("renders a download link for the sample template file at the roster step", () => {
    render(<ClassCreateFlow />);
    enterDetails();

    const templateLink = screen.getByRole("link", {
      name: /tải file mẫu/i,
    });
    expect(templateLink).toBeInTheDocument();
    expect(templateLink).toHaveAttribute(
      "href",
      "/templates/mau-danh-sach-sinh-vien.xlsx",
    );
    expect(templateLink).toHaveAttribute(
      "download",
      "mau-danh-sach-sinh-vien.xlsx",
    );
  });
});
