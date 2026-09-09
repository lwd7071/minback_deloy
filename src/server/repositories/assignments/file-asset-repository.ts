import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { UploadedCloudinaryAssetInput } from "@/schemas/file-assets";

export type AttachmentRow = {
  id: string;
  assignment_id: string;
  original_name: string;
  cloudinary_public_id: string;
  cloudinary_secure_url: string;
  resource_type: "raw";
  version: number;
  format: string;
  bytes: number;
  status: "active" | "deletion_pending" | "delete_failed" | "deleted";
  created_at: string;
};

const ATTACHMENT_COLUMNS =
  "id, assignment_id, original_name, cloudinary_public_id, cloudinary_secure_url, resource_type, version, format, bytes, status, created_at";

export async function countActiveAttachments(
  assignmentId: string,
): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("assignment_attachments")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", assignmentId)
    .eq("status", "active");
  if (error) throw new Error("ATTACHMENT_COUNT_FAILED");
  return count ?? 0;
}

export async function listActiveAttachments(
  assignmentId: string,
): Promise<AttachmentRow[]> {
  const { data, error } = await createAdminClient()
    .from("assignment_attachments")
    .select(ATTACHMENT_COLUMNS)
    .eq("assignment_id", assignmentId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw new Error("ATTACHMENT_LIST_FAILED");
  return data as AttachmentRow[];
}

export async function listActiveAttachmentsForAssignments(
  assignmentIds: string[],
): Promise<AttachmentRow[]> {
  if (assignmentIds.length === 0) return [];
  const { data, error } = await createAdminClient()
    .from("assignment_attachments")
    .select(ATTACHMENT_COLUMNS)
    .in("assignment_id", assignmentIds)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw new Error("ATTACHMENT_LIST_FAILED");
  return data as AttachmentRow[];
}

export async function createAttachment(
  assignmentId: string,
  teacherId: string,
  file: UploadedCloudinaryAssetInput,
): Promise<AttachmentRow> {
  const { data, error } = await createAdminClient()
    .from("assignment_attachments")
    .insert({
      assignment_id: assignmentId,
      original_name: file.originalName,
      cloudinary_asset_id: file.assetId,
      cloudinary_public_id: file.publicId,
      cloudinary_secure_url: file.secureUrl,
      resource_type: file.resourceType,
      version: file.version,
      format: file.format,
      bytes: file.bytes,
      uploaded_by: teacherId,
    })
    .select(ATTACHMENT_COLUMNS)
    .single();
  if (error) throw new Error("ATTACHMENT_CREATE_FAILED");
  return data as AttachmentRow;
}

export async function findAttachmentForAssignment(
  assignmentId: string,
  attachmentId: string,
): Promise<AttachmentRow | null> {
  const { data, error } = await createAdminClient()
    .from("assignment_attachments")
    .select(ATTACHMENT_COLUMNS)
    .eq("id", attachmentId)
    .eq("assignment_id", assignmentId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error("ATTACHMENT_GET_FAILED");
  return data as AttachmentRow | null;
}

export async function setAttachmentDeletionState(
  attachmentId: string,
  status: "deletion_pending" | "delete_failed" | "deleted",
  teacherId: string,
): Promise<void> {
  const updates: Record<string, string> = { status };
  if (status === "deleted") {
    updates.deleted_at = new Date().toISOString();
    updates.deleted_by = teacherId;
  }
  const { error } = await createAdminClient()
    .from("assignment_attachments")
    .update(updates)
    .eq("id", attachmentId);
  if (error) throw new Error("ATTACHMENT_DELETE_STATE_FAILED");
}
