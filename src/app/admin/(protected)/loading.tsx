export default function AdminLoading() {
  return (
    <div
      className="teacher-dash"
      aria-busy="true"
      aria-label="Đang tải dữ liệu"
    >
      <div className="teacher-metrics-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="stat-card skeleton" key={index} />
        ))}
      </div>
      <div className="teacher-class-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="teacher-class-card skeleton" key={index} />
        ))}
      </div>
    </div>
  );
}
