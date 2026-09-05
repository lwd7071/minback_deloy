"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { GradebookDto } from "@/types/frontend-rebuild";
export function GradebookView({
  classSectionId,
  data,
}: {
  classSectionId: string;
  data: GradebookDto;
}) {
  const studentPages = Math.max(
    1,
    Math.ceil(data.meta.students.total / data.meta.students.pageSize),
  );
  const assignmentPages = Math.max(
    1,
    Math.ceil(data.meta.assignments.total / data.meta.assignments.pageSize),
  );
  const href = (studentPage: number, assignmentPage: number) =>
    `/admin/classes/${classSectionId}/gradebook?studentPage=${studentPage}&assignmentPage=${assignmentPage}`;
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="table-sticky-col">Sinh viên</th>
              {data.assignments.map((assignment) => (
                <th key={assignment.id} title={assignment.title}>
                  {assignment.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.students.map((student) => (
              <tr key={student.id}>
                <td className="table-sticky-col">
                  <strong>{student.mssv}</strong>
                  <br />
                  <span className="muted">{student.fullName}</span>
                </td>
                {data.assignments.map((assignment) => {
                  const evaluation =
                    data.evaluations[student.id]?.[assignment.id];
                  return (
                    <td key={assignment.id}>
                      {evaluation ? (
                        <span className="cluster">
                          {evaluation.score ?? "—"}/{assignment.maxScore}
                          <Badge variant={evaluation.status}>
                            {evaluation.status}
                          </Badge>
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav
        className="pagination-summary cluster"
        aria-label="Phân trang bảng điểm"
      >
        <span>
          Sinh viên {data.meta.students.page}/{studentPages}
        </span>
        {data.meta.students.page === 1 ? (
          <span className="pagination-link is-disabled">Trước</span>
        ) : (
          <Link
            href={href(data.meta.students.page - 1, data.meta.assignments.page)}
          >
            Trước
          </Link>
        )}
        {data.meta.students.page === studentPages ? (
          <span className="pagination-link is-disabled">Sau</span>
        ) : (
          <Link
            href={href(data.meta.students.page + 1, data.meta.assignments.page)}
          >
            Sau
          </Link>
        )}
        <span>
          Bài tập {data.meta.assignments.page}/{assignmentPages}
        </span>
        {data.meta.assignments.page === 1 ? (
          <span className="pagination-link is-disabled">Trước</span>
        ) : (
          <Link
            href={href(data.meta.students.page, data.meta.assignments.page - 1)}
          >
            Trước
          </Link>
        )}
        {data.meta.assignments.page === assignmentPages ? (
          <span className="pagination-link is-disabled">Sau</span>
        ) : (
          <Link
            href={href(data.meta.students.page, data.meta.assignments.page + 1)}
          >
            Sau
          </Link>
        )}
      </nav>
    </>
  );
}
