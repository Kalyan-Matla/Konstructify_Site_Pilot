import type { Paise } from './utils/money';

export type ProjectStatus = 'in-progress' | 'on-hold' | 'completed';

/** Layer 4 of the authorization model, and the fork the approvals route
 *  branches on. Until now this existed only as a `can()` parameter with no
 *  field behind it — nothing could actually populate it. */
export type ProjectType = 'government' | 'private';

/** Which body's rules this project follows. One state authored properly
 *  beats twenty authored vaguely, so Telangana is the only private
 *  jurisdiction for now and others are refused rather than defaulted. */
export type Jurisdiction = 'telangana' | 'cpwd';

export interface Project {
  id: string;
  name: string;
  location: string;
  clientName: string;
  budgetPaise: Paise;
  startDate: string; // ISO date
  endDate: string; // ISO date
  status: ProjectStatus;
  type: ProjectType;
  jurisdiction: Jurisdiction;
  /** Plot area in square metres. With height, decides the TS-bPASS tier —
   *  so it is captured at creation, not discovered later. */
  plotAreaSqm: number | null;
  /** Proposed building height in metres. */
  buildingHeightM: number | null;
}

/** Where a step sits. `not-applicable` matters as much as `done`: a project
 *  with no borewell should be able to close that step honestly rather than
 *  leave it open forever. */
export type SopStepStatus = 'not-started' | 'in-progress' | 'done' | 'not-applicable';

/** The live, per-project state of one checklist step. The step's text lives
 *  in a template; only what the project did about it lives here. */
export interface SopStepState {
  id: string;
  projectId: string;
  /** Stable key into the template — survives the template being reworded. */
  stepKey: string;
  status: SopStepStatus;
  /** The document that proves this step was completed. */
  documentId: string | null;
  note: string;
  updatedAt: string;
  updatedByName: string;
}

export type DrawingDiscipline = 'architectural' | 'structural' | 'mep' | '3d' | 'other';

/**
 * One issued revision of one sheet.
 *
 * Revisions of the same sheet share a `sheetNumber`, and exactly one of them
 * is `isCurrent`. That single flag is the point of a drawing register:
 * building to a superseded sheet is one of the most expensive mistakes on a
 * site, and it happens because someone had an old print. Site personas are
 * shown the current revision only; the history stays reachable for the
 * people who need to audit what changed.
 */
export interface Drawing {
  id: string;
  projectId: string;
  /** Stable across revisions — every revision of a sheet shares it. */
  sheetNumber: string;
  title: string;
  discipline: DrawingDiscipline;
  /** 'R0', 'R1', 'A', 'B' — whatever the project's convention is. */
  revision: string;
  /** The revision this one replaced. Null on first issue. */
  supersedesId: string | null;
  isCurrent: boolean;
  src: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  uploadedByName: string;
  timestamp: string;
  /** What changed in this revision, for the people building to it. */
  notes: string;
  /**
   * Real-world extent of the sheet, in millimetres.
   *
   * Zone outlines are stored as fractions of the sheet, which keeps them
   * correct when a drawing is re-exported at another resolution — but a
   * fraction alone cannot answer "how big is this room". With the sheet's
   * true width and height, every zone yields a real measurement instead of
   * a percentage, which is what anyone on site actually needs.
   *
   * Null when the sheet has no stated scale; measurements are then withheld
   * rather than invented.
   */
  sheetWidthMm: number | null;
  sheetHeightMm: number | null;
}

export type DocumentKind = 'permit' | 'noc' | 'sanction' | 'drawing' | 'other';

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  kind: DocumentKind;
  /** Data URI now; a signed URL once storage moves in Phase 1. Named for
   *  what it is to a reader, not for how it is currently transported. */
  src: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  uploadedByName: string;
  timestamp: string;
  /** Permits expire, and an expired one is worse than a missing one because
   *  it looks satisfied. Null when the document does not lapse. */
  expiresOn: string | null;
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
  src: string;
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
  /**
   * Outline as fractions of the drawing's width and height, so it survives
   * the image being resized or re-exported at another resolution.
   *
   * Keep the precision high. These fractions are multiplied by the sheet's
   * real width to produce the measurement shown on site: at four decimal
   * places a 24 m sheet resolves to 2.4 mm, which was enough to print a
   * room as 7601 mm when the drawing itself is dimensioned 7600. A figure
   * that disagrees with the sheet by a millimetre is how people stop
   * trusting the overlay.
   */
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
  | 'zone'
  | 'sopStep'
  | 'document'
  | 'drawing';

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
  sopSteps: SopStepState[];
  documents: ProjectDocument[];
  drawings: Drawing[];
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
