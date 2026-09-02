"use client";

import { useEffect, useState } from "react";
import type { StudentAdminDto } from "@/types/student";
import type { TeacherStudentProfileDto } from "@/types/student-profile";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";

type ApiResult<T> =
  | { data: T; meta?: { page: number; pageSize: number; total: number } }
  | { error: { message: string } };

export function StudentManagementView({
  classSectionId,
}: {
  classSectionId: string;
}) {
  const [students, setStudents] = useState<StudentAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Debounce tìm kiếm 300ms để chống spam request và race condition
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // State sửa thông tin student
  const [editingStudent, setEditingStudent] = useState<StudentAdminDto | null>(
    null,
  );
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // State Reset PIN
  const [resetPinStudent, setResetPinStudent] =
    useState<StudentAdminDto | null>(null);
  const [initialPin, setInitialPin] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  // State hồ sơ học tập Teacher xem trong đúng ClassSection hiện hành.
  const [profileStudent, setProfileStudent] = useState<StudentAdminDto | null>(
    null,
  );
  const [studentProfile, setStudentProfile] =
    useState<TeacherStudentProfileDto | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // refreshKey tăng lên mỗi khi cần tải lại danh sách (sau save/reset PIN)
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const query = debouncedSearch.trim()
          ? `&search=${encodeURIComponent(debouncedSearch.trim())}`
          : "";
        const url = `/api/v1/teacher/class-sections/${classSectionId}/students?page=${page}&pageSize=${pageSize}${query}`;
        const res = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await res.json()) as ApiResult<StudentAdminDto[]>;

        if (controller.signal.aborted) return;

        if (!res.ok || !("data" in body)) {
          throw new Error(
            "error" in body
              ? body.error.message
              : "Không thể tải danh sách sinh viên",
          );
        }

        setStudents(body.data);
        if (body.meta) setTotal(body.meta.total);
        setError(null);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Lỗi kết nối");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    // Hủy bỏ request đang bay dở khi người dùng đổi từ khóa hoặc đổi trang
    return () => {
      controller.abort();
    };
  }, [classSectionId, page, pageSize, debouncedSearch, refreshKey]);

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
        throw new Error(
          "error" in body ? body.error.message : "Không thể lưu cập nhật",
        );
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
        throw new Error(
          "error" in body ? body.error.message : "Reset PIN thất bại",
        );
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

  async function handleViewProfile(st: StudentAdminDto) {
    setProfileStudent(st);
    setStudentProfile(null);
    setProfileLoading(true);

    try {
      const res = await fetch(
        `/api/v1/teacher/class-sections/${classSectionId}/students/${st.id}/profile`,
        { cache: "no-store" },
      );
      const body = (await res.json()) as ApiResult<TeacherStudentProfileDto>;
      if (!res.ok || !("data" in body)) {
        throw new Error(
          "error" in body ? body.error.message : "Không thể tải hồ sơ học tập",
        );
      }
      setStudentProfile(body.data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể tải hồ sơ học tập");
      setProfileStudent(null);
    } finally {
      setProfileLoading(false);
    }
  }

  return (
    <div className="settings-stack">
      {/* Ô tìm kiếm & tổng số */}
      <div className="settings-row">
        <input
          type="text"
          className="form-input"
          placeholder="Tìm theo MSSV, Họ tên, Nickname…"
          autoComplete="off"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <span className="muted">Tổng số: {total} sinh viên</span>
      </div>

      {error ? (
        <p className="form-error">{error}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>MSSV</th>
                <th>Họ và tên</th>
                <th>Nickname</th>
                <th>Email</th>
                <th>Trạng thái PIN</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody
              style={{
                opacity: loading && students.length > 0 ? 0.6 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {loading && students.length === 0 ? (
                // Skeleton Rows: Giữ nguyên khung bảng chống layout shift
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td>
                      <div
                        className="skeleton-block is-strong"
                        style={{ height: "14px", width: "80px" }}
                      />
                    </td>
                    <td>
                      <div
                        className="skeleton-block is-strong"
                        style={{ height: "14px", width: "140px" }}
                      />
                    </td>
                    <td>
                      <div
                        className="skeleton-block"
                        style={{ height: "14px", width: "90px" }}
                      />
                    </td>
                    <td>
                      <div
                        className="skeleton-block"
                        style={{ height: "14px", width: "160px" }}
                      />
                    </td>
                    <td>
                      <div
                        className="skeleton-block is-strong"
                        style={{
                          height: "18px",
                          width: "70px",
                          borderRadius: "9999px",
                        }}
                      />
                    </td>
                    <td>
                      <div
                        className="skeleton-block"
                        style={{ height: "26px", width: "140px" }}
                      />
                    </td>
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="muted"
                    style={{ textAlign: "center", padding: "32px 0" }}
                  >
                    Không tìm thấy sinh viên nào trong lớp này.
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.id}>
                    <td>{st.mssv}</td>
                    <td>{st.fullName}</td>
                    <td>{st.nickname}</td>
                    <td className="muted">{st.email ?? "—"}</td>
                    <td>
                      {st.mustChangePin ? (
                        <span className="status-text status-warning">
                          Cần đổi PIN
                        </span>
                      ) : (
                        <span className="status-text status-success">
                          Bình thường
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="button button-secondary button-sm"
                        onClick={() => void handleViewProfile(st)}
                      >
                        Hồ sơ
                      </button>
                      <button
                        className="button button-secondary button-sm"
                        onClick={() => startEdit(st)}
                      >
                        Sửa
                      </button>
                      <button
                        className="button button-secondary button-sm"
                        onClick={() => void handleResetPin(st)}
                      >
                        Reset PIN
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!error && total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          disabled={loading}
          onPageChange={(newPage) => {
            setPage(newPage);
          }}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[20, 50, 100]}
        />
      )}

      <Modal
        open={Boolean(profileStudent)}
        onClose={() => {
          setProfileStudent(null);
          setStudentProfile(null);
        }}
        title={
          profileStudent
            ? `Hồ sơ học tập: ${profileStudent.fullName}`
            : "Hồ sơ học tập"
        }
        size="lg"
      >
        <div className="settings-stack">
          {profileLoading ? (
            <p className="muted">Đang tải hồ sơ…</p>
          ) : studentProfile ? (
            <>
              <p className="muted">
                {studentProfile.classSection.code} —{" "}
                {studentProfile.classSection.name}
              </p>
              <p>
                Tiến độ:{" "}
                <strong>
                  {studentProfile.progress.completed}/
                  {studentProfile.progress.total} (
                  {studentProfile.progress.percentage}%)
                </strong>
              </p>
              {studentProfile.assignments.length === 0 ? (
                <p className="muted">Chưa có bài tập đã công bố hoặc đóng.</p>
              ) : (
                <ul className="settings-stack">
                  {studentProfile.assignments.map((assignment) => (
                    <li key={assignment.id}>
                      <strong>{assignment.title}</strong> — {assignment.status}
                      <br />
                      Điểm: {assignment.evaluation?.score ?? "Chưa chấm"}; trạng
                      thái:{" "}
                      {assignment.evaluation?.status ?? "Chưa có đánh giá"}
                      {assignment.evaluation?.feedback ? (
                        <>
                          <br />
                          Nhận xét: {assignment.evaluation.feedback}
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
          <div className="dialog-actions">
            <button
              className="button"
              onClick={() => {
                setProfileStudent(null);
                setStudentProfile(null);
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal / Dialog Sửa thông tin */}
      <Modal
        open={Boolean(editingStudent)}
        onClose={() => setEditingStudent(null)}
        title={
          editingStudent
            ? `Cập nhật sinh viên: ${editingStudent.mssv}`
            : "Cập nhật sinh viên"
        }
        size="sm"
      >
        <div>
          <form
            className="dialog-form"
            onSubmit={(e) => void handleSaveEdit(e)}
            autoComplete="off"
          >
            <div>
              <label className="form-label">Họ và tên</label>
              <input
                type="text"
                className="form-input"
                required
                autoComplete="off"
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
                autoComplete="off"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Email (tùy chọn)</label>
              <input
                type="email"
                className="form-input"
                autoComplete="off"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>

            {editError && <p className="form-error">{editError}</p>}

            <div className="dialog-actions">
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
      </Modal>

      {/* Modal Hiển thị PIN Khởi tạo khi Reset PIN */}
      <Modal
        open={Boolean(resetPinStudent)}
        onClose={() => {
          setResetPinStudent(null);
          setInitialPin(null);
        }}
        title="Reset PIN thành công"
        size="sm"
      >
        <div className="settings-stack">
          <p className="muted dialog-copy">
            Đã tạo PIN khởi tạo mới cho sinh viên{" "}
            <strong>{resetPinStudent?.fullName}</strong> (
            {resetPinStudent?.mssv}):
          </p>

          {resetBusy ? (
            <p className="muted">Đang tạo PIN ngẫu nhiên…</p>
          ) : initialPin ? (
            <div className="pin-reveal">
              <span className="pin-label">PIN KHỞI TẠO MỚI:</span>
              <div className="pin-value">{initialPin}</div>
              <small className="muted pin-help">
                Mã PIN này chỉ hiển thị đúng một lần. Hãy sao chép để gửi cho
                Sinh viên.
              </small>
            </div>
          ) : null}

          <div className="dialog-actions">
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
      </Modal>
    </div>
  );
}
