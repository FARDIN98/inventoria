-- =====================================================
-- ADMIN USER SETUP SCRIPT
-- =====================================================
-- This script sets up an initial admin user for the Inventoria application.
-- 
-- IMPORTANT: This script requires MANUAL execution in two parts:
-- 1. Create user in Supabase Auth (via Supabase Dashboard or API)
-- 2. Execute the SQL commands below in your Supabase SQL Editor
--
-- =====================================================

-- STEP 1: CREATE USER IN SUPABASE AUTH
-- =====================================================
-- You must first create the user in Supabase Auth using one of these methods:
--
-- METHOD A: Via Supabase Dashboard
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to Authentication > Users
-- 3. Click "Add user" 
-- 4. Enter email: admin66@gmail.com
-- 5. Enter password: (choose a secure password)
-- 6. Set "Email Confirmed" to true
-- 7. Copy the generated User ID for use in STEP 2
--
-- METHOD B: Via Supabase API (replace YOUR_SERVICE_ROLE_KEY)
-- curl -X POST 'https://your-project.supabase.co/auth/v1/admin/users' \
-- -H 'apikey: YOUR_SERVICE_ROLE_KEY' \
-- -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
-- -H 'Content-Type: application/json' \
-- -d '{
--   "email": "admin@inventoria.com",
--   "password": "your-secure-password",
--   "email_confirm": true
-- }'
--
-- =====================================================

-- STEP 2: CREATE USER RECORD IN DATABASE
-- =====================================================
-- Execute the following SQL in your Supabase SQL Editor
-- Replace 'USER_ID_FROM_STEP_1' with the actual User ID from Supabase Auth

-- Insert admin user record
INSERT INTO public.users (
    id,
    email,
    name,
    role,
    "isBlocked",
    language,
    theme,
    "createdAt",
    "updatedAt"
) VALUES (
    'f8bca51a-5442-45b2-93af-7350a3a29269',  -- Replace with actual User ID from Supabase Auth
    'admin66@gmail.com',
    'System Administrator',
    'ADMIN',
    false,
    'en',
    'light',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    role = 'ADMIN',
    "isBlocked" = false,
    "updatedAt" = NOW();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these queries to verify the admin user was created successfully:

-- Check if user exists in users table
-- SELECT id, email, name, role, "isBlocked" 
-- FROM public.users 
-- WHERE email = 'admin@inventoria.com';

-- Check if user exists in Supabase Auth
-- SELECT id, email, email_confirmed_at, created_at
-- FROM auth.users 
-- WHERE email = 'admin@inventoria.com';

-- =====================================================
-- ALTERNATIVE: QUICK SETUP FOR EXISTING USER
-- =====================================================
-- If you already have a user account and want to make it admin:
-- 1. Sign up normally through the application
-- 2. Find your User ID in the users table
-- 3. Run this query (replace YOUR_EMAIL with your actual email):

-- UPDATE public.users 
-- SET role = 'ADMIN', "isBlocked" = false, "updatedAt" = NOW()
-- WHERE email = 'YOUR_EMAIL';

-- =====================================================
-- SECURITY NOTES
-- =====================================================
-- 1. Change the default admin email and password after setup
-- 2. Use a strong password for the admin account
-- 3. Consider enabling MFA for admin accounts
-- 4. Regularly audit admin user access
-- 5. This admin user will have full access to:
--    - View all users
--    - Block/unblock users
--    - Delete users
--    - Promote/demote admin roles
--    - Access admin dashboard at /admin

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================
-- If you encounter issues:
-- 1. Ensure the User ID from Supabase Auth matches exactly
-- 2. Check that the email is confirmed in Supabase Auth
-- 3. Verify RLS policies allow the operation
-- 4. Check application logs for authentication errors
-- 5. Ensure the user can sign in through the normal login flow

-- End of setup script