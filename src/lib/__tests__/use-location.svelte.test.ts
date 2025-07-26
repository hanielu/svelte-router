import { describe, it, expect } from "vitest";
import { render } from "vitest-browser-svelte";
import { html } from "test-utils";

// svelte:defs
import { MemoryRouter, Routes, Route, useLocation } from "svelte-router";

const ShowLocation = html`<script>
    let location = useLocation();
  </script>

  <pre>{JSON.stringify(location)}</pre>`;

const App = html`<div>
  <Routes>
    <Route path="/home" element="{ShowLocation}" />
  </Routes>
  <Routes location="/scoped?scoped=search#scoped-hash">
    <Route path="/scoped" element="{ShowLocation}" />
  </Routes>
</div>`;
// sd

describe("useLocation", () => {
  it("returns the current location object", () => {
    let screen = render(html`
        <MemoryRouter initialEntries={["/home?the=search#the-hash"]}>
          <Routes>
            <Route path="/home" element={ShowLocation} />
          </Routes>
        </MemoryRouter>
      `);

    expect(screen.container.firstElementChild).toMatchInlineSnapshot(`
      <pre>
        {"pathname":"/home","search":"?the=search","hash":"#the-hash","state":null,"key":"default"}
      </pre>
    `);
  });

  it("returns the scoped location object when nested in <Routes location>", () => {
    let screen = render(html`
          <MemoryRouter initialEntries={["/home?the=search#the-hash"]}>
            <App />
          </MemoryRouter>
        	`);

    expect(screen.container.firstElementChild).toMatchSnapshot(`
      <div>
        <pre>
          {"pathname":"/home","search":"?the=search","hash":"#the-hash","state":null,"key":"default"}
        </pre>
        <pre>
          {"pathname":"/scoped","search":"?scoped=search","hash":"#scoped-hash","state":null,"key":"default"}
        </pre>
      </div>
    `);
  });

  it("preserves state from initialEntries", () => {
    let screen = render(html`
        <MemoryRouter
          initialEntries={[{ pathname: "/example", state: { my: "state" }, key: "my-key" }]}
        >
          <Routes>
            <Route path={"/example"} element={ShowLocation} />
          </Routes>
        </MemoryRouter>
      `);

    expect(screen.container.firstElementChild).toMatchInlineSnapshot(`
      <pre>
        {"pathname":"/example","search":"","hash":"","state":{"my":"state"},"key":"my-key"}
      </pre>
    `);
  });
});
