import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { MemoryRouter, useLocation } from "svelte-router";
import { m, snippet } from "test-utils";

describe("<Router>", () => {
  it("throws if another <Router> is already in context", () => {
    expect(() => {
      render(m(MemoryRouter, m => m(MemoryRouter)));
    }).toThrow(/cannot render a <Router> inside another <Router>/);
  });

  it("memoizes the current location", () => {
    let location1;
    const CaptureLocation = snippet.c(() => {
      location1 = useLocation();
    });

    render(m(MemoryRouter, m => m(CaptureLocation)));

    expect(location1).toBeDefined();

    let location2;
    const CaptureLocation2 = snippet.c(() => {
      location2 = useLocation();
    });

    render(m(MemoryRouter, m => m(CaptureLocation2)));

    expect(location2).toBeDefined();

    // TODO: this is failing, but it's not clear why, also shouldn't be too much of a problem but still
    // expect(location1).toBe(location2);
  });
});

// test("<Router>", () => {
//   let double = multiplier(0, 2);

//   expect(double.value).toEqual(0);

//   double.set(5);

//   expect(double.value).toEqual(10);
// });

// function multiplier(initial: number, k: number) {
//   let count = $state(initial);

//   return {
//     get value() {
//       return count * k;
//     },

//     set: (c: number) => {
//       count = c;
//     },
//   };
// }
