"use client";

import { useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  computeTotal,
  CRITERION_MAX_SCORE,
  type Criterion,
  type CriterionScore,
} from "@/lib/evaluation-criteria";
import type { StudentAdminDto } from "@/types/student";
import type { ResultRow } from "./use-bulk-grade";

export interface GradeRowItemProps {
  student: StudentAdminDto;
  evaluation?: ResultRow;
  maxScore: number;
  criteria?: Criterion[];
  onSave: (
    studentId: string,
    score: number | null,
    feedback: string,
    criteriaScores?: CriterionScore[],
  ) => Promise<{ success: boolean; error?: string }>;
}

export function GradeRowItem({
  student,
  evaluation,
  maxScore,
  criteria,
  onSave,
}: GradeRowItemProps) {
  const hasCriteria = Boolean(criteria && criteria.length > 0);
  const [editing, setEditing] = useState(false);
  const [draftScore, setDraftScore] = useState("");
  const [draftCriteriaScores, setDraftCriteriaScores] = useState<
    Record<string, string>
  >({});
  const [draftFeedback, setDraftFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstInputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    if (hasCriteria && criteria) {
      const initialMap: Record<string, string> = {};
      const existingScores = evaluation?.criteriaScores ?? [];
      for (const c of criteria) {
        const found = existingScores.find((es) => es.name === c.name);
        initialMap[c.name] =
          found !== undefined && found.score !== null ? String(found.score) : "";
      }
      setDraftCriteriaScores(initialMap);
    } else {
      setDraftScore(
        evaluation?.score !== undefined && evaluation?.score !== null
          ? String(evaluation.score)
          : "",
      );
    }
    setDraftFeedback(evaluation?.feedback || "");
    setError(null);
    setEditing(true);
    setTimeout(() => {
      firstInputRef.current?.focus();
    }, 50);
  }

  function cancelEdit() {
    setError(null);
    setEditing(false);
  }

  // Tính tổng điểm động realtime khi có criteria
  const computedLiveScore = hasCriteria && criteria
    ? (() => {
        const allBlank = criteria.every(
          (c) => (draftCriteriaScores[c.name] ?? "").trim() === "",
        );
        if (allBlank) return null;
        const validCriteria: CriterionScore[] = [];
        for (const c of criteria) {
          const val = (draftCriteriaScores[c.name] ?? "").trim();
          const num = Number(val);
          if (val === "" || Number.isNaN(num)) return null;
          validCriteria.push({ ...c, score: num });
        }
        return computeTotal(validCriteria, maxScore);
      })()
    : null;

  async function handleSave() {
    setError(null);

    if (hasCriteria && criteria) {
      const allBlank = criteria.every(
        (c) => (draftCriteriaScores[c.name] ?? "").trim() === "",
      );

      if (allBlank) {
        // Xóa trắng điểm
        setSaving(true);
        try {
          const result = await onSave(student.id, null, draftFeedback.trim(), []);
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
        return;
      }

      // Kiểm tra từng tiêu chí
      const criteriaPayload: CriterionScore[] = [];
      for (const c of criteria) {
        const raw = (draftCriteriaScores[c.name] ?? "").trim();
        if (raw === "") {
          setError(`Vui lòng nhập điểm cho tiêu chí "${c.name}"`);
          return;
        }
        const num = Number(raw);
        if (Number.isNaN(num)) {
          setError(`Điểm tiêu chí "${c.name}" phải là số hợp lệ`);
          return;
        }
        if (num < 0 || num > CRITERION_MAX_SCORE) {
          setError(
            `Điểm tiêu chí "${c.name}" phải từ 0 đến ${CRITERION_MAX_SCORE}`,
          );
          return;
        }
        // Kiểm tra tối đa 1 chữ số thập phân
        if (!Number.isInteger(Math.round(num * 100) / 10)) {
          setError(
            `Điểm tiêu chí "${c.name}" chỉ có tối đa một chữ số thập phân`,
          );
          return;
        }
        criteriaPayload.push({ ...c, score: num });
      }

      const total = computeTotal(criteriaPayload, maxScore);
      setSaving(true);
      try {
        const result = await onSave(
          student.id,
          total,
          draftFeedback.trim(),
          criteriaPayload,
        );
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
      return;
    }

    // Trường hợp không có criteria (truyền thống)
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

      {/* Cột cho từng tiêu chí nếu bài tập có criteria */}
      {hasCriteria && criteria
        ? criteria.map((c, index) => {
            const existingScore = evaluation?.criteriaScores?.find(
              (cs) => cs.name === c.name,
            )?.score;
            return (
              <td key={c.name} style={{ textAlign: "right" }}>
                {editing ? (
                  <input
                    ref={index === 0 ? firstInputRef : undefined}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    max={CRITERION_MAX_SCORE}
                    className="form-input"
                    style={{ width: "70px", textAlign: "right" }}
                    value={draftCriteriaScores[c.name] ?? ""}
                    disabled={saving}
                    onChange={(e) =>
                      setDraftCriteriaScores((prev) => ({
                        ...prev,
                        [c.name]: e.target.value,
                      }))
                    }
                    onKeyDown={handleKeyDown}
                    aria-label={`Điểm ${c.name} của ${student.fullName}`}
                  />
                ) : (
                  existingScore !== undefined && existingScore !== null
                    ? existingScore
                    : "—"
                )}
              </td>
            );
          })
        : null}

      {/* Cột Tổng điểm */}
      <td style={{ textAlign: "right" }}>
        {editing ? (
          <div>
            {hasCriteria ? (
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: "var(--color-primary)",
                }}
                aria-label={`Điểm tổng của ${student.fullName}`}
              >
                {computedLiveScore !== null ? computedLiveScore : "—"}
              </span>
            ) : (
              <input
                ref={firstInputRef}
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                max={maxScore}
                className="form-input"
                style={{ width: "80px", textAlign: "right" }}
                value={draftScore}
                disabled={saving}
                onChange={(e) => setDraftScore(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label={`Điểm của ${student.fullName}`}
              />
            )}
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
