<script lang="ts" module>
  import type { Component, Snippet } from "svelte";
  import type { NonIndexRouteObject, IndexRouteObject, RouteObject } from "../context.js";
  import type { LazyRouteFunction } from "../router/utils.js";
  import { AddRouteContext } from "./routes.svelte";
  import { invariant } from "../router/history.js";

  /**
   * @category Types
   */
  export interface PathRouteProps {
    caseSensitive?: NonIndexRouteObject["caseSensitive"];
    path?: NonIndexRouteObject["path"];
    id?: NonIndexRouteObject["id"];
    lazy?: LazyRouteFunction<NonIndexRouteObject>;
    loader?: NonIndexRouteObject["loader"];
    action?: NonIndexRouteObject["action"];
    hasErrorBoundary?: NonIndexRouteObject["hasErrorBoundary"];
    shouldRevalidate?: NonIndexRouteObject["shouldRevalidate"];
    handle?: NonIndexRouteObject["handle"];
    index?: false;
    children?: Snippet;
    element?: Snippet | null;
    hydrateFallbackElement?: Snippet | null;
    errorElement?: Snippet | null;
    Component?: Component | null;
    HydrateFallback?: Component | null;
    ErrorBoundary?: Component | null;
  }

  /**
   * @category Types
   */
  export interface LayoutRouteProps extends PathRouteProps {}

  /**
   * @category Types
   */
  export interface IndexRouteProps {
    caseSensitive?: IndexRouteObject["caseSensitive"];
    path?: IndexRouteObject["path"];
    id?: IndexRouteObject["id"];
    lazy?: LazyRouteFunction<IndexRouteObject>;
    loader?: IndexRouteObject["loader"];
    action?: IndexRouteObject["action"];
    hasErrorBoundary?: IndexRouteObject["hasErrorBoundary"];
    shouldRevalidate?: IndexRouteObject["shouldRevalidate"];
    handle?: IndexRouteObject["handle"];
    index: true;
    children?: undefined;
    element?: Snippet | null;
    hydrateFallbackElement?: Snippet | null;
    errorElement?: Snippet | null;
    Component?: Component | null;
    HydrateFallback?: Component | null;
    ErrorBoundary?: Component | null;
  }

  export type RouteProps = PathRouteProps | LayoutRouteProps | IndexRouteProps;
</script>

<script lang="ts">
  let props: RouteProps = $props();

  invariant(!props.index || !props.children, "An index route cannot have child routes.");

  const routesContext = AddRouteContext.get();

  if (!routesContext) {
    throw new Error("Route must be a child of Routes");
  }

  const [addRouteToParent, getNextChildIndex, parentTreePath] = routesContext;
  const currentIndex = getNextChildIndex();

  // Provide an index generator for this route's own children so that each level
  // of the tree maintains its own sequential ordering.
  let childIndex = 0;

  let treePath: number[] = [...parentTreePath, currentIndex];

  const children: RouteObject[] = [];
  AddRouteContext.set([r => children.push(r), () => childIndex++, treePath]);

  $effect(() => {
    let route: RouteObject = {
      id: props.id || treePath.join("-"),
      caseSensitive: props.caseSensitive,
      element: props.element,
      Component: props.Component,
      index: props.index,
      path: props.path,
      loader: props.loader,
      action: props.action,
      hydrateFallbackElement: props.hydrateFallbackElement,
      HydrateFallback: props.HydrateFallback,
      errorElement: props.errorElement,
      ErrorBoundary: props.ErrorBoundary,
      hasErrorBoundary:
        props.hasErrorBoundary === true ||
        props.ErrorBoundary != null ||
        props.errorElement != null,
      shouldRevalidate: props.shouldRevalidate,
      handle: props.handle,
      lazy: props.lazy,
    };

    if (children.length > 0) {
      route.children = children;
    }

    addRouteToParent(route);
  });
</script>

<!--
  This is so that Layout routes can have children 
  which register themselves with the parent route 
  and build the routes tree and so on.
-->
{@render props.children?.()}
