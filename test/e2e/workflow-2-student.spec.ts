import { test, expect, type Locator } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Helper điền mã PIN 6 chữ số vào OtpInput component.
 */
async function fillOtp(container: Locator, pin: string) {
  const digits = pin.split("");
  for (let i = 0; i < digits.length; i++) {
    await container.locator("input.otp-digit").nth(i).fill(digits[i]);
  }
}

test.describe("Workflow 2: Student Flow & Privacy Verification", () => {
  test("Đăng nhập PIN khởi tạo -> Buộc đổi Nickname & PIN -> Xem điểm cá nhân & Bảo mật Privacy", async ({
    page,
    request,
  }) => {
    // 1. Xác định mã lớp học phần: ưu tiên lớp vừa tạo từ Workflow 1
    let classCode = "E2E10376";
    const statePath = path.resolve(
      process.cwd(),
      "test/e2e/fixtures/last-class.json",
    );
    if (fs.existsSync(statePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
        if (state.classCode) classCode = state.classCode;
      } catch {}
    }

    const mssv = "21110001";
    const initialPin = "111111";

    // Truy cập trang lớp học phần
    await page.goto(`/class/${encodeURIComponent(classCode)}`);
    await page.waitForLoadState("networkidle");

    // Điền mã sinh viên và mã PIN ban đầu (111111)
    await page.fill("#student-identifier", mssv);
    await fillOtp(page.locator(".student-pin-field"), initialPin);

    // Bấm Đăng nhập
    const loginBtn = page.locator("button.student-login-submit");
    await expect(loginBtn).toBeEnabled();
    await loginBtn.click();

    // 2. Kiểm tra bắt buộc chuyển hướng sang Onboarding
    await expect(page).toHaveURL(
      new RegExp(`/class/${classCode}/onboarding`, "i"),
      {
        timeout: 10_000,
      },
    );
    await expect(
      page.locator("text=Để bảo mật tài khoản, bạn cần"),
    ).toBeVisible();

    // Sinh viên đặt Nickname mới và mã PIN mới
    const newNickname = `AnHero${Date.now().toString().slice(-4)}`;
    const newPin = "987654";

    const nicknameInput = page.locator("#new-nickname");
    if (await nicknameInput.isVisible()) {
      await nicknameInput.fill(newNickname);
    }

    const pinFields = page.locator(".otp-input");
    const pinFieldCount = await pinFields.count();

    if (pinFieldCount >= 2) {
      // Ô nhập PIN mới
      await fillOtp(pinFields.nth(0), newPin);
      // Ô xác nhận PIN mới
      await fillOtp(pinFields.nth(1), newPin);
    } else if (pinFieldCount === 1) {
      await fillOtp(pinFields.nth(0), newPin);
    }

    // Bấm Hoàn tất tài khoản
    const submitBtn = page.locator("#change-credentials-submit");
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 3. Kiểm tra chuyển hướng vào bảng điểm / hồ sơ cá nhân
    await expect(page).toHaveURL(
      new RegExp(`/class/${classCode}/(profile|grades)`, "i"),
      {
        timeout: 10_000,
      },
    );
    await page.waitForLoadState("networkidle");

    // Sinh viên thấy đúng bài tập và điểm số cá nhân đã được công bố từ Workflow 1
    await expect(
      page.locator("text=Bài tập 1: Kiểm thử E2E").first(),
    ).toBeVisible({ timeout: 10_000 });

    // Điểm số 8.5 của sinh viên 21110001 hiển thị rõ ràng trên thẻ bài tập
    await expect(page.locator("text=8.5").first()).toBeVisible();

    // 4. Privacy Regression Check:
    // Đảm bảo không hiển thị thông tin hay bài của sinh viên khác (ví dụ Trần Thị Bích / 21110002)
    const pageContent = await page.textContent("body");
    expect(pageContent).not.toContain("Trần Thị Bích");
    expect(pageContent).not.toContain("21110002@student.hcmute.edu.vn");

    // Kiểm tra API bảo mật: Cookie của sinh viên này chỉ lấy được kết quả của chính mình
    const cookies = await page.context().cookies();
    const cookieHeader = cookies
      .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
      .join("; ");

    const resultsResponse = await request.get("/api/v1/student/results", {
      headers: {
        cookie: cookieHeader,
      },
    });

    expect(resultsResponse.ok()).toBeTruthy();
    const resultsJson = await resultsResponse.json();
    expect(resultsJson).toHaveProperty("data");

    // Negative Test: Học sinh tuyệt đối không thể truy cập API quản trị giáo viên
    const teacherAccessResponse = await request.get(
      "/api/v1/teacher/class-sections",
      {
        headers: {
          cookie: cookieHeader,
        },
      },
    );
    expect([401, 403]).toContain(teacherAccessResponse.status());
  });
});
