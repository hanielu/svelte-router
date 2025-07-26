import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { html } from "test-utils";

// svelte:defs
import { MemoryRouter, Routes, Route, useParams } from "svelte-router";

const Home = html`<h1>Home</h1>`;
const User = html`<script>
    let { userId } = useParams();
  </script>
  <div>
    <h1>User: {userId}</h1>
  </div>`;
// sd

describe("<Routes> with a location", () => {
  it("matches when the location is overridden", () => {
    let location = {
      pathname: "/home",
      search: "",
      hash: "",
      state: null,
      key: "r9qntrej",
    };

    let screen = render(
      html`
			<script>
				let {location} = $props();
			</script>
        <MemoryRouter initialEntries={["/users/michael"]}>
          <Routes location={location}>
            <Route path="home" element={Home} />
            <Route path="users/:userId" element={User} />
          </Routes>
        </MemoryRouter>`,
      { location }
    );

    expect(screen.container.firstElementChild).toMatchInlineSnapshot(`
     <h1>
       Home
     </h1>
    `);
  });

  it("matches when the location is not overridden", () => {
    let screen = render(html`
        <MemoryRouter initialEntries={["/users/michael"]}>
          <Routes>
            <Route path="home" element={Home} />
            <Route path="users/:userId" element={User} />
          </Routes>
        </MemoryRouter>`);

    expect(screen.container.firstElementChild).toMatchInlineSnapshot(`
      <div>
        <h1>
          User: michael
        </h1>
      </div>
    `);
  });
});
