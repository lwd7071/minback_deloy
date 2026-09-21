import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

const routeTemplates = [
  "/",
  "/admin/classes",
  "/admin/settings",
  "/class/[code]/profile",
  "/class/[code]/grades",
  "/class/[code]/notifications",
] as const;

const sampleSchema = z.object({
  buildSha: z.string().trim().min(1).max(128),
  routeTemplate: z.enum(routeTemplates),
  actorScope: z.enum(["public", "teacher", "student"]),
  metric: z.string().trim().min(1).max(64),
  durationMs: z.number().finite().min(0).max(120_000),
  deviceClass: z.string().trim().min(1).max(32),
  networkClass: z.string().trim().min(1).max(32),
});

const payloadSchema = z.object({
  samples: z.array(sampleSchema).min(1).max(50),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const parsed = payloadSchema.parse(await request.json());
    const { error } = await createAdminClient()
      .from("performance_samples")
      .insert(
        parsed.samples.map((sample) => ({
          build_sha: sample.buildSha,
          route_template: sample.routeTemplate,
          actor_scope: sample.actorScope,
          metric: sample.metric,
          duration_ms: sample.durationMs,
          device_class: sample.deviceClass,
          network_class: sample.networkClass,
        })),
      );
    if (error) throw error;
    return successResponse({ accepted: parsed.samples.length });
  } catch (error) {
    return errorResponse(error);
  }
}
