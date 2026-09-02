import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { requireFullStudentSession } from "@/server/auth/student-session";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { cacheTags } from "@/server/cache/resource-tags";
import { listTeacherAssignments } from "@/server/services/assignments/assignment-service";
import { getTeacherClassSection } from "@/server/services/class-sections/class-section-service";
import {
  getTeacherClassSectionSummaries,
  getTeacherGradebook,
} from "@/server/services/frontend-rebuild/frontend-api-service";
import { getTeacherDashboardOverview } from "@/server/services/frontend-rebuild/teacher-dashboard-service";
import { getStudentProfile } from "@/server/services/students/student-profile-service";
import { getNotificationSettings } from "@/server/services/notifications/notification-settings-service";
import { getTeacherAssignment } from "@/server/services/assignments/assignment-service";
import { listTeacherEvaluations } from "@/server/services/evaluations/evaluation-service";
import { listTeacherSubmissions } from "@/server/services/students/teacher-submission-service";
import { listStudentsInClass } from "@/server/services/students/student-management-service";

function privateNavigationLife(): void {
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
}

export async function loadTeacherDashboard() {
  "use cache: private";
  privateNavigationLife();
  const { teacher } = await requireTeacher();
  cacheTag(cacheTags.teacher(teacher.id), cacheTags.teacherDashboard(teacher.id));
  return getTeacherDashboardOverview();
}

export async function loadTeacherClasses(input: unknown) {
  "use cache: private";
  privateNavigationLife();
  const { teacher } = await requireTeacher();
  cacheTag(cacheTags.teacher(teacher.id), cacheTags.teacherClasses(teacher.id));
  return getTeacherClassSectionSummaries(input);
}

export async function loadTeacherSettings() {
  "use cache: private";
  privateNavigationLife();
  const { teacher } = await requireTeacher();
  cacheTag(cacheTags.teacher(teacher.id), cacheTags.teacherSettings(teacher.id));
  return getNotificationSettings();
}

export async function loadTeacherClassOverview(classSectionId: string) {
  "use cache: private";
  privateNavigationLife();
  const { teacher } = await requireTeacher();
  cacheTag(cacheTags.teacher(teacher.id), cacheTags.classSection(classSectionId));
  return getTeacherClassSection(classSectionId);
}

export async function loadClassAssignments(classSectionId: string) {
  "use cache: private";
  privateNavigationLife();
  const { teacher } = await requireTeacher();
  cacheTag(
    cacheTags.teacher(teacher.id),
    cacheTags.classSection(classSectionId),
    cacheTags.classAssignments(classSectionId),
  );
  return listTeacherAssignments(classSectionId);
}

export async function loadGradebook(classSectionId: string, input: unknown) {
  "use cache: private";
  privateNavigationLife();
  const { teacher } = await requireTeacher();
  cacheTag(
    cacheTags.teacher(teacher.id),
    cacheTags.classSection(classSectionId),
    cacheTags.classGradebook(classSectionId),
  );
  return getTeacherGradebook(classSectionId, input);
}

export async function loadClassStudents(classSectionId: string) {
  "use cache: private";
  privateNavigationLife();
  const { teacher } = await requireTeacher();
  cacheTag(cacheTags.teacher(teacher.id), cacheTags.classStudents(classSectionId));
  return listStudentsInClass(classSectionId, { page: 1, pageSize: 20 });
}

export async function loadBulkGrade(classSectionId: string, assignmentId: string) {
  "use cache: private";
  privateNavigationLife();
  const { teacher } = await requireTeacher();
  cacheTag(
    cacheTags.teacher(teacher.id), cacheTags.classStudents(classSectionId),
    cacheTags.assignment(assignmentId), cacheTags.assignmentGrading(assignmentId),
  );
  const [assignment, students, evaluations, submissions] = await Promise.all([
    getTeacherAssignment(assignmentId),
    listStudentsInClass(classSectionId, { page: 1, pageSize: 100 }),
    listTeacherEvaluations(assignmentId),
    listTeacherSubmissions(assignmentId),
  ]);
  return { assignment, students: students.students, evaluations, submissions };
}

export async function loadStudentWorkspace() {
  "use cache: private";
  privateNavigationLife();
  const session = await requireFullStudentSession();
  cacheTag(
    cacheTags.student(session.studentId),
    cacheTags.studentProfile(session.studentId),
    cacheTags.classStudentProfiles(session.classSectionId),
  );
  return getStudentProfile(session);
}
