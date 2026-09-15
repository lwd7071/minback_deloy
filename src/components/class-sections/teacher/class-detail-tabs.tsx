"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { AssignmentDetailView } from "@/components/assignments/teacher/assignment-detail-view";
import { PRODUCT_CAPABILITIES } from "@/config/product-capabilities";
export function ClassDetailTabs({
  classSectionId,
}: {
  classSectionId: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const tab = ["students", "assignments"].includes(search.get("tab") ?? "")
    ? search.get("tab")!
    : "students";
  const assignmentId = search.get("assignment");
  function change(next: string) {
    router.replace(`/admin/classes/${classSectionId}/${next}`);
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
          ...(PRODUCT_CAPABILITIES.teacher.gradebook
            ? [{ id: "gradebook", label: "Bảng điểm" }]
            : []),
        ]}
        activeTab={tab}
        onTabChange={change}
      />
      <Modal
        open={Boolean(assignmentId)}
        onClose={close}
        title="Chi tiết bài tập"
        size="lg"
      >
        {assignmentId ? (
          <AssignmentDetailView assignmentId={assignmentId} onClose={close} />
        ) : null}
      </Modal>
    </div>
  );
}
