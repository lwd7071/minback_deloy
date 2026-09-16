import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test.describe("Workflow 1: Teacher Flow", () => {
  test("Đăng nhập -> Tạo lớp & Import sinh viên -> Tạo bài tập -> Nhập/Import điểm", async ({
    page,
  }) => {
    // 1. Đăng nhập Giáo viên
    const teacherEmail = process.env.E2E_TEACHER_EMAIL || "admin@test.com";
    const teacherPassword =
      process.env.E2E_TEACHER_PASSWORD || "DemoTeacherA123!";

    await page.goto("/admin/login");
    await page.waitForLoadState("networkidle");

    await page.fill("#teacher-email", teacherEmail);
    await page.fill("#teacher-password", teacherPassword);
    await page.click('button[type="submit"]');

    // Kiểm tra chuyển hướng thành công đến danh sách lớp
    await expect(page).toHaveURL(/\/admin\/classes/);
    await page.waitForLoadState("networkidle");

    // 2. Tạo lớp học phần mới kèm import sinh viên
    const classCode = `E2E${Date.now().toString().slice(-5)}`;
    const className = `Lớp Kiểm Thử E2E ${classCode}`;

    // Lưu classCode để kịch bản workflow-2 (Student) kế thừa kiểm thử
    const statePath = path.resolve(
      process.cwd(),
      "test/e2e/fixtures/last-class.json",
    );
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify({ classCode }), "utf-8");

    await page.goto("/admin/classes/new");
    await page.waitForLoadState("networkidle");

    // Bước 1: Thông tin lớp
    const codeInput = page
      .locator('label:has-text("Mã lớp") input, input.form-input')
      .first();
    await codeInput.fill(classCode);
    const nameInput = page.locator('label:has-text("Tên lớp") input').first();
    await nameInput.fill(className);

    await page.click('button[type="submit"]:has-text("Tiếp tục")');

    // Bước 2: Tải lên danh sách sinh viên
    await expect(
      page.locator("text=Chuẩn bị danh sách sinh viên"),
    ).toBeVisible();

    const studentCsvPath = path.resolve(
      process.cwd(),
      "test/e2e/danh_sach_sinh_vien_mau.csv",
    );
    await page.setInputFiles('input[type="file"]', studentCsvPath);

    // Bấm Kiểm tra tệp
    const checkFileBtn = page.locator('button:has-text("Kiểm tra tệp")');
    await checkFileBtn.click();

    // Chờ bản xem trước hiển thị (10 sinh viên hợp lệ)
    await expect(page.locator(".class-create-stats strong").first()).toHaveText(
      "10",
      {
        timeout: 30_000,
      },
    );
    await expect(page.locator("text=Nguyễn Văn An")).toBeVisible();

    // Tiếp tục xác nhận
    const continueReviewBtn = page.locator(
      'button:has-text("Tiếp tục xác nhận")',
    );
    await continueReviewBtn.click();

    // Bước 3: Xác nhận & Tạo lớp
    await expect(page.locator("text=Kiểm tra trước khi tạo")).toBeVisible();
    const createClassBtn = page.locator('button:has-text("Tạo lớp")').last();
    await createClassBtn.click();

    // Bước 4: Thành công -> Vào lớp
    await expect(page.locator("h2:has-text('Đã tạo lớp')")).toBeVisible({
      timeout: 15_000,
    });
    const enterClassBtn = page.locator('button:has-text("Đi tới lớp")');
    await enterClassBtn.click();

    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/classes\/[0-9a-f-]+/);

    // 3. Chuyển sang phần Bài tập và tạo bài tập mới
    const assignmentLink = page.locator('a[href*="/assignments"]').first();
    await assignmentLink.click();
    await page.waitForLoadState("networkidle");

    // Click nút "+ Tạo bài tập mới"
    const showCreateBtn = page.locator('button:has-text("+ Tạo bài tập mới")');
    await showCreateBtn.click();

    // Nhập tên bài tập
    const titleInput = page
      .locator('label:has-text("Tên bài tập") input, input.form-input')
      .first();
    await titleInput.fill("Bài tập 1: Kiểm thử E2E");

    // Bấm Tạo bài tập
    const submitAssignmentBtn = page.locator('button:has-text("Tạo bài tập")');
    await submitAssignmentBtn.click();

    // Chờ bài tập xuất hiện trên danh sách
    await expect(page.locator("text=Bài tập 1: Kiểm thử E2E")).toBeVisible({
      timeout: 10_000,
    });

    // 4. Nhập điểm & feedback cho bài tập
    const gradeLink = page
      .locator('a:has-text("Nhập điểm & feedback")')
      .first();
    await gradeLink.click();

    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(
      /\/admin\/classes\/.*\/assignments\/.*\/grade/,
    );

    // 4. Nhập file điểm & feedback cho bài tập
    const importGradeBtn = page.locator('button:has-text("Nhập file điểm")');
    await importGradeBtn.click();

    const gradeCsvPath = path.resolve(
      process.cwd(),
      "test/e2e/bang_cham_diem_mau.csv",
    );
    const modal = page.locator(
      ".grade-import-modal-content, .modal, [role='dialog']",
    );
    await modal.locator('input[type="file"]').setInputFiles(gradeCsvPath);

    // Click Kiểm tra tệp
    const checkGradeFileBtn = modal.locator('button:has-text("Kiểm tra tệp")');
    await checkGradeFileBtn.click();

    // Chờ xem trước load xong
    await expect(modal.locator("text=Tạo mới")).toBeVisible({
      timeout: 10_000,
    });

    // Công bố kết quả
    const publishBtn = modal.locator('button:has-text("Công bố kết quả")');
    await publishBtn.click();

    const confirmPublishBtn = modal.locator(
      'button:has-text("Xác nhận công bố")',
    );
    await confirmPublishBtn.click();

    // Chờ cập nhật và kiểm tra sinh viên kèm điểm số hiển thị trên bảng
    await expect(page.locator("text=Nguyễn Văn An").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("text=8.5").first()).toBeVisible();
  });
});
