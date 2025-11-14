# AI Rules for AgencyHub Application

This document outlines the core technologies and best practices for developing the AgencyHub application.

## Tech Stack Description

*   **Framework**: Next.js is used for building server-rendered React applications, leveraging its App Router for efficient navigation and page management.
*   **Language**: TypeScript is strictly enforced across the entire codebase to ensure type safety, improve code quality, and enhance developer experience.
*   **Styling**: Tailwind CSS is the primary styling framework, promoting a utility-first approach for rapid and consistent UI development.
*   **UI Components**: shadcn/ui components, built on Radix UI primitives, provide a set of accessible and customizable UI building blocks.
*   **Form Management**: React Hook Form is utilized for robust and performant form handling, paired with Zod for schema-based validation.
*   **Icons**: Lucide React provides a comprehensive and easily customizable set of SVG icons for the application.
*   **Data Storage**: Local Storage is used for client-side data persistence, while Supabase is integrated for backend services including authentication, database management, and file storage.
*   **Date Utilities**: The `date-fns` library is available for efficient and reliable date formatting, parsing, and manipulation.
*   **Toast Notifications**: The application uses shadcn/ui's built-in toast system for displaying user feedback and notifications.

## Library Usage Rules

To maintain consistency and efficiency, please adhere to the following rules when developing:

1.  **React Components**: All new components must be functional React components, written in TypeScript (`.tsx` files).
2.  **Styling**: Always use Tailwind CSS classes for styling. Avoid inline styles or separate CSS files unless absolutely necessary for global styles defined in `globals.css`.
3.  **UI Components**:
    *   Prioritize using existing shadcn/ui components from `src/components/ui/`.
    *   If a component needs significant customization or is not available in `src/components/ui/`, create a new custom component in `src/components/custom/`.
    *   **DO NOT** modify any files within the `src/components/ui/` directory.
4.  **Icons**: Use icons exclusively from the `lucide-react` library.
5.  **Forms**: For any forms, use `react-hook-form` for form state management and `zod` with `@hookform/resolvers/zod` for schema validation.
6.  **Routing**: Leverage Next.js App Router for all navigation and page creation. New pages should be created within the `src/app/` directory.
7.  **Data Persistence**:
    *   For client-side, non-critical data, use `localStorage`.
    *   For backend interactions (authentication, database, storage), utilize the `@supabase/supabase-js` library.
8.  **Date Handling**: Use `date-fns` for any date formatting, parsing, or manipulation tasks.
9.  **Toast Notifications**: Use the `useToast` hook and `Toaster` component from `src/hooks/use-toast.ts` and `src/components/ui/toaster.tsx` for displaying notifications to the user.