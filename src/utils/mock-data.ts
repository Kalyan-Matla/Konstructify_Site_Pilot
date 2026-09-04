import type { AppState, Invoice, InvoiceStatus, PaymentMode } from '../types';
import { isoDaysFromNow } from './format';
import { rupees } from './money';

function inv(
  id: string,
  vendorId: string,
  projectId: string,
  invoiceNumber: string,
  amountRupees: number,
  invoiceDaysAgo: number,
  dueInDays: number,
  status: InvoiceStatus,
  notes: string,
  paymentMode: PaymentMode | null = null,
  /** Days before the invoice's own due date it was paid — positive is early/
   *  on-time, negative is late. Relative to dueDate (not "today"), since
   *  seeded due dates sit anywhere from weeks ago to weeks out; a fixed
   *  "paid 2 days ago" made every settled invoice in the demo look late
   *  against its (often much older) due date, so every vendor's "paid on
   *  time" scorecard read 0%. Defaults to a few days early. */
  paidDaysBeforeDue = 3,
): Invoice {
  return {
    id,
    vendorId,
    projectId,
    invoiceNumber,
    amountPaise: rupees(amountRupees),
    invoiceDate: isoDaysFromNow(-invoiceDaysAgo),
    dueDate: isoDaysFromNow(dueInDays),
    status,
    paymentMode: status === 'unpaid' ? null : paymentMode ?? 'NEFT',
    paymentDate: status === 'unpaid' ? null : isoDaysFromNow(dueInDays - paidDaysBeforeDue),
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
        budgetPaise: rupees(25_00_000),
        startDate: isoDaysFromNow(-30),
        endDate: isoDaysFromNow(30),
        status: 'in-progress',
        type: 'private',
        jurisdiction: 'telangana',
        plotAreaSqm: 420,        // ≤500 m² and ≤10 m → instant approval
        buildingHeightM: 9.5,
      },
      {
        id: 'p2',
        name: 'Commercial Building, Bangalore',
        location: 'Whitefield, Bangalore',
        clientName: 'ABC Developers Ltd',
        budgetPaise: rupees(40_00_000),
        startDate: isoDaysFromNow(-20),
        endDate: isoDaysFromNow(70),
        status: 'in-progress',
        type: 'private',
        jurisdiction: 'telangana',
        plotAreaSqm: 1800,       // above the instant limits → single window
        buildingHeightM: 24,
      },
      {
        id: 'p3',
        name: 'Renovation Project, Delhi',
        location: 'Gurgaon, Delhi',
        clientName: 'Mrs. Priya Verma',
        budgetPaise: rupees(15_00_000),
        startDate: isoDaysFromNow(10),
        endDate: isoDaysFromNow(55),
        status: 'on-hold',
        type: 'government',
        jurisdiction: 'cpwd',
        plotAreaSqm: null,
        buildingHeightM: null,
      },
    ],
    vendors: [
      { id: 'v1', name: 'ABC Concrete', phone: '9876543210', email: 'sales@abcconcrete.in', category: 'material', gstId: '27AABCT1234H1Z0', bankAccount: '1234567890', bankIfsc: 'SBIN0001234', creditLimitPaise: rupees(10_00_000), paymentTerms: '14-day', ratingQuality: 4.8, ratingDelivery: 4.5 },
      { id: 'v2', name: 'DEF Steel', phone: '9876543211', email: 'sales@defsteel.in', category: 'material', gstId: '27AABCT1234H1Z1', bankAccount: '1234567891', bankIfsc: 'SBIN0001235', creditLimitPaise: rupees(8_00_000), paymentTerms: 'COD', ratingQuality: 4.5, ratingDelivery: 4.8 },
      { id: 'v3', name: 'GHI Electrical', phone: '9876543212', email: 'info@ghielectrical.in', category: 'service', gstId: '29AABCT1234H1Z2', bankAccount: '1234567892', bankIfsc: 'HDFC0001236', creditLimitPaise: rupees(5_00_000), paymentTerms: '30-day', ratingQuality: 4.2, ratingDelivery: 4.0 },
      { id: 'v4', name: 'JKL Plumbing', phone: '9876543213', email: 'contact@jklplumbing.in', category: 'service', gstId: '29AABCT1234H1Z3', bankAccount: '1234567893', bankIfsc: 'HDFC0001237', creditLimitPaise: rupees(5_00_000), paymentTerms: '7-day', ratingQuality: 4.0, ratingDelivery: 4.3 },
      { id: 'v5', name: 'MNO Labor Services', phone: '9876543214', email: 'ops@mnolabor.in', category: 'labor', gstId: '27AABCT1234H1Z4', bankAccount: '1234567894', bankIfsc: 'ICIC0001238', creditLimitPaise: rupees(15_00_000), paymentTerms: 'COD', ratingQuality: 4.6, ratingDelivery: 4.7 },
      { id: 'v6', name: 'PQR Equipment Rentals', phone: '9876543215', email: 'rent@pqrequip.in', category: 'equipment', gstId: '06AABCT1234H1Z5', bankAccount: '1234567895', bankIfsc: 'ICIC0001239', creditLimitPaise: rupees(10_00_000), paymentTerms: '14-day', ratingQuality: 4.4, ratingDelivery: 4.1 },
      { id: 'v7', name: 'STU Finishing Works', phone: '9876543216', email: 'hello@stufinish.in', category: 'service', gstId: '07AABCT1234H1Z6', bankAccount: '1234567896', bankIfsc: 'SBIN0001240', creditLimitPaise: rupees(3_00_000), paymentTerms: '7-day', ratingQuality: 4.9, ratingDelivery: 4.6 },
      { id: 'v8', name: 'VWX Transport', phone: '9876543217', email: 'moves@vwxtransport.in', category: 'service', gstId: '07AABCT1234H1Z7', bankAccount: '1234567897', bankIfsc: 'HDFC0001241', creditLimitPaise: rupees(4_00_000), paymentTerms: 'COD', ratingQuality: 4.1, ratingDelivery: 4.4 },
    ],
    // Credit used per vendor is derived from non-paid invoices.
    invoices: [
      // ABC Concrete — heavy usage (~₹8.5L of ₹10L)
      inv('i1', 'v1', 'p1', 'ABC-45', 6_00_000, 12, 2, 'unpaid', 'RMC for foundation pour'),
      inv('i2', 'v1', 'p1', 'ABC-44', 2_00_000, 34, -20, 'unpaid', 'RMC week 1 — disputed quantity'),
      inv('i3', 'v1', 'p2', 'ABC-46', 50_000, 5, 9, 'unpaid', 'Test cubes + pump charges'),
      inv('i4', 'v1', 'p1', 'ABC-42', 3_00_000, 40, -26, 'paid', 'RMC slab casting', 'RTGS'),
      inv('i5', 'v1', 'p1', 'ABC-41', 1_50_000, 48, -34, 'paid', 'RMC footing', 'NEFT', -5),
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
      inv('i18', 'v5', 'p1', 'MNO-308', 1_50_000, 35, -28, 'paid', 'Site clearing', 'NEFT', -5),
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
      inv('i28', 'v2', 'p2', 'DEF-95', 90_000, 44, -40, 'paid', 'Binding wire + mesh', 'NEFT', -5),
      inv('i29', 'v3', 'p1', 'GHI-15', 40_000, 50, -20, 'paid', 'Temporary site power', 'Cheque'),
      inv('i30', 'v6', 'p2', 'PQR-49', 70_000, 47, -33, 'paid', 'Scaffolding rental', 'NEFT', -5),
    ],
    tasks: [
      { id: 't1', projectId: 'p1', name: 'Foundation excavation', description: 'Excavate and level foundation to -2.4m', phase: 'Foundation', assignedTo: 'Site Lead', status: 'complete', dueDate: isoDaysFromNow(-5), percentComplete: 100, budgetItemId: 'b1', zoneId: null, createdAt: isoDaysFromNow(-28) },
      { id: 't2', projectId: 'p1', name: 'RMC pour — raft', description: 'M30 raft pour with pump', phase: 'Foundation', assignedTo: 'Concrete Crew', status: 'complete', dueDate: isoDaysFromNow(-12), percentComplete: 100, budgetItemId: 'b1', zoneId: null, createdAt: isoDaysFromNow(-25) },
      { id: 't3', projectId: 'p1', name: 'Column framing — GF', description: 'Shuttering and rebar for ground floor columns', phase: 'Structure', assignedTo: 'Shuttering Crew', status: 'in-progress', dueDate: isoDaysFromNow(10), percentComplete: 30, budgetItemId: 'b3', zoneId: null, createdAt: isoDaysFromNow(-10) },
      { id: 't4', projectId: 'p1', name: 'Slab casting — GF', description: 'Ground floor slab, 180mm', phase: 'Structure', assignedTo: 'Concrete Crew', status: 'pending', dueDate: isoDaysFromNow(18), percentComplete: 0, budgetItemId: 'b2', zoneId: null, createdAt: isoDaysFromNow(-5) },
      { id: 't5', projectId: 'p1', name: 'Brickwork — GF partitions', description: 'AAC block partitions ground floor', phase: 'Structure', assignedTo: 'Mason Gang', status: 'pending', dueDate: isoDaysFromNow(26), percentComplete: 0, budgetItemId: 'b2', zoneId: null, createdAt: isoDaysFromNow(-3) },
      { id: 't6', projectId: 'p2', name: 'Site mobilization', description: 'Fencing, site office, water and power', phase: 'Foundation', assignedTo: 'Site Lead', status: 'complete', dueDate: isoDaysFromNow(-14), percentComplete: 100, budgetItemId: 'b6', zoneId: null, createdAt: isoDaysFromNow(-20) },
      { id: 't7', projectId: 'p2', name: 'Excavation — basement', description: 'Basement dig with shoring', phase: 'Foundation', assignedTo: 'Excavation Crew', status: 'in-progress', dueDate: isoDaysFromNow(-2), percentComplete: 80, budgetItemId: 'b6', zoneId: null, createdAt: isoDaysFromNow(-16) },
      { id: 't8', projectId: 'p2', name: 'MEP rough-in — B1', description: 'Electrical conduits and plumbing sleeves', phase: 'MEP', assignedTo: 'GHI Electrical', status: 'in-progress', dueDate: isoDaysFromNow(15), percentComplete: 40, budgetItemId: 'b10', zoneId: null, createdAt: isoDaysFromNow(-8) },
      { id: 't9', projectId: 'p2', name: 'Waterproofing — retaining walls', description: 'Membrane waterproofing on retaining walls', phase: 'Structure', assignedTo: 'Waterproofing Sub', status: 'pending', dueDate: isoDaysFromNow(22), percentComplete: 0, budgetItemId: 'b6', zoneId: null, createdAt: isoDaysFromNow(-4) },
      { id: 't10', projectId: 'p3', name: 'Demolition survey', description: 'Survey and mark walls for demolition', phase: 'Foundation', assignedTo: 'Site Lead', status: 'pending', dueDate: isoDaysFromNow(14), percentComplete: 0, budgetItemId: 'b11', zoneId: null, createdAt: isoDaysFromNow(-2) },
      { id: 't11', projectId: 'p1', name: 'External plumbing lines', description: 'Sewer connection and storm drains', phase: 'MEP', assignedTo: 'JKL Plumbing', status: 'in-progress', dueDate: isoDaysFromNow(8), percentComplete: 55, budgetItemId: 'b4', zoneId: null, createdAt: isoDaysFromNow(-12) },
      { id: 't12', projectId: 'p1', name: 'Sample flat finishing', description: 'One-bedroom sample unit full finish', phase: 'Finishing', assignedTo: 'STU Finishing', status: 'in-progress', dueDate: isoDaysFromNow(20), percentComplete: 25, budgetItemId: 'b5', zoneId: null, createdAt: isoDaysFromNow(-9) },
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
      { id: 'b1', projectId: 'p1', description: 'Excavation & foundation', quantity: 1, unit: 'LS', unitRatePaise: rupees(3_00_000), actualSpendPaise: rupees(2_80_000) },
      { id: 'b2', projectId: 'p1', description: 'RMC (M30)', quantity: 200, unit: 'm³', unitRatePaise: rupees(2_500), actualSpendPaise: rupees(5_75_000) },
      { id: 'b3', projectId: 'p1', description: 'TMT Steel', quantity: 40, unit: 'MT', unitRatePaise: rupees(10_000), actualSpendPaise: rupees(3_50_000) },
      { id: 'b4', projectId: 'p1', description: 'MEP works', quantity: 1, unit: 'LS', unitRatePaise: rupees(6_00_000), actualSpendPaise: rupees(90_000) },
      { id: 'b5', projectId: 'p1', description: 'Finishing works', quantity: 1, unit: 'LS', unitRatePaise: rupees(7_00_000), actualSpendPaise: rupees(1_50_000) },
      { id: 'b6', projectId: 'p2', description: 'Excavation & shoring', quantity: 1, unit: 'LS', unitRatePaise: rupees(5_00_000), actualSpendPaise: rupees(3_70_000) },
      { id: 'b7', projectId: 'p2', description: 'RMC (M35)', quantity: 350, unit: 'm³', unitRatePaise: rupees(2_700), actualSpendPaise: rupees(50_000) },
      { id: 'b8', projectId: 'p2', description: 'Structural steel', quantity: 60, unit: 'MT', unitRatePaise: rupees(11_000), actualSpendPaise: rupees(2_90_000) },
      { id: 'b9', projectId: 'p2', description: 'Equipment rental', quantity: 1, unit: 'LS', unitRatePaise: rupees(8_00_000), actualSpendPaise: rupees(3_20_000) },
      { id: 'b10', projectId: 'p2', description: 'MEP works', quantity: 1, unit: 'LS', unitRatePaise: rupees(9_00_000), actualSpendPaise: rupees(2_40_000) },
      { id: 'b11', projectId: 'p3', description: 'Demolition', quantity: 1, unit: 'LS', unitRatePaise: rupees(2_00_000), actualSpendPaise: rupees(0) },
      { id: 'b12', projectId: 'p3', description: 'Civil repairs', quantity: 1, unit: 'LS', unitRatePaise: rupees(5_00_000), actualSpendPaise: rupees(0) },
      { id: 'b13', projectId: 'p3', description: 'Interiors & finishing', quantity: 1, unit: 'LS', unitRatePaise: rupees(6_50_000), actualSpendPaise: rupees(0) },
    ],
    // Zones: floor → room → element. Status is never stored here — it is
    // derived from the tasks that build each zone, so a drawing can never
    // disagree with the work underneath it.
    zones: [
      { id: 'z-p1-gf', projectId: 'p1', parentId: null, level: 'floor', name: 'Ground Floor', drawingId: null, outline: null },
      { id: 'z-p1-ff', projectId: 'p1', parentId: null, level: 'floor', name: 'First Floor', drawingId: null, outline: null },
      { id: 'z-p1-gf-liv', projectId: 'p1', parentId: 'z-p1-gf', level: 'room', name: 'Living Room', drawingId: 'dwg-a101-r1', outline: [{ x: 0.142857, y: 0.142857 }, { x: 0.500000, y: 0.142857 }, { x: 0.500000, y: 0.482143 }, { x: 0.142857, y: 0.482143 }] },
      { id: 'z-p1-gf-kit', projectId: 'p1', parentId: 'z-p1-gf', level: 'room', name: 'Kitchen', drawingId: 'dwg-a101-r1', outline: [{ x: 0.142857, y: 0.482143 }, { x: 0.500000, y: 0.482143 }, { x: 0.500000, y: 0.750000 }, { x: 0.142857, y: 0.750000 }] },
      { id: 'z-p1-gf-c4', projectId: 'p1', parentId: 'z-p1-gf-liv', level: 'element', name: 'Column C4', drawingId: 'dwg-a101-r1', outline: [{ x: 0.185714, y: 0.196429 }, { x: 0.214286, y: 0.196429 }, { x: 0.214286, y: 0.232143 }, { x: 0.185714, y: 0.232143 }] },
      { id: 'z-p1-gf-b2', projectId: 'p1', parentId: 'z-p1-gf-liv', level: 'element', name: 'Beam B2', drawingId: 'dwg-a101-r1', outline: [{ x: 0.257143, y: 0.196429 }, { x: 0.385714, y: 0.196429 }, { x: 0.385714, y: 0.214286 }, { x: 0.257143, y: 0.214286 }] },
      { id: 'z-p2-b1', projectId: 'p2', parentId: null, level: 'floor', name: 'Basement B1', drawingId: null, outline: null },
      { id: 'z-p2-b1-park', projectId: 'p2', parentId: 'z-p2-b1', level: 'room', name: 'Parking Bay', drawingId: null, outline: null },
    ],
    // Seeded empty: photos are captured on site, and a fake data URL would
    // only produce broken images in the gallery.
    photos: [],
    // Checklist state and documents start empty — they are filled by the
    // project team as approvals are actually obtained.
    // A seeded ground-floor plan so the zone overlay lands on a real sheet.
    // Authored as SVG rather than shipped as a binary — it stays small, and
    // it renders identically wherever the demo runs.
    drawings: [
      {
        id: 'dwg-a101-r1',
        projectId: 'p1',
        sheetNumber: 'A-101',
        title: 'Ground floor plan',
        discipline: 'architectural',
        revision: 'R1',
        supersedesId: 'dwg-a101-r0',
        isCurrent: true,
        src: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20840%20672%22%20width%3D%22840%22%20height%3D%22672%22%3E%3Cstyle%3E.sheet%7Bfill%3A%23FCFBF8%7D.grid%7Bstroke%3A%23E0DBD1%3Bstroke-width%3A.7%7D.wall%7Bfill%3Anone%3Bstroke%3A%231C1917%3Bstroke-width%3A6.5%3Bstroke-linecap%3Asquare%7D.thin%7Bfill%3Anone%3Bstroke%3A%231C1917%3Bstroke-width%3A2.2%7D.ext%7Bstroke%3A%23857C70%3Bstroke-width%3A.7%7D.dim%7Bstroke%3A%231C1917%3Bstroke-width%3A1%7D.tick%7Bstroke%3A%231C1917%3Bstroke-width%3A1.2%3Bfill%3Anone%7D.fig%7Bfont-family%3Aui-monospace%2Cmonospace%3Bfont-size%3A14px%3Bfill%3A%231C1917%3Bfont-weight%3A700%7D.rm%7Bfont-family%3Aui-monospace%2Cmonospace%3Bfont-size%3A15px%3Bfill%3A%2357534E%3Bletter-spacing%3A.8px%7D.rmd%7Bfont-family%3Aui-monospace%2Cmonospace%3Bfont-size%3A12px%3Bfill%3A%23A8741A%7D.note%7Bfont-family%3Aui-monospace%2Cmonospace%3Bfont-size%3A11px%3Bfill%3A%23857C70%7D.tb%7Bfont-family%3Aui-monospace%2Cmonospace%3Bfont-size%3A12px%3Bfill%3A%231C1917%3Bfont-weight%3A700%7D%3C/style%3E%3Crect%20class%3D%22sheet%22%20width%3D%22840%22%20height%3D%22672%22/%3E%3Cg%20class%3D%22grid%22%3E%3Cpath%20d%3D%22M0%200H840%22/%3E%3Cpath%20d%3D%22M0%2012H840%22/%3E%3Cpath%20d%3D%22M0%2024H840%22/%3E%3Cpath%20d%3D%22M0%2036H840%22/%3E%3Cpath%20d%3D%22M0%2048H840%22/%3E%3Cpath%20d%3D%22M0%2060H840%22/%3E%3Cpath%20d%3D%22M0%2072H840%22/%3E%3Cpath%20d%3D%22M0%2084H840%22/%3E%3Cpath%20d%3D%22M0%2096H840%22/%3E%3Cpath%20d%3D%22M0%20108H840%22/%3E%3Cpath%20d%3D%22M0%20120H840%22/%3E%3Cpath%20d%3D%22M0%20132H840%22/%3E%3Cpath%20d%3D%22M0%20144H840%22/%3E%3Cpath%20d%3D%22M0%20156H840%22/%3E%3Cpath%20d%3D%22M0%20168H840%22/%3E%3Cpath%20d%3D%22M0%20180H840%22/%3E%3Cpath%20d%3D%22M0%20192H840%22/%3E%3Cpath%20d%3D%22M0%20204H840%22/%3E%3Cpath%20d%3D%22M0%20216H840%22/%3E%3Cpath%20d%3D%22M0%20228H840%22/%3E%3Cpath%20d%3D%22M0%20240H840%22/%3E%3Cpath%20d%3D%22M0%20252H840%22/%3E%3Cpath%20d%3D%22M0%20264H840%22/%3E%3Cpath%20d%3D%22M0%20276H840%22/%3E%3Cpath%20d%3D%22M0%20288H840%22/%3E%3Cpath%20d%3D%22M0%20300H840%22/%3E%3Cpath%20d%3D%22M0%20312H840%22/%3E%3Cpath%20d%3D%22M0%20324H840%22/%3E%3Cpath%20d%3D%22M0%20336H840%22/%3E%3Cpath%20d%3D%22M0%20348H840%22/%3E%3Cpath%20d%3D%22M0%20360H840%22/%3E%3Cpath%20d%3D%22M0%20372H840%22/%3E%3Cpath%20d%3D%22M0%20384H840%22/%3E%3Cpath%20d%3D%22M0%20396H840%22/%3E%3Cpath%20d%3D%22M0%20408H840%22/%3E%3Cpath%20d%3D%22M0%20420H840%22/%3E%3Cpath%20d%3D%22M0%20432H840%22/%3E%3Cpath%20d%3D%22M0%20444H840%22/%3E%3Cpath%20d%3D%22M0%20456H840%22/%3E%3Cpath%20d%3D%22M0%20468H840%22/%3E%3Cpath%20d%3D%22M0%20480H840%22/%3E%3Cpath%20d%3D%22M0%20492H840%22/%3E%3Cpath%20d%3D%22M0%20504H840%22/%3E%3Cpath%20d%3D%22M0%20516H840%22/%3E%3Cpath%20d%3D%22M0%20528H840%22/%3E%3Cpath%20d%3D%22M0%20540H840%22/%3E%3Cpath%20d%3D%22M0%20552H840%22/%3E%3Cpath%20d%3D%22M0%20564H840%22/%3E%3Cpath%20d%3D%22M0%20576H840%22/%3E%3Cpath%20d%3D%22M0%20588H840%22/%3E%3Cpath%20d%3D%22M0%20600H840%22/%3E%3Cpath%20d%3D%22M0%20612H840%22/%3E%3Cpath%20d%3D%22M0%20624H840%22/%3E%3Cpath%20d%3D%22M0%20636H840%22/%3E%3Cpath%20d%3D%22M0%20648H840%22/%3E%3Cpath%20d%3D%22M0%20660H840%22/%3E%3Cpath%20d%3D%22M0%200V672%22/%3E%3Cpath%20d%3D%22M12%200V672%22/%3E%3Cpath%20d%3D%22M24%200V672%22/%3E%3Cpath%20d%3D%22M36%200V672%22/%3E%3Cpath%20d%3D%22M48%200V672%22/%3E%3Cpath%20d%3D%22M60%200V672%22/%3E%3Cpath%20d%3D%22M72%200V672%22/%3E%3Cpath%20d%3D%22M84%200V672%22/%3E%3Cpath%20d%3D%22M96%200V672%22/%3E%3Cpath%20d%3D%22M108%200V672%22/%3E%3Cpath%20d%3D%22M120%200V672%22/%3E%3Cpath%20d%3D%22M132%200V672%22/%3E%3Cpath%20d%3D%22M144%200V672%22/%3E%3Cpath%20d%3D%22M156%200V672%22/%3E%3Cpath%20d%3D%22M168%200V672%22/%3E%3Cpath%20d%3D%22M180%200V672%22/%3E%3Cpath%20d%3D%22M192%200V672%22/%3E%3Cpath%20d%3D%22M204%200V672%22/%3E%3Cpath%20d%3D%22M216%200V672%22/%3E%3Cpath%20d%3D%22M228%200V672%22/%3E%3Cpath%20d%3D%22M240%200V672%22/%3E%3Cpath%20d%3D%22M252%200V672%22/%3E%3Cpath%20d%3D%22M264%200V672%22/%3E%3Cpath%20d%3D%22M276%200V672%22/%3E%3Cpath%20d%3D%22M288%200V672%22/%3E%3Cpath%20d%3D%22M300%200V672%22/%3E%3Cpath%20d%3D%22M312%200V672%22/%3E%3Cpath%20d%3D%22M324%200V672%22/%3E%3Cpath%20d%3D%22M336%200V672%22/%3E%3Cpath%20d%3D%22M348%200V672%22/%3E%3Cpath%20d%3D%22M360%200V672%22/%3E%3Cpath%20d%3D%22M372%200V672%22/%3E%3Cpath%20d%3D%22M384%200V672%22/%3E%3Cpath%20d%3D%22M396%200V672%22/%3E%3Cpath%20d%3D%22M408%200V672%22/%3E%3Cpath%20d%3D%22M420%200V672%22/%3E%3Cpath%20d%3D%22M432%200V672%22/%3E%3Cpath%20d%3D%22M444%200V672%22/%3E%3Cpath%20d%3D%22M456%200V672%22/%3E%3Cpath%20d%3D%22M468%200V672%22/%3E%3Cpath%20d%3D%22M480%200V672%22/%3E%3Cpath%20d%3D%22M492%200V672%22/%3E%3Cpath%20d%3D%22M504%200V672%22/%3E%3Cpath%20d%3D%22M516%200V672%22/%3E%3Cpath%20d%3D%22M528%200V672%22/%3E%3Cpath%20d%3D%22M540%200V672%22/%3E%3Cpath%20d%3D%22M552%200V672%22/%3E%3Cpath%20d%3D%22M564%200V672%22/%3E%3Cpath%20d%3D%22M576%200V672%22/%3E%3Cpath%20d%3D%22M588%200V672%22/%3E%3Cpath%20d%3D%22M600%200V672%22/%3E%3Cpath%20d%3D%22M612%200V672%22/%3E%3Cpath%20d%3D%22M624%200V672%22/%3E%3Cpath%20d%3D%22M636%200V672%22/%3E%3Cpath%20d%3D%22M648%200V672%22/%3E%3Cpath%20d%3D%22M660%200V672%22/%3E%3Cpath%20d%3D%22M672%200V672%22/%3E%3Cpath%20d%3D%22M684%200V672%22/%3E%3Cpath%20d%3D%22M696%200V672%22/%3E%3Cpath%20d%3D%22M708%200V672%22/%3E%3Cpath%20d%3D%22M720%200V672%22/%3E%3Cpath%20d%3D%22M732%200V672%22/%3E%3Cpath%20d%3D%22M744%200V672%22/%3E%3Cpath%20d%3D%22M756%200V672%22/%3E%3Cpath%20d%3D%22M768%200V672%22/%3E%3Cpath%20d%3D%22M780%200V672%22/%3E%3Cpath%20d%3D%22M792%200V672%22/%3E%3Cpath%20d%3D%22M804%200V672%22/%3E%3Cpath%20d%3D%22M816%200V672%22/%3E%3Cpath%20d%3D%22M828%200V672%22/%3E%3C/g%3E%3Cg%20class%3D%22wall%22%3E%3Crect%20x%3D%22120%22%20y%3D%2296%22%20width%3D%22624%22%20height%3D%22408%22%20fill%3D%22none%22/%3E%3Cpath%20d%3D%22M420%2096V504%22/%3E%3Cpath%20d%3D%22M120%20324H420%22/%3E%3Cpath%20d%3D%22M420%20252H744%22/%3E%3C/g%3E%3Cg%20class%3D%22thin%22%3E%3Crect%20x%3D%22156%22%20y%3D%22132%22%20width%3D%2224%22%20height%3D%2224%22%20fill%3D%22%23E0DBD1%22/%3E%3Crect%20x%3D%22216%22%20y%3D%22132%22%20width%3D%22108%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke-dasharray%3D%226%204%22/%3E%3C/g%3E%3Ctext%20class%3D%22note%22%20x%3D%22168%22%20y%3D%22172%22%20text-anchor%3D%22middle%22%3EC4%3C/text%3E%3Ctext%20class%3D%22note%22%20x%3D%22270%22%20y%3D%22126%22%20text-anchor%3D%22middle%22%3EB2%3C/text%3E%3Ctext%20class%3D%22rm%22%20x%3D%22270.0%22%20y%3D%22210%22%20text-anchor%3D%22middle%22%3ELIVING%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22270.0%22%20y%3D%22229%22%20text-anchor%3D%22middle%22%3E25%27-0%22%20%26%23215%3B%2019%27-0%22%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22270.0%22%20y%3D%22246%22%20text-anchor%3D%22middle%22%3E475%20sq%20ft%3C/text%3E%3Ctext%20class%3D%22rm%22%20x%3D%22270.0%22%20y%3D%22400%22%20text-anchor%3D%22middle%22%3EKITCHEN%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22270.0%22%20y%3D%22419%22%20text-anchor%3D%22middle%22%3E25%27-0%22%20%26%23215%3B%2015%27-0%22%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22270.0%22%20y%3D%22436%22%20text-anchor%3D%22middle%22%3E375%20sq%20ft%3C/text%3E%3Ctext%20class%3D%22rm%22%20x%3D%22582.0%22%20y%3D%22160%22%20text-anchor%3D%22middle%22%3EBEDROOM%201%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22582.0%22%20y%3D%22179%22%20text-anchor%3D%22middle%22%3E27%27-0%22%20%26%23215%3B%2013%27-0%22%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22582.0%22%20y%3D%22196%22%20text-anchor%3D%22middle%22%3E351%20sq%20ft%3C/text%3E%3Ctext%20class%3D%22rm%22%20x%3D%22582.0%22%20y%3D%22370%22%20text-anchor%3D%22middle%22%3EBEDROOM%202%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22582.0%22%20y%3D%22389%22%20text-anchor%3D%22middle%22%3E27%27-0%22%20%26%23215%3B%2021%27-0%22%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22582.0%22%20y%3D%22406%22%20text-anchor%3D%22middle%22%3E567%20sq%20ft%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M120%20504V556M420%20504V556%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M120%20546H420%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M116%20550L124%20542%22/%3E%3Cpath%20d%3D%22M416%20550L424%20542%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%22270.0%22%20y%3D%22539%22%20text-anchor%3D%22middle%22%3E25%27-0%22%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M420%20504V556M744%20504V556%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M420%20546H744%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M416%20550L424%20542%22/%3E%3Cpath%20d%3D%22M740%20550L748%20542%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%22582.0%22%20y%3D%22539%22%20text-anchor%3D%22middle%22%3E27%27-0%22%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M120%20504V592M744%20504V592%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M120%20582H744%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M116%20586L124%20578%22/%3E%3Cpath%20d%3D%22M740%20586L748%20578%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%22432.0%22%20y%3D%22575%22%20text-anchor%3D%22middle%22%3E52%27-0%22%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M120%2096H74M120%20324H74%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M84%2096V324%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M80%20100L88%2092%22/%3E%3Cpath%20d%3D%22M80%20328L88%20320%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%2277%22%20y%3D%22210.0%22%20text-anchor%3D%22middle%22%20transform%3D%22rotate%28-90%2077%20210.0%29%22%3E19%27-0%22%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M120%20324H74M120%20504H74%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M84%20324V504%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M80%20328L88%20320%22/%3E%3Cpath%20d%3D%22M80%20508L88%20500%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%2277%22%20y%3D%22414.0%22%20text-anchor%3D%22middle%22%20transform%3D%22rotate%28-90%2077%20414.0%29%22%3E15%27-0%22%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M120%2096H36M120%20504H36%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M46%2096V504%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M42%20100L50%2092%22/%3E%3Cpath%20d%3D%22M42%20508L50%20500%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%2239%22%20y%3D%22300.0%22%20text-anchor%3D%22middle%22%20transform%3D%22rotate%28-90%2039%20300.0%29%22%3E34%27-0%22%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M744%2096H776M744%20252H776%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M786%2096V252%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M782%20100L790%2092%22/%3E%3Cpath%20d%3D%22M782%20256L790%20248%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%22779%22%20y%3D%22174.0%22%20text-anchor%3D%22middle%22%20transform%3D%22rotate%28-90%20779%20174.0%29%22%3E13%27-0%22%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M744%20252H776M744%20504H776%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M786%20252V504%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M782%20256L790%20248%22/%3E%3Cpath%20d%3D%22M782%20508L790%20500%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%22779%22%20y%3D%22378.0%22%20text-anchor%3D%22middle%22%20transform%3D%22rotate%28-90%20779%20378.0%29%22%3E21%27-0%22%3C/text%3E%3Cg%20transform%3D%22translate%28120%2C620%29%22%3E%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%2260%22%20height%3D%228%22%20fill%3D%22%231C1917%22/%3E%3Crect%20x%3D%2260%22%20y%3D%220%22%20width%3D%2260%22%20height%3D%228%22%20fill%3D%22none%22%20stroke%3D%22%231C1917%22%20stroke-width%3D%221%22/%3E%3Crect%20x%3D%22120%22%20y%3D%220%22%20width%3D%2260%22%20height%3D%228%22%20fill%3D%22%231C1917%22/%3E%3Ctext%20class%3D%22note%22%20x%3D%220%22%20y%3D%2220%22%3E0%3C/text%3E%3Ctext%20class%3D%22note%22%20x%3D%22170%22%20y%3D%2220%22%3E15%27-0%22%3C/text%3E%3C/g%3E%3Ctext%20class%3D%22note%22%20x%3D%22330%22%20y%3D%22628%22%3ESCALE%201/4%26%238221%3B%20%3D%201%26%238217%3B-0%26%238221%3B%3C/text%3E%3Ctext%20class%3D%22note%22%20x%3D%22744%22%20y%3D%22628%22%20text-anchor%3D%22end%22%3EALL%20DIMENSIONS%20IN%20FEET%20AND%20INCHES%3C/text%3E%3Cg%20transform%3D%22translate%28730%2C606%29%22%3E%3Cpath%20d%3D%22M0%20-18L6%206L0%200L-6%206Z%22%20fill%3D%22%231C1917%22/%3E%3C/g%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M120%20638H744%22/%3E%3Ctext%20class%3D%22tb%22%20x%3D%22120%22%20y%3D%22654%22%3EGROUND%20FLOOR%20PLAN%3C/text%3E%3Ctext%20class%3D%22tb%22%20x%3D%22744%22%20y%3D%22654%22%20text-anchor%3D%22end%22%3ESHEET%20A-101%20%26%23183%3B%20REV%20R1%3C/text%3E%3C/svg%3E',
        mimeType: 'image/svg+xml',
        sizeBytes: 2400,
        uploadedByUserId: 'u-1-pm',
        uploadedByName: 'Anita Deshmukh',
        timestamp: isoDaysFromNow(-8),
        notes: 'Kitchen window relocated; column C4 grid reference corrected.',
        sheetWidthMm: 21336,
        sheetHeightMm: 17069,
      },
      {
        id: 'dwg-a101-r0',
        projectId: 'p1',
        sheetNumber: 'A-101',
        title: 'Ground floor plan',
        discipline: 'architectural',
        revision: 'R0',
        supersedesId: null,
        isCurrent: false,
        src: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20840%20672%22%20width%3D%22840%22%20height%3D%22672%22%3E%3Cstyle%3E.sheet%7Bfill%3A%23FCFBF8%7D.grid%7Bstroke%3A%23E0DBD1%3Bstroke-width%3A.7%7D.wall%7Bfill%3Anone%3Bstroke%3A%231C1917%3Bstroke-width%3A6.5%3Bstroke-linecap%3Asquare%7D.thin%7Bfill%3Anone%3Bstroke%3A%231C1917%3Bstroke-width%3A2.2%7D.ext%7Bstroke%3A%23857C70%3Bstroke-width%3A.7%7D.dim%7Bstroke%3A%231C1917%3Bstroke-width%3A1%7D.tick%7Bstroke%3A%231C1917%3Bstroke-width%3A1.2%3Bfill%3Anone%7D.fig%7Bfont-family%3Aui-monospace%2Cmonospace%3Bfont-size%3A14px%3Bfill%3A%231C1917%3Bfont-weight%3A700%7D.rm%7Bfont-family%3Aui-monospace%2Cmonospace%3Bfont-size%3A15px%3Bfill%3A%2357534E%3Bletter-spacing%3A.8px%7D.rmd%7Bfont-family%3Aui-monospace%2Cmonospace%3Bfont-size%3A12px%3Bfill%3A%23A8741A%7D.note%7Bfont-family%3Aui-monospace%2Cmonospace%3Bfont-size%3A11px%3Bfill%3A%23857C70%7D.tb%7Bfont-family%3Aui-monospace%2Cmonospace%3Bfont-size%3A12px%3Bfill%3A%231C1917%3Bfont-weight%3A700%7D%3C/style%3E%3Crect%20class%3D%22sheet%22%20width%3D%22840%22%20height%3D%22672%22/%3E%3Cg%20class%3D%22grid%22%3E%3Cpath%20d%3D%22M0%200H840%22/%3E%3Cpath%20d%3D%22M0%2012H840%22/%3E%3Cpath%20d%3D%22M0%2024H840%22/%3E%3Cpath%20d%3D%22M0%2036H840%22/%3E%3Cpath%20d%3D%22M0%2048H840%22/%3E%3Cpath%20d%3D%22M0%2060H840%22/%3E%3Cpath%20d%3D%22M0%2072H840%22/%3E%3Cpath%20d%3D%22M0%2084H840%22/%3E%3Cpath%20d%3D%22M0%2096H840%22/%3E%3Cpath%20d%3D%22M0%20108H840%22/%3E%3Cpath%20d%3D%22M0%20120H840%22/%3E%3Cpath%20d%3D%22M0%20132H840%22/%3E%3Cpath%20d%3D%22M0%20144H840%22/%3E%3Cpath%20d%3D%22M0%20156H840%22/%3E%3Cpath%20d%3D%22M0%20168H840%22/%3E%3Cpath%20d%3D%22M0%20180H840%22/%3E%3Cpath%20d%3D%22M0%20192H840%22/%3E%3Cpath%20d%3D%22M0%20204H840%22/%3E%3Cpath%20d%3D%22M0%20216H840%22/%3E%3Cpath%20d%3D%22M0%20228H840%22/%3E%3Cpath%20d%3D%22M0%20240H840%22/%3E%3Cpath%20d%3D%22M0%20252H840%22/%3E%3Cpath%20d%3D%22M0%20264H840%22/%3E%3Cpath%20d%3D%22M0%20276H840%22/%3E%3Cpath%20d%3D%22M0%20288H840%22/%3E%3Cpath%20d%3D%22M0%20300H840%22/%3E%3Cpath%20d%3D%22M0%20312H840%22/%3E%3Cpath%20d%3D%22M0%20324H840%22/%3E%3Cpath%20d%3D%22M0%20336H840%22/%3E%3Cpath%20d%3D%22M0%20348H840%22/%3E%3Cpath%20d%3D%22M0%20360H840%22/%3E%3Cpath%20d%3D%22M0%20372H840%22/%3E%3Cpath%20d%3D%22M0%20384H840%22/%3E%3Cpath%20d%3D%22M0%20396H840%22/%3E%3Cpath%20d%3D%22M0%20408H840%22/%3E%3Cpath%20d%3D%22M0%20420H840%22/%3E%3Cpath%20d%3D%22M0%20432H840%22/%3E%3Cpath%20d%3D%22M0%20444H840%22/%3E%3Cpath%20d%3D%22M0%20456H840%22/%3E%3Cpath%20d%3D%22M0%20468H840%22/%3E%3Cpath%20d%3D%22M0%20480H840%22/%3E%3Cpath%20d%3D%22M0%20492H840%22/%3E%3Cpath%20d%3D%22M0%20504H840%22/%3E%3Cpath%20d%3D%22M0%20516H840%22/%3E%3Cpath%20d%3D%22M0%20528H840%22/%3E%3Cpath%20d%3D%22M0%20540H840%22/%3E%3Cpath%20d%3D%22M0%20552H840%22/%3E%3Cpath%20d%3D%22M0%20564H840%22/%3E%3Cpath%20d%3D%22M0%20576H840%22/%3E%3Cpath%20d%3D%22M0%20588H840%22/%3E%3Cpath%20d%3D%22M0%20600H840%22/%3E%3Cpath%20d%3D%22M0%20612H840%22/%3E%3Cpath%20d%3D%22M0%20624H840%22/%3E%3Cpath%20d%3D%22M0%20636H840%22/%3E%3Cpath%20d%3D%22M0%20648H840%22/%3E%3Cpath%20d%3D%22M0%20660H840%22/%3E%3Cpath%20d%3D%22M0%200V672%22/%3E%3Cpath%20d%3D%22M12%200V672%22/%3E%3Cpath%20d%3D%22M24%200V672%22/%3E%3Cpath%20d%3D%22M36%200V672%22/%3E%3Cpath%20d%3D%22M48%200V672%22/%3E%3Cpath%20d%3D%22M60%200V672%22/%3E%3Cpath%20d%3D%22M72%200V672%22/%3E%3Cpath%20d%3D%22M84%200V672%22/%3E%3Cpath%20d%3D%22M96%200V672%22/%3E%3Cpath%20d%3D%22M108%200V672%22/%3E%3Cpath%20d%3D%22M120%200V672%22/%3E%3Cpath%20d%3D%22M132%200V672%22/%3E%3Cpath%20d%3D%22M144%200V672%22/%3E%3Cpath%20d%3D%22M156%200V672%22/%3E%3Cpath%20d%3D%22M168%200V672%22/%3E%3Cpath%20d%3D%22M180%200V672%22/%3E%3Cpath%20d%3D%22M192%200V672%22/%3E%3Cpath%20d%3D%22M204%200V672%22/%3E%3Cpath%20d%3D%22M216%200V672%22/%3E%3Cpath%20d%3D%22M228%200V672%22/%3E%3Cpath%20d%3D%22M240%200V672%22/%3E%3Cpath%20d%3D%22M252%200V672%22/%3E%3Cpath%20d%3D%22M264%200V672%22/%3E%3Cpath%20d%3D%22M276%200V672%22/%3E%3Cpath%20d%3D%22M288%200V672%22/%3E%3Cpath%20d%3D%22M300%200V672%22/%3E%3Cpath%20d%3D%22M312%200V672%22/%3E%3Cpath%20d%3D%22M324%200V672%22/%3E%3Cpath%20d%3D%22M336%200V672%22/%3E%3Cpath%20d%3D%22M348%200V672%22/%3E%3Cpath%20d%3D%22M360%200V672%22/%3E%3Cpath%20d%3D%22M372%200V672%22/%3E%3Cpath%20d%3D%22M384%200V672%22/%3E%3Cpath%20d%3D%22M396%200V672%22/%3E%3Cpath%20d%3D%22M408%200V672%22/%3E%3Cpath%20d%3D%22M420%200V672%22/%3E%3Cpath%20d%3D%22M432%200V672%22/%3E%3Cpath%20d%3D%22M444%200V672%22/%3E%3Cpath%20d%3D%22M456%200V672%22/%3E%3Cpath%20d%3D%22M468%200V672%22/%3E%3Cpath%20d%3D%22M480%200V672%22/%3E%3Cpath%20d%3D%22M492%200V672%22/%3E%3Cpath%20d%3D%22M504%200V672%22/%3E%3Cpath%20d%3D%22M516%200V672%22/%3E%3Cpath%20d%3D%22M528%200V672%22/%3E%3Cpath%20d%3D%22M540%200V672%22/%3E%3Cpath%20d%3D%22M552%200V672%22/%3E%3Cpath%20d%3D%22M564%200V672%22/%3E%3Cpath%20d%3D%22M576%200V672%22/%3E%3Cpath%20d%3D%22M588%200V672%22/%3E%3Cpath%20d%3D%22M600%200V672%22/%3E%3Cpath%20d%3D%22M612%200V672%22/%3E%3Cpath%20d%3D%22M624%200V672%22/%3E%3Cpath%20d%3D%22M636%200V672%22/%3E%3Cpath%20d%3D%22M648%200V672%22/%3E%3Cpath%20d%3D%22M660%200V672%22/%3E%3Cpath%20d%3D%22M672%200V672%22/%3E%3Cpath%20d%3D%22M684%200V672%22/%3E%3Cpath%20d%3D%22M696%200V672%22/%3E%3Cpath%20d%3D%22M708%200V672%22/%3E%3Cpath%20d%3D%22M720%200V672%22/%3E%3Cpath%20d%3D%22M732%200V672%22/%3E%3Cpath%20d%3D%22M744%200V672%22/%3E%3Cpath%20d%3D%22M756%200V672%22/%3E%3Cpath%20d%3D%22M768%200V672%22/%3E%3Cpath%20d%3D%22M780%200V672%22/%3E%3Cpath%20d%3D%22M792%200V672%22/%3E%3Cpath%20d%3D%22M804%200V672%22/%3E%3Cpath%20d%3D%22M816%200V672%22/%3E%3Cpath%20d%3D%22M828%200V672%22/%3E%3C/g%3E%3Cg%20class%3D%22wall%22%3E%3Crect%20x%3D%22120%22%20y%3D%2296%22%20width%3D%22624%22%20height%3D%22408%22%20fill%3D%22none%22/%3E%3Cpath%20d%3D%22M420%2096V504%22/%3E%3Cpath%20d%3D%22M120%20324H420%22/%3E%3Cpath%20d%3D%22M420%20252H744%22/%3E%3C/g%3E%3Cg%20class%3D%22thin%22%3E%3Crect%20x%3D%22156%22%20y%3D%22132%22%20width%3D%2224%22%20height%3D%2224%22%20fill%3D%22%23E0DBD1%22/%3E%3Crect%20x%3D%22216%22%20y%3D%22132%22%20width%3D%22108%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke-dasharray%3D%226%204%22/%3E%3C/g%3E%3Ctext%20class%3D%22note%22%20x%3D%22168%22%20y%3D%22172%22%20text-anchor%3D%22middle%22%3EC4%3C/text%3E%3Ctext%20class%3D%22note%22%20x%3D%22270%22%20y%3D%22126%22%20text-anchor%3D%22middle%22%3EB2%3C/text%3E%3Ctext%20class%3D%22rm%22%20x%3D%22270.0%22%20y%3D%22210%22%20text-anchor%3D%22middle%22%3ELIVING%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22270.0%22%20y%3D%22229%22%20text-anchor%3D%22middle%22%3E25%27-0%22%20%26%23215%3B%2019%27-0%22%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22270.0%22%20y%3D%22246%22%20text-anchor%3D%22middle%22%3E475%20sq%20ft%3C/text%3E%3Ctext%20class%3D%22rm%22%20x%3D%22270.0%22%20y%3D%22400%22%20text-anchor%3D%22middle%22%3EKITCHEN%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22270.0%22%20y%3D%22419%22%20text-anchor%3D%22middle%22%3E25%27-0%22%20%26%23215%3B%2015%27-0%22%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22270.0%22%20y%3D%22436%22%20text-anchor%3D%22middle%22%3E375%20sq%20ft%3C/text%3E%3Ctext%20class%3D%22rm%22%20x%3D%22582.0%22%20y%3D%22160%22%20text-anchor%3D%22middle%22%3EBEDROOM%201%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22582.0%22%20y%3D%22179%22%20text-anchor%3D%22middle%22%3E27%27-0%22%20%26%23215%3B%2013%27-0%22%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22582.0%22%20y%3D%22196%22%20text-anchor%3D%22middle%22%3E351%20sq%20ft%3C/text%3E%3Ctext%20class%3D%22rm%22%20x%3D%22582.0%22%20y%3D%22370%22%20text-anchor%3D%22middle%22%3EBEDROOM%202%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22582.0%22%20y%3D%22389%22%20text-anchor%3D%22middle%22%3E27%27-0%22%20%26%23215%3B%2021%27-0%22%3C/text%3E%3Ctext%20class%3D%22rmd%22%20x%3D%22582.0%22%20y%3D%22406%22%20text-anchor%3D%22middle%22%3E567%20sq%20ft%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M120%20504V556M420%20504V556%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M120%20546H420%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M116%20550L124%20542%22/%3E%3Cpath%20d%3D%22M416%20550L424%20542%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%22270.0%22%20y%3D%22539%22%20text-anchor%3D%22middle%22%3E25%27-0%22%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M420%20504V556M744%20504V556%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M420%20546H744%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M416%20550L424%20542%22/%3E%3Cpath%20d%3D%22M740%20550L748%20542%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%22582.0%22%20y%3D%22539%22%20text-anchor%3D%22middle%22%3E27%27-0%22%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M120%20504V592M744%20504V592%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M120%20582H744%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M116%20586L124%20578%22/%3E%3Cpath%20d%3D%22M740%20586L748%20578%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%22432.0%22%20y%3D%22575%22%20text-anchor%3D%22middle%22%3E52%27-0%22%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M120%2096H74M120%20324H74%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M84%2096V324%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M80%20100L88%2092%22/%3E%3Cpath%20d%3D%22M80%20328L88%20320%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%2277%22%20y%3D%22210.0%22%20text-anchor%3D%22middle%22%20transform%3D%22rotate%28-90%2077%20210.0%29%22%3E19%27-0%22%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M120%20324H74M120%20504H74%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M84%20324V504%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M80%20328L88%20320%22/%3E%3Cpath%20d%3D%22M80%20508L88%20500%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%2277%22%20y%3D%22414.0%22%20text-anchor%3D%22middle%22%20transform%3D%22rotate%28-90%2077%20414.0%29%22%3E15%27-0%22%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M120%2096H36M120%20504H36%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M46%2096V504%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M42%20100L50%2092%22/%3E%3Cpath%20d%3D%22M42%20508L50%20500%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%2239%22%20y%3D%22300.0%22%20text-anchor%3D%22middle%22%20transform%3D%22rotate%28-90%2039%20300.0%29%22%3E34%27-0%22%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M744%2096H776M744%20252H776%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M786%2096V252%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M782%20100L790%2092%22/%3E%3Cpath%20d%3D%22M782%20256L790%20248%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%22779%22%20y%3D%22174.0%22%20text-anchor%3D%22middle%22%20transform%3D%22rotate%28-90%20779%20174.0%29%22%3E13%27-0%22%3C/text%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M744%20252H776M744%20504H776%22/%3E%3Cpath%20class%3D%22dim%22%20d%3D%22M786%20252V504%22/%3E%3Cg%20class%3D%22tick%22%3E%3Cpath%20d%3D%22M782%20256L790%20248%22/%3E%3Cpath%20d%3D%22M782%20508L790%20500%22/%3E%3C/g%3E%3Ctext%20class%3D%22fig%22%20x%3D%22779%22%20y%3D%22378.0%22%20text-anchor%3D%22middle%22%20transform%3D%22rotate%28-90%20779%20378.0%29%22%3E21%27-0%22%3C/text%3E%3Cg%20transform%3D%22translate%28120%2C620%29%22%3E%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%2260%22%20height%3D%228%22%20fill%3D%22%231C1917%22/%3E%3Crect%20x%3D%2260%22%20y%3D%220%22%20width%3D%2260%22%20height%3D%228%22%20fill%3D%22none%22%20stroke%3D%22%231C1917%22%20stroke-width%3D%221%22/%3E%3Crect%20x%3D%22120%22%20y%3D%220%22%20width%3D%2260%22%20height%3D%228%22%20fill%3D%22%231C1917%22/%3E%3Ctext%20class%3D%22note%22%20x%3D%220%22%20y%3D%2220%22%3E0%3C/text%3E%3Ctext%20class%3D%22note%22%20x%3D%22170%22%20y%3D%2220%22%3E15%27-0%22%3C/text%3E%3C/g%3E%3Ctext%20class%3D%22note%22%20x%3D%22330%22%20y%3D%22628%22%3ESCALE%201/4%26%238221%3B%20%3D%201%26%238217%3B-0%26%238221%3B%3C/text%3E%3Ctext%20class%3D%22note%22%20x%3D%22744%22%20y%3D%22628%22%20text-anchor%3D%22end%22%3EALL%20DIMENSIONS%20IN%20FEET%20AND%20INCHES%3C/text%3E%3Cg%20transform%3D%22translate%28730%2C606%29%22%3E%3Cpath%20d%3D%22M0%20-18L6%206L0%200L-6%206Z%22%20fill%3D%22%231C1917%22/%3E%3C/g%3E%3Cpath%20class%3D%22ext%22%20d%3D%22M120%20638H744%22/%3E%3Ctext%20class%3D%22tb%22%20x%3D%22120%22%20y%3D%22654%22%3EGROUND%20FLOOR%20PLAN%3C/text%3E%3Ctext%20class%3D%22tb%22%20x%3D%22744%22%20y%3D%22654%22%20text-anchor%3D%22end%22%3ESHEET%20A-101%20%26%23183%3B%20REV%20R1%3C/text%3E%3C/svg%3E',
        mimeType: 'image/svg+xml',
        sizeBytes: 2400,
        uploadedByUserId: 'u-1-pm',
        uploadedByName: 'Anita Deshmukh',
        timestamp: isoDaysFromNow(-26),
        notes: 'First issue for construction.',
        sheetWidthMm: 21336,
        sheetHeightMm: 17069,
      },
    ],
    sopSteps: [],
    documents: [],
    activity: [
      { id: 'a1', message: 'Invoice ABC-45 (₹6L) created for ABC Concrete', timestamp: new Date().toISOString(), entity: 'invoice'  },
      { id: 'a2', message: 'Task "Excavation — basement" marked 80%', timestamp: new Date().toISOString(), entity: 'task'  },
      { id: 'a3', message: 'Payment sent to GHI Electrical (GHI-21, NEFT)', timestamp: new Date().toISOString(), entity: 'invoice'  },
      { id: 'a4', message: 'Work order WO-010 completed by VWX Transport', timestamp: new Date().toISOString(), entity: 'workOrder'  },
      { id: 'a5', message: 'Vendor STU Finishing Works added', timestamp: new Date().toISOString(), entity: 'vendor'  },
    ],
    syncQueue: [],
  };
}
