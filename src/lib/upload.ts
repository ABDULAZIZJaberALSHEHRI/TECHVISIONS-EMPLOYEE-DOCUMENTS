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
