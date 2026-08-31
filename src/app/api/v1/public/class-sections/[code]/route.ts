import { type NextRequest, NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { getPublicClassSection } from "@/server/services/frontend-rebuild/frontend-api-service";

type Context = { params: Promise<{ code: string }> };

export async function GET(
  request: NextRequest,
  { params }: Context,
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const data = await getPublicClassSection(
      code,
      request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip"),
    );
    return successResponse(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
