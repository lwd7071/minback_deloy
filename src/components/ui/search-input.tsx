export function SearchInput({
  value,
  onChange,
  placeholder = "Tìm kiếm…",
  onClear,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
}) {
  return (
    <div className="search-input-wrap">
      <input
        className="input"
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && onClear ? (
        <button
          type="button"
          className="search-input-clear"
          aria-label="Xóa tìm kiếm"
          onClick={onClear}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
