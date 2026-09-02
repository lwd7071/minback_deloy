import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { getTeacherDashboardOverview } from "@/server/services/frontend-rebuild/teacher-dashboard-service";

export async function GET(): Promise<NextResponse> {
  try {
    const result = await getTeacherDashboardOverview();
    return successResponse(result.data);
  } catch (error) {
    return errorResponse(error);
  }
}
