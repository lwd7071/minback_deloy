import { ClassCreateFlow } from "@/components/class-sections/teacher/class-create-flow";
import { BackLink } from "@/components/ui/back-link";
export default function CreateClassPage() {
  return (
    <div className="stack">
      <div className="teacher-content-back">
        <BackLink
          fallbackHref="/admin/classes"
          ariaLabel="Quay lại danh sách lớp học"
          forceFallback
        />
      </div>
      <ClassCreateFlow />
    </div>
  );
}
