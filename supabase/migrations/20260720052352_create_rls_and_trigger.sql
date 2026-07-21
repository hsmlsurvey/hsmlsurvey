/*
# Hamza Sugar Mills - RLS Policies & Auth Trigger

## Security
- Helper function `is_allowed(table_name, action)` checks the current user's app_users row permissions OR admin role.
- RLS policies on all data tables use is_allowed for granular per-table CRUD control.
- app_users: admin full CRUD; users read own row, update own row.
- app_settings: read for authenticated; write for admin only.
- Trigger auto-creates an app_users row (role=user) when a new auth.users row is created via Supabase signup.
*/

-- =========================================================
-- Helper function: is_allowed
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
              au.permissions->p_table->>p_action = 'true'
            )
          )
        )
    );
$$;

-- =========================================================
-- Trigger: auto-create app_users row on auth signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.app_users (id, email, name, role, status, is_active, permissions)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'user',
    'active',
    true,
    '{}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- Policies: zones
-- =========================================================
DROP POLICY IF EXISTS "zones_select_auth" ON public.zones;
CREATE POLICY "zones_select_auth" ON public.zones FOR SELECT
  TO authenticated USING (public.is_allowed('zones','view'));

DROP POLICY IF EXISTS "zones_insert_auth" ON public.zones;
CREATE POLICY "zones_insert_auth" ON public.zones FOR INSERT
  TO authenticated WITH CHECK (public.is_allowed('zones','insert'));

DROP POLICY IF EXISTS "zones_update_auth" ON public.zones;
CREATE POLICY "zones_update_auth" ON public.zones FOR UPDATE
  TO authenticated USING (public.is_allowed('zones','update'))
  WITH CHECK (public.is_allowed('zones','update'));

DROP POLICY IF EXISTS "zones_delete_auth" ON public.zones;
CREATE POLICY "zones_delete_auth" ON public.zones FOR DELETE
  TO authenticated USING (public.is_allowed('zones','delete'));

-- =========================================================
-- Policies: circles
-- =========================================================
DROP POLICY IF EXISTS "circles_select_auth" ON public.circles;
CREATE POLICY "circles_select_auth" ON public.circles FOR SELECT
  TO authenticated USING (public.is_allowed('circles','view'));

DROP POLICY IF EXISTS "circles_insert_auth" ON public.circles;
CREATE POLICY "circles_insert_auth" ON public.circles FOR INSERT
  TO authenticated WITH CHECK (public.is_allowed('circles','insert'));

DROP POLICY IF EXISTS "circles_update_auth" ON public.circles;
CREATE POLICY "circles_update_auth" ON public.circles FOR UPDATE
  TO authenticated USING (public.is_allowed('circles','update'))
  WITH CHECK (public.is_allowed('circles','update'));

DROP POLICY IF EXISTS "circles_delete_auth" ON public.circles;
CREATE POLICY "circles_delete_auth" ON public.circles FOR DELETE
  TO authenticated USING (public.is_allowed('circles','delete'));

-- =========================================================
-- Policies: mozas
-- =========================================================
DROP POLICY IF EXISTS "mozas_select_auth" ON public.mozas;
CREATE POLICY "mozas_select_auth" ON public.mozas FOR SELECT
  TO authenticated USING (public.is_allowed('mozas','view'));

DROP POLICY IF EXISTS "mozas_insert_auth" ON public.mozas;
CREATE POLICY "mozas_insert_auth" ON public.mozas FOR INSERT
  TO authenticated WITH CHECK (public.is_allowed('mozas','insert'));

DROP POLICY IF EXISTS "mozas_update_auth" ON public.mozas;
CREATE POLICY "mozas_update_auth" ON public.mozas FOR UPDATE
  TO authenticated USING (public.is_allowed('mozas','update'))
  WITH CHECK (public.is_allowed('mozas','update'));

DROP POLICY IF EXISTS "mozas_delete_auth" ON public.mozas;
CREATE POLICY "mozas_delete_auth" ON public.mozas FOR DELETE
  TO authenticated USING (public.is_allowed('mozas','delete'));

-- =========================================================
-- Policies: growers
-- =========================================================
DROP POLICY IF EXISTS "growers_select_auth" ON public.growers;
CREATE POLICY "growers_select_auth" ON public.growers FOR SELECT
  TO authenticated USING (public.is_allowed('growers','view'));

DROP POLICY IF EXISTS "growers_insert_auth" ON public.growers;
CREATE POLICY "growers_insert_auth" ON public.growers FOR INSERT
  TO authenticated WITH CHECK (public.is_allowed('growers','insert'));

DROP POLICY IF EXISTS "growers_update_auth" ON public.growers;
CREATE POLICY "growers_update_auth" ON public.growers FOR UPDATE
  TO authenticated USING (public.is_allowed('growers','update'))
  WITH CHECK (public.is_allowed('growers','update'));

DROP POLICY IF EXISTS "growers_delete_auth" ON public.growers;
CREATE POLICY "growers_delete_auth" ON public.growers FOR DELETE
  TO authenticated USING (public.is_allowed('growers','delete'));

-- =========================================================
-- Policies: passbook_entries
-- =========================================================
DROP POLICY IF EXISTS "pe_select_auth" ON public.passbook_entries;
CREATE POLICY "pe_select_auth" ON public.passbook_entries FOR SELECT
  TO authenticated USING (public.is_allowed('passbook_entries','view'));

DROP POLICY IF EXISTS "pe_insert_auth" ON public.passbook_entries;
CREATE POLICY "pe_insert_auth" ON public.passbook_entries FOR INSERT
  TO authenticated WITH CHECK (public.is_allowed('passbook_entries','insert'));

DROP POLICY IF EXISTS "pe_update_auth" ON public.passbook_entries;
CREATE POLICY "pe_update_auth" ON public.passbook_entries FOR UPDATE
  TO authenticated USING (public.is_allowed('passbook_entries','update'))
  WITH CHECK (public.is_allowed('passbook_entries','update'));

DROP POLICY IF EXISTS "pe_delete_auth" ON public.passbook_entries;
CREATE POLICY "pe_delete_auth" ON public.passbook_entries FOR DELETE
  TO authenticated USING (public.is_allowed('passbook_entries','delete'));

-- =========================================================
-- Policies: app_users
-- Admin: full CRUD. User: read own, update own.
-- =========================================================
DROP POLICY IF EXISTS "appusers_select_auth" ON public.app_users;
CREATE POLICY "appusers_select_auth" ON public.app_users FOR SELECT
  TO authenticated USING (
    public.is_allowed('app_users','view') OR auth.uid() = id
  );

DROP POLICY IF EXISTS "appusers_insert_auth" ON public.app_users;
CREATE POLICY "appusers_insert_auth" ON public.app_users FOR INSERT
  TO authenticated WITH CHECK (public.is_allowed('app_users','insert'));

DROP POLICY IF EXISTS "appusers_update_auth" ON public.app_users;
CREATE POLICY "appusers_update_auth" ON public.app_users FOR UPDATE
  TO authenticated USING (public.is_allowed('app_users','update') OR auth.uid() = id)
  WITH CHECK (public.is_allowed('app_users','update') OR auth.uid() = id);

DROP POLICY IF EXISTS "appusers_delete_auth" ON public.app_users;
CREATE POLICY "appusers_delete_auth" ON public.app_users FOR DELETE
  TO authenticated USING (public.is_allowed('app_users','delete'));

-- =========================================================
-- Policies: app_settings
-- =========================================================
DROP POLICY IF EXISTS "settings_select_auth" ON public.app_settings;
CREATE POLICY "settings_select_auth" ON public.app_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_update_auth" ON public.app_settings;
CREATE POLICY "settings_update_auth" ON public.app_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "settings_insert_auth" ON public.app_settings;
CREATE POLICY "settings_insert_auth" ON public.app_settings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  );
