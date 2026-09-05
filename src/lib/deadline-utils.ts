export type DeadlineInfo = {
  rawDate: string;
  formattedDate: string;
  formattedTime: string;
  formattedShort: string;
  formattedFull: string;
  periodLabel: "Sáng" | "Trưa" | "Chiều" | "Tối" | "Đêm";
  isExpired: boolean;
  timeRemainingNotice: string;
  urgency: "urgent" | "warning" | "normal" | "expired";
};

export function parseDeadlineTimestamp(dueDate: string): number {
  if (!dueDate) return 0;
  // If the dueDate is in YYYY-MM-DD format, the deadline is 23:59:59.999 ICT (+07:00)
  const trimmed = dueDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T23:59:59.999+07:00`).getTime();
  }
  return new Date(trimmed).getTime();
}

export function getPeriodLabel(
  hours: number,
): "Sáng" | "Trưa" | "Chiều" | "Tối" | "Đêm" {
  if (hours >= 5 && hours < 12) return "Sáng";
  if (hours >= 12 && hours < 14) return "Trưa";
  if (hours >= 14 && hours < 18) return "Chiều";
  if (hours >= 18 && hours < 22) return "Tối";
  return "Đêm";
}

export function formatDeadlineInfo(
  dueDate: string,
  nowTimestamp: number = Date.now(),
): DeadlineInfo {
  if (!dueDate) {
    return {
      rawDate: "",
      formattedDate: "—",
      formattedTime: "—",
      formattedShort: "—",
      formattedFull: "Chưa xác định",
      periodLabel: "Đêm",
      isExpired: false,
      timeRemainingNotice: "Chưa có hạn nộp",
      urgency: "normal",
    };
  }

  const deadlineMs = parseDeadlineTimestamp(dueDate);
  const deadlineDate = new Date(deadlineMs);
  const isInvalid = Number.isNaN(deadlineMs) || deadlineMs === 0;

  if (isInvalid) {
    return {
      rawDate: dueDate,
      formattedDate: dueDate,
      formattedTime: "23:59",
      formattedShort: dueDate,
      formattedFull: dueDate,
      periodLabel: "Đêm",
      isExpired: false,
      timeRemainingNotice: "Hạn nộp",
      urgency: "normal",
    };
  }

  // Extract date components
  const day = String(deadlineDate.getDate()).padStart(2, "0");
  const month = String(deadlineDate.getMonth() + 1).padStart(2, "0");
  const year = deadlineDate.getFullYear();
  const hours = deadlineDate.getHours();
  const minutes = String(deadlineDate.getMinutes()).padStart(2, "0");
  const seconds = String(deadlineDate.getSeconds()).padStart(2, "0");

  const formattedDate = `${day}/${month}/${year}`;
  const formattedTime = `${String(hours).padStart(2, "0")}:${minutes}:${seconds}`;
  const periodLabel = getPeriodLabel(hours);
  const formattedShort = `${String(hours).padStart(2, "0")}:${minutes} (${periodLabel}) ${formattedDate}`;
  const formattedFull = `${formattedTime} (${periodLabel}) ngày ${formattedDate}`;

  const diffMs = deadlineMs - nowTimestamp;
  const isExpired = diffMs <= 0;

  let timeRemainingNotice = "";
  let urgency: DeadlineInfo["urgency"] = "normal";

  if (isExpired) {
    timeRemainingNotice = "Đã quá hạn";
    urgency = "expired";
  } else {
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours <= 12) {
      const remainingHours = Math.max(1, Math.ceil(diffHours));
      timeRemainingNotice = `Hết hạn sau ${remainingHours} giờ`;
      urgency = "urgent";
    } else if (diffHours <= 24) {
      timeRemainingNotice = `Hết hạn hôm nay lúc ${String(hours).padStart(2, "0")}:${minutes}`;
      urgency = "urgent";
    } else if (diffDays === 1) {
      timeRemainingNotice = `Hết hạn ngày mai lúc ${String(hours).padStart(2, "0")}:${minutes}`;
      urgency = "warning";
    } else {
      timeRemainingNotice = `Còn ${diffDays} ngày`;
      urgency = "normal";
    }
  }

  return {
    rawDate: dueDate,
    formattedDate,
    formattedTime,
    formattedShort,
    formattedFull,
    periodLabel,
    isExpired,
    timeRemainingNotice,
    urgency,
  };
}
