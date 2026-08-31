import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/response";
import { getStudentAttachmentDownload } from "@/server/services/student-file-download-service";

type Params = {
  params: Promise<{ assignmentId: string; attachmentId: string }>;
};

export async function GET(
  _request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    const { assignmentId, attachmentId } = await params;
    return NextResponse.redirect(
      await getStudentAttachmentDownload(assignmentId, attachmentId),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
