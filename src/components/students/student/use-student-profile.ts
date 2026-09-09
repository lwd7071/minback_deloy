"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppIconName } from "@/components/ui/app-icon";
import { useNotificationPolling } from "@/components/notifications/student/use-notification-polling";

export type StudentProfileAssignment = {
  id: string;
  classSectionId: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  status: "draft" | "published" | "closed";
  maxScore: number;
  createdAt: string;
  updatedAt: string;
  attachments: Array<{
    id: string;
    originalName: string;
    bytes: number;
    format: string;
    uploadedAt: string;
    downloadUrl: string;
  }>;
  submission: {
    attemptCount: number;
    latestAttempt: {
      id: string;
      attemptNumber: number;
      submittedAt: string;
      isLate: boolean;
      files: Array<{
        id: string;
        originalName: string;
        bytes: number;
        format: string;
        uploadedAt: string;
        downloadUrl: string;
      }>;
    } | null;
  };
  evaluation: {
    id: string;
    studentId: string;
    assignmentId: string;
    score: number | null;
    feedback: string;
    status: "pending" | "graded" | "returned";
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type StudentProfileDto = {
  student: { mssv: string; fullName: string; nickname: string };
  classSection: { id: string; code: string; name: string };
  progress: { completed: number; total: number; percentage: number };
  submissionProgress: { completed: number; total: number; percentage: number };
  assignments: StudentProfileAssignment[];
};

type ApiResult<T> = { data: T } | { error: { message: string } };

export type RecentActivity = {
  id: string;
  icon: AppIconName;
  tone: "blue" | "green";
  label: string;
  occurredAt: string;
};

export interface DashboardStats {
  averageScore: number | null;
  submitted: number;
  graded: number;
  notSubmitted: number;
  upcoming?: StudentProfileAssignment;
  recentActivities: RecentActivity[];
}

/**
 * Custom Hook quản lý dữ liệu và tính toán thống kê cho Student Profile.
 * 
 * Tuân thủ Single Responsibility Principle (SRP):
 * - Tách toàn bộ data fetching, session logout, route sync và dashboard aggregation
 *   ra khỏi presentation view.
 */
export function useStudentProfile({ classCode }: { classCode: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | null
  >(null);
  const [referenceTime] = useState(() => Date.now());
  const notificationState = useNotificationPolling();

  useEffect(() => {
    let active = true;

    fetch("/api/v1/student/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          let message = "Không thể tải hồ sơ học tập";
          try {
            const body = (await response.json()) as {
              error?: { message?: string };
            };
            if (body.error?.message) message = body.error.message;
          } catch {
            // Fallback cho non-JSON response
          }
          throw new Error(message);
        }
        const body = (await response.json()) as ApiResult<StudentProfileDto>;
        if (!("data" in body)) throw new Error("Dữ liệu không hợp lệ");
        return body.data;
      })
      .then((data) => {
        if (!active) return;
        if (classCode && data.classSection.code !== classCode.toUpperCase()) {
          router.replace(
            `/class/${encodeURIComponent(data.classSection.code)}/profile`,
          );
          return;
        }
        setProfile(data);
      })
      .catch((fetchError: unknown) => {
        if (active) {
          setError(
            fetchError instanceof Error ? fetchError.message : "Lỗi kết nối",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey, classCode, router]);

  async function handleLogout() {
    try {
      await fetch("/api/v1/student/auth/logout", { method: "POST" });
    } finally {
      setProfile(null);
      router.replace("/");
      router.refresh();
    }
  }

  const dashboard = useMemo<DashboardStats | null>(() => {
    if (!profile) return null;
    const scores = profile.assignments
      .filter(
        (assignment) =>
          assignment.evaluation?.score !== null &&
          assignment.evaluation?.score !== undefined &&
          (assignment.evaluation.status === "graded" ||
            assignment.evaluation.status === "returned"),
      )
      .map(
        (assignment) =>
          (assignment.evaluation!.score! / assignment.maxScore) * 100,
      );
    const averageScore = scores.length
      ? Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length,
        )
      : null;
    const submitted = profile.assignments.filter(
      (assignment) => assignment.submission.latestAttempt !== null,
    ).length;
    const graded = profile.assignments.filter(
      (assignment) =>
        assignment.evaluation?.status === "graded" ||
        assignment.evaluation?.status === "returned",
    ).length;
    const upcoming = profile.assignments
      .filter(
        (assignment) =>
          assignment.status === "published" &&
          !assignment.submission.latestAttempt &&
          new Date(assignment.dueDate).getTime() > referenceTime,
      )
      .sort(
        (left, right) =>
          new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
      )[0];
    const recentActivities: RecentActivity[] = profile.assignments
      .flatMap((assignment) => {
        const activities: RecentActivity[] = [];
        if (assignment.submission.latestAttempt) {
          activities.push({
            id: `submission-${assignment.submission.latestAttempt.id}`,
            icon: "upload",
            tone: "blue",
            label: `Bạn đã nộp bài “${assignment.title}”`,
            occurredAt: assignment.submission.latestAttempt.submittedAt,
          });
        }
        if (
          assignment.evaluation?.status === "graded" ||
          assignment.evaluation?.status === "returned"
        ) {
          activities.push({
            id: `evaluation-${assignment.evaluation.id}`,
            icon: "fileCheck",
            tone: "green",
            label: `Giảng viên đã chấm bài “${assignment.title}”`,
            occurredAt: assignment.evaluation.updatedAt,
          });
        }
        return activities;
      })
      .sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() -
          new Date(left.occurredAt).getTime(),
      )
      .slice(0, 4);

    return {
      averageScore,
      submitted,
      graded,
      notSubmitted: profile.assignments.length - submitted,
      upcoming,
      recentActivities,
    };
  }, [profile, referenceTime]);

  const selectedAssignment = useMemo(() => {
    if (!profile || !selectedAssignmentId) return null;
    return (
      profile.assignments.find((a) => a.id === selectedAssignmentId) ?? null
    );
  }, [profile, selectedAssignmentId]);

  return {
    profile,
    loading,
    error,
    dashboard,
    referenceTime,
    notificationState,
    selectedAssignmentId,
    selectedAssignment,
    setSelectedAssignmentId,
    handleLogout,
    handleAssignmentSubmitted: () => {
      setRefreshKey((value) => value + 1);
      setSelectedAssignmentId(null);
    },
  };
}
