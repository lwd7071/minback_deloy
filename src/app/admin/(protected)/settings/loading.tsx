import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="stack" aria-busy="true" aria-label="Đang tải cài đặt">
      <div className="page-head">
        <Skeleton width="160px" height="32px" />
        <div style={{ marginTop: "6px" }}>
          <Skeleton width="280px" height="18px" />
        </div>
      </div>
      <section className="card">
        <div className="settings-stack">
          {/* Hàng bật/tắt email */}
          <div
            className="settings-row"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
            }}
          >
            <div style={{ flex: 1 }}>
              <Skeleton width="220px" height="20px" />
              <div style={{ marginTop: "8px" }}>
                <Skeleton width="90%" height="16px" />
                <div style={{ marginTop: "4px" }}>
                  <Skeleton width="70%" height="16px" />
                </div>
              </div>
            </div>
            <Skeleton width="48px" height="26px" />
          </div>

          {/* Ba dòng thông tin cấu hình */}
          <dl className="settings-details">
            <div style={{ marginBottom: "12px" }}>
              <Skeleton width="180px" height="14px" />
              <div style={{ marginTop: "6px" }}>
                <Skeleton width="200px" height="18px" />
              </div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <Skeleton width="180px" height="14px" />
              <div style={{ marginTop: "6px" }}>
                <Skeleton width="150px" height="18px" />
              </div>
            </div>
            <div>
              <Skeleton width="180px" height="14px" />
              <div style={{ marginTop: "6px" }}>
                <Skeleton width="220px" height="18px" />
              </div>
            </div>
          </dl>

          {/* Nút gửi thử */}
          <div>
            <Skeleton width="170px" height="36px" />
          </div>
        </div>
      </section>
    </div>
  );
}
