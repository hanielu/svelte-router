import type { DemoMode, RouterType } from "$components/showcase.svelte";

export const getRouterFeatures = (mode: DemoMode) => {
  if (mode === "declarative") {
    return [
      "Component-based route definitions",
      "Nested routing support",
      "Navigation hooks (useNavigate, useLocation)",
      "Route transitions and animations",
      "Catch-all routes for 404 handling",
    ];
  } else {
    return [
      "Data loading with loaders",
      "Async route components",
      "Error boundaries",
      "Optimistic UI updates",
      "Parallel data fetching",
    ];
  }
};

export const getRouterDescription = (routerType: RouterType) => {
  switch (routerType) {
    case "browser":
      return "Uses the HTML5 History API for clean URLs (/profile)";
    case "hash":
      return "Uses URL hash for routing, works without server config (#/profile)";
    case "memory":
      return "Keeps history in memory, perfect for testing and SSR";
    default:
      return "Router description";
  }
};
