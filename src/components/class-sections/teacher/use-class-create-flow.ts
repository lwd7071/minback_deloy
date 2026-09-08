import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { classSectionCreateSchema } from "@/schemas/class-section";
import type { ClassSectionSetupDto } from "@/types/class-section";
import type { ImportPreviewDto } from "@/types/frontend-rebuild";

export type CreateClassStep = "details" | "roster" | "review" | "complete";
type ApiResult<T> = { data: T } | { error: { code?: string; message: string } };

export const STEPS: Array<{ id: CreateClassStep; label: string }> = [
  { id: "details", label: "Thông tin lớp" },
  { id: "roster", label: "Danh sách sinh viên" },
  { id: "review", label: "Xác nhận" },
  { id: "complete", label: "Hoàn tất" },
];

export function stepIndex(step: CreateClassStep): number {
  return STEPS.findIndex((item) => item.id === step);
}

export function useClassCreateFlow() {
  const router = useRouter();
  const codeInputRef = useRef<HTMLInputElement>(null);
  const previewControllerRef = useRef<AbortController | null>(null);
  const previewSequenceRef = useRef(0);
  const [step, setStep] = useState<CreateClassStep>("details");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewDto | null>(null);
  const [skipRoster, setSkipRoster] = useState(false);
  const [result, setResult] = useState<ClassSectionSetupDto | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => previewControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (step === "complete" && result?.classSection?.id) {
      router?.prefetch?.(`/admin/classes/${result.classSection.id}`);
    }
  }, [step, result, router]);

  function continueDetails(event: React.FormEvent) {
    event.preventDefault();
    const parsed = classSectionCreateSchema.safeParse({ code, name });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form");
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      codeInputRef.current?.focus();
      return;
    }
    setCode(parsed.data.code);
    setName(parsed.data.name);
    setFieldErrors({});
    setError(null);
    setStep("roster");
  }

  function changeFile(nextFile: File | null) {
    previewControllerRef.current?.abort();
    previewSequenceRef.current += 1;
    setFile(nextFile);
    setPreview(null);
    setSkipRoster(false);
    setError(null);
    setPreviewBusy(false);
  }

  async function inspectFile() {
    if (!file || previewBusy) return;
    previewControllerRef.current?.abort();
    const controller = new AbortController();
    const sequence = previewSequenceRef.current + 1;
    previewSequenceRef.current = sequence;
    previewControllerRef.current = controller;
    setPreviewBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(
        "/api/v1/teacher/class-section-import-previews",
        { method: "POST", body: formData, signal: controller.signal },
      );
      const body = (await response.json()) as ApiResult<ImportPreviewDto>;
      if (!response.ok || !("data" in body)) {
        throw new Error(
          "error" in body ? body.error.message : "Không thể kiểm tra tệp",
        );
      }
      if (previewSequenceRef.current === sequence) setPreview(body.data);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(
          cause instanceof Error ? cause.message : "Không thể kiểm tra tệp",
        );
      }
    } finally {
      if (previewSequenceRef.current === sequence) setPreviewBusy(false);
      if (previewControllerRef.current === controller) {
        previewControllerRef.current = null;
      }
    }
  }

  function continueWithoutRoster() {
    changeFile(null);
    setSkipRoster(true);
    setStep("review");
  }

  async function createClassSection() {
    if (submitBusy || result) return;
    setSubmitBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("code", code);
      formData.set("name", name);
      if (!skipRoster && file) formData.set("file", file);
      const response = await fetch("/api/v1/teacher/class-section-setups", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as ApiResult<ClassSectionSetupDto>;
      if (!response.ok || !("data" in body)) {
        if (
          response.status === 409 &&
          "error" in body &&
          body.error.code === "CONFLICT"
        ) {
          setFieldErrors({ code: body.error.message });
          setStep("details");
          window.setTimeout(() => codeInputRef.current?.focus(), 0);
          return;
        }
        throw new Error(
          "error" in body ? body.error.message : "Không thể tạo lớp",
        );
      }
      setResult(body.data);
      setStep("complete");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo lớp");
    } finally {
      setSubmitBusy(false);
    }
  }

  function navigateToClass() {
    if (!result?.classSection?.id) return;
    setNavigating(true);
    router.push(`/admin/classes/${result.classSection.id}`);
  }

  return {
    step,
    setStep,
    code,
    setCode,
    name,
    setName,
    fieldErrors,
    setFieldErrors,
    file,
    preview,
    skipRoster,
    result,
    previewBusy,
    submitBusy,
    navigating,
    error,
    codeInputRef,
    continueDetails,
    changeFile,
    inspectFile,
    continueWithoutRoster,
    createClassSection,
    navigateToClass,
  };
}
