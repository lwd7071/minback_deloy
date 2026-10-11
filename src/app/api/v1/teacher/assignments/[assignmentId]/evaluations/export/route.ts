import { errorResponse } from "@/lib/api/response";
import { generateEvaluationExport } from "@/server/services/evaluations/evaluation-export-service";

function encodeRFC5987(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function asciiFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
): Promise<Response> {
  try {
    const { assignmentId } = await params;
    const { buffer, fileName } = await generateEvaluationExport(assignmentId);
    const disposition = `attachment; filename="${asciiFileName(fileName)}"; filename*=UTF-8''${encodeRFC5987(fileName)}`;

    return new Response(buffer as never, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
