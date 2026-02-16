import path from "path";
import { MIME_TYPE_MAP } from "@/lib/constants";
import { uploadToS3, downloadFromS3, deleteFromS3, deletePrefix } from "@/lib/storage";

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 200);
}

export function getAllowedMimeTypes(acceptedFormats: string): string[] {
  const formats = acceptedFormats.split(",").map((f) => f.trim().toLowerCase());
  const mimeTypes: string[] = [];
  for (const format of formats) {
    const types = MIME_TYPE_MAP[format];
    if (types) {
      mimeTypes.push(...types);
    }
  }
  return mimeTypes;
}

export function validateFileType(
  mimeType: string,
  acceptedFormats: string
): boolean {
  const allowedMimes = getAllowedMimeTypes(acceptedFormats);
  if (allowedMimes.length === 0) return true;
  return allowedMimes.includes(mimeType);
}

export function validateFileSize(
  sizeBytes: number,
  maxSizeMb: number
): boolean {
  return sizeBytes <= maxSizeMb * 1024 * 1024;
}

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase().replace(".", "");
}

export async function saveFile(
  file: File,
  requestId: string,
  assignmentId: string
): Promise<{
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}> {
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(file.name);
  const fileName = `${timestamp}-${sanitized}`;
  const key = `${requestId}/${assignmentId}/${fileName}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await uploadToS3(key, buffer, file.type);

  return {
    filePath: key,
    fileName: file.name,
    fileSize: buffer.length,
    mimeType: file.type,
  };
}

export async function saveAttachment(
  file: File,
  requestId: string
): Promise<{
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}> {
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(file.name);
  const fileName = `${timestamp}-${sanitized}`;
  const key = `${requestId}/attachments/${fileName}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await uploadToS3(key, buffer, file.type);

  return {
    filePath: key,
    fileName: file.name,
    fileSize: buffer.length,
    mimeType: file.type,
  };
}

export async function deleteFile(relativePath: string): Promise<void> {
  try {
    await deleteFromS3(relativePath);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
  }
}

export async function getFileBuffer(relativePath: string): Promise<Buffer> {
  return downloadFromS3(relativePath);
}

export function getAbsolutePath(relativePath: string): string {
  // For S3, the relativePath is the S3 key. This function is kept
  // for backward compatibility but callers should use getFileBuffer instead.
  return relativePath;
}

// Template file handling
const TEMPLATE_DIR = "templates";
const MAX_TEMPLATE_SIZE_MB = 10;
const ALLOWED_TEMPLATE_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
];

export function validateTemplateFile(file: File): string | null {
  if (!ALLOWED_TEMPLATE_MIMES.includes(file.type)) {
    return "Invalid template file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG";
  }
  if (file.size > MAX_TEMPLATE_SIZE_MB * 1024 * 1024) {
    return `Template file size must be under ${MAX_TEMPLATE_SIZE_MB}MB`;
  }
  return null;
}

export async function saveTemplateFile(
  file: File,
  requestId: string
): Promise<{
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}> {
  const sanitized = sanitizeFilename(file.name);
  const fileName = `template-${sanitized}`;
  const key = `${TEMPLATE_DIR}/${requestId}/${fileName}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await uploadToS3(key, buffer, file.type);

  return {
    filePath: key,
    fileName: file.name,
    fileSize: buffer.length,
    mimeType: file.type,
  };
}

export async function deleteTemplateFile(requestId: string): Promise<void> {
  try {
    await deletePrefix(`${TEMPLATE_DIR}/${requestId}/`);
  } catch (error) {
    console.error("Error deleting template files from S3:", error);
  }
}

export function getTemplateFilePath(relativePath: string): string {
  // For S3, the relativePath is the S3 key.
  return relativePath;
}
