/*
# Hamza Sugar Mills - Core Schema (Tables)

## Overview
Full schema for the Hamza Sugar Mills grower management system. Supports zones -> circles -> mozas -> growers hierarchy, passbook records with variety/non-variety mondha & sanma figures, app users with 3 roles (admin/moderator/user) and granular per-table permissions.

## New Tables
1. `zones` - Top-level geographic zones (Zone#, Zone Type)
2. `circles` - Circles within zones (Circle name)
3. `mozas` - Mozas within circles (Moza name)
4. `growers` - Grower master records (Passbook#, Name, Father, CNIC, Cell, Bank, Transport)
5. `passbook_entries` - Per-moza grower entries with acre + variety/non-variety mondha/sanma figures
6. `app_users` - Application user profiles mirroring auth.users with role + permissions + status
7. `app_settings` - Key/value app settings (e.g. admin whatsapp link)

## Notes
- Permissions stored as JSONB object with keys per table: {zones:{view,insert,update,delete}, ...}. Admin always allowed via role check.
- RLS policies added in a follow-up migration after the is_allowed helper function is created.
*/

-- =========================================================
-- zones
-- =========================================================
CREATE TABLE IF NOT EXISTS public.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_number text NOT NULL,
  zone_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- circles
-- =========================================================
CREATE TABLE IF NOT EXISTS public.circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  circle_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- mozas
-- =========================================================
CREATE TABLE IF NOT EXISTS public.mozas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  moza_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.mozas ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- growers (master record per passbook#)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.growers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passbook_number text NOT NULL,
  grower_name text NOT NULL,
  father_name text,
  cnic text,
  cell text,
  bank_title text,
  bank_account text,
  transport_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.growers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_growers_passbook ON public.growers (passbook_number);
CREATE INDEX IF NOT EXISTS idx_growers_cnic ON public.growers (cnic);

-- =========================================================
-- passbook_entries (per moza entry for a grower)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.passbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grower_id uuid NOT NULL REFERENCES public.growers(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL,
  circle_id uuid REFERENCES public.circles(id) ON DELETE SET NULL,
  moza_id uuid REFERENCES public.mozas(id) ON DELETE SET NULL,
  survey text,
  variety_mondha numeric(12,2) DEFAULT 0,
  variety_sanma numeric(12,2) DEFAULT 0,
  non_variety_mondha numeric(12,2) DEFAULT 0,
  non_variety_sanma numeric(12,2) DEFAULT 0,
  total_acre numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.passbook_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_pe_grower ON public.passbook_entries (grower_id);
CREATE INDEX IF NOT EXISTS idx_pe_zone ON public.passbook_entries (zone_id);
CREATE INDEX IF NOT EXISTS idx_pe_circle ON public.passbook_entries (circle_id);
CREATE INDEX IF NOT EXISTS idx_pe_moza ON public.passbook_entries (moza_id);

-- =========================================================
-- app_users (profile mirroring auth.users)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin','moderator','user')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  is_active boolean NOT NULL DEFAULT true,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- app_settings (key/value)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_zones_updated ON public.zones;
CREATE TRIGGER trg_zones_updated BEFORE UPDATE ON public.zones
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_circles_updated ON public.circles;
CREATE TRIGGER trg_circles_updated BEFORE UPDATE ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_mozas_updated ON public.mozas;
CREATE TRIGGER trg_mozas_updated BEFORE UPDATE ON public.mozas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_growers_updated ON public.growers;
CREATE TRIGGER trg_growers_updated BEFORE UPDATE ON public.growers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_pe_updated ON public.passbook_entries;
CREATE TRIGGER trg_pe_updated BEFORE UPDATE ON public.passbook_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_appusers_updated ON public.app_users;
CREATE TRIGGER trg_appusers_updated BEFORE UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated ON public.app_settings;
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- Seed default setting: admin whatsapp link
-- =========================================================
INSERT INTO public.app_settings (key, value)
VALUES ('admin_whatsapp_link', 'https://wa.me/0000000000')
ON CONFLICT (key) DO NOTHING;
