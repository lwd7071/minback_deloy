"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { WorkspaceHeader } from "@/components/layout/workspace-header";
import type { StudentProfileDto } from "@/types/student-profile";

type WorkspaceState = {
  profile: StudentProfileDto | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const StudentWorkspaceContext = createContext<WorkspaceState | null>(null);

export function useStudentWorkspace() {
  const context = useContext(StudentWorkspaceContext);
  if (!context) throw new Error("Student workspace context is required");
  return context;
}

export function StudentWorkspaceLayout({
  classCode,
  children,
}: {
  classCode: string;
  children: ReactNode;
}) {
  const [profile, setProfile] = useState<StudentProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/student/profile", {
        cache: "no-store",
      });
      const body = (await response.json()) as
        | { data: StudentProfileDto }
        | { error: { message: string } };
      if (!response.ok || !("data" in body)) {
        throw new Error("error" in body ? body.error.message : "Không thể tải hồ sơ học tập");
      }
      setProfile(body.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const value = useMemo(
    () => ({ profile, loading, error, refresh }),
    [profile, loading, error, refresh],
  );

  return (
    <StudentWorkspaceContext.Provider value={value}>
      <div className="workspace-page student-workspace">
        <WorkspaceHeader classCode={classCode} role="student" />
        <main className="workspace-main">{children}</main>
      </div>
    </StudentWorkspaceContext.Provider>
  );
}
