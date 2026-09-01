const GENERIC_UPLOAD_ERROR = "Không thể tải file lên. Vui lòng thử lại sau.";

export function getCloudinaryUploadErrorMessage(body: unknown): string {
  const technicalMessage =
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "object" &&
    body.error !== null &&
    "message" in body.error &&
    typeof body.error.message === "string"
      ? body.error.message
      : "";

  if (/missing permissions|request forbidden/i.test(technicalMessage)) {
    return "Hệ thống lưu trữ chưa được cấp quyền tải file. Vui lòng liên hệ quản trị viên.";
  }

  if (
    /invalid signature|unknown api key|cloud_name mismatch/i.test(
      technicalMessage,
    )
  ) {
    return "Cấu hình dịch vụ lưu trữ chưa hợp lệ. Vui lòng liên hệ quản trị viên.";
  }

  if (/file size|too large|max_file_size/i.test(technicalMessage)) {
    return "File vượt quá dung lượng cho phép.";
  }

  if (/format|extension|allowed_formats/i.test(technicalMessage)) {
    return "Định dạng file không được hỗ trợ.";
  }

  return GENERIC_UPLOAD_ERROR;
}
