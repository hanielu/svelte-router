import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { html } from "test-utils";

// svelte:defs
import {
  createMemoryRouter,
  Form,
  Outlet,
  RouterProvider,
  useActionData,
  useLoaderData,
  useMatches,
  useNavigation,
  useRouteLoaderData,
} from "svelte-router";
// sd

describe("data-router hooks", () => {
  it("exposes navigation, matches, and loader data", async () => {
    const Page = html`<script>
        const navigation = $derived(useNavigation());
        const matches = $derived(useMatches());
        const ownData = $derived(useLoaderData());
        const rootData = $derived(useRouteLoaderData("root"));
      </script>

      <p>navigation:{navigation.state}</p>
      <p>root:{rootData?.label ?? "loading"}</p>
      <p>page:{ownData?.label ?? "loading"}</p>
      <p>matches:{matches.map((match) => match.id).join(",")}</p>`;

    const router = createMemoryRouter([
      {
        id: "root",
        path: "/",
        loader: () => ({ label: "root-data" }),
        Component: html`<Outlet />`,
        children: [
          {
            id: "page",
            index: true,
            loader: () => ({ label: "page-data" }),
            Component: Page,
          },
        ],
      },
    ]);

    const screen = render(
      html`<script>
          let { router } = $props();
        </script>
        <RouterProvider {router} />`,
      { router }
    );

    await expect.element(screen.getByText("navigation:idle")).toBeVisible();
    await expect.element(screen.getByText("root:root-data")).toBeVisible();
    await expect.element(screen.getByText("page:page-data")).toBeVisible();
    await expect.element(screen.getByText("matches:root,page")).toBeVisible();
  });

  it("exposes action data after a form submission", async () => {
    const Page = html`<script>
        const actionData = $derived(useActionData());
      </script>

      <Form method="post">
        <input name="message" value="hello" />
        <button type="submit">Submit</button>
      </Form>
      <p>result:{actionData?.message ?? "none"}</p>`;

    const router = createMemoryRouter([
      {
        id: "action",
        path: "/",
        action: async ({ request }) => {
          const data = await request.formData();
          return { message: data.get("message") };
        },
        Component: Page,
      },
    ]);

    const screen = render(
      html`<script>
          let { router } = $props();
        </script>
        <RouterProvider {router} />`,
      { router }
    );

    await expect.element(screen.getByText("result:none")).toBeVisible();
    await screen.getByRole("button", { name: "Submit" }).click();
    await expect.element(screen.getByText("result:hello")).toBeVisible();
  });
});
