import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/response";
import { getStudentSubmissionFileDownload } from "@/server/services/student-file-download-service";

type Params = { params: Promise<{ assignmentId: string; fileId: string }> };

export async function GET(
  _request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    const { assignmentId, fileId } = await params;
    return NextResponse.redirect(
      await getStudentSubmissionFileDownload(assignmentId, fileId),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
