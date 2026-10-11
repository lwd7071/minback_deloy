import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ImportPreviewTable } from "../import-preview-table";

describe("ImportPreviewTable", () => {
  afterEach(cleanup);

  it("labels ungraded roster rows as skipped rather than errors", () => {
    render(
      <ImportPreviewTable
        rows={[
          {
            rowNumber: 2,
            mssv: "001234",
            fullName: "Nguyễn An",
            score: null,
            feedback: null,
            status: "skipped",
          },
        ]}
      />,
    );

    expect(screen.getByText("Chưa có điểm, bỏ qua")).toBeInTheDocument();
    expect(
      screen.getByText("Chưa có điểm, bỏ qua").closest("tr"),
    ).not.toHaveClass("import-row-invalid");
  });
});
