# @hvniel/svelte-router

A powerful Svelte 5 port of React Router - the modern, lightweight, performant, and accessible routing library for single-page applications.

> **🚧 Work in Progress**: This project is actively being developed. Issues, feature requests, and pull requests are welcome! Help us make this the best routing solution for Svelte 5.

## Quick start

Install it:

```bash
npm i @hvniel/svelte-router
# or
yarn add @hvniel/svelte-router
# or
pnpm add @hvniel/svelte-router
```

## Overview

This library provides a complete port of React Router to Svelte 5, maintaining feature parity with the original React implementation while adapting to Svelte's reactivity system. All documentation and APIs from the [original React Router][react-router-docs] library apply here, with some Svelte-specific adaptations.

The router supports both **data routing** and **declarative routing** modes, giving you flexibility in how you structure your application.

> **Note on Framework Mode**: This port focuses exclusively on data and declarative routing modes for client-side applications. The "framework" mode (equivalent to Remix) is not planned for this library since [SvelteKit](https://kit.svelte.dev/) already provides an exceptional full-stack framework experience for Svelte applications. If you need server-side rendering, file-based routing, or full-stack capabilities, we recommend using SvelteKit instead.

## Routing Modes

### Data Routing Mode

Data routing provides a more modern approach with centralized route configuration, built-in data loading, and better error handling:

```svelte
<script>
  import { createBrowserRouter, RouterProvider } from '@hvniel/svelte-router';

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
          path: "/users/:id",
          Component: User,
          loader: async ({ params }) => {
            const response = await fetch(`/api/users/${params.id}`);
            return response.json();
          },
        },
      ],
    },
  ]);
</script>

<RouterProvider {router} />
```

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

## Key Features

- **Multiple Router Types**: BrowserRouter, HashRouter, MemoryRouter, and StaticRouter
- **Data Loading**: Built-in loader and action functions for data fetching
- **Nested Routing**: Full support for nested routes and layouts
- **Progressive Enhancement**: Works with or without JavaScript
- **Type Safety**: Full TypeScript support with proper type inference
- **Svelte 5 Native**: Built specifically for Svelte 5 with proper reactivity

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

```svelte
<!-- User.svelte -->
<script module>
  export const loader = async ({ params }) => {
    const response = await fetch(`/api/users/${params.id}`);
    const user = await response.json();
    return { user };
  };
</script>

<script>
  import { useLoaderData, useParams } from '@hvniel/svelte-router';

  const data = useLoaderData<typeof loader>();
  const params = useParams();
</script>

<h1>User: {data.user.name}</h1>
<p>ID: {params.id}</p>
```

### Forms and Actions

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

The main differences lie in how reactive values are handled, since Svelte components use a different reactivity model than React:

### Svelte 5 Reactivity Integration

In data routing mode, you can access reactive data using the provided hooks:

```svelte
<script>
  import { useLocation, useParams } from '@hvniel/svelte-router';

  // Use $derived for reactive computations
  const location = $derived(useLocation());
  const params = useParams();

  // Use $effect for side effects
  $effect(() => {
    console.log('Location changed:', location.pathname);
  });
</script>
```

### Router Configuration

Both routing modes support the same router types:

```svelte
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

All core concepts from React Router remain the same:

- **Routers**: BrowserRouter, HashRouter, MemoryRouter, StaticRouter
- **Route Matching**: Path patterns, dynamic segments, nested routes
- **Navigation**: Link components, programmatic navigation
- **Data Loading**: Loaders, actions, and error boundaries
- **Route Protection**: Route guards and authentication flows

For detailed documentation on these concepts, please refer to the [original React Router documentation][react-router-docs].

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
| `useLocation()`     | Returns the current location object            |
| `useParams()`       | Returns the current route parameters           |
| `useSearchParams()` | Returns URL search parameters                  |
| `useHref(to)`       | Returns the href for a given destination       |

### Data Hooks (Data Routing Mode)

| Hook                 | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `useLoaderData<T>()` | Returns data from the route loader                    |
| `useActionData<T>()` | Returns data from the route action                    |
| `useRouteError()`    | Returns the current route error                       |
| `useNavigation()`    | Returns navigation state information                  |
| `useSubmit()`        | Returns a function to submit forms programmatically   |
| `useFetcher()`       | Returns a fetcher for loading data without navigation |
| `useRevalidator()`   | Returns a function to revalidate route data           |

### Route Definition Types

| Interface        | Description                                 |
| ---------------- | ------------------------------------------- |
| `RouteObject`    | Route configuration object for data routing |
| `LoaderFunction` | Type for route loader functions             |
| `ActionFunction` | Type for route action functions             |
| `ErrorBoundary`  | Type for error boundary components          |

## License

MIT © [Haniel Ubogu](https://github.com/HanielU)

[react-router-docs]: https://reactrouter.com/
