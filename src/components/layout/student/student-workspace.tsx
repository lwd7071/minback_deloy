"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { WorkspaceHeader } from "@/components/layout/workspace-header";
import type { StudentProfileDto } from "@/types/student-profile";

type WorkspaceState = {
  profile: StudentProfileDto | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const StudentWorkspaceContext = createContext<WorkspaceState | null>(null);

export function useStudentWorkspace() {
  const context = useContext(StudentWorkspaceContext);
  if (!context) throw new Error("Student workspace context is required");
  return context;
}

export function StudentWorkspaceLayout({
  classCode,
  profile,
  children,
}: {
  classCode: string;
  profile: StudentProfileDto;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition]);

  const value = useMemo(
    () => ({ profile, loading: isPending, error: null, refresh }),
    [isPending, profile, refresh],
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
