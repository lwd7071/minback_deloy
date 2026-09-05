import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Download,
  Eye,
  FileCheck2,
  FolderKanban,
  GraduationCap,
  House,
  Info,
  LogOut,
  Search,
  Settings,
  Star,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

const icons = {
  bell: Bell,
  book: BookOpen,
  calendar: CalendarDays,
  check: CheckCircle2,
  classes: FolderKanban,
  clock: Clock3,
  download: Download,
  eye: Eye,
  fileCheck: FileCheck2,
  gradebook: ClipboardList,
  home: House,
  info: Info,
  logout: LogOut,
  search: Search,
  settings: Settings,
  star: Star,
  students: Users,
  study: GraduationCap,
  upload: Upload,
  close: X,
} satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof icons;

export function AppIcon({
  name,
  size = 18,
  label,
}: {
  name: AppIconName;
  size?: number;
  label?: string;
}) {
  const Icon = icons[name];
  return (
    <Icon
      aria-hidden={label ? undefined : true}
      aria-label={label}
      size={size}
      strokeWidth={1.8}
    />
  );
}
