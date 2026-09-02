import "server-only";

export type EvaluationEmailTemplateInput = {
  studentFullName: string;
  assignmentTitle: string;
  classCode: string;
  className: string;
};

/**
 * Escape các ký tự nhạy cảm trong HTML để chống XSS / HTML Injection.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

/**
 * Tạo nội dung email thông báo kết quả bài tập (Evaluation Returned).
 * Tuân thủ quy định:
 * 1. Tuyệt đối không chứa điểm (score) hay nhận xét (feedback).
 * 2. Mọi biến động được escape HTML an toàn.
 * 3. Link đăng nhập lớp học: {appUrl}/class/{classCode}/login
 */
export function renderEvaluationReturnedEmail(
  input: EvaluationEmailTemplateInput,
  appUrl: string,
): { subject: string; htmlContent: string } {
  const studentFullName = escapeHtml(input.studentFullName);
  const assignmentTitle = escapeHtml(input.assignmentTitle);
  const classCode = escapeHtml(input.classCode);
  const className = escapeHtml(input.className);
  const cleanAppUrl = appUrl.replace(/\/$/, "");
  const loginUrl = `${cleanAppUrl}/class/${encodeURIComponent(input.classCode)}/login`;
  const safeLoginUrl = escapeHtml(loginUrl);

  const subject = `[MinBack] Có kết quả mới - ${input.classCode}`;

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
        <p style="margin: 0 0 16px; font-size: 15px;">Xin chào <strong>${studentFullName}</strong>,</p>
        <p style="margin: 0 0 16px; font-size: 15px;">
          Giáo viên đã công bố kết quả bài tập “<strong>${assignmentTitle}</strong>” thuộc lớp học phần <strong>${classCode}</strong> — <strong>${className}</strong>.
        </p>
        <p style="margin: 0 0 24px; font-size: 14px; color: #2C5468;">
          Vui lòng đăng nhập MinBack để xem điểm và feedback:
        </p>
        <div style="margin: 0 0 24px;">
          <a href="${safeLoginUrl}" style="display: inline-block; background-color: #F5B400; color: #16303D; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;">
            Đăng nhập xem kết quả
          </a>
        </div>
        <p style="margin: 0 0 24px; font-size: 13px; color: #2C5468; word-break: break-all;">
          Hoặc truy cập trực tiếp đường dẫn:<br>
          <a href="${safeLoginUrl}" style="color: #2C5468; text-decoration: underline;">${safeLoginUrl}</a>
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
