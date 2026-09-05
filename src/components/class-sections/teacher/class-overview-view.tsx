"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

import { AppIcon } from "@/components/ui/app-icon";
import { Card } from "@/components/ui/card";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

export function ClassOverviewView({
  classSectionId,
  code,
  name,
}: {
  classSectionId: string;
  code?: string;
  name?: string;
}) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const links = [
    {
      href: `/admin/classes/${classSectionId}/students`,
      icon: "students" as const,
      title: "Sinh viên",
      description:
        "Quản lý danh sách sinh viên, đặt lại mã PIN và xem hồ sơ học tập.",
    },
    {
      href: `/admin/classes/${classSectionId}/assignments`,
      icon: "book" as const,
      title: "Bài tập",
      description:
        "Tạo, cập nhật và công bố bài tập kèm file hướng dẫn cho lớp.",
    },
    {
      href: `/admin/classes/${classSectionId}/gradebook`,
      icon: "gradebook" as const,
      title: "Bảng điểm",
      description: "Theo dõi tiến độ nộp bài, chấm điểm và trả nhận xét.",
    },
  ];

  async function handleDeleteClass() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(
        `/api/v1/teacher/class-sections/${classSectionId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const body = (await response.json()) as {
          error?: { message?: string };
        };
        throw new Error(body.error?.message ?? "Không thể xóa lớp học phần");
      }
      setShowDeleteModal(false);
      router.push("/admin/classes");
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi xóa lớp học phần",
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="class-overview">
      <p className="muted" style={{ marginBottom: "20px" }}>
        Chọn khu vực quản lý bạn muốn làm việc cho lớp học phần này:
      </p>

      <div className="class-overview-grid">
        {links.map((item) => (
          <Link
            className="class-overview-link"
            href={item.href}
            key={item.href}
          >
            <Card hover>
              <span className="class-overview-icon">
                <AppIcon name={item.icon} size={24} />
              </span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                Vào quản lý →
              </span>
            </Card>
          </Link>
        ))}
      </div>

      {/* Khu vực Xóa lớp học */}
      <div className="class-danger-zone">
        <div className="class-danger-card">
          <div className="class-danger-info">
            <h3>Xóa lớp học phần</h3>
            <p className="muted">
              Xóa hoàn toàn lớp học này. Chỉ thực hiện được khi lớp chưa có sinh
              viên và chưa có bài tập.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={() => {
              setShowDeleteModal(true);
              setDeleteError(null);
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
            <span>Xóa lớp học này</span>
          </button>
        </div>
      </div>

      {/* Modal xác nhận xóa */}
      <ConfirmationModal
        open={showDeleteModal}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setDeleteError(null);
          }
        }}
        title={`Xác nhận xóa lớp: ${code || ""}`}
        confirmLabel={isDeleting ? "Đang xóa…" : "Xác nhận xóa lớp"}
        loading={isDeleting}
        onConfirm={() => void handleDeleteClass()}
      >
        <div className="form-stack">
          <p>
            Bạn có chắc chắn muốn xóa lớp học phần{" "}
            <strong>{name || code}</strong> ({code}) không?
          </p>

          <div
            className="form-notice"
            style={{
              borderColor: "var(--color-error)",
              background: "rgba(180, 40, 40, 0.05)",
            }}
          >
            <p
              style={{
                color: "var(--color-error)",
                margin: 0,
                fontSize: "0.88rem",
                fontWeight: 500,
              }}
            >
              ⚠️ <strong>Lưu ý:</strong> Hành động này không thể hoàn tác. Hệ
              thống sẽ từ chối xóa nếu lớp học đã có sinh viên hoặc bài tập để
              bảo vệ dữ liệu.
            </p>
          </div>

          {deleteError && (
            <p
              className="form-error"
              role="alert"
              style={{ margin: "4px 0 0 0" }}
            >
              {deleteError}
            </p>
          )}
        </div>
      </ConfirmationModal>
    </div>
  );
}
