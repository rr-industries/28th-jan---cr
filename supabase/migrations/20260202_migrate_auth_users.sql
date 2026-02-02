-- Migration: Create Auth Users for Existing Employees
-- This script should be run in the Supabase Dashboard SQL Editor to properly initialize Auth users.

BEGIN;

-- 1. Create a function to safely create auth users
CREATE OR REPLACE FUNCTION public.migrate_employees_to_auth()
RETURNS void AS $$
DECLARE
    emp RECORD;
    new_user_id UUID;
    v_email TEXT;
BEGIN
    FOR emp IN SELECT id, employee_id, name, role, email FROM public.employees WHERE auth_user_id IS NULL LOOP
        -- Generate internal email if none exists
        IF emp.email IS NULL OR emp.email = '' THEN
            v_email := lower(emp.employee_id) || '@caferepublic.internal';
        ELSE
            v_email := emp.email;
        END IF;

        -- Check if user already exists in auth.users by email
        SELECT id INTO new_user_id FROM auth.users WHERE email = v_email;

        IF new_user_id IS NULL THEN
            -- Create new user
            -- Default password: Employee@123 (Admin should change/reset this later)
            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                recovery_sent_at,
                last_sign_in_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at,
                confirmation_token,
                email_change,
                email_change_token_new,
                recovery_token
            )
            VALUES (
                '00000000-0000-0000-0000-000000000000',
                gen_random_uuid(),
                'authenticated',
                'authenticated',
                v_email,
                crypt('Employee@123', gen_salt('bf')),
                now(),
                now(),
                now(),
                '{"provider":"email","providers":["email"]}',
                jsonb_build_object('name', emp.name, 'role', emp.role, 'employee_id', emp.employee_id),
                now(),
                now(),
                '',
                '',
                '',
                ''
            )
            RETURNING id INTO new_user_id;

            -- Create identity
            INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                new_user_id,
                jsonb_build_object('sub', new_user_id, 'email', v_email),
                'email',
                now(),
                now(),
                now()
            );
        END IF;

        -- Link employee to auth user
        UPDATE public.employees 
        SET auth_user_id = new_user_id, 
            email = v_email 
        WHERE id = emp.id;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Run the migration
SELECT public.migrate_employees_to_auth();

-- 3. Cleanup (optional, but good practice)
DROP FUNCTION public.migrate_employees_to_auth();

COMMIT;
