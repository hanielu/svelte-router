# @hvniel/svelte-router

A powerful Svelte 5 port of React Router - the modern, lightweight, performant, and accessible routing library for single-page applications.

> **🚧 Work in Progress**: This project is actively being developed. Issues, feature requests, and pull requests are welcome! Help us make this the best react-router port for Svelte 5.

## Quick start

This branch targets Svelte `5.57.0` or newer within Svelte 5. The package is still
`0.0.6`; unreleased branch changes are not implied to be on npm yet.

Install it:

```bash
npm i @hvniel/svelte-router
# or
yarn add @hvniel/svelte-router
# or
pnpm add @hvniel/svelte-router
```

## Overview

This library is building toward React Router's declarative- and data-mode behaviour while adapting the API to Svelte 5. It is not yet a complete port; use the [React Router parity plan](./react-router-parity.md) to see what is tested, partial, or missing.

The [upstream test audit](./docs/test-parity.md) records the pinned React Router revision, completed counterpart suites, and explicit Svelte adaptations. A passing local suite is not a claim that the entire upstream suite has been ported.

The router supports both **data routing** and **declarative routing** modes, giving you flexibility in how you structure your application.

> **Note on Framework Mode**: This port focuses exclusively on data and declarative routing modes for client-side applications. The "framework" mode (equivalent to Remix) is not planned for this library since [SvelteKit](https://kit.svelte.dev/) already provides an exceptional full-stack framework experience for Svelte applications. If you need server-side rendering, file-based routing, or full-stack capabilities, we recommend using SvelteKit instead.

## Table of Contents

- [Quick start](#quick-start)
- [Routing Modes](#routing-modes)
  - [Data Routing Mode](#data-routing-mode)
  - [Declarative Routing Mode](#declarative-routing-mode)
- [Key Features](#key-features)
- [Examples](#examples)
- [Key Differences from React Router](#key-differences-from-react-router)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [React Router parity plan](./react-router-parity.md)
- [Contributing](#contributing)

## Routing Modes

### Data Routing Mode

Data routing registers route objects with an engine that owns navigation,
loaders/actions, revalidation, and blockers. This example is a client-side SPA
entry; `Root.svelte` renders an `Outlet`, and `Home.svelte` is application UI:

```svelte
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createBrowserRouter, RouterProvider } from '@hvniel/svelte-router';
  import Root from './Root.svelte';
  import Home from './Home.svelte';
  import User, { loader as userLoader } from './User.svelte';

  const router = createBrowserRouter([
    {
      path: "/",
      Component: Root,
      children: [
        {
          index: true,
          Component: Home,
        },
        {
          path: "users/:id",
          Component: User,
          loader: userLoader,
        },
      ],
    },
  ]);

  // This entry creates and owns the engine, not merely its subscription.
  onDestroy(() => router.dispose());
</script>

<RouterProvider {router} />
```

The `User.svelte` component and loader are shown below. Exporting a loader from a
component does not register it automatically; the `loader` route property does.

### Declarative Routing Mode

Declarative routing uses familiar component-based syntax for defining routes:

```svelte
<script>
  import { BrowserRouter, Routes, Route } from '@hvniel/svelte-router';
  import Home from './Home.svelte';
  import About from './About.svelte';
  import User from './User.svelte';
</script>

<BrowserRouter>
  <Routes>
    <Route path="/" Component={Home} />
    <Route path="/about" Component={About} />
    <Route path="/users/:id" Component={User} />
  </Routes>
</BrowserRouter>
```

Both modes are useful. A descendant `Routes` table can also render under a data
router's splat route, but its definitions do not become engine-managed
loader/action routes. In `0.0.6`, `useBlocker` requires a data router, even if the
application owns its data fetching. See [router architecture](docs/architecture.md).

## Key Features

- **Multiple Router Types**: BrowserRouter, HashRouter, MemoryRouter, and StaticRouter
- **Data Loading**: Built-in loader and action functions for data fetching
- **Nested Routing**: Nested routes and layouts through `Outlet`
- **Native HTML**: Links and forms enhance ordinary elements; a client-only app still requires JavaScript
- **TypeScript**: Typed APIs, with outstanding package/type conformance work tracked in the parity plan
- **Svelte 5**: Components, snippets, runes, and live readonly `.current` value handles

## Examples

### Basic Navigation

```svelte
<script>
  import { Link, useNavigate } from '@hvniel/svelte-router';

  const navigate = useNavigate();
</script>

<nav>
  <Link to="/">Home</Link>
  <Link to="/about">About</Link>
  <button onclick={() => navigate('/dashboard')}>
    Go to Dashboard
  </button>
</nav>
```

### Data Loading with Loaders

This is the component registered by the data-router example above. The sample
assumes `/api/users/:id` returns a user object with a string `name`:

```svelte
<!-- User.svelte -->
<script module lang="ts">
  import type { LoaderFunctionArgs } from '@hvniel/svelte-router';

  export async function loader({ params, request }: LoaderFunctionArgs) {
    const response = await fetch(`/api/users/${params.id}`, {
      signal: request.signal,
    });
    if (!response.ok) throw response;
    const user: unknown = await response.json();
    if (!user || typeof user !== 'object' || !('name' in user) || typeof user.name !== 'string') {
      throw new Error('Expected a user with a string name');
    }
    return { user: { name: user.name } };
  }
</script>

<script lang="ts">
  import { useLoaderData, useParams } from '@hvniel/svelte-router';

  const data = useLoaderData<typeof loader>();
  const params = useParams<'id'>();
</script>

<h1>User: {data.current?.user.name ?? 'Loading...'}</h1>
<p>ID: {params.current.id}</p>
```

### Forms and Actions

Render this inside `RouterProvider`, with an `action` registered on the `/login`
data route. The form markup alone does not create the action or a server endpoint:

```svelte
<script>
  import { Form } from '@hvniel/svelte-router';
</script>

<Form method="post" action="/login">
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit">Login</button>
</Form>
```

### Nested Routes and Layouts

```svelte
<!-- Layout.svelte -->
<script>
  import { Outlet } from '@hvniel/svelte-router';
</script>

<div class="layout">
  <header>My App</header>
  <main>
    <Outlet />
  </main>
  <footer>© 2024</footer>
</div>
```

## Key Differences from React Router

The main differences lie in how reactive values are handled and how route elements are defined, since Svelte uses a different component model than React:

### Component vs Element

In React Router, you can use either `Component` or `element` props for route definitions. In this Svelte port:

- **`Component`**: Works the same as React Router - pass a Svelte component
- **`element`**: Instead of JSX elements, this accepts Svelte **snippets**

```svelte
<script>
  import { Route } from '@hvniel/svelte-router';
  import UserProfile from './UserProfile.svelte';
</script>

<!-- Alternative definitions inside Routes; choose one. -->
<!-- Using Component (same as React Router) -->
<Route path="/user/:id" Component={UserProfile} />

<!-- Using element with snippets (Svelte-specific) -->
<Route path="/user/:id">
  {#snippet element()}
    <UserProfile />
  {/snippet}
</Route>
```

For data routing, put `Component: UserProfile` on the route object, as in the
entry example. Its alternative `element` property accepts a snippet reference,
not JSX or JavaScript written directly into component markup.

### Svelte 5 Reactivity Integration

In both routing modes, value hooks return stable readonly `.current` handles.
Initialize them once; reads stay live without remounting the component:

```svelte
<script>
  import { useLocation, useParams } from '@hvniel/svelte-router';

  const location = useLocation();
  const params = useParams();

  // Use $effect for side effects
  $effect(() => {
    console.log('Location changed:', location.current.pathname);
  });
</script>

<p>{location.current.pathname}: {params.current.id ?? 'no user selected'}</p>
```

This is an implemented, **unreleased breaking change from 0.0.6**. Replace
`$derived(useLocation())` with `useLocation()` and read `location.current`.
Use getters for changing inputs: `useHref(() => to, () => ({ relative }))`.
`$derived` remains useful for calculations from the current value. See the
[reactivity guide](docs/svelte-reactivity.md) for the full migration contract.

### Router Configuration

Declarative mode supplies browser, hash, and memory wrappers (fragments shown
below). Data mode uses the corresponding `create*Router` functions and
`RouterProvider` instead:

```svelte
<script>
  import { BrowserRouter, HashRouter, MemoryRouter } from '@hvniel/svelte-router';
</script>

<!-- Browser History (clean URLs) -->
<BrowserRouter>
  <!-- routes -->
</BrowserRouter>

<!-- Hash History (hash-based URLs) -->
<HashRouter>
  <!-- routes -->
</HashRouter>

<!-- Memory History (for testing/SSR) -->
<MemoryRouter initialEntries={["/"]}>
  <!-- routes -->
</MemoryRouter>
```

## Core Concepts

The library shares these core routing concepts with React Router:

- **Routers**: BrowserRouter, HashRouter, MemoryRouter, StaticRouter
- **Route Matching**: Path patterns, dynamic segments, nested routes
- **Navigation**: Link components, programmatic navigation
- **Data Loading**: Loaders, actions, and error boundaries
- **Route Protection**: Route guards and authentication flows

Use the [original React Router documentation][react-router-docs] for conceptual
background, and this package's [parity plan](react-router-parity.md) for actual
support and limitations. Client-side route protection is not server authorization.

## API Reference

### Data Routing Components

| Component        | Description                                   |
| ---------------- | --------------------------------------------- |
| `RouterProvider` | Provides router context for data routing mode |
| `Outlet`         | Renders child route components                |

### Declarative Routing Components

| Component       | Description                          |
| --------------- | ------------------------------------ |
| `BrowserRouter` | Router using browser history API     |
| `HashRouter`    | Router using URL hash for navigation |
| `MemoryRouter`  | Router storing history in memory     |
| `StaticRouter`  | Router for server-side rendering     |
| `Routes`        | Container for route definitions      |
| `Route`         | Individual route definition          |

### Navigation Components

| Component | Description                            |
| --------- | -------------------------------------- |
| `Link`    | Navigation link component              |
| `NavLink` | Link with active/pending state and snippet content |
| `Form`    | Enhanced form with routing integration |

### Data Router Creation Functions

| Function                                | Description                                |
| --------------------------------------- | ------------------------------------------ |
| `createBrowserRouter(routes, options?)` | Creates a data router with browser history |
| `createHashRouter(routes, options?)`    | Creates a data router with hash history    |
| `createMemoryRouter(routes, options?)`  | Creates a data router with memory history  |

### Navigation Hooks

| Hook                | Description                                    |
| ------------------- | ---------------------------------------------- |
| `useNavigate()`     | Returns a function for programmatic navigation |
| `useLocation()`     | Read the location through `.current`           |
| `useParams()`       | Read current route params through `.current`   |
| `useSearchParams()` | Returns `[paramsHandle, setParams]`; read `paramsHandle.current` |
| `useHref(to)`       | Returns a live href handle; accepts a value or getter |

### Data Hooks (Data Routing Mode)

| Hook                 | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `useLoaderData<T>()` | Returns data from the route loader                    |
| `useActionData<T>()` | Returns data from the route action                    |
| `useRouteError()`    | Returns the current route error                       |
| `useNavigation()`    | Returns navigation state information                  |
| `useSubmit()`        | Returns a function to submit forms programmatically   |
| `useRevalidator()`   | Returns a `revalidate()` command and live readonly `state` |

`useFetcher`/`useFetchers` are planned, not current exports. Value readers such as
`useNavigation` and `useLoaderData` return readonly `.current` handles. Loader and
action data may be `undefined` before it exists. `useSubmit` remains a command.

### Route Definition Types

| Interface        | Description                                 |
| ---------------- | ------------------------------------------- |
| `LoaderFunction` | Type for route loader functions             |
| `ActionFunction` | Type for route action functions             |

The Svelte-specific `RouteObject` type exists internally but is not currently
re-exported from the package root. `ErrorBoundary` is a route property accepting a
Svelte component, not an exported interface. Do not import either as a public type.

## Contributing

Start with [AGENTS.md](AGENTS.md), then the relevant guide:

- [Architecture and ownership](docs/architecture.md)
- [Svelte reactivity and API design](docs/svelte-reactivity.md)
- [Development, compiler probes, and verification](docs/frontend-development.md)

These guides define modern Svelte conventions and how to correct outdated
assumptions. The [parity plan](react-router-parity.md) tracks capability evidence;
the historical `todos.md` checklist is not a support contract.

## License

MIT © [Haniel Ubogu](https://github.com/HanielU)

[react-router-docs]: https://reactrouter.com/
