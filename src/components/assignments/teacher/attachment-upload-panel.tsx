"use client";

import { useCallback, useEffect, useState } from "react";

import { getCloudinaryUploadErrorMessage } from "@/lib/cloudinary-upload-error";
import { normalizeCloudinaryRawUpload } from "@/lib/cloudinary-upload-response";
import type { FileAssetDto } from "@/types/file-assets";

type Props = { assignmentId: string; disabled: boolean };

export function AttachmentUploadPanel({ assignmentId, disabled }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<FileAssetDto[]>([]);

  const loadAttachments = useCallback(async (): Promise<void> => {
    const response = await fetch(
      `/api/v1/teacher/assignments/${assignmentId}/attachments`,
      { cache: "no-store" },
    );
    const body = (await response.json()) as { data?: FileAssetDto[] };
    if (response.ok && body.data) setAttachments(body.data);
  }, [assignmentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAttachments(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAttachments]);

  async function upload(): Promise<void> {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const sign = await fetch(
        `/api/v1/teacher/assignments/${assignmentId}/attachments/sign`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ originalName: file.name, bytes: file.size }),
        },
      );
      const signed = (await sign.json()) as {
        data?: Record<string, string | number>;
        error?: { message: string };
      };
      if (!sign.ok || !signed.data)
        throw new Error(signed.error?.message ?? "Không thể xác thực upload");
      const form = new FormData();
      form.set("file", file);
      form.set("api_key", String(signed.data.apiKey));
      form.set("timestamp", String(signed.data.timestamp));
      form.set("signature", String(signed.data.signature));
      form.set("public_id", String(signed.data.publicId));
      form.set("upload_preset", String(signed.data.uploadPreset));
      form.set("type", "authenticated");
      form.set("overwrite", "false");
      const cloud = await fetch(String(signed.data.uploadUrl), {
        method: "POST",
        body: form,
      });
      const asset = (await cloud.json()) as {
        error?: { message?: string };
        [key: string]: unknown;
      };
      if (!cloud.ok) {
        throw new Error(getCloudinaryUploadErrorMessage(asset));
      }
      const uploadedAsset = normalizeCloudinaryRawUpload(asset, file.name);
      const saved = await fetch(
        `/api/v1/teacher/assignments/${assignmentId}/attachments`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            file: uploadedAsset,
          }),
        },
      );
      const savedBody = (await saved.json()) as { error?: { message: string } };
      if (!saved.ok)
        throw new Error(savedBody.error?.message ?? "Không thể lưu file");
      setFile(null);
      await loadAttachments();
      setMessage("Đã thêm file.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function remove(attachmentId: string): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/v1/teacher/assignments/${assignmentId}/attachments/${attachmentId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Không thể xóa file");
      await loadAttachments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xóa file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-stack">
      <label className="form-label">
        Tài liệu đính kèm (tối đa 20 MB)
        <input
          className="form-input"
          type="file"
          disabled={disabled}
          accept=".pdf,.docx,.xlsx,.pptx,.txt,.zip,.jpg,.jpeg,.png"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <button
        className="button button-secondary"
        type="button"
        disabled={disabled || busy || !file}
        onClick={() => void upload()}
      >
        {busy ? "Đang upload…" : "Thêm tài liệu"}
      </button>
      {message ? (
        <p className={message.startsWith("Đã") ? "muted" : "form-error"}>
          {message}
        </p>
      ) : null}
      {attachments.length ? (
        <ul className="settings-stack">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <a href={attachment.downloadUrl}>{attachment.originalName}</a>{" "}
              <span className="muted">
                ({Math.ceil(attachment.bytes / 1024)} KB)
              </span>{" "}
              {!disabled ? (
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(attachment.id)}
                >
                  Xóa
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
