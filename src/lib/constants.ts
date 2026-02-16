export const APP_NAME = process.env.APP_NAME || "DRMS";
export const APP_URL = process.env.APP_URL || "http://localhost:3000";

export const DEFAULT_MAX_FILE_SIZE_MB = 10;
export const DEFAULT_ACCEPTED_FORMATS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "doc",
  "docx",
];

export const MIME_TYPE_MAP: Record<string, string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  xls: ["application/vnd.ms-excel"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
};

export const PRIORITY_CONFIG = {
  LOW: {
    label: "Low",
    bg: "#F3F4F6",
    text: "#6B7280"
  },
  MEDIUM: {
    label: "Medium",
    bg: "#DBEAFE",
    text: "#2563EB"
  },
  HIGH: {
    label: "High",
    bg: "#FEF3C7",
    text: "#D97706"
  },
  URGENT: {
    label: "Urgent",
    bg: "#FEE2E2",
    text: "#DC2626"
  },
} as const;

export const STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700" },
  OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-700" },
} as const;

export const REQUEST_STATUS_CONFIG = {
  OPEN: { label: "Open", color: "bg-green-100 text-green-700" },
  PENDING_HR: { label: "Pending HR", color: "bg-purple-100 text-purple-700" },
  CLOSED: { label: "Complete", color: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700" },
} as const;

export const NOTIFICATION_POLL_INTERVAL = 30000; // 30 seconds

export const ITEMS_PER_PAGE = 10;
