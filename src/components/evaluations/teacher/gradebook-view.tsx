"use client";

import Link from "next/link";
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
}: {
  assignments: GradebookAssignmentHeaderDto[];
}) {
  return (
    <thead>
      <tr>
        <th className="table-sticky-col">Sinh viên</th>
        {assignments.map((assignment) => (
          <th key={assignment.id} title={assignment.title}>
            {assignment.title}
          </th>
        ))}
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
}: {
  student: GradebookStudentColumnDto;
  assignments: GradebookAssignmentHeaderDto[];
  evaluationsByAssignment?: Record<string, GradebookCellEvaluationDto>;
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
          <GradebookCell
            evaluation={evaluationsByAssignment?.[assignment.id]}
            maxScore={assignment.maxScore}
          />
        </td>
      ))}
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

    return <EmptyState icon="book" title={title} description={description} />;
  }

  return (
    <>
      <div className="table-wrap">
        <table>
          <GradebookHeader assignments={data.assignments} />
          <tbody>
            {data.students.map((student) => (
              <GradebookRow
                key={student.id}
                student={student}
                assignments={data.assignments}
                evaluationsByAssignment={data.evaluations[student.id]}
              />
            ))}
          </tbody>
        </table>
      </div>
      <GradebookPagination
        meta={data.meta}
        classSectionId={classSectionId}
      />
    </>
  );
}
