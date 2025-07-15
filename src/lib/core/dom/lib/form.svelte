<script lang="ts" module>
  import { ABSOLUTE_URL_REGEX, type RelativeRoutingType } from "$lib/core/router/router.js";
  import type { HTMLFormMethod } from "$lib/core/router/utils.js";

  /**
   * Form props shared by navigations and fetchers
   */
  interface SharedFormProps extends HTMLAttributes<HTMLFormElement> {
    /**
     * The HTTP verb to use when the form is submitted. Supports "get", "post",
     * "put", "delete", and "patch".
     *
     * Native `<form>` only supports `get` and `post`, avoid the other verbs if
     * you'd like to support progressive enhancement
     */
    method?: HTMLFormMethod;

    /**
     * The encoding type to use for the form submission.
     */
    encType?: "application/x-www-form-urlencoded" | "multipart/form-data" | "text/plain";

    /**
     * The URL to submit the form data to.  If `undefined`, this defaults to the closest route in context.
     */
    action?: string;

    /**
     * Determines whether the form action is relative to the route hierarchy or
     * the pathname.  Use this if you want to opt out of navigating the route
     * hierarchy and want to instead route based on /-delimited URL segments
     */
    relative?: RelativeRoutingType;

    /**
     * Prevent the scroll position from resetting to the top of the viewport on
     * completion of the navigation when using the <ScrollRestoration> component
     */
    preventScrollReset?: boolean;

    /**
     * A function to call when the form is submitted. If you call
     * `event.preventDefault()` then this form will not do anything.
     */
    onsubmit?: FormEventHandler<HTMLFormElement>;
  }

  /**
   * Form props available to fetchers
   * @category Types
   */
  export interface FetcherFormProps extends SharedFormProps {}

  /**
   * Form props available to navigations
   * @category Types
   */
  export interface FormProps extends SharedFormProps {
    discover?: DiscoverBehavior;

    /**
     * Indicates a specific fetcherKey to use when using `navigate={false}` so you
     * can pick up the fetcher's state in a different component in a {@link
     * useFetcher}.
     */
    fetcherKey?: string;

    /**
     * Skips the navigation and uses a {@link useFetcher | fetcher} internally
     * when `false`. This is essentially a shorthand for `useFetcher()` +
     * `<fetcher.Form>` where you don't care about the resulting data in this
     * component.
     */
    navigate?: boolean;

    /**
     * Forces a full document navigation instead of client side routing + data
     * fetch.
     */
    reloadDocument?: boolean;

    /**
     * Replaces the current entry in the browser history stack when the form
     * navigates. Use this if you don't want the user to be able to click "back"
     * to the page with the form on it.
     */
    replace?: boolean;

    /**
     * State object to add to the history stack entry for this navigation
     */
    state?: any;

    /**
     * Enables a [View
     * Transition](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
     * for this navigation. To apply specific styles during the transition see
     * {@link useViewTransitionState}.
     */
    viewTransition?: boolean;
  }
</script>

<script lang="ts">
  import type { DiscoverBehavior } from "$lib/index.js";
  import type { FormEventHandler, HTMLAttributes } from "svelte/elements";
  import { defaultMethod } from "../dom.js";
  import { useFormAction, useSubmit } from "./index.svelte.js";

  let {
    discover = "render",
    fetcherKey,
    navigate,
    reloadDocument,
    replace,
    state,
    method = defaultMethod,
    action,
    onsubmit,
    relative,
    preventScrollReset,
    viewTransition,
    ref = $bindable(),
    children,
    ...props
  }: FormProps & { ref?: HTMLFormElement } = $props();

  type HTMLFormSubmitter = HTMLButtonElement | HTMLInputElement;

  let submit = useSubmit();
  let formAction = useFormAction(action, { relative });
  let formMethod: HTMLFormMethod = method.toLowerCase() === "get" ? "get" : "post";
  let isAbsolute = typeof action === "string" && ABSOLUTE_URL_REGEX.test(action);

  let submitHandler: FormEventHandler<HTMLFormElement> = event => {
    onsubmit && onsubmit(event);
    if (event.defaultPrevented) return;
    event.preventDefault();

    let submitter = (event as unknown as SubmitEvent).submitter as HTMLFormSubmitter | null;

    let submitMethod =
      (submitter?.getAttribute("formmethod") as HTMLFormMethod | undefined) || method;

    submit(submitter || event.currentTarget, {
      fetcherKey,
      method: submitMethod,
      navigate,
      replace,
      state,
      relative,
      preventScrollReset,
      viewTransition,
    });
  };
</script>

<form
  bind:this={ref}
  method={formMethod}
  action={formAction}
  onsubmit={reloadDocument ? onsubmit : submitHandler}
  {...props}
  data-discover={!isAbsolute && discover === "render" ? "true" : undefined}
>
  {@render children?.()}
</form>

<!-- 
  @component
  A progressively enhanced HTML [`<form>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form) that submits data to actions via `fetch`, activating pending states in `useNavigation` which enables advanced user interfaces beyond a basic HTML form. After a form's action completes, all data on the page is automatically revalidated to keep the UI in sync with the data.

  Because it uses the HTML form API, server rendered pages are interactive at a basic level before JavaScript loads. Instead of React Router managing the submission, the browser manages the submission as well as the pending states (like the spinning favicon). After JavaScript loads, React Router takes over enabling web application user experiences.

  Form is most useful for submissions that should also change the URL or otherwise add an entry to the browser history stack. For forms that shouldn't manipulate the browser history stack, use [`<fetcher.Form>`][fetcher_form].

  ```svelte
  <script>
    import { Form } from "@hvniel/svelte-router";
  </script>

  <Form action="/events" method="post">
    <input name="title" type="text" />
    <input name="description" type="text" />
  </Form>
-->
