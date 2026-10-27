import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GradeImportModal } from "../grade-import-modal";
import type { EvaluationImportPreviewDto } from "@/types/evaluation-import";

describe("GradeImportModal (Auto-inspect & UI/UX)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockSuccessPreview: EvaluationImportPreviewDto = {
    summary: {
      total: 1,
      valid: 1,
      skipped: 0,
      invalid: 0,
      create: 1,
      update: 0,
      unchanged: 0,
    },
    criteria: [{ name: "Tiêu chí 1", weight: 100 }],
    warnings: [],
    rows: [
      {
        rowNumber: 2,
        mssv: "21110275",
        fullName: "Phạm Phúc Hưng",
        studentId: "student-1",
        score: 7,
        feedback: "",
        status: "valid",
        action: "create",
      },
    ],
  };

  it("does not render obsolete 'Kiểm tra tệp' button", () => {
    render(
      <GradeImportModal
        open={true}
        onClose={vi.fn()}
        assignmentId="assignment-1"
        classSectionId="class-1"
        maxScore={10}
        onSuccess={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Kiểm tra tệp" }),
    ).not.toBeInTheDocument();
  });

  it("automatically inspects file upon file selection", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockSuccessPreview }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <GradeImportModal
        open={true}
        onClose={vi.fn()}
        assignmentId="assignment-1"
        classSectionId="class-1"
        maxScore={10}
        onSuccess={vi.fn()}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const file = new File(["dummy content"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/teacher/assignments/assignment-1/evaluations/import-preview",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        }),
      );
    });

    // Preview table displays parsed data
    await waitFor(() => {
      expect(screen.getByText("Phạm Phúc Hưng")).toBeInTheDocument();
      expect(screen.getByText("Tiêu chí 1: 100%")).toBeInTheDocument();
    });
  });

  it("shows loading state while auto-inspecting", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    const pendingPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    const fetchMock = vi.fn().mockReturnValue(pendingPromise);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <GradeImportModal
        open={true}
        onClose={vi.fn()}
        assignmentId="assignment-1"
        classSectionId="class-1"
        maxScore={10}
        onSuccess={vi.fn()}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "grades.xlsx");

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Expect loading text and disabled input
    expect(screen.getByText(/đang kiểm tra/i)).toBeInTheDocument();
    expect(fileInput).toBeDisabled();

    // Resolve fetch
    resolveFetch({
      ok: true,
      json: async () => ({ data: mockSuccessPreview }),
    });

    await waitFor(() => {
      expect(screen.queryByText(/đang kiểm tra/i)).not.toBeInTheDocument();
      expect(fileInput).not.toBeDisabled();
    });
  });

  it("shows error and provides 'Thử lại' button on failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: "Tệp không có dữ liệu" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSuccessPreview }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <GradeImportModal
        open={true}
        onClose={vi.fn()}
        assignmentId="assignment-1"
        classSectionId="class-1"
        maxScore={10}
        onSuccess={vi.fn()}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "grades.xlsx");

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Tệp không có dữ liệu")).toBeInTheDocument();
    });

    const retryButton = screen.getByRole("button", { name: /thử lại/i });
    expect(retryButton).toBeInTheDocument();

    // Click Retry
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Phạm Phúc Hưng")).toBeInTheDocument();
    });
  });
});
