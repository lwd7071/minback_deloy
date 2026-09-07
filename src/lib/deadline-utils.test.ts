import { describe, expect, it } from "vitest";
import {
  formatDeadlineInfo,
  getPeriodLabel,
  parseDeadlineTimestamp,
} from "./deadline-utils";

describe("deadline-utils", () => {
  it("parses YYYY-MM-DD as 23:59:59.999 in ICT (+07:00)", () => {
    const timestamp = parseDeadlineTimestamp("2026-09-10");
    const date = new Date(timestamp);
    // In UTC (+00:00), 23:59:59.999 ICT (+07:00) is exactly 16:59:59.999Z
    expect(date.toISOString()).toBe("2026-09-10T16:59:59.999Z");
  });

  it("determines period labels correctly", () => {
    expect(getPeriodLabel(6)).toBe("Sáng");
    expect(getPeriodLabel(12)).toBe("Trưa");
    expect(getPeriodLabel(15)).toBe("Chiều");
    expect(getPeriodLabel(19)).toBe("Tối");
    expect(getPeriodLabel(23)).toBe("Đêm");
    expect(getPeriodLabel(1)).toBe("Đêm");
  });

  it("formats deadline info with period and full date", () => {
    const info = formatDeadlineInfo("2026-09-10");
    expect(info.formattedDate).toBe("10/09/2026");
    expect(info.formattedTime).toBe("23:59:59");
    expect(info.periodLabel).toBe("Đêm");
    expect(info.formattedShort).toContain("23:59 (Đêm) 10/09/2026");
    expect(info.formattedFull).toBe("23:59:59 (Đêm) ngày 10/09/2026");
  });

  it("computes countdown and expired state accurately", () => {
    // Mock now as 2026-09-08 10:00:00 ICT
    const mockNow = new Date("2026-09-08T10:00:00+07:00").getTime();
    const info = formatDeadlineInfo("2026-09-10", mockNow);
    expect(info.isExpired).toBe(false);
    expect(info.timeRemainingNotice).toContain("Còn 2 ngày");

    // Past deadline
    const pastInfo = formatDeadlineInfo("2026-09-01", mockNow);
    expect(pastInfo.isExpired).toBe(true);
    expect(pastInfo.timeRemainingNotice).toBe("Đã quá hạn");
  });
});
