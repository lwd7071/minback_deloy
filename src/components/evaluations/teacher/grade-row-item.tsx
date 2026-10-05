"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { StudentAdminDto } from "@/types/student";
import type { ResultRow } from "./use-bulk-grade";

export interface GradeRowItemProps {
  student: StudentAdminDto;
  evaluation?: ResultRow;
  maxScore: number;
  onSave: (
    studentId: string,
    score: number | null,
    feedback: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

export function GradeRowItem({
  student,
  evaluation,
  maxScore,
  onSave,
}: GradeRowItemProps) {
  const [editing, setEditing] = useState(false);
  const [draftScore, setDraftScore] = useState("");
  const [draftFeedback, setDraftFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scoreInputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraftScore(
      evaluation?.score !== undefined && evaluation?.score !== null
        ? String(evaluation.score)
        : "",
    );
    setDraftFeedback(evaluation?.feedback || "");
    setError(null);
    setEditing(true);
    setTimeout(() => {
      scoreInputRef.current?.focus();
    }, 50);
  }

  function cancelEdit() {
    setError(null);
    setEditing(false);
  }

  async function handleSave() {
    setError(null);
    let parsedScore: number | null = null;
    const trimmedScore = draftScore.trim();

    if (trimmedScore !== "") {
      const num = Number(trimmedScore);
      if (Number.isNaN(num)) {
        setError("Điểm phải là số hợp lệ");
        return;
      }
      if (num < 0) {
        setError("Điểm không được âm");
        return;
      }
      if (num > maxScore) {
        setError(`Điểm tối đa là ${maxScore}`);
        return;
      }
      // Check 1 decimal place: Number.isInteger(num * 10)
      if (!Number.isInteger(Math.round(num * 100) / 10)) {
        setError("Điểm chỉ có tối đa một chữ số thập phân");
        return;
      }
      parsedScore = num;
    }

    setSaving(true);
    try {
      const result = await onSave(student.id, parsedScore, draftFeedback.trim());
      if (result.success) {
        setEditing(false);
      } else {
        setError(result.error || "Không thể lưu điểm");
      }
    } catch {
      setError("Đã xảy ra lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  }

  return (
    <tr>
      <td className="identity-mono">{student.mssv}</td>
      <td>{student.fullName}</td>
      <td>
        {editing ? (
          <div>
            <input
              ref={scoreInputRef}
              type="number"
              step="0.1"
              min="0"
              max={maxScore}
              className="form-input"
              style={{ width: "90px" }}
              value={draftScore}
              disabled={saving}
              onChange={(e) => setDraftScore(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label={`Điểm của ${student.fullName}`}
            />
            {error ? (
              <div
                className="status-text status-error"
                style={{ fontSize: "0.8rem", marginTop: "2px" }}
              >
                {error}
              </div>
            ) : null}
          </div>
        ) : (
          evaluation?.score ?? "—"
        )}
      </td>
      <td className="grade-feedback-cell">
        {editing ? (
          <input
            type="text"
            className="form-input"
            style={{ width: "100%", minWidth: "160px" }}
            value={draftFeedback}
            placeholder="Nhận xét..."
            disabled={saving}
            onChange={(e) => setDraftFeedback(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label={`Feedback cho ${student.fullName}`}
          />
        ) : (
          evaluation?.feedback || "—"
        )}
      </td>
      <td>
        <Badge
          variant={
            evaluation?.status === "returned"
              ? "returned"
              : evaluation?.status === "graded"
                ? "success"
                : "neutral"
          }
        >
          {evaluation?.status === "returned"
            ? "Đã công bố"
            : evaluation?.status === "graded"
              ? "Chưa công bố"
              : "Chưa có kết quả"}
        </Badge>
      </td>
      <td>
        {editing ? (
          <div className="cluster" style={{ gap: "4px" }}>
            <button
              type="button"
              className="button button-sm"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Lưu…" : "Lưu"}
            </button>
            <button
              type="button"
              className="button button-secondary button-sm"
              disabled={saving}
              onClick={cancelEdit}
            >
              Hủy
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="button button-secondary button-sm"
            onClick={startEdit}
          >
            Sửa
          </button>
        )}
      </td>
    </tr>
  );
}
