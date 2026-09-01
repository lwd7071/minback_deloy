"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { StudentManagementView } from "@/components/students/teacher/student-management-view";
import { ClassAssignmentsView } from "@/components/assignments/teacher/class-assignments-view";
import { GradebookView } from "@/components/evaluations/teacher/gradebook-view";
import { Modal } from "@/components/ui/modal";
import { AssignmentDetailView } from "@/components/assignments/teacher/assignment-detail-view";
export function ClassDetailTabs({
  classSectionId,
}: {
  classSectionId: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const tab = ["students", "assignments", "gradebook"].includes(
    search.get("tab") ?? "",
  )
    ? search.get("tab")!
    : "students";
  const assignmentId = search.get("assignment");
  function change(next: string) {
    const params = new URLSearchParams(search.toString());
    params.set("tab", next);
    params.delete("assignment");
    router.replace(`?${params.toString()}`);
  }
  function close() {
    const params = new URLSearchParams(search.toString());
    params.delete("assignment");
    router.replace(`?${params.toString()}`);
  }
  return (
    <div className="stack">
      <Tabs
        tabs={[
          { id: "students", label: "Sinh viên" },
          { id: "assignments", label: "Bài tập" },
          { id: "gradebook", label: "Bảng điểm" },
        ]}
        activeTab={tab}
        onTabChange={change}
      />
      {tab === "students" ? (
        <StudentManagementView classSectionId={classSectionId} />
      ) : tab === "assignments" ? (
        <ClassAssignmentsView classSectionId={classSectionId} />
      ) : (
        <GradebookView classSectionId={classSectionId} />
      )}
      <Modal
        open={Boolean(assignmentId)}
        onClose={close}
        title="Chi tiết bài tập"
        size="lg"
      >
        {assignmentId ? (
          <AssignmentDetailView
            assignmentId={assignmentId}
            onClose={close}
            onDeleted={close}
          />
        ) : null}
      </Modal>
    </div>
  );
}
