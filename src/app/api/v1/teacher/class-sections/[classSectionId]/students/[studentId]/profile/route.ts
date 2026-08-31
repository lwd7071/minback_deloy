import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { getTeacherStudentProfile } from "@/server/services/students/teacher-student-profile-service";

type RouteParams = {
  params: Promise<{ classSectionId: string; studentId: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { classSectionId, studentId } = await params;
    return successResponse(
      await getTeacherStudentProfile(classSectionId, studentId),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
