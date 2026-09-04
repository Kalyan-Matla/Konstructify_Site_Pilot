-- ═══════════════════════════════════════════════════════════════════
-- 004 · Business records. Every table carries account_id and the
--       standard columns, and every money column is integer paise.
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE vendor_category  AS ENUM ('material', 'service', 'labor', 'equipment');
CREATE TYPE payment_terms    AS ENUM ('COD', '7-day', '14-day', '30-day');
CREATE TYPE invoice_status   AS ENUM ('unpaid', 'payment-sent', 'paid');
CREATE TYPE payment_mode     AS ENUM ('NEFT', 'RTGS', 'Cheque');
CREATE TYPE task_status      AS ENUM ('pending', 'in-progress', 'complete');
CREATE TYPE priority         AS ENUM ('High', 'Medium', 'Low');
CREATE TYPE zone_level       AS ENUM ('floor', 'room', 'element');
CREATE TYPE sop_step_status  AS ENUM ('not-started', 'in-progress', 'done', 'not-applicable');
CREATE TYPE document_kind    AS ENUM ('permit', 'noc', 'sanction', 'drawing', 'other');
CREATE TYPE discipline       AS ENUM ('architectural', 'structural', 'mep', '3d', 'other');

CREATE TABLE vendor (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL REFERENCES account(id),
  name              text NOT NULL,
  phone             text NOT NULL,
  email             text NOT NULL DEFAULT '',
  category          vendor_category NOT NULL,
  gst_id            text NOT NULL DEFAULT '',
  bank_account      text NOT NULL DEFAULT '',
  bank_ifsc         text NOT NULL DEFAULT '',
  credit_limit_paise bigint NOT NULL CHECK (credit_limit_paise >= 0),
  payment_terms     payment_terms NOT NULL,
  rating_quality    numeric(2,1) NOT NULL DEFAULT 4.0,
  rating_delivery   numeric(2,1) NOT NULL DEFAULT 4.0,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE budget_item (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid NOT NULL REFERENCES account(id),
  project_id   uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  description  text NOT NULL,
  -- A measured decimal, deliberately NOT money.
  quantity     numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit         text NOT NULL,
  unit_rate_paise    bigint NOT NULL CHECK (unit_rate_paise >= 0),
  actual_spend_paise bigint NOT NULL DEFAULT 0 CHECK (actual_spend_paise >= 0),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE invoice (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     uuid NOT NULL REFERENCES account(id),
  vendor_id      uuid NOT NULL REFERENCES vendor(id),
  project_id     uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_date   date NOT NULL,
  due_date       date NOT NULL,
  amount_paise   bigint NOT NULL CHECK (amount_paise > 0),
  status         invoice_status NOT NULL DEFAULT 'unpaid',
  payment_mode   payment_mode,
  payment_date   date,
  notes          text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
  deleted_at timestamptz,

  -- An unpaid invoice cannot carry settlement details, and a settled one
  -- must. Enforced here so no code path can produce a half-paid record.
  CONSTRAINT invoice_settlement_coherent CHECK (
    (status = 'unpaid'  AND payment_mode IS NULL AND payment_date IS NULL)
    OR (status <> 'unpaid' AND payment_mode IS NOT NULL)
  )
);

CREATE TABLE zone (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES account(id),
  project_id  uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES zone(id) ON DELETE CASCADE,
  level       zone_level NOT NULL,
  name        text NOT NULL,
  drawing_id  uuid,
  -- Fractions of the sheet, so a re-export at another resolution keeps them.
  outline     jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE work_task (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     uuid NOT NULL REFERENCES account(id),
  project_id     uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name           text NOT NULL,
  description    text NOT NULL DEFAULT '',
  phase          text NOT NULL,
  assigned_to    text NOT NULL,
  status         task_status NOT NULL DEFAULT 'pending',
  due_date       date NOT NULL,
  percent_complete smallint NOT NULL DEFAULT 0
    CHECK (percent_complete BETWEEN 0 AND 100),
  -- Null is allowed and meaningful: the task is excluded from weighted
  -- progress and reported as unlinked rather than silently averaged in.
  budget_item_id uuid REFERENCES budget_item(id) ON DELETE SET NULL,
  zone_id        uuid REFERENCES zone(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE work_order (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid NOT NULL REFERENCES account(id),
  project_id   uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  task_name    text NOT NULL,
  description  text NOT NULL DEFAULT '',
  assignee     text NOT NULL,
  priority     priority NOT NULL DEFAULT 'Medium',
  due_date     date NOT NULL,
  status       task_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
  deleted_at timestamptz,
  -- Order numbers are quoted in correspondence; two live ones on a project
  -- is a real-world ambiguity, not just untidy data.
  CONSTRAINT work_order_number_unique UNIQUE (project_id, order_number)
);

CREATE TABLE drawing (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES account(id),
  project_id    uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  sheet_number  text NOT NULL,
  title         text NOT NULL,
  discipline    discipline NOT NULL DEFAULT 'architectural',
  revision      text NOT NULL,
  supersedes_id uuid REFERENCES drawing(id),
  is_current    boolean NOT NULL DEFAULT true,
  storage_key   text NOT NULL,
  mime_type     text NOT NULL,
  size_bytes    bigint NOT NULL,
  notes         text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
  deleted_at timestamptz
);

-- The register's whole reason for existing, enforced by the database:
-- exactly one current revision per sheet. Two would make an old print look
-- authoritative, which is how the wrong thing gets built.
CREATE UNIQUE INDEX drawing_one_current_per_sheet
  ON drawing (project_id, sheet_number)
  WHERE is_current AND deleted_at IS NULL;

ALTER TABLE zone
  ADD CONSTRAINT zone_drawing_fk FOREIGN KEY (drawing_id) REFERENCES drawing(id);

CREATE TABLE project_photo (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES account(id),
  project_id  uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  task_id     uuid REFERENCES work_task(id) ON DELETE SET NULL,
  zone_id     uuid REFERENCES zone(id) ON DELETE SET NULL,
  storage_key text NOT NULL,
  caption     text NOT NULL DEFAULT '',
  -- A client's photo of a defect must stay attributable, so this is not null.
  uploaded_by uuid NOT NULL REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE project_document (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES account(id),
  project_id  uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name        text NOT NULL,
  kind        document_kind NOT NULL DEFAULT 'other',
  storage_key text NOT NULL,
  mime_type   text NOT NULL,
  size_bytes  bigint NOT NULL,
  -- Permits lapse, and an expired one is worse than a missing one because
  -- it looks satisfied.
  expires_on  date,
  uploaded_by uuid NOT NULL REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE sop_step_state (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES account(id),
  project_id  uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  -- Keys into the checklist template in application code, and survives the
  -- template being reworded.
  step_key    text NOT NULL,
  status      sop_step_status NOT NULL DEFAULT 'not-started',
  document_id uuid REFERENCES project_document(id) ON DELETE SET NULL,
  note        text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
  deleted_at timestamptz,
  CONSTRAINT sop_step_once_per_project UNIQUE (project_id, step_key)
);

-- Indexes on the two columns every RLS policy and query filters by.
CREATE INDEX vendor_account_idx        ON vendor (account_id)        WHERE deleted_at IS NULL;
CREATE INDEX budget_item_project_idx   ON budget_item (project_id)   WHERE deleted_at IS NULL;
CREATE INDEX invoice_project_idx       ON invoice (project_id)       WHERE deleted_at IS NULL;
CREATE INDEX invoice_vendor_idx        ON invoice (vendor_id)        WHERE deleted_at IS NULL;
CREATE INDEX zone_project_idx          ON zone (project_id)          WHERE deleted_at IS NULL;
CREATE INDEX work_task_project_idx     ON work_task (project_id)     WHERE deleted_at IS NULL;
CREATE INDEX work_order_project_idx    ON work_order (project_id)    WHERE deleted_at IS NULL;
CREATE INDEX drawing_project_idx       ON drawing (project_id)       WHERE deleted_at IS NULL;
CREATE INDEX photo_project_idx         ON project_photo (project_id) WHERE deleted_at IS NULL;
CREATE INDEX document_project_idx      ON project_document (project_id) WHERE deleted_at IS NULL;
CREATE INDEX sop_project_idx           ON sop_step_state (project_id) WHERE deleted_at IS NULL;
