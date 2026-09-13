import {
  useLocation, useParams, useMatch, useResolvedPath, useHref, useNavigationType,
  useNavigation, useMatches, useLoaderData, useRouteLoaderData, useActionData,
  useRouteError, useRouteId, useOutletContext, useSearchParams, useFormAction,
  useViewTransitionState, useNavigate, useRevalidator, useInRouterContext,
  type RouterValue,
} from "@hvniel/svelte-router";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;

// Isolated compile-only consumer of the emitted package, not the source/SvelteKit project.
// Hooks must run in real component initialization at runtime.
function consumer() {
  const location = useLocation();
  const params = useParams<"id">();
  const recordParams = useParams<{ id: string; page?: string }>();
  const match = useMatch(() => "/posts/:id" as const);
  const path = useResolvedPath(() => "..", () => ({ relative: "path" }));
  const href = useHref(() => "/posts");
  const data = useLoaderData<() => Promise<{ title: string }>>();
  const optionalData = useRouteLoaderData<{ title: string }>(() => "post");
  const action = useActionData<() => { saved: boolean }>();
  const [search, setSearch] = useSearchParams({ page: "1" });
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const matches = useMatches();
  const error = useRouteError();
  const id = useRouteId();
  const outlet = useOutletContext<{ title: string }>();
  const formAction = useFormAction(() => undefined, () => ({ relative: "route" }));
  const transitioning = useViewTransitionState(() => "/posts");

  type Params = Assert<Equal<typeof params.current, Readonly<{ readonly id: string | undefined }>>>;
  type RecordParams = Assert<Equal<typeof recordParams.current, Readonly<Partial<{ id: string; page?: string }>>>>;
  type Data = Assert<Equal<typeof data.current, { title: string } | undefined>>;
  type OptionalData = Assert<Equal<typeof optionalData.current, { title: string } | undefined>>;
  type Action = Assert<Equal<typeof action.current, { saved: boolean } | undefined>>;
  type ErrorValue = Assert<Equal<typeof error.current, unknown>>;
  type DefaultData = Assert<Equal<ReturnType<typeof useLoaderData>["current"], unknown>>;
  // Internal box branding and setters are not part of the public handle contract.
  type HandleKeys = Assert<Equal<keyof RouterValue<unknown>, "current">>;
  type HrefHandle = Assert<Equal<typeof href, RouterValue<string>>>;
  type SearchHandle = Assert<Equal<typeof search, RouterValue<URLSearchParams>>>;
  const structuralHandle: typeof href = { get current() { return "/posts"; } };

  const title: string | undefined = data.current?.title;
  const matchedId: string | undefined = match.current?.params.id;
  const currentId: string = id.current;
  const contextTitle: string | undefined = outlet.current?.title;
  const pathname: string = location.current.pathname;
  const resolved: string = path.current.pathname;
  const liveHref: RouterValue<string> = href;
  const liveSearch: RouterValue<URLSearchParams> = search;
  const formHref: string = formAction.current;
  const isTransitioning: boolean = transitioning.current;
  const inRouter: boolean = useInRouterContext();
  const count: number = matches.current.length;
  const state: "idle" | "loading" | "submitting" = navigation.current.state;

  // @ts-expect-error Handles cannot be overwritten.
  location.current = location.current;
  // @ts-expect-error Param keys remain precise.
  params.current.missing;
  // @ts-expect-error Param values remain readonly.
  params.current.id = "changed";
  // @ts-expect-error Match pattern inference remains precise.
  match.current?.params.missing;
  // @ts-expect-error Loader inference is not any.
  data.current?.missing;
  // @ts-expect-error This is a value handle, not the old location object.
  location.pathname;
  // @ts-expect-error Controller state is a read-only projection.
  revalidator.state = "loading";

  const navigate = useNavigate();
  navigate("/posts");
  navigate(-1);
  revalidator.revalidate();
  setSearch(previous => { previous.set("page", "2"); return previous; });
  useNavigationType().current;
}
