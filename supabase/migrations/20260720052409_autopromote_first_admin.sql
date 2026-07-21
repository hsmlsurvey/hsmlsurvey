/*
# Auto-promote first user to admin

## Change
- Updates handle_new_user trigger so that if no admin exists in app_users, the first signup becomes admin with full permissions.
- Otherwise new signups remain role='user' with empty permissions.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_count int;
  has_admin boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.app_users WHERE role = 'admin') INTO has_admin;

  IF NOT has_admin THEN
    INSERT INTO public.app_users (id, email, name, role, status, is_active, permissions)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      'admin',
      'active',
      true,
      '{}'::jsonb
    );
  ELSE
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
  END IF;
  RETURN NEW;
END;
$$;
