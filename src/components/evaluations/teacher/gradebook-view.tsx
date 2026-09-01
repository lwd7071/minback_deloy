"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { GradebookDto } from "@/types/frontend-rebuild";
export function GradebookView({ classSectionId }: { classSectionId: string }) {
  const [data, setData] = useState<GradebookDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void fetch(
      `/api/v1/teacher/class-sections/${classSectionId}/gradebook?studentPageSize=100&assignmentPageSize=50`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.data)
          throw new Error(body.error?.message ?? "Không thể tải bảng điểm");
        return body.data as GradebookDto;
      })
      .then((value) => {
        if (active) setData(value);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Không thể tải bảng điểm",
          );
      });
    return () => {
      active = false;
    };
  }, [classSectionId]);
  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <p className="muted">Đang tải bảng điểm…</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Sinh viên</th>
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
              <td>
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
  );
}
