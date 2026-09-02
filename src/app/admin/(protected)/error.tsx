"use client";

export default function AdminError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="workspace-state" role="alert">
      <p className="form-error">Không thể tải dữ liệu. Vui lòng thử lại.</p>
      <button className="btn btn-primary" type="button" onClick={reset}>
        Thử lại
      </button>
    </div>
  );
}
