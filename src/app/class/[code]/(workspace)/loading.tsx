import { Skeleton } from "@/components/ui/skeleton";

export default function StudentWorkspaceLoading() {
  return (
    <div
      className="stack"
      aria-busy="true"
      aria-label="Đang tải kết quả học tập"
    >
      <Skeleton width="220px" height="30px" />
      <Skeleton width="100%" height="110px" />
      <Skeleton width="100%" height="260px" />
    </div>
  );
}
