import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error(
    "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required",
  );
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

const name = "minback_authenticated_files";
const options = {
  unsigned: false,
  resource_type: "raw",
  type: "authenticated",
  overwrite: false,
  max_file_size: 20 * 1024 * 1024,
  allowed_formats: [
    "pdf",
    "docx",
    "xlsx",
    "pptx",
    "txt",
    "zip",
    "jpg",
    "jpeg",
    "png",
  ],
};

try {
  try {
    await cloudinary.api.update_upload_preset(name, options);
    process.stdout.write(`Cloudinary preset updated: ${name}\n`);
  } catch (error) {
    const cloudinaryError = error?.error ?? error;

    if (cloudinaryError?.http_code !== 404) throw error;

    await cloudinary.api.create_upload_preset({ name, ...options });
    process.stdout.write(`Cloudinary preset created: ${name}\n`);
  }
} catch (error) {
  const cloudinaryError = error?.error ?? error;
  const status = cloudinaryError?.http_code ?? "unknown";
  const message = cloudinaryError?.message ?? "Unknown Cloudinary error";
  throw new Error(`Cloudinary preset setup failed (${status}): ${message}`);
}
