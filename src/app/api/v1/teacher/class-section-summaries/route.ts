import { type NextRequest, NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { getTeacherClassSectionSummaries } from "@/server/services/frontend-rebuild/frontend-api-service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = new URL(request.url).searchParams;
    const result = await getTeacherClassSectionSummaries({
      page: params.get("page") ?? undefined,
      pageSize: params.get("pageSize") ?? undefined,
      search: params.get("q") ?? params.get("search") ?? undefined,
      progress: params.get("progress") ?? undefined,
      sort: params.get("sort") ?? undefined,
    });
    return successResponse(result.data, undefined, {
      ...result.meta,
      filterCounts: result.filterCounts,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
