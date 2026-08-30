import type { Paise } from './utils/money';

export type ProjectStatus = 'in-progress' | 'on-hold' | 'completed';

export interface Project {
  id: string;
  name: string;
  location: string;
  clientName: string;
  budgetPaise: Paise;
  startDate: string; // ISO date
  endDate: string; // ISO date
  status: ProjectStatus;
}

export type VendorCategory = 'material' | 'service' | 'labor' | 'equipment';
export type PaymentTerms = 'COD' | '7-day' | '14-day' | '30-day';

export interface Vendor {
  id: string;
  name: string;
  phone: string;
  email: string;
  category: VendorCategory;
  gstId: string;
  bankAccount: string;
  bankIfsc: string;
  creditLimitPaise: Paise;
  paymentTerms: PaymentTerms;
  ratingQuality: number; // 1–5
  ratingDelivery: number; // 1–5
}

export type InvoiceStatus = 'unpaid' | 'payment-sent' | 'paid';
export type PaymentMode = 'NEFT' | 'RTGS' | 'Cheque';

export interface Invoice {
  id: string;
  vendorId: string;
  projectId: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO date
  dueDate: string; // ISO date
  amountPaise: Paise;
  status: InvoiceStatus;
  paymentMode: PaymentMode | null;
  paymentDate: string | null;
  notes: string;
}

/**
 * One photo entity for the whole project.
 *
 * A photo taken against a task is still a project photo — it just carries a
 * taskId. Modelling these separately would produce two disconnected
 * galleries of the same site, and the site photo that matters most is
 * usually the one someone took against a specific task.
 */
export interface ProjectPhoto {
  id: string;
  projectId: string;
  /** Set when the photo was captured against a task. */
  taskId: string | null;
  /** Set when the photo documents a specific zone (a room, a column). */
  zoneId: string | null;
  dataUrl: string;
  caption: string;
  /** Who added it — a client's photo of a defect must stay attributable. */
  uploadedByUserId: string;
  uploadedByName: string;
  timestamp: string; // ISO
}

/** Floor contains rooms; rooms contain elements. Status rolls UP this chain,
 *  so a drawing can never disagree with the tasks underneath it. */
export type ZoneLevel = 'floor' | 'room' | 'element';

export interface Zone {
  id: string;
  projectId: string;
  /** null at floor level. */
  parentId: string | null;
  level: ZoneLevel;
  name: string;
  /** The drawing this zone is outlined on, once drawings exist (Block D). */
  drawingId: string | null;
  /** Outline as fractions of the drawing's width/height, so it survives the
   *  image being resized or re-exported at another resolution. */
  outline: Array<{ x: number; y: number }> | null;
}

export type TaskStatus = 'pending' | 'in-progress' | 'complete';
export type Priority = 'High' | 'Medium' | 'Low';

export interface WorkTask {
  id: string;
  projectId: string;
  name: string;
  description: string;
  phase: string;
  assignedTo: string;
  status: TaskStatus;
  dueDate: string; // ISO date
  percentComplete: number;
  /** The BOQ line this task delivers. Progress is weighted by BOQ value, so
   *  a task with no line cannot contribute to the percentage — it is
   *  excluded and counted, never silently averaged in. */
  budgetItemId: string | null;
  /** The zone this task builds, if it maps to one. */
  zoneId: string | null;
  createdAt: string; // ISO date
}

export interface WorkOrder {
  id: string;
  projectId: string;
  orderNumber: string;
  taskName: string;
  description: string;
  assignee: string;
  priority: Priority;
  dueDate: string; // ISO date
  status: TaskStatus;
}

export interface BudgetItem {
  id: string;
  projectId: string;
  description: string;
  /** Measured quantity — a real decimal (200.5 m³), never money. */
  quantity: number;
  unit: string;
  unitRatePaise: Paise;
  actualSpendPaise: Paise;
}

export interface ActivityItem {
  id: string;
  message: string;
  timestamp: string; // ISO
  /** What this entry is about, so the feed can be filtered by capability
   *  rather than by reading the message text. Added before the activity log
   *  carries real data — retrofitting it later would mean unparseable
   *  history. */
  entity: EntityKind;
}

export type EntityKind =
  | 'project'
  | 'vendor'
  | 'invoice'
  | 'task'
  | 'workOrder'
  | 'budgetItem'
  | 'photo'
  | 'zone';

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  entity: EntityKind;
  entityId: string;
  label: string;
  timestamp: string; // ISO
  status: 'pending' | 'synced';
}

export interface AppState {
  projects: Project[];
  vendors: Vendor[];
  invoices: Invoice[];
  tasks: WorkTask[];
  workOrders: WorkOrder[];
  budgetItems: BudgetItem[];
  photos: ProjectPhoto[];
  zones: Zone[];
  activity: ActivityItem[];
  syncQueue: SyncQueueItem[];
}

export interface AISuggestion {
  id: string;
  title: string;
  message: string;
  suggestion: string;
  action: string;
}
