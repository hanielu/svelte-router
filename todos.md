## TODOS

- [ ] Find every reference to react and make sure it's either used correctly in relation to svelte or removed
- [ ] Replace every react-router with svelte-router

---

## 🎯 React Router → Svelte Port Checklist

### 📁 **Core Router Infrastructure**

#### History & Navigation Management

- [x] `createBrowserHistory` - Browser history API integration
- [x] `createHashHistory` - Hash-based routing
- [x] `createMemoryHistory` - In-memory history for testing/SSR
- [x] Router state management (location, navigation state, etc.)
- [x] Route matching engine (`matchRoutes`, `matchPath`)
- [x] Path utilities (`createPath`, `parsePath`, `resolvePath`, `generatePath`)

#### Route Configuration System

- [x] Route object types and interfaces
- [x] Nested route resolution
- [x] Dynamic route parameters parsing
- [x] Route hierarchy management

---

### 🏗️ **Declarative Mode**

_Basic routing with component-based configuration_

#### Router Components

- [x] `BrowserRouter` - Browser history wrapper
- [x] `HashRouter` - Hash history wrapper
- [x] `MemoryRouter` - Memory history wrapper
- [x] `StaticRouter` - Server-side rendering router
- [x] `Router` - Base router component

#### Route Configuration Components

- [x] `Routes` - Route container/switcher
- [x] `Route` - Individual route definition
- [x] `Outlet` - Nested route rendering

#### Navigation Components

- [x] `Link` - Basic navigation links
- [ ] `NavLink` - Navigation links with active states
- [ ] `Navigate` - Programmatic navigation component

#### Core Declarative Hooks

- [x] `useLocation` - Current location object
- [x] `useNavigate` - Programmatic navigation function
- [x] `useParams` - Route parameters
- [ ] `useSearchParams` - URL search parameters
- [ ] `useNavigationType` - Navigation type (push/pop/replace)
- [ ] `useOutlet` - Access to child route content
- [x] `useOutletContext` - Context passing to child routes
- [x] `useRoutes` - Programmatic route matching
- [ ] `useMatch` - Match specific route pattern
- [ ] `useMatches` - All current route matches
- [ ] `useHref` - Generate href for navigation
- [ ] `useResolvedPath` - Resolve relative paths
- [x] `useInRouterContext` - Check if inside router

---

### 📊 **Data Mode**

_Advanced data loading, actions, and state management_

#### Data Router Components

- [x] `RouterProvider` - Data router wrapper
- [x] `createBrowserRouter` - Browser router with data capabilities
- [x] `createHashRouter` - Hash router with data capabilities
- [x] `createMemoryRouter` - Memory router with data capabilities
- [x] `createStaticRouter` - Static router for SSR
- [x] `Form` - Enhanced form with data submission
- [ ] `Await` - Suspense-like async data handling

#### Data Loading & Actions

- [ ] Loader function system
- [ ] Action function system
- [ ] Data fetching strategy
- [ ] Revalidation logic
- [ ] Error boundary integration
- [ ] Hydration support

#### Data Mode Hooks

- [ ] `useLoaderData` - Access route loader data
- [ ] `useActionData` - Access action result data
- [ ] `useFetcher` - Independent data fetching
- [ ] `useFetchers` - All active fetchers
- [ ] `useNavigation` - Navigation state (loading/idle/submitting)
- [ ] `useRevalidator` - Manual revalidation trigger
- [x] `useSubmit` - Programmatic form submission
- [ ] `useFormAction` - Resolve form action URLs
- [ ] `useRouteError` - Route-level error handling
- [ ] `useRouteLoaderData` - Access ancestor route loader data
- [ ] `useAsyncValue` - Access resolved async values
- [ ] `useAsyncError` - Access async errors
- [ ] `useBlocker` - Block navigation conditionally
- [ ] `useBeforeUnload` - Handle browser unload events
- [ ] `useViewTransitionState` - View transition states

---

### 🛠️ **Utilities & Helpers**

#### Route Utilities

- [x] `matchRoutes` - Match URL against route config
- [x] `matchPath` - Match URL against single pattern
- [x] `generatePath` - Generate URL from pattern + params

#### Navigation Utilities

- [ ] `redirect` - Redirect responses
- [ ] `redirectDocument` - Document-level redirects
- [ ] `replace` - Replace navigation
- [ ] `data` - Structured data responses
- [ ] `createSearchParams` - URLSearchParams creation

#### Error Handling

- [ ] `isRouteErrorResponse` - Error response type checking
- [ ] Error response types and interfaces
- [ ] Error boundary integration

#### SSR/Session Support _(Data Mode)_

- [ ] `createRequestHandler` - Server request handling
- [ ] `createStaticHandler` - Static data loading
- [ ] `createCookie` - Cookie management
- [ ] `createSession` - Session management
- [ ] `createSessionStorage` - Session storage
- [ ] `createCookieSessionStorage` - Cookie-based sessions
- [ ] `createMemorySessionStorage` - Memory-based sessions

---

### 🧪 **Testing & Development**

#### Testing Utilities

- [ ] `createRoutesStub` - Testing route stubs
- [ ] Memory router for testing
- [ ] Route testing helpers

#### Developer Experience

- [ ] Router DevTools integration
- [ ] Error boundaries and helpful error messages
- [ ] Development mode warnings
- [ ] Performance monitoring hooks

---

### 🚀 **Performance Optimizations**

- [ ] Lazy route loading
- [ ] Code splitting integration
- [ ] Preloading strategies
- [ ] Bundle size optimization
- [ ] Memory leak prevention

---

### 📋 **Implementation Strategy Recommendations**

1. **Start with Declarative Mode** - Implement basic routing first
2. **Build Core Infrastructure** - History management and route matching
3. **Add Data Mode Features** - Loaders, actions, and data hooks
4. **Svelte-Specific Polish** - Stores, reactivity, and DX improvements
5. **Testing & Documentation** - Comprehensive test suite and docs

This checklist covers all the major APIs and features from both React Router modes. The total scope is quite large, so I'd recommend starting with the core declarative mode features and building up from there!
