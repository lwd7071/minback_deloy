import type { EvaluationImportPreviewRowDto } from "@/types/evaluation-import";

export function ImportPreviewTable({
  rows,
}: {
  rows: EvaluationImportPreviewRowDto[];
}) {
  return (
    <div className="table-wrap import-preview-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Dòng</th>
            <th>MSSV</th>
            <th>Họ tên</th>
            <th>Điểm</th>
            <th>Feedback</th>
            <th>Kết quả</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className={
                row.status === "invalid" || row.status === "skipped"
                  ? "import-row-invalid"
                  : ""
              }
              key={row.rowNumber}
            >
              <td>{row.rowNumber}</td>
              <td className="identity-mono">{row.mssv || "—"}</td>
              <td>{row.fullName || "—"}</td>
              <td>{row.score ?? "—"}</td>
              <td className="import-feedback-cell" title={row.feedback ?? ""}>
                {row.feedback || "—"}
              </td>
              <td>
                {row.status === "valid" ? (
                  <span className="badge badge-success">
                    {row.action ?? "Hợp lệ"}
                  </span>
                ) : (
                  <span className="badge badge-error">
                    {row.errors?.[0]?.message || "Lỗi"}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
