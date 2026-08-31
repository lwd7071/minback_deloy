export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
}: {
  value: number;
  max?: number;
  showLabel?: boolean;
}) {
  const percentage =
    max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="progress-stack">
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>
      {showLabel ? <small className="muted">{percentage}%</small> : null}
    </div>
  );
}
