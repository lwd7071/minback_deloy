import "server-only";

import { notFound, redirect } from "next/navigation";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";

export function handleTeacherPageError(error: unknown): never {
  if (error instanceof ApiError) {
    if (error.code === API_ERROR_CODES.notFound) notFound();
    if (error.code === API_ERROR_CODES.unauthenticated)
      redirect("/admin/login");
  }
  throw error;
}

export function handleStudentWorkspaceError(
  error: unknown,
  classCode: string,
): never {
  const publicClassPath = `/class/${encodeURIComponent(classCode)}`;
  if (error instanceof ApiError) {
    if (error.code === API_ERROR_CODES.credentialChangeRequired) {
      redirect(`${publicClassPath}/onboarding`);
    }
    if (
      error.code === API_ERROR_CODES.unauthenticated ||
      error.code === API_ERROR_CODES.sessionExpired ||
      error.code === API_ERROR_CODES.notFound
    ) {
      redirect(publicClassPath);
    }
  }
  throw error;
}
