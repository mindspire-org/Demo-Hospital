# Super Admin Portal Setup Note

## Manual Step Required

The file `backend/src/config/env.ts` is blocked by `.gitignore` and cannot be edited automatically.

Please add this line to `backend/src/config/env.ts`:

```ts
SUPER_ADMIN_MASTER_KEY: process.env.SUPER_ADMIN_MASTER_KEY || '',
```

And add this to your `.env` file:

```bash
SUPER_ADMIN_MASTER_KEY=sa_master_replace_with_secure_key
```

## What was implemented

1. Backend models: SuperAdminUser, SystemConfig, ClientProfile, SuperAdminAuditLog
2. Backend: moduleRegistry.ts, validators, superAdmin_guard.ts, superAdmin.controller.ts, superAdmin.routes.ts
3. /health endpoint now returns `setupRequired: boolean`
4. Frontend: superAdmin.api.ts, SystemConfigContext, SuperAdmin pages (login, dashboard, modules, client, usage, admins)
5. App.tsx routes for /super-admin/*
6. Home.tsx dynamic filtering via useSystemConfig
7. hospital_Sidebar.tsx isPathVisible integration

## First Run

1. Start the backend
2. Visit `/super-admin/login`
3. If setupRequired is true, use the Setup form with your master key
4. Login with the created admin credentials
5. Use Module Manager to enable/disable modules
