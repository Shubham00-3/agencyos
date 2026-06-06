// Demo mode enables the one-click "sign in as any role" buttons on the login
// page and the in-app role switcher. It is meant for local development only.
//
// It is force-disabled in any production build, so even if NEXT_PUBLIC_DEMO_MODE
// is accidentally left "true" in a production environment, the demo backdoors
// can never ship. Works in both client and server contexts (both vars are
// inlined at build time).
export const DEMO_MODE =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";
