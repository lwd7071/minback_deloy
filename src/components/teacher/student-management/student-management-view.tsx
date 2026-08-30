"use client";

import { useEffect, useState } from "react";
import type { StudentAdminDto } from "@/types/student";

type ApiResult<T> = { data: T; meta?: { page: number; pageSize: number; total: number } } | { error: { message: string } };

export function StudentManagementView({ classSectionId }: { classSectionId: string }) {
  const [students, setStudents] = useState<StudentAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // State sửa thông tin student
  const [editingStudent, setEditingStudent] = useState<StudentAdminDto | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // State Reset PIN
  const [resetPinStudent, setResetPinStudent] = useState<StudentAdminDto | null>(null);
  const [initialPin, setInitialPin] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  // refreshKey tăng lên mỗi khi cần tải lại danh sách (sau save/reset PIN)
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const url = `/api/v1/teacher/class-sections/${classSectionId}/students?page=${page}&pageSize=20${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        const body = (await res.json()) as ApiResult<StudentAdminDto[]>;

        if (cancelled) return;

        if (!res.ok || !("data" in body)) {
          throw new Error("error" in body ? body.error.message : "Không thể tải danh sách sinh viên");
        }

        setStudents(body.data);
        if (body.meta) setTotal(body.meta.total);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Lỗi kết nối");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    // Cleanup: huỷ setState khi component unmount hoặc deps thay đổi
    return () => { cancelled = true; };
  }, [classSectionId, page, search, refreshKey]);

  function startEdit(st: StudentAdminDto) {
    setEditingStudent(st);
    setEditFullName(st.fullName);
    setEditEmail(st.email ?? "");
    setEditNickname(st.nickname);
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStudent) return;

    setEditBusy(true);
    setEditError(null);

    try {
      const res = await fetch(
        `/api/v1/teacher/class-sections/${classSectionId}/students/${editingStudent.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fullName: editFullName.trim(),
            email: editEmail.trim() || null,
            nickname: editNickname.trim(),
          }),
        },
      );

      const body = (await res.json()) as ApiResult<StudentAdminDto>;
      if (!res.ok || !("data" in body)) {
        throw new Error("error" in body ? body.error.message : "Không thể lưu cập nhật");
      }

      setEditingStudent(null);
      triggerRefresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setEditBusy(false);
    }
  }

  async function handleResetPin(st: StudentAdminDto) {
    setResetPinStudent(st);
    setInitialPin(null);
    setResetBusy(true);

    try {
      const res = await fetch(
        `/api/v1/teacher/class-sections/${classSectionId}/students/${st.id}/reset-pin`,
        { method: "POST" },
      );

      const body = (await res.json()) as ApiResult<{ initialPin: string }>;
      if (!res.ok || !("data" in body)) {
        throw new Error("error" in body ? body.error.message : "Reset PIN thất bại");
      }

      setInitialPin(body.data.initialPin);
      triggerRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi reset PIN");
      setResetPinStudent(null);
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="settings-stack">
      {/* Ô tìm kiếm & tổng số */}
      <div className="settings-row" style={{ alignItems: "center" }}>
        <input
          type="text"
          className="form-input"
          style={{ maxWidth: "320px" }}
          placeholder="Tìm theo MSSV, Họ tên, Nickname…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <span className="muted">Tổng số: {total} sinh viên</span>
      </div>

      {loading ? (
        <p className="muted">Đang tải danh sách sinh viên…</p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : students.length === 0 ? (
        <p className="muted">Không tìm thấy sinh viên nào trong lớp này.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.88rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: "10px" }}>MSSV</th>
                <th style={{ padding: "10px" }}>Họ và tên</th>
                <th style={{ padding: "10px" }}>Nickname</th>
                <th style={{ padding: "10px" }}>Email</th>
                <th style={{ padding: "10px" }}>Trạng thái PIN</th>
                <th style={{ padding: "10px", textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {students.map((st) => (
                <tr key={st.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px", fontWeight: 600 }}>{st.mssv}</td>
                  <td style={{ padding: "10px" }}>{st.fullName}</td>
                  <td style={{ padding: "10px" }}>{st.nickname}</td>
                  <td style={{ padding: "10px" }} className="muted">
                    {st.email ?? "—"}
                  </td>
                  <td style={{ padding: "10px" }}>
                    {st.mustChangePin ? (
                      <span style={{ color: "#dc6803", fontWeight: 600 }}>Cần đổi PIN</span>
                    ) : (
                      <span style={{ color: "#18733b" }}>Bình thường</span>
                    )}
                  </td>
                  <td style={{ padding: "10px", textAlign: "right" }}>
                    <button
                      className="button button-secondary"
                      style={{ fontSize: "0.75rem", padding: "4px 8px", marginRight: "6px" }}
                      onClick={() => startEdit(st)}
                    >
                      Sửa
                    </button>
                    <button
                      className="button button-secondary"
                      style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                      onClick={() => void handleResetPin(st)}
                    >
                      Reset PIN
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal / Dialog Sửa thông tin */}
      {editingStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            className="surface"
            style={{ width: "100%", maxWidth: "440px", padding: "24px" }}
          >
            <h3>Cập nhật Sinh viên: {editingStudent.mssv}</h3>
            <form onSubmit={(e) => void handleSaveEdit(e)} style={{ display: "grid", gap: "14px", marginTop: "14px" }}>
              <div>
                <label className="form-label">Họ và tên</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Nickname</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Email (tùy chọn)</label>
                <input
                  type="email"
                  className="form-input"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>

              {editError && <p className="form-error">{editError}</p>}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setEditingStudent(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="button" disabled={editBusy}>
                  {editBusy ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hiển thị PIN Khởi tạo khi Reset PIN */}
      {resetPinStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div className="surface" style={{ width: "100%", maxWidth: "420px", padding: "24px" }}>
            <h3>Reset PIN thành công</h3>
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              Đã tạo PIN khởi tạo mới cho sinh viên <strong>{resetPinStudent.fullName}</strong> ({resetPinStudent.mssv}):
            </p>

            {resetBusy ? (
              <p className="muted">Đang tạo PIN ngẫu nhiên…</p>
            ) : initialPin ? (
              <div
                style={{
                  background: "color-mix(in srgb, var(--accent) 8%, var(--surface))",
                  border: "1px dashed var(--accent)",
                  borderRadius: "8px",
                  padding: "16px",
                  textAlign: "center",
                  margin: "16px 0",
                }}
              >
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>PIN KHỞI TẠO MỚI:</span>
                <div style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "4px", color: "var(--accent)" }}>
                  {initialPin}
                </div>
                <small className="muted" style={{ display: "block", marginTop: "6px" }}>
                  Mã PIN này chỉ hiển thị đúng một lần. Hãy sao chép để gửi cho Sinh viên.
                </small>
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="button"
                onClick={() => {
                  setResetPinStudent(null);
                  setInitialPin(null);
                }}
              >
                Đã sao chép & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
