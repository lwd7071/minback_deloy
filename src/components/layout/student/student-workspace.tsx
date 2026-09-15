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
import type { StudentWorkspaceIdentity } from "@/types/student-workspace";

type WorkspaceState = {
  identity: StudentWorkspaceIdentity | null;
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
  identity,
  children,
}: {
  classCode: string;
  identity: StudentWorkspaceIdentity;
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
    () => ({ identity, loading: isPending, error: null, refresh }),
    [isPending, identity, refresh],
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
