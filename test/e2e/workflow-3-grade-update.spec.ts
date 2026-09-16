import { test, expect, type Locator } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

/**
 * Helper điền mã PIN 6 chữ số vào component OtpInput của sinh viên.
 */
async function fillOtp(container: Locator, pin: string) {
  const digits = pin.split("");
  for (let i = 0; i < digits.length; i++) {
    await container.locator("input.otp-digit").nth(i).fill(digits[i]);
  }
}

test.describe("Workflow 3: Re-import Grade, Draft Isolation & Student Realtime Sync", () => {
  test("Giáo viên sửa điểm, kiểm tra chặn lộ bản nháp và học sinh xem điểm cập nhật", async ({
    browser,
    page: teacherPage,
  }) => {
    test.setTimeout(90_000);
    // -------------------------------------------------------------------------
    // BƯỚC 1: ĐĂNG NHẬP GIÁO VIÊN & TẠO LỚP HỌC PHẦN KÈM SINH VIÊN
    // -------------------------------------------------------------------------
    const teacherEmail = process.env.E2E_TEACHER_EMAIL || "admin@test.com";
    const teacherPassword =
      process.env.E2E_TEACHER_PASSWORD || "DemoTeacherA123!";

    await teacherPage.goto("/admin/login");
    await teacherPage.waitForLoadState("networkidle");

    await teacherPage.fill("#teacher-email", teacherEmail);
    await teacherPage.fill("#teacher-password", teacherPassword);
    await teacherPage.click('button[type="submit"]');

    await expect(teacherPage).toHaveURL(/\/admin\/classes/, {
      timeout: 20_000,
    });
    await teacherPage.waitForLoadState("networkidle");

    // Tạo mã lớp ngẫu nhiên để tránh trùng lặp DB
    const randomSuffix = Date.now().toString().slice(-5);
    const classCode = `REV${randomSuffix}`;
    const className = `Lớp Kiểm Thử Sửa Điểm ${classCode}`;

    await teacherPage.goto("/admin/classes/new");
    await teacherPage.waitForLoadState("networkidle");

    // Bước 1 của Wizard tạo lớp
    const codeInput = teacherPage
      .locator('label:has-text("Mã lớp") input, input.form-input')
      .first();
    await codeInput.fill(classCode);
    const nameInput = teacherPage
      .locator('label:has-text("Tên lớp") input')
      .first();
    await nameInput.fill(className);
    await teacherPage.click('button[type="submit"]:has-text("Tiếp tục")');

    // Sử dụng file danh sách mẫu chuẩn của dự án
    const studentCsvPath = path.resolve(
      process.cwd(),
      "test/e2e/danh_sach_sinh_vien_mau.csv",
    );
    const studentMssv = "21110001";
    const studentName = "Nguyễn Văn An";

    const tempDir = path.resolve(process.cwd(), "test/e2e/fixtures/temp");
    fs.mkdirSync(tempDir, { recursive: true });

    // Bước 2: Tải lên danh sách sinh viên
    await expect(
      teacherPage.locator("text=Chuẩn bị danh sách sinh viên"),
    ).toBeVisible();
    await teacherPage.setInputFiles('input[type="file"]', studentCsvPath);
    await teacherPage.click('button:has-text("Kiểm tra tệp")');

    // Chờ bản xem trước hiển thị (10 sinh viên)
    await expect(
      teacherPage.locator(".class-create-stats strong").first(),
    ).toHaveText("10", {
      timeout: 30_000,
    });
    await teacherPage.click('button:has-text("Tiếp tục xác nhận")');

    // Bước 3: Xác nhận tạo lớp
    await expect(
      teacherPage.locator("text=Kiểm tra trước khi tạo"),
    ).toBeVisible();
    await teacherPage.locator('button:has-text("Tạo lớp")').last().click();

    // Bước 4: Thành công -> Đi tới lớp
    await expect(teacherPage.locator("h2:has-text('Đã tạo lớp')")).toBeVisible({
      timeout: 15_000,
    });
    await teacherPage.locator('button:has-text("Đi tới lớp")').click();

    await teacherPage.waitForLoadState("networkidle");
    await expect(teacherPage).toHaveURL(/\/admin\/classes\/[0-9a-f-]+/);

    // -------------------------------------------------------------------------
    // BƯỚC 2: TẠO BÀI TẬP MỚI VÀ ĐIỀU HƯỚNG SANG TRANG NHẬP ĐIỂM
    // -------------------------------------------------------------------------
    const assignmentLink = teacherPage
      .locator('a[href*="/assignments"]')
      .first();
    await assignmentLink.click();
    await teacherPage.waitForLoadState("networkidle");

    await teacherPage.locator('button:has-text("+ Tạo bài tập mới")').click();
    const assignmentTitle = `Bài Tập Phúc Khảo ${randomSuffix}`;
    const titleInput = teacherPage
      .locator('label:has-text("Tên bài tập") input, input.form-input')
      .first();
    await titleInput.fill(assignmentTitle);
    await teacherPage.locator('button:has-text("Tạo bài tập")').click();

    // Chờ bài tập xuất hiện trên danh sách và click "Nhập điểm & feedback"
    await expect(teacherPage.locator(`text=${assignmentTitle}`)).toBeVisible({
      timeout: 10_000,
    });
    const gradeLink = teacherPage
      .locator('a:has-text("Nhập điểm & feedback")')
      .first();
    await gradeLink.click();

    await expect(teacherPage).toHaveURL(/\/assignments\/[a-f0-9-]+\/grade/);
    await teacherPage.waitForLoadState("networkidle");

    // -------------------------------------------------------------------------
    // BƯỚC 3: NHẬP ĐIỂM LẦN ĐẦU (8.0) VÀ CÔNG BỐ CHO SINH VIÊN
    // -------------------------------------------------------------------------
    const initialGradePath = path.join(
      tempDir,
      `initial_grade_${randomSuffix}.csv`,
    );
    fs.writeFileSync(
      initialGradePath,
      `MSSV,Họ tên,Điểm,Feedback\n${studentMssv},${studentName},8.0,Làm bài khá tốt\n`,
      "utf-8",
    );

    await teacherPage.click('button:has-text("Nhập file điểm")');
    const modal = teacherPage.locator(".modal, [role='dialog']");
    await modal.locator('input[type="file"]').setInputFiles(initialGradePath);

    await modal.locator('button:has-text("Kiểm tra tệp")').click();
    await expect(modal.locator(".import-preview-table-wrap")).toBeVisible({
      timeout: 10_000,
    });

    // Công bố kết quả ngay
    await modal.locator('button:has-text("Công bố kết quả")').click();
    await modal.locator('button:has-text("Xác nhận công bố")').click();

    // Chờ bảng điểm cập nhật trạng thái "Đã công bố"
    await expect(
      teacherPage.locator('span:has-text("Đã công bố")'),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      teacherPage.locator("table.grade-results-table"),
    ).toContainText("8");

    // -------------------------------------------------------------------------
    // BƯỚC 4: TEST EDGE CASE - UPLOAD ĐIỂM LỖI (NGOÀI THANG > 10)
    // -------------------------------------------------------------------------
    const invalidGradePath = path.join(
      tempDir,
      `invalid_grade_${randomSuffix}.csv`,
    );
    fs.writeFileSync(
      invalidGradePath,
      `MSSV,Họ tên,Điểm,Feedback\n${studentMssv},${studentName},15.0,Điểm vượt trần\n`,
      "utf-8",
    );

    // Bấm nút "Nhập lại file điểm"
    await teacherPage.click('button:has-text("Nhập lại file điểm")');
    await modal.locator('input[type="file"]').setInputFiles(invalidGradePath);
    await modal.locator('button:has-text("Kiểm tra tệp")').click();

    // Bảng preview phải đánh dấu dòng lỗi
    await expect(modal.locator(".import-preview-table-wrap")).toBeVisible({
      timeout: 10_000,
    });
    await expect(modal.locator(".badge-error").first()).toBeVisible();
    await expect(modal.locator(".badge-error").first()).toContainText(
      "vượt quá",
    );

    // Nút Lưu nháp / Công bố phải bị disabled khi không có dòng hợp lệ nào
    await expect(
      modal.locator('button:has-text("Lưu chưa công bố")'),
    ).toBeDisabled();
    await modal.locator('button:has-text("Đóng")').click();

    // -------------------------------------------------------------------------
    // BƯỚC 5: CẬP NHẬT ĐIỂM (9.5) Ở CHẾ ĐỘ "LƯU CHƯA CÔNG BỐ" (LƯU NHÁP)
    // -------------------------------------------------------------------------
    const updatedDraftGradePath = path.join(
      tempDir,
      `draft_grade_${randomSuffix}.csv`,
    );
    fs.writeFileSync(
      updatedDraftGradePath,
      `MSSV,Họ tên,Điểm,Feedback\n${studentMssv},${studentName},9.5,Phúc khảo thành công - bài làm xuất sắc\n`,
      "utf-8",
    );

    await teacherPage.click('button:has-text("Nhập lại file điểm")');
    await modal
      .locator('input[type="file"]')
      .setInputFiles(updatedDraftGradePath);
    await modal.locator('button:has-text("Kiểm tra tệp")').click();

    await expect(modal.locator(".import-preview-table-wrap")).toBeVisible({
      timeout: 10_000,
    });
    // Bấm "Lưu chưa công bố"
    await modal.locator('button:has-text("Lưu chưa công bố")').click();

    // Xác nhận trên giao diện GV: Trạng thái sinh viên chuyển thành "Chưa công bố"
    await expect(
      teacherPage.locator('span:has-text("Chưa công bố")'),
    ).toBeVisible({ timeout: 10_000 });
    // Thanh công cụ GV xuất hiện nút "Công bố 1 kết quả"
    await expect(
      teacherPage.locator('button:has-text("Công bố 1 kết quả")'),
    ).toBeVisible();

    // -------------------------------------------------------------------------
    // BƯỚC 6: BẢO MẬT PHÍA SINH VIÊN - CHƯA ĐƯỢC PHÉP THẤY ĐIỂM NHÁP (9.5)
    // -------------------------------------------------------------------------
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();

    await studentPage.goto(`/class/${encodeURIComponent(classCode)}`);
    await studentPage.waitForLoadState("networkidle");

    // Sinh viên đăng nhập lần đầu với mã PIN mặc định 111111
    await studentPage.fill("#student-identifier", studentMssv);
    await fillOtp(studentPage.locator(".student-pin-field"), "111111");
    await studentPage.click("button.student-login-submit");

    test.setTimeout(90_000);

    // Bắt buộc đổi Nickname & PIN qua trang Onboarding
    await expect(studentPage).toHaveURL(
      new RegExp(`/class/${classCode}/onboarding`, "i"),
      {
        timeout: 10_000,
      },
    );
    await expect(
      studentPage.locator("text=Để bảo mật tài khoản, bạn cần"),
    ).toBeVisible({
      timeout: 10_000,
    });

    const nicknameInput = studentPage.locator("#new-nickname");
    await expect(nicknameInput).toBeVisible({ timeout: 10_000 });
    await nicknameInput.fill(`Hero${randomSuffix}`);

    const pinFields = studentPage.locator(".otp-input");
    await expect(pinFields.first()).toBeVisible({ timeout: 10_000 });
    const pinFieldCount = await pinFields.count();
    if (pinFieldCount >= 2) {
      await fillOtp(pinFields.nth(0), "888888");
      await fillOtp(pinFields.nth(1), "888888");
    } else if (pinFieldCount === 1) {
      await fillOtp(pinFields.nth(0), "888888");
    }

    const submitBtn = studentPage.locator("#change-credentials-submit");
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
    await submitBtn.click();

    // Chờ hoàn tất đổi thông tin và chuyển hướng vào trang hồ sơ / workspace cá nhân
    await expect(studentPage).toHaveURL(
      new RegExp(`/class/${classCode}/(profile|grades)`, "i"),
      {
        timeout: 15_000,
      },
    );
    await studentPage.waitForLoadState("networkidle");

    // Điều hướng sang mục Kết quả / Điểm của sinh viên
    const gradesNav = studentPage.locator('a[href*="/grades"]');
    if (await gradesNav.isVisible()) {
      await gradesNav.click();
    } else {
      await studentPage.goto(`/class/${encodeURIComponent(classCode)}/grades`);
    }
    await studentPage.waitForLoadState("networkidle");

    // ASSERT BẢO MẬT QUAN TRỌNG:
    // Vì kết quả đang ở chế độ "Lưu chưa công bố" (Draft), sinh viên tuyệt đối
    // KHÔNG ĐƯỢC PHÉP nhìn thấy điểm nháp 9.5. Hệ thống hiển thị trạng thái chưa có kết quả.
    await expect(
      studentPage.locator("text=Chưa có kết quả được công bố."),
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(studentPage.locator("text=9.5")).not.toBeVisible();

    // -------------------------------------------------------------------------
    // BƯỚC 7: GIÁO VIÊN THỰC HIỆN "CÔNG BỐ KẾT QUẢ" MỚI
    // -------------------------------------------------------------------------
    await teacherPage.click('button:has-text("Công bố 1 kết quả")');
    // Xuất hiện card thông báo xác nhận công bố
    const alertDialog = teacherPage.locator('[role="alertdialog"]');
    await expect(alertDialog).toBeVisible();
    await alertDialog.locator('button:has-text("Xác nhận công bố")').click();

    // Chờ hộp thoại xác nhận đóng lại và nút công bố biến mất -> đảm bảo API publish hoàn tất 100%
    await expect(alertDialog).not.toBeVisible({ timeout: 10_000 });
    await expect(
      teacherPage.locator('button:has-text("Công bố 1 kết quả")'),
    ).not.toBeVisible({
      timeout: 10_000,
    });
    await expect(
      teacherPage.locator("table.grade-results-table"),
    ).toContainText("9.5");

    // -------------------------------------------------------------------------
    // BƯỚC 8: SINH VIÊN TẢI LẠI TRANG & NHẬN ĐIỂM MỚI (9.5) THÀNH CÔNG
    // -------------------------------------------------------------------------
    await studentPage.reload();

    // Điểm hiển thị bên ngoài danh sách đã cập nhật lên 9.5
    const updatedRow = studentPage.locator("button.workspace-assignment-row");
    await expect(updatedRow).toBeVisible({ timeout: 15_000 });
    await expect(updatedRow).toContainText("9.5 / 10 điểm");

    // Click xem chi tiết để kiểm tra feedback phúc khảo
    await updatedRow.click();
    await expect(studentPage.locator(".student-result-score")).toHaveText(
      "9.5 / 10",
    );
    await expect(studentPage.locator(".form-notice")).toContainText(
      "Phúc khảo thành công - bài làm xuất sắc",
    );

    // Dọn dẹp file tạm
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });
});
