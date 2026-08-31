import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { assertSameOrigin } from "@/lib/api/origin";
import { signTeacherAttachmentUpload } from "@/server/services/attachment-service";

type Params = { params: Promise<{ assignmentId: string }> };

export async function POST(
  request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { assignmentId } = await params;
    return successResponse(
      await signTeacherAttachmentUpload(assignmentId, await request.json()),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
