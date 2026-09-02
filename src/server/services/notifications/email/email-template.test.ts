import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  escapeHtml,
  renderEvaluationReturnedEmail,
} from "./templates/evaluation-returned-template";
import { renderTestEmail } from "./templates/test-email-template";

describe("email templates", () => {
  it("escapes all special HTML characters properly", () => {
    const raw = `"><script>alert('xss')</script>&"`;
    const escaped = escapeHtml(raw);
    expect(escaped).toBe(
      "&quot;&gt;&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;&amp;&quot;",
    );
    expect(escaped).not.toContain("<script>");
  });

  it("renders evaluation returned email with correct content and privacy guarantees", () => {
    const result = renderEvaluationReturnedEmail(
      {
        studentFullName: "Nguyễn Văn A",
        assignmentTitle: "Bài tập 1: TypeScript & Clean Architecture",
        classCode: "SE101",
        className: "Công nghệ phần mềm",
      },
      "https://minback.edu.vn",
    );

    expect(result.subject).toBe("[MinBack] Có kết quả mới - SE101");
    expect(result.htmlContent).toContain("Nguyễn Văn A");
    expect(result.htmlContent).toContain("SE101");
    expect(result.htmlContent).toContain("Công nghệ phần mềm");
    expect(result.htmlContent).toContain(
      "https://minback.edu.vn/class/SE101/login",
    );
    expect(result.htmlContent).toContain("background-color: #1E3A4A");
    expect(result.htmlContent).toContain("background-color: #F5B400");
    expect(result.htmlContent).toContain("color: #16303D");

    // Ràng buộc bảo mật: Không chứa điểm số cụ thể
    expect(result.htmlContent).not.toContain("score");
    expect(result.htmlContent).not.toContain("grade");
  });

  it("renders test email correctly", () => {
    const result = renderTestEmail();
    expect(result.subject).toBe("[MinBack] Kiểm tra cấu hình email");
    expect(result.htmlContent).toContain(
      "Cấu hình Brevo của MinBack đang hoạt động",
    );
    expect(result.htmlContent).toContain("background-color: #1E3A4A");
    expect(result.htmlContent).toContain("background-color: #FBFAF7");
  });
});
