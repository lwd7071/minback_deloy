"use client";

import { useState } from "react";

import type { SubmissionSummaryDto } from "@/types/submission";

type UploadSignature = {
  apiKey: string;
  cloudName: string;
  timestamp: number;
  signature: string;
  publicId: string;
  uploadPreset: string;
  uploadUrl: string;
  type: "authenticated";
};

type UploadedAsset = {
  originalName: string;
  assetId: string;
  publicId: string;
  version: number;
  signature: string;
  secureUrl: string;
  resourceType: "raw";
  format: string;
  bytes: number;
};

export function SubmissionUploadPanel({
  assignmentId,
  status,
  submission,
  onSubmitted,
}: {
  assignmentId: string;
  status: "draft" | "published" | "closed";
  submission: SubmissionSummaryDto;
  onSubmitted: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    if (files.length < 1 || files.length > 5) {
      setError("Chọn từ 1 đến 5 file.");
      return;
    }
    setBusy(true);
    setUploadedCount(0);
    setError(null);
    try {
      const uploaded: UploadedAsset[] = [];
      for (const file of files) {
        const signResponse = await fetch(
          `/api/v1/student/assignments/${assignmentId}/submissions/sign`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ originalName: file.name, bytes: file.size }),
          },
        );
        const signBody = (await signResponse.json()) as {
          data?: UploadSignature;
          error?: { message: string };
        };
        if (!signResponse.ok || !signBody.data) {
          throw new Error(
            signBody.error?.message ?? "Không thể xác thực upload",
          );
        }
        const form = new FormData();
        form.set("file", file);
        form.set("api_key", signBody.data.apiKey);
        form.set("timestamp", String(signBody.data.timestamp));
        form.set("signature", signBody.data.signature);
        form.set("public_id", signBody.data.publicId);
        form.set("upload_preset", signBody.data.uploadPreset);
        form.set("type", signBody.data.type);
        form.set("overwrite", "false");
        const cloudinaryResponse = await fetch(signBody.data.uploadUrl, {
          method: "POST",
          body: form,
        });
        const cloudinaryBody = await cloudinaryResponse.json();
        if (!cloudinaryResponse.ok)
          throw new Error("Cloudinary từ chối file upload");
        uploaded.push({
          originalName: file.name,
          assetId: cloudinaryBody.asset_id,
          publicId: cloudinaryBody.public_id,
          version: cloudinaryBody.version,
          signature: cloudinaryBody.signature,
          secureUrl: cloudinaryBody.secure_url,
          resourceType: cloudinaryBody.resource_type,
          format: cloudinaryBody.format,
          bytes: cloudinaryBody.bytes,
        });
        setUploadedCount(uploaded.length);
      }
      const finalizeResponse = await fetch(
        `/api/v1/student/assignments/${assignmentId}/submissions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ files: uploaded }),
        },
      );
      const finalizeBody = (await finalizeResponse.json()) as {
        error?: { message: string };
      };
      if (!finalizeResponse.ok)
        throw new Error(finalizeBody.error?.message ?? "Không thể lưu bài nộp");
      setFiles([]);
      setUploadedCount(0);
      onSubmitted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể nộp bài");
    } finally {
      setBusy(false);
    }
  }

  if (status !== "published") return null;
  return (
    <div className="submission-panel settings-stack">
      <label className="form-label">
        Nộp bài (tối đa 5 file, mỗi file 20 MB)
        <input
          className="form-input"
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.pptx,.txt,.zip,.jpg,.jpeg,.png"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
      </label>
      <p className="muted">Đã nộp {submission.attemptCount}/10 lần.</p>
      {files.length > 0 ? (
        <div className="stack" aria-live="polite">
          {files.map((file, index) => (
            <div className="split" key={`${file.name}-${file.lastModified}`}>
              <span>{file.name}</span>
              <span className="badge">
                {index < uploadedCount
                  ? "Đã tải"
                  : busy && index === uploadedCount
                    ? "Đang tải…"
                    : "Chờ tải"}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <button
        className="button"
        disabled={busy || files.length === 0}
        onClick={() => void submit()}
      >
        {busy ? "Đang tải và lưu…" : "Nộp bài"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
