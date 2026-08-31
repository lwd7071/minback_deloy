import { StudentManagementView } from "@/components/teacher/student-management/student-management-view";

export const metadata = {
  title: "Quản lý Sinh viên — MinBack",
  description:
    "Quản lý thông tin sinh viên, nickname và reset PIN trong lớp học phần.",
};

export default async function TeacherStudentsPage({
  params,
}: {
  params: Promise<{ classSectionId: string }>;
}) {
  const { classSectionId } = await params;

  return (
    <section className="surface">
      <p className="eyebrow">Quản lý lớp</p>
      <h1>Danh sách Sinh viên trong Lớp</h1>
      <p className="muted">
        Xem danh sách sinh viên, cập nhật thông tin cá nhân và tạo lại PIN ngẫu
        nhiên khi sinh viên quên.
      </p>
      <StudentManagementView classSectionId={classSectionId} />
    </section>
  );
}
