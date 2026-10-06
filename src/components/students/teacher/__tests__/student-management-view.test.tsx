import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { StudentManagementView } from "../student-management-view";
import type { StudentAdminDto } from "@/types/student";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

function renderComponent(props: Parameters<typeof StudentManagementView>[0]) {
  return render(
    <ToastProvider>
      <StudentManagementView {...props} />
    </ToastProvider>,
  );
}

describe("StudentManagementView - Account Activation Status and Actions", () => {
  const dummyStudents: StudentAdminDto[] = [
    {
      id: "student-1",
      classSectionId: "class-1",
      mssv: "24110001",
      fullName: "Vĩ Đông",
      nickname: "dongdeptrai",
      email: "vjdont@gmail.com",
      mustChangeNickname: false,
      mustChangePin: false,
      lockedUntil: null,
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
    },
    {
      id: "student-2",
      classSectionId: "class-1",
      mssv: "24110002",
      fullName: "Trần Thị B",
      nickname: "24110002",
      email: "tranthib@gmail.com",
      mustChangeNickname: true,
      mustChangePin: true,
      lockedUntil: null,
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
    },
  ];

  it("renders 'Trạng thái' column with 'Đã kích hoạt' and 'Chưa kích hoạt' labels", () => {
    renderComponent({
      classSectionId: "class-1",
      initialStudents: dummyStudents,
      initialMeta: { total: 2, page: 1, pageSize: 20 },
      initialSearch: "",
    });

    // Kiểm tra header hiển thị "Trạng thái" thay vì "Trạng thái PIN"
    expect(screen.getByRole("columnheader", { name: "Trạng thái" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Trạng thái PIN" })).not.toBeInTheDocument();

    // Sinh viên đã hoàn tất đổi PIN: "Đã kích hoạt"
    expect(screen.getByText("Đã kích hoạt")).toBeInTheDocument();

    // Sinh viên mới tạo chưa kích hoạt qua Google: "Chưa kích hoạt"
    expect(screen.getByText("Chưa kích hoạt")).toBeInTheDocument();
  });

  it("only provides 'Hồ sơ' and 'Sửa' actions, hiding 'Reset PIN'", () => {
    const { container } = renderComponent({
      classSectionId: "class-1",
      initialStudents: dummyStudents,
      initialMeta: { total: 2, page: 1, pageSize: 20 },
      initialSearch: "",
    });

    const tbody = container.querySelector("tbody")!;
    const rowButtons = tbody.querySelectorAll("button");
    // 2 sinh viên x 2 nút ("Hồ sơ" và "Sửa") = 4 buttons trong tbody
    expect(rowButtons).toHaveLength(4);
    expect(screen.queryByRole("button", { name: /reset pin/i })).not.toBeInTheDocument();
  });
});
