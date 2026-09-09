import { describe, expect, it } from "vitest";
import {
  buildStudentAttachmentDownloadUrl,
  buildStudentSubmissionFileDownloadUrl,
  buildStudentSubmissionFilesBaseUrl,
  buildTeacherSubmissionFilesBaseUrl,
  buildDownloadUrlFromBase,
} from "./file-urls";

describe("File URLs Helper", () => {
  it("builds student attachment download URL correctly", () => {
    const url = buildStudentAttachmentDownloadUrl("assign-1", "attach-1");
    expect(url).toBe(
      "/api/v1/student/assignments/assign-1/attachments/attach-1/download",
    );
  });

  it("builds student submission file download URL correctly", () => {
    const url = buildStudentSubmissionFileDownloadUrl("assign-1", "file-1");
    expect(url).toBe(
      "/api/v1/student/assignments/assign-1/submissions/files/file-1/download",
    );
  });

  it("builds student & teacher base URLs and download paths", () => {
    const studentBase = buildStudentSubmissionFilesBaseUrl("assign-1");
    expect(studentBase).toBe(
      "/api/v1/student/assignments/assign-1/submission-files",
    );
    expect(buildDownloadUrlFromBase(studentBase, "file-1")).toBe(
      "/api/v1/student/assignments/assign-1/submission-files/file-1/download",
    );

    const teacherBase = buildTeacherSubmissionFilesBaseUrl("assign-1");
    expect(teacherBase).toBe(
      "/api/v1/teacher/assignments/assign-1/submission-files",
    );
    expect(buildDownloadUrlFromBase(teacherBase, "file-1")).toBe(
      "/api/v1/teacher/assignments/assign-1/submission-files/file-1/download",
    );
  });
});
