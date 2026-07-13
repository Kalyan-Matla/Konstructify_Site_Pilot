import type { AppState, Invoice, InvoiceStatus, PaymentMode } from '../types';
import { isoDaysFromNow } from './format';

function inv(
  id: string,
  vendorId: string,
  projectId: string,
  invoiceNumber: string,
  amount: number,
  invoiceDaysAgo: number,
  dueInDays: number,
  status: InvoiceStatus,
  notes: string,
  paymentMode: PaymentMode | null = null,
): Invoice {
  return {
    id,
    vendorId,
    projectId,
    invoiceNumber,
    amount,
    invoiceDate: isoDaysFromNow(-invoiceDaysAgo),
    dueDate: isoDaysFromNow(dueInDays),
    status,
    paymentMode: status === 'unpaid' ? null : paymentMode ?? 'NEFT',
    paymentDate: status === 'unpaid' ? null : isoDaysFromNow(-2),
    notes,
  };
}

export function buildMockState(): AppState {
  return {
    projects: [
      {
        id: 'p1',
        name: 'Residential Complex, Mumbai',
        location: 'Worli, Mumbai',
        clientName: 'Mr. Rajesh Sharma',
        budget: 25_00_000,
        startDate: isoDaysFromNow(-30),
        endDate: isoDaysFromNow(30),
        status: 'in-progress',
      },
      {
        id: 'p2',
        name: 'Commercial Building, Bangalore',
        location: 'Whitefield, Bangalore',
        clientName: 'ABC Developers Ltd',
        budget: 40_00_000,
        startDate: isoDaysFromNow(-20),
        endDate: isoDaysFromNow(70),
        status: 'in-progress',
      },
      {
        id: 'p3',
        name: 'Renovation Project, Delhi',
        location: 'Gurgaon, Delhi',
        clientName: 'Mrs. Priya Verma',
        budget: 15_00_000,
        startDate: isoDaysFromNow(10),
        endDate: isoDaysFromNow(55),
        status: 'on-hold',
      },
    ],
    vendors: [
      { id: 'v1', name: 'ABC Concrete', phone: '9876543210', email: 'sales@abcconcrete.in', category: 'material', gstId: '27AABCT1234H1Z0', bankAccount: '1234567890', bankIfsc: 'SBIN0001234', creditLimit: 10_00_000, paymentTerms: '14-day', ratingQuality: 4.8, ratingDelivery: 4.5 },
      { id: 'v2', name: 'DEF Steel', phone: '9876543211', email: 'sales@defsteel.in', category: 'material', gstId: '27AABCT1234H1Z1', bankAccount: '1234567891', bankIfsc: 'SBIN0001235', creditLimit: 8_00_000, paymentTerms: 'COD', ratingQuality: 4.5, ratingDelivery: 4.8 },
      { id: 'v3', name: 'GHI Electrical', phone: '9876543212', email: 'info@ghielectrical.in', category: 'service', gstId: '29AABCT1234H1Z2', bankAccount: '1234567892', bankIfsc: 'HDFC0001236', creditLimit: 5_00_000, paymentTerms: '30-day', ratingQuality: 4.2, ratingDelivery: 4.0 },
      { id: 'v4', name: 'JKL Plumbing', phone: '9876543213', email: 'contact@jklplumbing.in', category: 'service', gstId: '29AABCT1234H1Z3', bankAccount: '1234567893', bankIfsc: 'HDFC0001237', creditLimit: 5_00_000, paymentTerms: '7-day', ratingQuality: 4.0, ratingDelivery: 4.3 },
      { id: 'v5', name: 'MNO Labor Services', phone: '9876543214', email: 'ops@mnolabor.in', category: 'labor', gstId: '27AABCT1234H1Z4', bankAccount: '1234567894', bankIfsc: 'ICIC0001238', creditLimit: 15_00_000, paymentTerms: 'COD', ratingQuality: 4.6, ratingDelivery: 4.7 },
      { id: 'v6', name: 'PQR Equipment Rentals', phone: '9876543215', email: 'rent@pqrequip.in', category: 'equipment', gstId: '06AABCT1234H1Z5', bankAccount: '1234567895', bankIfsc: 'ICIC0001239', creditLimit: 10_00_000, paymentTerms: '14-day', ratingQuality: 4.4, ratingDelivery: 4.1 },
      { id: 'v7', name: 'STU Finishing Works', phone: '9876543216', email: 'hello@stufinish.in', category: 'service', gstId: '07AABCT1234H1Z6', bankAccount: '1234567896', bankIfsc: 'SBIN0001240', creditLimit: 3_00_000, paymentTerms: '7-day', ratingQuality: 4.9, ratingDelivery: 4.6 },
      { id: 'v8', name: 'VWX Transport', phone: '9876543217', email: 'moves@vwxtransport.in', category: 'service', gstId: '07AABCT1234H1Z7', bankAccount: '1234567897', bankIfsc: 'HDFC0001241', creditLimit: 4_00_000, paymentTerms: 'COD', ratingQuality: 4.1, ratingDelivery: 4.4 },
    ],
    // Credit used per vendor is derived from non-paid invoices.
    invoices: [
      // ABC Concrete — heavy usage (~₹8.5L of ₹10L)
      inv('i1', 'v1', 'p1', 'ABC-45', 6_00_000, 12, 2, 'unpaid', 'RMC for foundation pour'),
      inv('i2', 'v1', 'p1', 'ABC-44', 2_00_000, 34, -20, 'unpaid', 'RMC week 1 — disputed quantity'),
      inv('i3', 'v1', 'p2', 'ABC-46', 50_000, 5, 9, 'unpaid', 'Test cubes + pump charges'),
      inv('i4', 'v1', 'p1', 'ABC-42', 3_00_000, 40, -26, 'paid', 'RMC slab casting', 'RTGS'),
      inv('i5', 'v1', 'p1', 'ABC-41', 1_50_000, 48, -34, 'paid', 'RMC footing', 'NEFT'),
      // DEF Steel (~₹3L of ₹8L)
      inv('i6', 'v2', 'p1', 'DEF-101', 1_00_000, 8, 10, 'unpaid', 'TMT bars 12mm'),
      inv('i7', 'v2', 'p2', 'DEF-102', 2_00_000, 4, 14, 'unpaid', 'Structural steel sections'),
      inv('i8', 'v2', 'p1', 'DEF-99', 1_80_000, 30, -25, 'paid', 'TMT bars 16mm', 'NEFT'),
      // GHI Electrical (~₹2L of ₹5L)
      inv('i9', 'v3', 'p2', 'GHI-21', 50_000, 2, 28, 'payment-sent', 'Conduit + wiring materials', 'NEFT'),
      inv('i10', 'v3', 'p2', 'GHI-20', 1_50_000, 10, 20, 'unpaid', 'MEP rough-in labour'),
      inv('i11', 'v3', 'p1', 'GHI-18', 75_000, 45, -15, 'paid', 'DB boards', 'NEFT'),
      // JKL Plumbing (~₹1.5L of ₹5L)
      inv('i12', 'v4', 'p1', 'JKL-77', 90_000, 6, 1, 'unpaid', 'CPVC piping first floor'),
      inv('i13', 'v4', 'p2', 'JKL-78', 60_000, 3, 4, 'unpaid', 'Bathroom fixtures rough-in'),
      inv('i14', 'v4', 'p1', 'JKL-75', 40_000, 25, -18, 'paid', 'Drainage lines', 'Cheque'),
      // MNO Labor (~₹7L of ₹15L)
      inv('i15', 'v5', 'p1', 'MNO-310', 2_50_000, 15, 0, 'unpaid', 'Mason gang — March'),
      inv('i16', 'v5', 'p1', 'MNO-311', 2_00_000, 7, 7, 'unpaid', 'Shuttering crew'),
      inv('i17', 'v5', 'p2', 'MNO-312', 2_50_000, 3, 11, 'unpaid', 'Excavation labour'),
      inv('i18', 'v5', 'p1', 'MNO-308', 1_50_000, 35, -28, 'paid', 'Site clearing', 'NEFT'),
      // PQR Equipment (~₹4L of ₹10L)
      inv('i19', 'v6', 'p2', 'PQR-55', 2_50_000, 9, 5, 'unpaid', 'Crane rental — 2 weeks'),
      inv('i20', 'v6', 'p1', 'PQR-56', 1_50_000, 5, 9, 'unpaid', 'Concrete pump + vibrators'),
      inv('i21', 'v6', 'p1', 'PQR-52', 1_00_000, 38, -24, 'paid', 'JCB hire', 'RTGS'),
      // STU Finishing (~₹1L of ₹3L)
      inv('i22', 'v7', 'p1', 'STU-12', 1_00_000, 4, 3, 'unpaid', 'POP + putty advance'),
      inv('i23', 'v7', 'p1', 'STU-10', 50_000, 28, -21, 'paid', 'Sample flat finishing', 'NEFT'),
      // VWX Transport (~₹2L of ₹4L)
      inv('i24', 'v8', 'p1', 'VWX-201', 1_20_000, 11, -4, 'unpaid', 'Material trips — 22 loads'),
      inv('i25', 'v8', 'p2', 'VWX-202', 80_000, 2, 12, 'unpaid', 'Steel delivery trips'),
      inv('i26', 'v8', 'p1', 'VWX-198', 60_000, 32, -27, 'paid', 'Debris removal', 'NEFT'),
      // A few more settled invoices for history
      inv('i27', 'v5', 'p2', 'MNO-305', 1_20_000, 42, -35, 'paid', 'Mobilization labour', 'NEFT'),
      inv('i28', 'v2', 'p2', 'DEF-95', 90_000, 44, -40, 'paid', 'Binding wire + mesh', 'NEFT'),
      inv('i29', 'v3', 'p1', 'GHI-15', 40_000, 50, -20, 'paid', 'Temporary site power', 'Cheque'),
      inv('i30', 'v6', 'p2', 'PQR-49', 70_000, 47, -33, 'paid', 'Scaffolding rental', 'NEFT'),
    ],
    tasks: [
      { id: 't1', projectId: 'p1', name: 'Foundation excavation', description: 'Excavate and level foundation to -2.4m', phase: 'Foundation', assignedTo: 'Site Lead', status: 'complete', dueDate: isoDaysFromNow(-5), percentComplete: 100, photos: [], createdAt: isoDaysFromNow(-28) },
      { id: 't2', projectId: 'p1', name: 'RMC pour — raft', description: 'M30 raft pour with pump', phase: 'Foundation', assignedTo: 'Concrete Crew', status: 'complete', dueDate: isoDaysFromNow(-12), percentComplete: 100, photos: [], createdAt: isoDaysFromNow(-25) },
      { id: 't3', projectId: 'p1', name: 'Column framing — GF', description: 'Shuttering and rebar for ground floor columns', phase: 'Structure', assignedTo: 'Shuttering Crew', status: 'in-progress', dueDate: isoDaysFromNow(10), percentComplete: 30, photos: [], createdAt: isoDaysFromNow(-10) },
      { id: 't4', projectId: 'p1', name: 'Slab casting — GF', description: 'Ground floor slab, 180mm', phase: 'Structure', assignedTo: 'Concrete Crew', status: 'pending', dueDate: isoDaysFromNow(18), percentComplete: 0, photos: [], createdAt: isoDaysFromNow(-5) },
      { id: 't5', projectId: 'p1', name: 'Brickwork — GF partitions', description: 'AAC block partitions ground floor', phase: 'Structure', assignedTo: 'Mason Gang', status: 'pending', dueDate: isoDaysFromNow(26), percentComplete: 0, photos: [], createdAt: isoDaysFromNow(-3) },
      { id: 't6', projectId: 'p2', name: 'Site mobilization', description: 'Fencing, site office, water and power', phase: 'Foundation', assignedTo: 'Site Lead', status: 'complete', dueDate: isoDaysFromNow(-14), percentComplete: 100, photos: [], createdAt: isoDaysFromNow(-20) },
      { id: 't7', projectId: 'p2', name: 'Excavation — basement', description: 'Basement dig with shoring', phase: 'Foundation', assignedTo: 'Excavation Crew', status: 'in-progress', dueDate: isoDaysFromNow(-2), percentComplete: 80, photos: [], createdAt: isoDaysFromNow(-16) },
      { id: 't8', projectId: 'p2', name: 'MEP rough-in — B1', description: 'Electrical conduits and plumbing sleeves', phase: 'MEP', assignedTo: 'GHI Electrical', status: 'in-progress', dueDate: isoDaysFromNow(15), percentComplete: 40, photos: [], createdAt: isoDaysFromNow(-8) },
      { id: 't9', projectId: 'p2', name: 'Waterproofing — retaining walls', description: 'Membrane waterproofing on retaining walls', phase: 'Structure', assignedTo: 'Waterproofing Sub', status: 'pending', dueDate: isoDaysFromNow(22), percentComplete: 0, photos: [], createdAt: isoDaysFromNow(-4) },
      { id: 't10', projectId: 'p3', name: 'Demolition survey', description: 'Survey and mark walls for demolition', phase: 'Foundation', assignedTo: 'Site Lead', status: 'pending', dueDate: isoDaysFromNow(14), percentComplete: 0, photos: [], createdAt: isoDaysFromNow(-2) },
      { id: 't11', projectId: 'p1', name: 'External plumbing lines', description: 'Sewer connection and storm drains', phase: 'MEP', assignedTo: 'JKL Plumbing', status: 'in-progress', dueDate: isoDaysFromNow(8), percentComplete: 55, photos: [], createdAt: isoDaysFromNow(-12) },
      { id: 't12', projectId: 'p1', name: 'Sample flat finishing', description: 'One-bedroom sample unit full finish', phase: 'Finishing', assignedTo: 'STU Finishing', status: 'in-progress', dueDate: isoDaysFromNow(20), percentComplete: 25, photos: [], createdAt: isoDaysFromNow(-9) },
    ],
    workOrders: [
      { id: 'w1', projectId: 'p1', orderNumber: 'WO-001', taskName: 'Excavation foundation', description: 'Complete excavation to design depth', assignee: 'Site Lead', priority: 'High', dueDate: isoDaysFromNow(-5), status: 'complete' },
      { id: 'w2', projectId: 'p1', orderNumber: 'WO-002', taskName: 'RMC pour — raft', description: 'M30, 120 m³ with pump', assignee: 'Concrete Crew', priority: 'High', dueDate: isoDaysFromNow(3), status: 'in-progress' },
      { id: 'w3', projectId: 'p1', orderNumber: 'WO-003', taskName: 'Structural steel — GF columns', description: 'Cut, bend, tie rebar per BBS', assignee: 'Steel Contractor', priority: 'High', dueDate: isoDaysFromNow(10), status: 'pending' },
      { id: 'w4', projectId: 'p1', orderNumber: 'WO-004', taskName: 'External drainage', description: 'Lay storm drains along west boundary', assignee: 'JKL Plumbing', priority: 'Medium', dueDate: isoDaysFromNow(8), status: 'in-progress' },
      { id: 'w5', projectId: 'p2', orderNumber: 'WO-005', taskName: 'Basement shoring checks', description: 'Daily shoring inspection log', assignee: 'Safety Officer', priority: 'High', dueDate: isoDaysFromNow(1), status: 'in-progress' },
      { id: 'w6', projectId: 'p2', orderNumber: 'WO-006', taskName: 'Crane erection', description: 'Erect tower crane, certify operator', assignee: 'PQR Equipment', priority: 'High', dueDate: isoDaysFromNow(6), status: 'pending' },
      { id: 'w7', projectId: 'p2', orderNumber: 'WO-007', taskName: 'MEP sleeves — B1 slab', description: 'Place sleeves before slab pour', assignee: 'GHI Electrical', priority: 'Medium', dueDate: isoDaysFromNow(12), status: 'pending' },
      { id: 'w8', projectId: 'p1', orderNumber: 'WO-008', taskName: 'Sample flat POP', description: 'POP punning in sample flat', assignee: 'STU Finishing', priority: 'Low', dueDate: isoDaysFromNow(18), status: 'pending' },
      { id: 'w9', projectId: 'p3', orderNumber: 'WO-009', taskName: 'Utility disconnection', description: 'Coordinate power/water disconnection before demo', assignee: 'Site Lead', priority: 'Medium', dueDate: isoDaysFromNow(12), status: 'pending' },
      { id: 'w10', projectId: 'p1', orderNumber: 'WO-010', taskName: 'Material trips — week 5', description: '20 truck trips for aggregate', assignee: 'VWX Transport', priority: 'Low', dueDate: isoDaysFromNow(-1), status: 'complete' },
    ],
    budgetItems: [
      { id: 'b1', projectId: 'p1', description: 'Excavation & foundation', quantity: 1, unit: 'LS', unitRate: 3_00_000, actualSpend: 2_80_000 },
      { id: 'b2', projectId: 'p1', description: 'RMC (M30)', quantity: 200, unit: 'm³', unitRate: 2_500, actualSpend: 5_75_000 },
      { id: 'b3', projectId: 'p1', description: 'TMT Steel', quantity: 40, unit: 'MT', unitRate: 10_000, actualSpend: 3_50_000 },
      { id: 'b4', projectId: 'p1', description: 'MEP works', quantity: 1, unit: 'LS', unitRate: 6_00_000, actualSpend: 90_000 },
      { id: 'b5', projectId: 'p1', description: 'Finishing works', quantity: 1, unit: 'LS', unitRate: 7_00_000, actualSpend: 1_50_000 },
      { id: 'b6', projectId: 'p2', description: 'Excavation & shoring', quantity: 1, unit: 'LS', unitRate: 5_00_000, actualSpend: 3_70_000 },
      { id: 'b7', projectId: 'p2', description: 'RMC (M35)', quantity: 350, unit: 'm³', unitRate: 2_700, actualSpend: 50_000 },
      { id: 'b8', projectId: 'p2', description: 'Structural steel', quantity: 60, unit: 'MT', unitRate: 11_000, actualSpend: 2_90_000 },
      { id: 'b9', projectId: 'p2', description: 'Equipment rental', quantity: 1, unit: 'LS', unitRate: 8_00_000, actualSpend: 3_20_000 },
      { id: 'b10', projectId: 'p2', description: 'MEP works', quantity: 1, unit: 'LS', unitRate: 9_00_000, actualSpend: 2_40_000 },
      { id: 'b11', projectId: 'p3', description: 'Demolition', quantity: 1, unit: 'LS', unitRate: 2_00_000, actualSpend: 0 },
      { id: 'b12', projectId: 'p3', description: 'Civil repairs', quantity: 1, unit: 'LS', unitRate: 5_00_000, actualSpend: 0 },
      { id: 'b13', projectId: 'p3', description: 'Interiors & finishing', quantity: 1, unit: 'LS', unitRate: 6_50_000, actualSpend: 0 },
    ],
    activity: [
      { id: 'a1', message: 'Invoice ABC-45 (₹6L) created for ABC Concrete', timestamp: new Date().toISOString() },
      { id: 'a2', message: 'Task "Excavation — basement" marked 80%', timestamp: new Date().toISOString() },
      { id: 'a3', message: 'Payment sent to GHI Electrical (GHI-21, NEFT)', timestamp: new Date().toISOString() },
      { id: 'a4', message: 'Work order WO-010 completed by VWX Transport', timestamp: new Date().toISOString() },
      { id: 'a5', message: 'Vendor STU Finishing Works added', timestamp: new Date().toISOString() },
    ],
    syncQueue: [],
  };
}
