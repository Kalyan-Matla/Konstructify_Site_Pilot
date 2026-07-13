export type ProjectStatus = 'in-progress' | 'on-hold' | 'completed';

export interface Project {
  id: string;
  name: string;
  location: string;
  clientName: string;
  budget: number;
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
  creditLimit: number;
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
  amount: number;
  status: InvoiceStatus;
  paymentMode: PaymentMode | null;
  paymentDate: string | null;
  notes: string;
}

export interface TaskPhoto {
  id: string;
  dataUrl: string;
  caption: string;
  timestamp: string; // ISO
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
  photos: TaskPhoto[];
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
  quantity: number;
  unit: string;
  unitRate: number;
  actualSpend: number;
}

export interface ActivityItem {
  id: string;
  message: string;
  timestamp: string; // ISO
}

export type EntityKind =
  | 'project'
  | 'vendor'
  | 'invoice'
  | 'task'
  | 'workOrder'
  | 'budgetItem';

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
