import { AppIcon, type AppIconName } from "./app-icon";
import { Button } from "./button";

export function EmptyState({
  icon = "info",
  title,
  description,
  action,
}: {
  icon?: AppIconName;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <AppIcon name={icon} size={20} />
      </span>
      <h4>{title}</h4>
      <p>{description}</p>
      {action ? (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
