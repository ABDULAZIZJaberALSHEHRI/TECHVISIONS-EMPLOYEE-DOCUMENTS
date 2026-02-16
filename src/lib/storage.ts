import "server-only";

const UPLOAD_DIR = "/home/opc/TECHVISIONS-EMPLOYEE-DOCUMENTS/uploads/";

type FsModule = typeof import("fs/promises");
type PathModule = typeof import("path");

let fsModulePromise: Promise<FsModule> | null = null;
let pathModulePromise: Promise<PathModule> | null = null;

function assertServerContext(): void {
  if (typeof window !== "undefined") {
    throw new Error("Local storage functions are server-only.");
  }
}

function getFs(): Promise<FsModule> {
  if (!fsModulePromise) {
    fsModulePromise = import("fs/promises");
  }
  return fsModulePromise;
}

function getPath(): Promise<PathModule> {
  if (!pathModulePromise) {
    pathModulePromise = import("path");
  }
  return pathModulePromise;
}

async function ensureDir(filePath: string): Promise<void> {
  assertServerContext();
  const fs = await getFs();
  const path = await getPath();
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function resolveUploadPath(key: string): Promise<string> {
  assertServerContext();
  const path = await getPath();
  return path.join(UPLOAD_DIR, key);
}

export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  assertServerContext();
  const fs = await getFs();
  const filePath = await resolveUploadPath(key);
  await ensureDir(filePath);
  await fs.writeFile(filePath, body);
}

export async function downloadFromS3(key: string): Promise<Buffer> {
  assertServerContext();
  const fs = await getFs();
  const filePath = await resolveUploadPath(key);
  return fs.readFile(filePath);
}

export async function deleteFromS3(key: string): Promise<void> {
  assertServerContext();
  const fs = await getFs();
  const filePath = await resolveUploadPath(key);
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export async function deletePrefix(prefix: string): Promise<void> {
  assertServerContext();
  const fs = await getFs();
  const dirPath = await resolveUploadPath(prefix);
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
