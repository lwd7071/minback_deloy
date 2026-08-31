"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AssignmentDto } from "@/types/assignment";
export function ClassAssignmentsView({
  classSectionId,
}: {
  classSectionId: string;
}) {
  const [rows, setRows] = useState<AssignmentDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    assignedDate: "",
    dueDate: "",
    maxScore: "10",
  });
  useEffect(() => {
    let active = true;
    void fetch(`/api/v1/teacher/class-sections/${classSectionId}/assignments`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.data)
          throw new Error(body.error?.message ?? "Không thể tải bài tập");
        return body.data as AssignmentDto[];
      })
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Không thể tải bài tập",
          );
      });
    return () => {
      active = false;
    };
  }, [classSectionId, refreshKey]);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/teacher/class-sections/${classSectionId}/assignments`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...draft, maxScore: Number(draft.maxScore) }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Không thể tạo bài tập");
      setDraft({
        title: "",
        description: "",
        assignedDate: "",
        dueDate: "",
        maxScore: "10",
      });
      setShowCreate(false);
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tạo bài tập",
      );
    } finally {
      setBusy(false);
    }
  }
  if (error) return <p className="form-error">{error}</p>;
  return (
    <div className="stack">
      <div className="split">
        <div>
          <h2>Bài tập</h2>
          <p className="muted">Tạo, phát hành và chấm bài trong lớp này.</p>
        </div>
        <Button onClick={() => setShowCreate((value) => !value)}>
          + Tạo bài tập
        </Button>
      </div>
      {showCreate ? (
        <Card>
          <form className="form-stack" onSubmit={(event) => void create(event)}>
            <label className="form-field">
              <span>Tên bài tập</span>
              <input
                required
                value={draft.title}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, title: event.target.value }))
                }
              />
            </label>
            <label className="form-field">
              <span>Mô tả</span>
              <textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <div className="grid">
              <label className="form-field">
                <span>Ngày giao</span>
                <input
                  required
                  type="date"
                  value={draft.assignedDate}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      assignedDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="form-field">
                <span>Hạn nộp</span>
                <input
                  required
                  type="date"
                  value={draft.dueDate}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      dueDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="form-field">
                <span>Điểm tối đa</span>
                <input
                  required
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={draft.maxScore}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      maxScore: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <Button loading={busy}>Tạo bản nháp</Button>
          </form>
        </Card>
      ) : null}
      <div className="grid">
        {rows.map((row) => (
          <Card hover className="stack" key={row.id}>
            <div className="split">
              <Badge variant={row.status}>{row.status}</Badge>
              <span className="muted">{row.dueDate}</span>
            </div>
            <h2>{row.title}</h2>
            <p className="muted">{row.description || "Chưa có mô tả."}</p>
            <div className="cluster">
              <Link
                className="btn btn-secondary"
                href={`/admin/classes/${classSectionId}?tab=assignments&assignment=${row.id}`}
              >
                Chỉnh sửa
              </Link>
              <Link
                className="btn btn-primary"
                href={`/admin/classes/${classSectionId}/assignments/${row.id}/grade`}
              >
                Chấm bài
              </Link>
            </div>
          </Card>
        ))}
        {!rows.length ? (
          <Card>
            <p className="muted">Chưa có bài tập trong lớp.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
