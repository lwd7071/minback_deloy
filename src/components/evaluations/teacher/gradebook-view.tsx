"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IntentPrefetchLink as Link } from "@/components/ui/intent-prefetch-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  GradebookAssignmentHeaderDto,
  GradebookCellEvaluationDto,
  GradebookDto,
  GradebookPaginationMetaDto,
  GradebookStudentColumnDto,
} from "@/types/gradebook";

/**
 * Presentational Sub-component: Tiêu đề danh sách bài tập (ISP).
 * Chỉ nhận danh sách header bài tập, không phụ thuộc vào dữ liệu sinh viên hay điểm số.
 */
export function GradebookHeader({
  assignments,
  classSectionId,
}: {
  assignments: GradebookAssignmentHeaderDto[];
  classSectionId: string;
}) {
  return (
    <thead>
      <tr>
        <th className="table-sticky-col">Sinh viên</th>
        {assignments.map((assignment) => (
          <th key={assignment.id} title={assignment.title}>
            <Link
              href={`/admin/classes/${classSectionId}/assignments/${assignment.id}/grade`}
            >
              {assignment.title}
            </Link>
            <small className="muted" style={{ display: "block" }}>
              {assignment.included
                ? `${assignment.weight}% tổng kết`
                : "Không tính tổng"}
            </small>
          </th>
        ))}
        <th>Tổng kết /10</th>
      </tr>
    </thead>
  );
}

/**
 * Presentational Sub-component: Một ô điểm đánh giá đơn lẻ (ISP).
 * Chỉ nhận thông tin điểm của bài tập tương ứng và thang điểm tối đa.
 */
export function GradebookCell({
  evaluation,
  maxScore,
}: {
  evaluation?: GradebookCellEvaluationDto;
  maxScore: number;
}) {
  if (!evaluation) {
    return <span className="muted">—</span>;
  }

  return (
    <span className="cluster">
      {evaluation.score ?? "—"}/{maxScore}
      <Badge variant={evaluation.status}>{evaluation.status}</Badge>
    </span>
  );
}

/**
 * Presentational Sub-component: Một dòng sinh viên trong bảng điểm (ISP).
 * Chỉ nhận thông tin của sinh viên đó, danh sách cột bài tập và map điểm của riêng sinh viên này.
 */
export function GradebookRow({
  student,
  assignments,
  evaluationsByAssignment,
  total,
  classSectionId,
}: {
  student: GradebookStudentColumnDto;
  assignments: GradebookAssignmentHeaderDto[];
  evaluationsByAssignment?: Record<string, GradebookCellEvaluationDto>;
  total?: GradebookDto["totals"][string];
  classSectionId: string;
}) {
  return (
    <tr>
      <td className="table-sticky-col">
        <strong>{student.mssv}</strong>
        <br />
        <span className="muted">{student.fullName}</span>
      </td>
      {assignments.map((assignment) => (
        <td key={assignment.id}>
          <Link
            href={`/admin/classes/${classSectionId}/assignments/${assignment.id}/grade`}
            aria-label={`Mở chấm điểm ${assignment.title} cho ${student.fullName}`}
          >
            <GradebookCell
              evaluation={evaluationsByAssignment?.[assignment.id]}
              maxScore={assignment.maxScore}
            />
          </Link>
        </td>
      ))}
      <td>
        <strong>
          {total?.score === null || !total ? "—" : total.score.toFixed(1)}
        </strong>
        {total?.score !== null && total ? (
          <small className="muted" style={{ display: "block" }}>
            {total.status === "final" ? "Chính thức" : "Tạm tính"}
          </small>
        ) : null}
      </td>
    </tr>
  );
}

/**
 * Presentational Sub-component: Thanh phân trang 2 chiều độc lập (ISP).
 * Chỉ nhận metadata phân trang và id lớp học phần để xây dựng liên kết điều hướng.
 */
export function GradebookPagination({
  meta,
  classSectionId,
}: {
  meta: GradebookPaginationMetaDto;
  classSectionId: string;
}) {
  const studentPages = Math.max(
    1,
    Math.ceil(meta.students.total / meta.students.pageSize),
  );
  const assignmentPages = Math.max(
    1,
    Math.ceil(meta.assignments.total / meta.assignments.pageSize),
  );

  const href = (studentPage: number, assignmentPage: number) =>
    `/admin/classes/${classSectionId}/gradebook?studentPage=${studentPage}&assignmentPage=${assignmentPage}`;

  return (
    <nav
      className="pagination-summary cluster"
      aria-label="Phân trang bảng điểm"
    >
      <span>
        Sinh viên {meta.students.page}/{studentPages}
      </span>
      {meta.students.page === 1 ? (
        <span className="pagination-link is-disabled">Trước</span>
      ) : (
        <Link href={href(meta.students.page - 1, meta.assignments.page)}>
          Trước
        </Link>
      )}
      {meta.students.page === studentPages ? (
        <span className="pagination-link is-disabled">Sau</span>
      ) : (
        <Link href={href(meta.students.page + 1, meta.assignments.page)}>
          Sau
        </Link>
      )}
      <span>
        Bài tập {meta.assignments.page}/{assignmentPages}
      </span>
      {meta.assignments.page === 1 ? (
        <span className="pagination-link is-disabled">Trước</span>
      ) : (
        <Link href={href(meta.students.page, meta.assignments.page - 1)}>
          Trước
        </Link>
      )}
      {meta.assignments.page === assignmentPages ? (
        <span className="pagination-link is-disabled">Sau</span>
      ) : (
        <Link href={href(meta.students.page, meta.assignments.page + 1)}>
          Sau
        </Link>
      )}
    </nav>
  );
}

/**
 * Composite View: Bảng điểm ma trận 2 chiều của lớp học phần.
 *
 * Tuân thủ Interface Segregation Principle (ISP):
 * - Hợp nhất từ các sub-component có hợp đồng props hẹp, độc lập và rõ ràng.
 * - Cho phép dễ dàng tối ưu hóa memoization và test từng phần giao diện độc lập.
 */
export function GradebookView({
  classSectionId,
  data,
}: {
  classSectionId: string;
  data: GradebookDto;
}) {
  const router = useRouter();
  const [configuration, setConfiguration] = useState(data.assignmentsConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const originalConfiguration = useMemo(
    () => JSON.stringify(data.assignmentsConfig),
    [data.assignmentsConfig],
  );
  const includedWeight = configuration.reduce(
    (sum, item) => sum + (item.included ? (item.weight ?? 0) : 0),
    0,
  );
  const configValid =
    !configuration.some(
      (item) => item.included && (item.weight === null || item.weight <= 0),
    ) &&
    (includedWeight === 0 || Math.abs(includedWeight - 100) <= 0.01);
  const dirty = JSON.stringify(configuration) !== originalConfiguration;

  async function saveConfiguration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(
        `/api/v1/teacher/class-sections/${classSectionId}/gradebook/config`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            assignments: configuration.map((item) => ({
              assignmentId: item.id,
              included: item.included,
              weight: item.weight,
            })),
          }),
        },
      );
      const body = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(
          body.error?.message ?? "Không thể lưu cấu hình bảng điểm",
        );
      }
      setSaved(true);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể lưu cấu hình bảng điểm",
      );
    } finally {
      setSaving(false);
    }
  }

  function updateConfiguration(
    assignmentId: string,
    update: Partial<(typeof configuration)[number]>,
  ) {
    setConfiguration((current) =>
      current.map((item) =>
        item.id === assignmentId ? { ...item, ...update } : item,
      ),
    );
    setSaved(false);
  }

  const hasStudents = data.meta.students.total > 0;
  const hasAssignments = data.meta.assignments.total > 0;

  if (!hasStudents || !hasAssignments) {
    const title =
      !hasStudents && !hasAssignments
        ? "Chưa có dữ liệu bảng điểm"
        : !hasStudents
          ? "Chưa có sinh viên"
          : "Chưa có bài tập";
    const description =
      !hasStudents && !hasAssignments
        ? "Thêm sinh viên và tạo bài tập để bắt đầu theo dõi bảng điểm."
        : !hasStudents
          ? "Thêm sinh viên vào lớp để bắt đầu nhập điểm."
          : "Tạo bài tập cho lớp để bắt đầu nhập điểm.";

    return (
      <div className="stack">
        <GradebookConfiguration
          assignments={configuration}
          includedWeight={includedWeight}
          valid={configValid}
          dirty={dirty}
          saving={saving}
          saved={saved}
          error={error}
          onUpdate={updateConfiguration}
          onSave={saveConfiguration}
        />
        <EmptyState icon="book" title={title} description={description} />
      </div>
    );
  }

  return (
    <div className="stack">
      <GradebookConfiguration
        assignments={configuration}
        includedWeight={includedWeight}
        valid={configValid}
        dirty={dirty}
        saving={saving}
        saved={saved}
        error={error}
        onUpdate={updateConfiguration}
        onSave={saveConfiguration}
      />
      <div className="table-wrap">
        <table>
          <GradebookHeader
            assignments={data.assignments}
            classSectionId={classSectionId}
          />
          <tbody>
            {data.students.map((student) => (
              <GradebookRow
                key={student.id}
                student={student}
                assignments={data.assignments}
                evaluationsByAssignment={data.evaluations[student.id]}
                total={data.totals[student.id]}
                classSectionId={classSectionId}
              />
            ))}
          </tbody>
        </table>
      </div>
      <GradebookPagination meta={data.meta} classSectionId={classSectionId} />
    </div>
  );
}

function GradebookConfiguration({
  assignments,
  includedWeight,
  valid,
  dirty,
  saving,
  saved,
  error,
  onUpdate,
  onSave,
}: {
  assignments: GradebookDto["assignmentsConfig"];
  includedWeight: number;
  valid: boolean;
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
  onUpdate: (
    assignmentId: string,
    update: Partial<GradebookDto["assignmentsConfig"][number]>,
  ) => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <form className="card stack" onSubmit={onSave}>
      <div>
        <h2>Cấu hình điểm tổng kết</h2>
        <p className="muted">
          Chọn bài được tính và đặt trọng số. Tổng trọng số cần bằng 100%; bài
          mới mặc định không tính.
        </p>
      </div>
      {assignments.length ? (
        <div className="stack">
          {assignments.map((assignment) => (
            <div className="cluster" key={assignment.id}>
              <label className="cluster" style={{ flex: 1 }}>
                <input
                  type="checkbox"
                  checked={assignment.included}
                  onChange={(event) =>
                    onUpdate(assignment.id, { included: event.target.checked })
                  }
                />
                <span>{assignment.title}</span>
              </label>
              <label className="cluster">
                <span>Trọng số (%)</span>
                <input
                  aria-label={`Trọng số ${assignment.title}`}
                  className="form-input"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={assignment.weight ?? ""}
                  disabled={!assignment.included}
                  onChange={(event) =>
                    onUpdate(assignment.id, {
                      weight:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    })
                  }
                />
              </label>
            </div>
          ))}
          <p className={valid ? "muted" : "form-error"} aria-live="polite">
            Tổng trọng số đang chọn: {includedWeight.toFixed(2)}%
            {!valid ? " · Cần bằng 100% trước khi lưu." : ""}
          </p>
        </div>
      ) : (
        <p className="muted">Tạo bài tập để thêm cột vào bảng điểm.</p>
      )}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="form-success" role="status">
          Đã lưu cấu hình bảng điểm.
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={!dirty || !valid || !assignments.length}
        loading={saving}
      >
        Lưu cấu hình
      </Button>
    </form>
  );
}
