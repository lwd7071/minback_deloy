import "server-only";

import { cache } from "react";
import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TeacherDto = {
  id: string;
  displayName: string;
  emailNotificationEnabled: boolean;
};

export type AuthenticatedTeacherContext = {
  supabase: SupabaseClient;
  teacher: TeacherDto;
};

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Query the `teachers` table by auth user ID.
 * Returns the teacher row or null if not found.
 * Throws ApiError(500) on unexpected database errors.
 */
async function fetchTeacherByAuthId(
  supabase: SupabaseClient,
  userId: string,
): Promise<TeacherDto | null> {
  const { data, error } = await supabase
    .from("teachers")
    .select("id, display_name, email_notification_enabled")
    .eq("id", userId)
    .single();

  if (error) {
    // PGRST116 = "no rows returned" from .single() — not a database crash
    if (error.code === "PGRST116") {
      return null;
    }
    throw new ApiError(500, API_ERROR_CODES.internal, "Đã xảy ra lỗi hệ thống");
  }

  return {
    id: data.id as string,
    displayName: data.display_name as string,
    emailNotificationEnabled: Boolean(data.email_notification_enabled),
  };
}

/**
 * Private resolver: authenticate via Supabase Auth, then map to Teacher record.
 * Returns the full authenticated context (supabase client + teacher DTO).
 * Throws UNAUTHENTICATED if no session or no teacher mapping.
 * Throws INTERNAL_ERROR on database failures.
 */
async function resolveAuthenticatedTeacher(): Promise<AuthenticatedTeacherContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ApiError(401, API_ERROR_CODES.unauthenticated, "Chưa đăng nhập");
  }

  const teacher = await fetchTeacherByAuthId(supabase, user.id);

  if (!teacher) {
    throw new ApiError(401, API_ERROR_CODES.unauthenticated, "Chưa đăng nhập");
  }

  return { supabase, teacher };
}

/**
 * Module-level memoized resolver for the current React Server Component request.
 * Does not cache across requests.
 */
const getCachedAuthenticatedTeacher = cache(resolveAuthenticatedTeacher);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Authenticate teacher with email/password via Supabase Auth SSR.
 * On success, Supabase SSR automatically sets auth cookies.
 * If auth succeeds but no teacher record exists, signs out to clean the cookie.
 */
export async function loginTeacher(
  email: string,
  password: string,
): Promise<{ id: string; displayName: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    throw new ApiError(
      401,
      API_ERROR_CODES.invalidCredentials,
      "Thông tin đăng nhập không hợp lệ",
    );
  }

  let teacher: TeacherDto | null;
  try {
    teacher = await fetchTeacherByAuthId(supabase, data.user.id);
  } catch {
    // Database error — clean up the auth session before rethrowing
    await supabase.auth.signOut();
    throw new ApiError(500, API_ERROR_CODES.internal, "Đã xảy ra lỗi hệ thống");
  }

  if (!teacher) {
    // Auth user exists but is not a Teacher — clean up session
    await supabase.auth.signOut();
    throw new ApiError(
      401,
      API_ERROR_CODES.invalidCredentials,
      "Thông tin đăng nhập không hợp lệ",
    );
  }

  return { id: teacher.id, displayName: teacher.displayName };
}

/**
 * Get current teacher info (DTO only, no supabase client).
 * Used by /me endpoint and login page session check.
 */
export async function getCurrentTeacher(): Promise<TeacherDto> {
  const { teacher } = await getCachedAuthenticatedTeacher();
  return teacher;
}

/**
 * Sign out current teacher session (local scope only).
 */
export async function logoutTeacher(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    throw new ApiError(500, API_ERROR_CODES.internal, "Đã xảy ra lỗi hệ thống");
  }
}

/**
 * Authenticate and return full context for downstream services.
 * The returned supabase client carries auth.uid() for RLS queries.
 * Only authenticates and throws — does NOT redirect.
 */
export async function requireTeacher(): Promise<AuthenticatedTeacherContext> {
  return getCachedAuthenticatedTeacher();
}
