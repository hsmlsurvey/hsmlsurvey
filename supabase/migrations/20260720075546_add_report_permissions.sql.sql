/*
# Add report permissions to role_permissions

## Changes
1. Add report permission keys to all role_permissions rows
2. Update is_allowed to handle report keys (reports use 'view' action only)
3. Reports are visible to all roles by default (view=true)
*/

-- Update role_permissions to include report keys
UPDATE public.role_permissions
SET permissions = permissions || '{"report_circle_moza":{"view":true,"insert":false,"update":false,"delete":false},"report_category":{"view":true,"insert":false,"update":false,"delete":false},"report_variety":{"view":true,"insert":false,"update":false,"delete":false},"report_grower":{"view":true,"insert":false,"update":false,"delete":false}}'::jsonb
WHERE role = 'admin';

UPDATE public.role_permissions
SET permissions = permissions || '{"report_circle_moza":{"view":true,"insert":false,"update":false,"delete":false},"report_category":{"view":true,"insert":false,"update":false,"delete":false},"report_variety":{"view":true,"insert":false,"update":false,"delete":false},"report_grower":{"view":true,"insert":false,"update":false,"delete":false}}'::jsonb
WHERE role = 'moderator';

UPDATE public.role_permissions
SET permissions = permissions || '{"report_circle_moza":{"view":true,"insert":false,"update":false,"delete":false},"report_category":{"view":true,"insert":false,"update":false,"delete":false},"report_variety":{"view":true,"insert":false,"update":false,"delete":false},"report_grower":{"view":true,"insert":false,"update":false,"delete":false}}'::jsonb
WHERE role = 'user';
