import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { MIME_TYPE_MAP } from "@/lib/constants";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 200);
}

export function getUploadDir(): string {
  return path.resolve(UPLOAD_DIR);
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
  if (allowedMimes.length === 0) return true; // No restriction
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
  const uploadBase = getUploadDir();
  const dirPath = path.join(uploadBase, requestId, assignmentId);

  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }

  const timestamp = Date.now();
  const sanitized = sanitizeFilename(file.name);
  const fileName = `${timestamp}-${sanitized}`;
  const filePath = path.join(dirPath, fileName);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  return {
    filePath: path.relative(uploadBase, filePath),
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
  const uploadBase = getUploadDir();
  const dirPath = path.join(uploadBase, requestId, "attachments");

  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }

  const timestamp = Date.now();
  const sanitized = sanitizeFilename(file.name);
  const fileName = `${timestamp}-${sanitized}`;
  const filePath = path.join(dirPath, fileName);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  return {
    filePath: path.relative(uploadBase, filePath),
    fileName: file.name,
    fileSize: buffer.length,
    mimeType: file.type,
  };
}

export async function deleteFile(relativePath: string): Promise<void> {
  const fullPath = path.join(getUploadDir(), relativePath);
  try {
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  } catch (error) {
    console.error("Error deleting file:", error);
  }
}

export function getAbsolutePath(relativePath: string): string {
  return path.join(getUploadDir(), relativePath);
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
  const uploadBase = getUploadDir();
  const dirPath = path.join(uploadBase, TEMPLATE_DIR, requestId);

  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }

  const sanitized = sanitizeFilename(file.name);
  const fileName = `template-${sanitized}`;
  const filePath = path.join(dirPath, fileName);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  return {
    filePath: path.relative(uploadBase, filePath),
    fileName: file.name,
    fileSize: buffer.length,
    mimeType: file.type,
  };
}

export async function deleteTemplateFile(requestId: string): Promise<void> {
  const dirPath = path.join(getUploadDir(), TEMPLATE_DIR, requestId);
  try {
    if (existsSync(dirPath)) {
      const { readdir } = await import("fs/promises");
      const files = await readdir(dirPath);
      for (const f of files) {
        await unlink(path.join(dirPath, f));
      }
      const { rmdir } = await import("fs/promises");
      await rmdir(dirPath);
    }
  } catch (error) {
    console.error("Error deleting template files:", error);
  }
}

export function getTemplateFilePath(relativePath: string): string {
  return path.join(getUploadDir(), relativePath);
}
