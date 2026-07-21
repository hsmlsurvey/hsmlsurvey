/*
# Split Zones into Zone Numbers + Zone Types, and add Role-Based Permissions

## Changes
1. Create `zone_numbers` table (id, zone_number) — separate management of Zone #
2. Create `zone_types` table (id, zone_type) — separate management of Zone Type
3. Migrate existing zone data into the two new tables
4. Alter `circles`: replace zone_id with zone_number_id + zone_type_id
5. Alter `passbook_entries`: replace zone_id with zone_number_id + zone_type_id
6. Drop old `zones` table (data preserved in new tables)
7. Create `role_permissions` table for role-based (admin/moderator/user) permissions
8. Update `is_allowed` to check role_permissions instead of per-user permissions
9. RLS policies on new tables
*/

-- =========================================================
-- zone_numbers
-- =========================================================
CREATE TABLE IF NOT EXISTS public.zone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_number text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.zone_numbers ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_zone_numbers_updated ON public.zone_numbers;
CREATE TRIGGER trg_zone_numbers_updated BEFORE UPDATE ON public.zone_numbers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- zone_types
-- =========================================================
CREATE TABLE IF NOT EXISTS public.zone_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_type text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.zone_types ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_zone_types_updated ON public.zone_types;
CREATE TRIGGER trg_zone_types_updated BEFORE UPDATE ON public.zone_types
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- Migrate existing zone data
-- =========================================================
INSERT INTO public.zone_numbers (zone_number)
  SELECT DISTINCT zone_number FROM public.zones
  ON CONFLICT (zone_number) DO NOTHING;

INSERT INTO public.zone_types (zone_type)
  SELECT DISTINCT zone_type FROM public.zones
  ON CONFLICT (zone_type) DO NOTHING;

-- =========================================================
-- Alter circles: add zone_number_id + zone_type_id, migrate, drop zone_id
-- =========================================================
ALTER TABLE public.circles ADD COLUMN IF NOT EXISTS zone_number_id uuid;
ALTER TABLE public.circles ADD COLUMN IF NOT EXISTS zone_type_id uuid;

-- Migrate circle FKs from zones to zone_numbers/zone_types
UPDATE public.circles c
SET
  zone_number_id = zn.id,
  zone_type_id = zt.id
FROM public.zones z
JOIN public.zone_numbers zn ON zn.zone_number = z.zone_number
JOIN public.zone_types zt ON zt.zone_type = z.zone_type
WHERE c.zone_id = z.id;

-- Add FK constraints
ALTER TABLE public.circles
  ADD CONSTRAINT circles_zone_number_fk FOREIGN KEY (zone_number_id)
    REFERENCES public.zone_numbers(id) ON DELETE SET NULL;
ALTER TABLE public.circles
  ADD CONSTRAINT circles_zone_type_fk FOREIGN KEY (zone_type_id)
    REFERENCES public.zone_types(id) ON DELETE SET NULL;

-- Drop old FK and column
ALTER TABLE public.circles DROP CONSTRAINT IF EXISTS circles_zone_id_fkey;
ALTER TABLE public.circles DROP COLUMN IF EXISTS zone_id;

CREATE INDEX IF NOT EXISTS idx_circles_zone_number ON public.circles (zone_number_id);
CREATE INDEX IF NOT EXISTS idx_circles_zone_type ON public.circles (zone_type_id);

-- =========================================================
-- Alter passbook_entries: add zone_number_id + zone_type_id, migrate, drop zone_id
-- =========================================================
ALTER TABLE public.passbook_entries ADD COLUMN IF NOT EXISTS zone_number_id uuid;
ALTER TABLE public.passbook_entries ADD COLUMN IF NOT EXISTS zone_type_id uuid;

UPDATE public.passbook_entries pe
SET
  zone_number_id = zn.id,
  zone_type_id = zt.id
FROM public.zones z
JOIN public.zone_numbers zn ON zn.zone_number = z.zone_number
JOIN public.zone_types zt ON zt.zone_type = z.zone_type
WHERE pe.zone_id = z.id;

ALTER TABLE public.passbook_entries
  ADD CONSTRAINT pe_zone_number_fk FOREIGN KEY (zone_number_id)
    REFERENCES public.zone_numbers(id) ON DELETE SET NULL;
ALTER TABLE public.passbook_entries
  ADD CONSTRAINT pe_zone_type_fk FOREIGN KEY (zone_type_id)
    REFERENCES public.zone_types(id) ON DELETE SET NULL;

ALTER TABLE public.passbook_entries DROP CONSTRAINT IF EXISTS passbook_entries_zone_id_fkey;
ALTER TABLE public.passbook_entries DROP COLUMN IF EXISTS zone_id;

CREATE INDEX IF NOT EXISTS idx_pe_zone_number ON public.passbook_entries (zone_number_id);
CREATE INDEX IF NOT EXISTS idx_pe_zone_type ON public.passbook_entries (zone_type_id);

-- =========================================================
-- Drop old zones table
-- =========================================================
DROP TABLE IF EXISTS public.zones CASCADE;

-- =========================================================
-- RLS policies: zone_numbers
-- =========================================================
DROP POLICY IF EXISTS "zone_numbers_select" ON public.zone_numbers;
CREATE POLICY "zone_numbers_select" ON public.zone_numbers FOR SELECT
  TO authenticated USING (public.is_allowed('zone_numbers','view'));

DROP POLICY IF EXISTS "zone_numbers_insert" ON public.zone_numbers;
CREATE POLICY "zone_numbers_insert" ON public.zone_numbers FOR INSERT
  TO authenticated WITH CHECK (public.is_allowed('zone_numbers','insert'));

DROP POLICY IF EXISTS "zone_numbers_update" ON public.zone_numbers;
CREATE POLICY "zone_numbers_update" ON public.zone_numbers FOR UPDATE
  TO authenticated USING (public.is_allowed('zone_numbers','update'))
  WITH CHECK (public.is_allowed('zone_numbers','update'));

DROP POLICY IF EXISTS "zone_numbers_delete" ON public.zone_numbers;
CREATE POLICY "zone_numbers_delete" ON public.zone_numbers FOR DELETE
  TO authenticated USING (public.is_allowed('zone_numbers','delete'));

-- =========================================================
-- RLS policies: zone_types
-- =========================================================
DROP POLICY IF EXISTS "zone_types_select" ON public.zone_types;
CREATE POLICY "zone_types_select" ON public.zone_types FOR SELECT
  TO authenticated USING (public.is_allowed('zone_types','view'));

DROP POLICY IF EXISTS "zone_types_insert" ON public.zone_types;
CREATE POLICY "zone_types_insert" ON public.zone_types FOR INSERT
  TO authenticated WITH CHECK (public.is_allowed('zone_types','insert'));

DROP POLICY IF EXISTS "zone_types_update" ON public.zone_types;
CREATE POLICY "zone_types_update" ON public.zone_types FOR UPDATE
  TO authenticated USING (public.is_allowed('zone_types','update'))
  WITH CHECK (public.is_allowed('zone_types','update'));

DROP POLICY IF EXISTS "zone_types_delete" ON public.zone_types;
CREATE POLICY "zone_types_delete" ON public.zone_types FOR DELETE
  TO authenticated USING (public.is_allowed('zone_types','delete'));

-- =========================================================
-- role_permissions table (role-based, not per-user)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role text PRIMARY KEY CHECK (role IN ('admin','moderator','user')),
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_role_perms_updated ON public.role_permissions;
CREATE TRIGGER trg_role_perms_updated BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed: admin = full, moderator = view-only by default, user = view-only by default
INSERT INTO public.role_permissions (role, permissions) VALUES
  ('admin', '{"zone_numbers":{"view":true,"insert":true,"update":true,"delete":true},"zone_types":{"view":true,"insert":true,"update":true,"delete":true},"circles":{"view":true,"insert":true,"update":true,"delete":true},"mozas":{"view":true,"insert":true,"update":true,"delete":true},"growers":{"view":true,"insert":true,"update":true,"delete":true},"passbook_entries":{"view":true,"insert":true,"update":true,"delete":true},"app_users":{"view":true,"insert":true,"update":true,"delete":true}}'::jsonb),
  ('moderator', '{"zone_numbers":{"view":true,"insert":false,"update":false,"delete":false},"zone_types":{"view":true,"insert":false,"update":false,"delete":false},"circles":{"view":true,"insert":false,"update":true,"delete":false},"mozas":{"view":true,"insert":false,"update":true,"delete":false},"growers":{"view":true,"insert":false,"update":true,"delete":false},"passbook_entries":{"view":true,"insert":true,"update":true,"delete":false},"app_users":{"view":false,"insert":false,"update":false,"delete":false}}'::jsonb),
  ('user', '{"zone_numbers":{"view":true,"insert":false,"update":false,"delete":false},"zone_types":{"view":true,"insert":false,"update":false,"delete":false},"circles":{"view":true,"insert":false,"update":false,"delete":false},"mozas":{"view":true,"insert":false,"update":false,"delete":false},"growers":{"view":true,"insert":false,"update":false,"delete":false},"passbook_entries":{"view":true,"insert":false,"update":false,"delete":false},"app_users":{"view":false,"insert":false,"update":false,"delete":false}}'::jsonb)
ON CONFLICT (role) DO NOTHING;

-- RLS: admin can CRUD role_permissions, others can read (to check their own permissions)
DROP POLICY IF EXISTS "role_perms_select" ON public.role_permissions;
CREATE POLICY "role_perms_select" ON public.role_permissions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "role_perms_update" ON public.role_permissions;
CREATE POLICY "role_perms_update" ON public.role_permissions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "role_perms_insert" ON public.role_permissions;
CREATE POLICY "role_perms_insert" ON public.role_permissions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "role_perms_delete" ON public.role_permissions;
CREATE POLICY "role_perms_delete" ON public.role_permissions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  );

-- =========================================================
-- Update is_allowed to use role_permissions
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_allowed(p_table text, p_action text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.app_users au
      WHERE au.id = auth.uid()
        AND (
          au.role = 'admin'
          OR (
            au.status = 'active'
            AND au.is_active = true
            AND (
              SELECT (rp.permissions->p_table->>p_action)::boolean
              FROM public.role_permissions rp
              WHERE rp.role = au.role
              LIMIT 1
            ) IS TRUE
          )
        )
    );
$$;
