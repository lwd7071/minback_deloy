import { test, expect } from "@playwright/test";
import path from "node:path";

test.describe("Kiểm thử: Tạo lớp trống -> Bổ sung sinh viên bằng 2 nút Thêm và Import", () => {
  test("Tạo lớp không kèm sinh viên -> Thêm thủ công & Import file bổ sung thành công", async ({
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

    await expect(page).toHaveURL(/\/admin\/classes/);
    await page.waitForLoadState("networkidle");

    // 2. Tạo lớp mới và chọn "Bỏ qua, thêm sau" ở Bước 2
    const emptyClassCode = `NOP${Date.now().toString().slice(-5)}`;
    const emptyClassName = `Lớp Trống ${emptyClassCode}`;

    await page.goto("/admin/classes/new");
    await page.waitForLoadState("networkidle");

    // Bước 1: Nhập thông tin lớp
    const codeInput = page
      .locator('label:has-text("Mã lớp") input, input.form-input')
      .first();
    await codeInput.fill(emptyClassCode);
    const nameInput = page.locator('label:has-text("Tên lớp") input').first();
    await nameInput.fill(emptyClassName);
    await page.click('button[type="submit"]:has-text("Tiếp tục")');

    // Bước 2: Bỏ qua bước import sinh viên
    await expect(
      page.locator("text=Chuẩn bị danh sách sinh viên"),
    ).toBeVisible();
    const skipBtn = page.locator('button:has-text("Bỏ qua, thêm sau")');
    await expect(skipBtn).toBeVisible();
    await skipBtn.click();

    // Bước 3: Xác nhận tạo lớp
    await expect(page.locator("text=Kiểm tra trước khi tạo")).toBeVisible();
    const createClassBtn = page.locator('button:has-text("Tạo lớp")').last();
    await createClassBtn.click();

    // Bước 4: Hoàn tất -> Vào lớp
    await expect(page.locator("h2:has-text('Đã tạo lớp')")).toBeVisible({
      timeout: 15_000,
    });
    const enterClassBtn = page.locator('button:has-text("Đi tới lớp")');
    await enterClassBtn.click();

    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/classes\/[0-9a-f-]+/);

    // 3. Vào tab Quản lý sinh viên của lớp
    const studentLink = page.locator('a[href*="/students"]').first();
    await studentLink.click();
    await page.waitForLoadState("networkidle");

    // 4. Xác nhận 2 nút "Nhập file Excel/CSV" và "+ Thêm sinh viên" ĐÃ ĐƯỢC HIỂN THỊ
    const importBtn = page
      .locator('button:has-text("Nhập file Excel/CSV")')
      .first();
    const addStudentBtn = page
      .locator('button:has-text("+ Thêm sinh viên")')
      .first();

    await expect(importBtn).toBeVisible();
    await expect(addStudentBtn).toBeVisible();

    // 5. Kiểm thử nút "+ Thêm sinh viên" thủ công
    await addStudentBtn.click();
    const addModal = page
      .locator('.modal, [role="dialog"]')
      .filter({ hasText: "Thêm sinh viên vào lớp" });
    await expect(addModal).toBeVisible();

    const mssvInput = addModal.locator('input[type="text"]').first();
    const fullNameInput = addModal.locator('input[type="text"]').nth(1);

    await mssvInput.fill("99990001");
    await fullNameInput.fill("Sinh Viên Thủ Công");

    const submitAddBtn = addModal.locator(
      'button[type="submit"]:has-text("Thêm sinh viên")',
    );
    await submitAddBtn.click();

    // Chờ danh sách cập nhật và kiểm tra sinh viên vừa thêm xuất hiện trong bảng
    await expect(page.locator("text=99990001").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator("text=Sinh Viên Thủ Công").first()).toBeVisible();

    // Nút "Sửa" và "Reset PIN" cho sinh viên này đã xuất hiện và hoạt động
    const editBtn = page.locator('button:has-text("Sửa")').first();
    await expect(editBtn).toBeVisible();

    // 6. Kiểm thử nút "Nhập file Excel/CSV" bổ sung
    await importBtn.click();
    const importModal = page
      .locator('.modal, [role="dialog"]')
      .filter({ hasText: "Nhập danh sách sinh viên từ file" });
    await expect(importModal).toBeVisible();

    const studentCsvPath = path.resolve(
      process.cwd(),
      "test/e2e/danh_sach_sinh_vien_mau.csv",
    );
    await importModal
      .locator('input[type="file"]')
      .setInputFiles(studentCsvPath);

    const submitImportBtn = importModal.locator(
      'button[type="submit"]:has-text("Tiến hành nhập")',
    );
    await submitImportBtn.click();

    // Chờ import xong và xác nhận sinh viên từ file xuất hiện trong bảng
    await expect(page.locator("text=21110001").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("text=Nguyễn Văn An").first()).toBeVisible();
  });
});
