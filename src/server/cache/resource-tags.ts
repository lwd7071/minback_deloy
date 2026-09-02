import "server-only";

import { revalidateTag } from "next/cache";

/**
 * Cache tags intentionally contain only opaque database identifiers. Never put
 * raw session values, email addresses, PINs, or class codes in a cache tag.
 */
export const cacheTags = {
  teacher: (teacherId: string) => `minback:teacher:${teacherId}`,
  teacherDashboard: (teacherId: string) =>
    `minback:teacher:${teacherId}:dashboard`,
  teacherClasses: (teacherId: string) =>
    `minback:teacher:${teacherId}:classes`,
  teacherSettings: (teacherId: string) =>
    `minback:teacher:${teacherId}:settings`,
  student: (studentId: string) => `minback:student:${studentId}`,
  studentProfile: (studentId: string) =>
    `minback:student:${studentId}:profile`,
  classSection: (classSectionId: string) =>
    `minback:class:${classSectionId}`,
  classAssignments: (classSectionId: string) =>
    `minback:class:${classSectionId}:assignments`,
  classStudents: (classSectionId: string) =>
    `minback:class:${classSectionId}:students`,
  classStudentProfiles: (classSectionId: string) =>
    `minback:class:${classSectionId}:student-profiles`,
  classGradebook: (classSectionId: string) =>
    `minback:class:${classSectionId}:gradebook`,
  assignment: (assignmentId: string) => `minback:assignment:${assignmentId}`,
  assignmentGrading: (assignmentId: string) =>
    `minback:assignment:${assignmentId}:grading`,
  publicClass: (normalizedCode: string) =>
    `minback:public-class:${normalizedCode}`,
};

/** Route Handlers must expire immediately so a following refresh reads fresh data. */
export function invalidateTags(tags: readonly string[]): void {
  for (const tag of new Set(tags)) revalidateTag(tag, { expire: 0 });
}
