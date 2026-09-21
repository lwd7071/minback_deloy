import { IntentPrefetchLink as Link } from "@/components/ui/intent-prefetch-link";

export default function ClassNotFound() {
  return (
    <div className="workspace-state">
      <p className="form-error">Không tìm thấy lớp học phần.</p>
      <Link className="btn btn-primary" href="/admin/classes">
        Quay về danh sách lớp
      </Link>
    </div>
  );
}
