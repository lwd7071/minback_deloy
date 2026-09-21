"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StudentAdminDto } from "@/types/student";
import type { TeacherStudentProfileDto } from "@/types/student-profile";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { StudentImportModal } from "./student-import-modal";
import { StudentAddModal } from "./student-add-modal";

type ApiResult<T> =
  | { data: T; meta?: { page: number; pageSize: number; total: number } }
  | { error: { message: string } };

export function StudentManagementView({
  classSectionId,
  initialStudents,
  initialMeta,
  initialSearch,
}: {
  classSectionId: string;
  initialStudents: StudentAdminDto[];
  initialMeta: { page: number; pageSize: number; total: number };
  initialSearch: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { push: toast } = useToast();
  const [students, setStudents] = useState<StudentAdminDto[]>(initialStudents);
  const loading = isPending;
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialMeta.page);
  const [pageSize, setPageSize] = useState(initialMeta.pageSize);
  const [total, setTotal] = useState(initialMeta.total);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // URL là nguồn sự thật; thay đổi từ khóa chỉ tạo một server navigation.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search === initialSearch) return;
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      router.replace(
        `/admin/classes/${classSectionId}/students${params.size ? `?${params}` : ""}`,
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [classSectionId, initialSearch, router, search]);

  const [previousInitial, setPreviousInitial] = useState({
    students: initialStudents,
    meta: initialMeta,
    search: initialSearch,
  });
  if (
    previousInitial.students !== initialStudents ||
    previousInitial.meta !== initialMeta ||
    previousInitial.search !== initialSearch
  ) {
    setPreviousInitial({
      students: initialStudents,
      meta: initialMeta,
      search: initialSearch,
    });
    setStudents(initialStudents);
    setTotal(initialMeta.total);
    setPage(initialMeta.page);
    setPageSize(initialMeta.pageSize);
  }

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
  const [resetBusy, setResetBusy] = useState(false);

  // State hồ sơ học tập Teacher xem trong đúng ClassSection hiện hành.
  const [profileStudent, setProfileStudent] = useState<StudentAdminDto | null>(
    null,
  );
  const [studentProfile, setStudentProfile] =
    useState<TeacherStudentProfileDto | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

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

      const updated = body.data;
      const matches = `${updated.mssv} ${updated.fullName} ${updated.nickname}`
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      setStudents((current) =>
        matches
          ? current.map((student) =>
              student.id === updated.id ? updated : student,
            )
          : current.filter((student) => student.id !== updated.id),
      );
      setEditingStudent(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setEditBusy(false);
    }
  }

  async function handleResetPin(st: StudentAdminDto) {
    setResetPinStudent(st);
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

      toast("Đã đặt lại PIN về mặc định 111111", "success");
      setStudents((current) =>
        current.map((student) =>
          student.id === st.id ? { ...student, mustChangePin: true } : student,
        ),
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Lỗi reset PIN", "error");
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
      toast(
        err instanceof Error ? err.message : "Không thể tải hồ sơ học tập",
        "error",
      );
      setProfileStudent(null);
    } finally {
      setProfileLoading(false);
    }
  }

  return (
    <div className="settings-stack">
      {/* Ô tìm kiếm, tổng số & nút Thao tác */}
      <div
        className="settings-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flex: "1 1 300px",
          }}
        >
          <input
            type="text"
            className="form-input"
            placeholder="Tìm theo MSSV, Họ tên, Nickname…"
            autoComplete="off"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
          <span className="muted" style={{ whiteSpace: "nowrap" }}>
            Tổng số: {total} sinh viên
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowImportModal(true)}
          >
            Nhập file Excel/CSV
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowAddModal(true)}
          >
            + Thêm sinh viên
          </Button>
        </div>
      </div>

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
          <tbody style={{ opacity: 1 }}>
            {students.length === 0 ? (
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

      {total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          disabled={loading}
          onPageChange={(newPage) => {
            const params = new URLSearchParams();
            if (search.trim()) params.set("q", search.trim());
            if (newPage > 1) params.set("page", String(newPage));
            if (pageSize !== 20) params.set("pageSize", String(pageSize));
            startTransition(() => {
              router.replace(
                `/admin/classes/${classSectionId}/students${params.size ? `?${params}` : ""}`,
              );
            });
          }}
          onPageSizeChange={(newSize) => {
            const params = new URLSearchParams();
            if (search.trim()) params.set("q", search.trim());
            if (newSize !== 20) params.set("pageSize", String(newSize));
            startTransition(() => {
              router.replace(
                `/admin/classes/${classSectionId}/students${params.size ? `?${params}` : ""}`,
              );
            });
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
        }}
        title="Reset PIN thành công"
        size="sm"
      >
        <div className="settings-stack">
          <p className="muted dialog-copy">
            Đã đặt lại PIN cho <strong>{resetPinStudent?.fullName}</strong> (
            {resetPinStudent?.mssv}).
          </p>

          {resetBusy ? (
            <p className="muted">Đang đặt lại PIN…</p>
          ) : (
            <Alert variant="success">
              PIN đã được đặt về mặc định 111111. Sinh viên sẽ đổi PIN sau lần
              đăng nhập tiếp theo.
            </Alert>
          )}

          <div className="dialog-actions">
            <button
              className="button"
              onClick={() => {
                setResetPinStudent(null);
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Nhập danh sách sinh viên từ file */}
      <StudentImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        classSectionId={classSectionId}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      {/* Modal Thêm sinh viên đơn lẻ */}
      <StudentAddModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        classSectionId={classSectionId}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
