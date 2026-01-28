## Project Summary
Cafe Republic is a focused restaurant management system for a single-outlet café operation. It features a streamlined admin dashboard for managing orders, menu items, staff, inventory, and business reports, along with a premium customer-facing menu and table booking system.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database & Auth**: Supabase
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI / Shadcn UI
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **State Management**: React Context (Cart, Admin)

## Architecture
- `src/app/admin`: Admin dashboard routes
- `src/app/menu`: Customer-facing menu
- `src/components`: Reusable UI components
- `src/context`: Global state management
- `src/lib`: Database client and utilities
- `src/hooks`: Custom React hooks

## User Preferences
- **Theme**: Premium, café-inspired aesthetic (rounded-xl corners, white/beige/primary palette)
- **ID Convention**: Staff IDs start with `EMP`, Super Admin IDs start with `ADM`
- **Security**: Minimalist admin authentication with secure ID and key
- **Navigation**: Persistent sidebar in admin, horizontal scroll categories in customer menu

## Project Guidelines
- **Single Outlet**: The system operates for a single location ("Cafe Republic").
- **Strict Ordering**: Orders are allowed only via active `table_sessions`.
- **Anti-Abuse**: Customer orders require staff approval before processing.
- **Clean UI**: Heavily rounded corners (`rounded-xl` to `rounded-[2.5rem]`), subtle shadows, and professional typography.
- **Verification**: Post-implementation verification using curl and linting.

## Common Patterns
- **Query Params**: Use `add=true` or `edit=ID` for modal control.
- **State Flow**: Context-based user and outlet state shared across admin routes.
  - **Interactive Feedback**: use `sonner` for all operation results.
  - **Hidden Admin Entry**: A discrete, invisible link (typically a `.` character) is placed in the footer and header to allow staff to access the `/admin/login` page without public visibility.

