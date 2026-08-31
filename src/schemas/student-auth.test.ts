import { describe, expect, it } from "vitest";

import {
  credentialsUpdateSchema,
  classSectionCodeSchema,
  fullNameSchema,
  nicknameSchema,
  pinSchema,
  studentAdminUpdateSchema,
  studentEmailSchema,
  studentListQuerySchema,
  studentLoginSchema,
} from "./student-auth";

describe("Student Auth Schemas Validation", () => {
  describe("classSectionCodeSchema", () => {
    it("normalizes to uppercase and accepts valid format", () => {
      expect(classSectionCodeSchema.parse("  it001_01  ")).toBe("IT001_01");
      expect(classSectionCodeSchema.parse("WEB-101")).toBe("WEB-101");
    });

    it("rejects invalid characters and lengths outside 2-50", () => {
      expect(() => classSectionCodeSchema.parse("A")).toThrow();
      expect(() => classSectionCodeSchema.parse("IT@001")).toThrow();
      expect(() => classSectionCodeSchema.parse("A".repeat(51))).toThrow();
    });
  });

  describe("nicknameSchema", () => {
    it("trims and accepts valid nicknames", () => {
      expect(nicknameSchema.parse("  student.01_A-B  ")).toBe("student.01_A-B");
    });

    it("rejects invalid characters and lengths outside 3-50", () => {
      expect(() => nicknameSchema.parse("ab")).toThrow();
      expect(() => nicknameSchema.parse("user#name")).toThrow();
      expect(() => nicknameSchema.parse("a".repeat(51))).toThrow();
    });
  });

  describe("pinSchema", () => {
    it("accepts exactly 6 digits", () => {
      expect(pinSchema.parse("123456")).toBe("123456");
      expect(pinSchema.parse("000000")).toBe("000000");
    });

    it("rejects non-digit and wrong length PINs", () => {
      expect(() => pinSchema.parse("12345")).toThrow();
      expect(() => pinSchema.parse("1234567")).toThrow();
      expect(() => pinSchema.parse("12345a")).toThrow();
    });
  });

  describe("fullNameSchema and studentEmailSchema", () => {
    it("trims fullName and validates length 1-150", () => {
      expect(fullNameSchema.parse("  Nguyễn Văn A  ")).toBe("Nguyễn Văn A");
      expect(() => fullNameSchema.parse("   ")).toThrow();
    });

    it("converts empty email to null and validates real emails", () => {
      expect(studentEmailSchema.parse("")).toBeNull();
      expect(studentEmailSchema.parse("   ")).toBeNull();
      expect(studentEmailSchema.parse(null)).toBeNull();
      expect(studentEmailSchema.parse("student@example.com")).toBe(
        "student@example.com",
      );
      expect(() => studentEmailSchema.parse("invalid-email")).toThrow();
    });
  });

  describe("studentLoginSchema", () => {
    it("validates login payload correctly", () => {
      const parsed = studentLoginSchema.parse({
        classCode: "web101",
        nickname: "cuong123",
        pin: "654321",
      });
      expect(parsed).toEqual({
        classCode: "WEB101",
        nickname: "cuong123",
        pin: "654321",
      });
    });
  });

  describe("credentialsUpdateSchema", () => {
    it("requires at least one field and validates optional fields", () => {
      expect(() => credentialsUpdateSchema.parse({})).toThrow();
      expect(
        credentialsUpdateSchema.parse({ nickname: "new_nick" }),
      ).toEqual({
        nickname: "new_nick",
      });
      expect(credentialsUpdateSchema.parse({ pin: "999888" })).toEqual({
        pin: "999888",
      });
    });
  });

  describe("studentListQuerySchema", () => {
    it("applies default pagination and bounds", () => {
      const parsed = studentListQuerySchema.parse({});
      expect(parsed).toEqual({
        page: 1,
        pageSize: 20,
        search: undefined,
      });
    });

    it("rejects pageSize > 100", () => {
      expect(() =>
        studentListQuerySchema.parse({
          page: "2",
          pageSize: "200",
        }),
      ).toThrow();
    });
  });

  describe("studentAdminUpdateSchema", () => {
    it("allows partial updates", () => {
      expect(
        studentAdminUpdateSchema.parse({ fullName: "Trần Thị B" }),
      ).toEqual({
        fullName: "Trần Thị B",
      });
      expect(
        studentAdminUpdateSchema.parse({ email: "new@example.com" }),
      ).toEqual({
        email: "new@example.com",
      });
    });
  });
});
