import "server-only";

import { escapeHtml } from "./evaluation-returned-template";

export function renderTestEmail(): { subject: string; htmlContent: string } {
  const subject = "[MinBack] Kiểm tra cấu hình email";

  const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FBFAF7; color: #16303D; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E1E6E9; border-radius: 8px; overflow: hidden;">
    <tr>
      <td style="padding: 24px 32px 16px; background-color: #1E3A4A; color: #FBFAF7;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.025em; color: #FBFAF7;">MinBack</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #C9D4D9;">Hệ thống hỗ trợ giảng dạy &amp; chấm bài</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <div style="display: inline-block; background-color: #E5F1EB; color: #417A61; font-size: 13px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px;">
          ✓ Kết nối thành công
        </div>
        <p style="margin: 0 0 16px; font-size: 15px; font-weight: 600;">Cấu hình Brevo của MinBack đang hoạt động chính xác.</p>
        <p style="margin: 0 0 24px; font-size: 14px; color: #2C5468;">
          Đây là email kiểm tra được gửi tự động từ trang Cài đặt thông báo của Giảng viên. Khi bạn công bố kết quả bài tập (trạng thái <em>returned</em>), sinh viên có email sẽ nhận được thư tương tự.
        </p>
        <hr style="border: 0; border-top: 1px solid #E1E6E9; margin: 24px 0;">
        <p style="margin: 0; font-size: 12px; color: #2C5468;">
          Đây là email tự động, vui lòng không trả lời.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return {
    subject,
    htmlContent,
  };
}
