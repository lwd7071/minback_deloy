export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className="avatar"
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {initials}
    </span>
  );
}
