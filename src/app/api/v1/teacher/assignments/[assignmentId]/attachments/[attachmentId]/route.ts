import { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse } from "@/lib/api/response";
import { deleteTeacherAttachment } from "@/server/services/attachment-service";

type Params = {
  params: Promise<{ assignmentId: string; attachmentId: string }>;
};

export async function DELETE(
  request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { assignmentId, attachmentId } = await params;
    await deleteTeacherAttachment(assignmentId, attachmentId);
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
