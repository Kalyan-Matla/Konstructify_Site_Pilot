import type { Jurisdiction, Project } from '../types';

/**
 * Approval routes as DATA, versioned and dated.
 *
 * Two things make this content different from the rest of the app.
 *
 * It goes stale. Permit rules change, and a checklist that confidently
 * states a wrong step is worse than no checklist at all — someone builds
 * unauthorised on the strength of it. Every template therefore carries a
 * `lastReviewed` date and a source, both shown on screen, and every route
 * ends with the instruction to confirm with the local authority.
 *
 * And it is jurisdiction-specific. There is no national SOP for private
 * construction in India: the same house needs a different set of approvals
 * depending on the city. Telangana is authored here; every other state is
 * refused rather than quietly given Telangana's path, because a Karnataka
 * owner following a Telangana checklist is worse off than one following
 * none.
 */

export type SopTier = 'registration' | 'instant-approval' | 'single-window' | 'cpwd';

export interface SopStepTemplate {
  /** Stable across rewordings — the per-project state keys off this. */
  key: string;
  title: string;
  detail: string;
  /** Who actually grants it. Naming the body is most of the value. */
  authority: string;
  /** What document proves the step, or null where nothing is issued. */
  documentLabel: string | null;
}

export interface SopTemplate {
  tier: SopTier;
  jurisdiction: Jurisdiction;
  label: string;
  summary: string;
  /** Shown on screen. Content this consequential should not look timeless. */
  lastReviewed: string;
  sourceLabel: string;
  sourceUrl: string;
  steps: SopStepTemplate[];
}

/** 75 square yards, the TS-bPASS registration threshold, in square metres. */
export const REGISTRATION_LIMIT_SQM = 62.7;
/** Instant self-certified approval holds to 500 m² and 10 m. */
export const INSTANT_LIMIT_SQM = 500;
export const INSTANT_LIMIT_HEIGHT_M = 10;

// ── Shared step definitions ──────────────────────────────────────────
// Several routes need the same real-world step. Defining each once keeps
// the wording identical wherever it appears.

const TITLE_CHECK: SopStepTemplate = {
  key: 'title-landuse',
  title: 'Confirm title and land use',
  detail:
    'Sale deed and encumbrance certificate in order, and the plot zoned for what you intend to build. Everything downstream depends on this being right.',
  authority: 'Sub-Registrar · Town and Country Planning',
  documentLabel: 'Sale deed and EC',
};

const BOREWELL: SopStepTemplate = {
  key: 'borewell-walta',
  title: 'Borewell permission under WALTA',
  detail:
    'Online registration and MRO permission are both mandatory. Past 120 m in a notified zone the Ground Water Department must give technical clearance — the geologist review people expect at this step.',
  authority: 'Mandal Revenue Officer · Ground Water Department',
  documentLabel: 'WALTA permission',
};

const SAND: SopStepTemplate = {
  key: 'sand-gravel',
  title: 'Source sand and gravel against transit permits',
  detail:
    'Material moved without a valid transit permit is the most common quiet compliance failure on a small site, and it is the contractor who carries it.',
  authority: 'Mines and Geology Department',
  documentLabel: 'Transit permits',
};

const POWER: SopStepTemplate = {
  key: 'electricity',
  title: 'Construction power, then permanent supply',
  detail:
    'Temporary supply for the build, converted to a permanent connection before handover. Applied through the DISCOM for your district.',
  authority: 'TGSPDCL or TGNPDCL',
  documentLabel: 'Service connection order',
};

const SETTING_OUT: SopStepTemplate = {
  key: 'setting-out',
  title: 'Setting-out survey and foundation',
  detail:
    'A surveyor marks the building line against the sanctioned drawing; footing and plinth follow. The first work that appears on the coloured drawing.',
  authority: 'Licensed surveyor',
  documentLabel: 'Setting-out report',
};

const SUPERSTRUCTURE: SopStepTemplate = {
  key: 'superstructure',
  title: 'Structure, envelope and services',
  detail:
    'Columns, slabs, walls, MEP rough-in and finishes, each mapped to a zone so progress is visible per floor, room and element.',
  authority: 'Site team',
  documentLabel: null,
};

const OCCUPANCY: SopStepTemplate = {
  key: 'occupancy',
  title: 'Occupancy certificate',
  detail:
    'The step most often skipped, and the one that makes the building legally habitable, insurable and sellable. Chase it while the team is still mobilised.',
  authority: 'Municipal Corporation or Panchayat',
  documentLabel: 'Occupancy certificate',
};

// ── Telangana routes ─────────────────────────────────────────────────

const TELANGANA_REVIEW = {
  lastReviewed: '2026-08-18',
  sourceLabel: 'TS-bPASS Act, 2020',
  sourceUrl: 'https://www.indiacode.nic.in/bitstream/123456789/16241/1/act_no_12_of_2020.pdf',
};

const REGISTRATION: SopTemplate = {
  tier: 'registration',
  jurisdiction: 'telangana',
  label: 'Registration only',
  summary:
    'Plots up to 75 sq yd need no building permission — only online registration. The utilities and construction steps still apply.',
  ...TELANGANA_REVIEW,
  steps: [
    TITLE_CHECK,
    {
      key: 'bpass-registration',
      title: 'Register the plot on TS-bPASS',
      detail:
        'No permission is required at this size, but registration is, and skipping it leaves the building unrecorded.',
      authority: 'TS-bPASS portal',
      documentLabel: 'Registration acknowledgement',
    },
    BOREWELL,
    POWER,
    SUPERSTRUCTURE,
  ],
};

const INSTANT_APPROVAL: SopTemplate = {
  tier: 'instant-approval',
  jurisdiction: 'telangana',
  label: 'Instant approval — self-certified',
  summary:
    'Up to 500 m² and 10 m, approval is issued on submission against your own certification. The liability that carries is personal.',
  ...TELANGANA_REVIEW,
  steps: [
    TITLE_CHECK,
    {
      key: 'drawings-byelaws',
      title: 'Prepare drawings to the local bye-laws',
      detail:
        'Setbacks, FAR and height per the sanctioned land use. This drawing later becomes the base for coloured progress.',
      authority: 'Licensed architect or engineer',
      documentLabel: 'Sanctioned drawing set',
    },
    {
      key: 'bpass-instant',
      title: 'Apply on TS-bPASS with self-certification',
      detail:
        'Apply, upload, pay — permission issues immediately. You are personally accountable for the declaration, so have the drawings checked before you sign, not after.',
      authority: 'TS-bPASS portal',
      documentLabel: 'Building permission',
    },
    BOREWELL,
    SAND,
    POWER,
    SETTING_OUT,
    SUPERSTRUCTURE,
    OCCUPANCY,
  ],
};

const SINGLE_WINDOW: SopTemplate = {
  tier: 'single-window',
  jurisdiction: 'telangana',
  label: 'Single window',
  summary:
    'Above 10 m, or any non-residential building. Sanctioned within 21 days, but through several authorities rather than one declaration.',
  ...TELANGANA_REVIEW,
  steps: [
    TITLE_CHECK,
    {
      key: 'drawings-byelaws',
      title: 'Prepare drawings to the local bye-laws',
      detail:
        'Setbacks, FAR, height against road width, and parking per the local development control rules.',
      authority: 'Licensed architect',
      documentLabel: 'Drawing set',
    },
    {
      key: 'structural-design',
      title: 'Structural design and stability certificate',
      detail:
        'Required at this scale, and the certificate has a named engineer behind it who carries the design.',
      authority: 'Structural engineer',
      documentLabel: 'Stability certificate',
    },
    {
      key: 'fire-noc',
      title: 'Fire services NOC',
      detail:
        'Applies above the height threshold and to non-residential occupancies. Sought early — it constrains the layout, so late changes are expensive.',
      authority: 'Telangana State Disaster Response and Fire Services',
      documentLabel: 'Fire NOC',
    },
    {
      key: 'environment-clearance',
      title: 'Environmental clearance, where applicable',
      detail:
        'Triggered by built-up area thresholds. Confirm applicability before assuming it is not needed.',
      authority: 'State Environment Impact Assessment Authority',
      documentLabel: 'Clearance letter',
    },
    {
      key: 'bpass-single-window',
      title: 'Apply on TS-bPASS single window',
      detail:
        'One application routed to every department that must clear it, sanctioned in 21 days.',
      authority: 'TS-bPASS portal',
      documentLabel: 'Building permission',
    },
    {
      key: 'rera',
      title: 'RERA registration, if units will be sold',
      detail:
        'Required before any marketing or booking of units. Selling ahead of registration is the expensive mistake here.',
      authority: 'Telangana RERA',
      documentLabel: 'RERA registration',
    },
    BOREWELL,
    SAND,
    POWER,
    SETTING_OUT,
    {
      key: 'lift-noc',
      title: 'Lift and escalator permission',
      detail: 'Applied for during structure so it does not hold up handover.',
      authority: 'Electrical Inspectorate',
      documentLabel: 'Lift permission',
    },
    SUPERSTRUCTURE,
    OCCUPANCY,
  ],
};

// ── Government route ─────────────────────────────────────────────────

const CPWD: SopTemplate = {
  tier: 'cpwd',
  jurisdiction: 'cpwd',
  label: 'Government works',
  summary:
    'The CPWD Works Manual chain, adopted by most central departments and PSUs. The first four stages happen before any contractor is on site.',
  lastReviewed: '2026-08-18',
  sourceLabel: 'CPWD Works Manual',
  sourceUrl: 'https://cpwd.gov.in/WriteReadData/man_cir/38259E.pdf',
  steps: [
    {
      key: 'admin-approval',
      title: 'Administrative Approval',
      detail: 'The department sanctions the work in principle, against a defined scope.',
      authority: 'Administrative department',
      documentLabel: 'AA letter',
    },
    {
      key: 'expenditure-sanction',
      title: 'Expenditure Sanction',
      detail: 'Funds committed against a head of account. Work cannot begin without it.',
      authority: 'Competent financial authority',
      documentLabel: 'Sanction order',
    },
    {
      key: 'technical-sanction',
      title: 'Technical Sanction',
      detail:
        'The detailed estimate approved against drawings and specifications by an authority competent for that value.',
      authority: 'Engineer-in-charge',
      documentLabel: 'TS estimate',
    },
    {
      key: 'tender',
      title: 'e-Tender and award',
      detail:
        'NIT, bid submission and opening on the e-procurement portal. Officials involved need valid digital signatures before the dates are set.',
      authority: 'Tender accepting authority',
      documentLabel: 'NIT and comparative statement',
    },
    {
      key: 'work-order',
      title: 'Work order',
      detail:
        'Scope, rates, measurement rules, retention terms and the deduction schedule agreed in writing.',
      authority: 'Executing division',
      documentLabel: 'Work order',
    },
    {
      key: 'measurement-book',
      title: 'Measurement Book',
      detail:
        'Physical measurement of work done, recorded as it happens. The legal basis for every payment that follows.',
      authority: 'Engineer-in-charge',
      documentLabel: 'MB entries',
    },
    {
      key: 'ra-bills',
      title: 'RA bills and statutory deductions',
      detail:
        'Running-account bills with security deposit, retention, income-tax TDS, GST TDS and labour cess withheld per the contract.',
      authority: 'Division office',
      documentLabel: 'RA bill',
    },
    {
      key: 'completion',
      title: 'Completion certificate and DLP',
      detail:
        'Completion recorded, then retention released after the defect liability period and a formal inspection.',
      authority: 'Engineer-in-charge',
      documentLabel: 'Completion certificate',
    },
  ],
};

const TEMPLATES: SopTemplate[] = [REGISTRATION, INSTANT_APPROVAL, SINGLE_WINDOW, CPWD];

/**
 * Which approval route a project follows.
 *
 * Government work follows the CPWD chain regardless of size. Private work
 * in Telangana is tiered by plot area and height, and the tier is decided
 * once at project creation because it changes what the whole build has to
 * do — discovering it late is how a project ends up mid-construction on
 * the wrong permission.
 *
 * Missing measurements fall to the strictest route rather than the most
 * convenient one: an unmeasured project is not evidence of a small one.
 */
export function resolveTier(project: Project): SopTier {
  if (project.type === 'government') return 'cpwd';

  const { plotAreaSqm, buildingHeightM } = project;
  if (plotAreaSqm === null) return 'single-window';
  if (plotAreaSqm <= REGISTRATION_LIMIT_SQM) return 'registration';
  if (plotAreaSqm <= INSTANT_LIMIT_SQM && (buildingHeightM ?? Infinity) <= INSTANT_LIMIT_HEIGHT_M) {
    return 'instant-approval';
  }
  return 'single-window';
}

/** The route itself, or null where the jurisdiction has not been authored. */
export function templateFor(project: Project): SopTemplate | null {
  const tier = resolveTier(project);
  return TEMPLATES.find((t) => t.tier === tier && t.jurisdiction === project.jurisdiction) ?? null;
}

export function templateByTier(tier: SopTier): SopTemplate | undefined {
  return TEMPLATES.find((t) => t.tier === tier);
}

/** Progress across a route. `not-applicable` counts as settled — a project
 *  with no borewell has genuinely dealt with that step. */
export function sopProgress(
  template: SopTemplate,
  states: Array<{ stepKey: string; status: string }>,
): { settled: number; total: number; percent: number } {
  const byKey = new Map(states.map((s) => [s.stepKey, s.status]));
  const settled = template.steps.filter((s) => {
    const st = byKey.get(s.key);
    return st === 'done' || st === 'not-applicable';
  }).length;
  const total = template.steps.length;
  return { settled, total, percent: total > 0 ? (settled / total) * 100 : 0 };
}
