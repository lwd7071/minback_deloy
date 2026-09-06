import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ClassOverviewSkeleton() {
  return (
    <div
      className="class-overview"
      aria-busy="true"
      aria-label="Đang tải thông tin tổng quan lớp học"
    >
      <div style={{ marginBottom: "20px" }}>
        <Skeleton width="45%" height={20} />
      </div>

      <div className="class-overview-grid">
        {[1, 2, 3].map((key) => (
          <div className="class-overview-link" key={key}>
            <Card>
              <span className="class-overview-icon">
                <Skeleton width={44} height={44} />
              </span>
              <div style={{ margin: "12px 0 8px 0" }}>
                <Skeleton width="50%" height={24} />
              </div>
              <Skeleton width="90%" height={16} />
              <div style={{ marginTop: "6px" }}>
                <Skeleton width="75%" height={16} />
              </div>
              <div style={{ marginTop: "16px" }}>
                <Skeleton width="35%" height={18} />
              </div>
            </Card>
          </div>
        ))}
      </div>

      <div className="class-danger-zone">
        <div className="class-danger-card">
          <div className="class-danger-info">
            <Skeleton width="30%" height={20} />
            <div style={{ marginTop: "8px" }}>
              <Skeleton width="60%" height={14} />
            </div>
          </div>
          <Skeleton width={140} height={38} />
        </div>
      </div>
    </div>
  );
}
