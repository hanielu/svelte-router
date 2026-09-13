import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";
import { tick } from "svelte";
import type { ReadableBox, WritableBox } from "../utils/box.svelte.js";

// svelte:defs
import { box } from "../utils/box.svelte.js";
import { Context } from "../utils/context.js";
import { attachRef } from "../utils/attach-ref.js";
// sd

describe("cached boxes", () => {
  it("shares prototype accessors without sharing instance state", async () => {
    const capture = vi.fn<(values: [WritableBox<number>, ReadableBox<number>, WritableBox<number>][]) => void>();
    const screen = render(html`<script>
      let { capture } = $props();
      capture([1, 2].map(initial => {
        const state = box(initial);
        const read = () => state.current * 2;
        return [state, box.with(read), box.with(read, value => state.current = value / 2)];
      }));
    </script>`, { capture });
    const [first, second] = capture.mock.calls[0][0];
    for (let index = 0; index < first.length; index++) {
      const one = first[index];
      const two = second[index];
      expect(one).not.toBe(two);
      expect(Object.hasOwn(one, "current")).toBe(false);
      expect(Object.getPrototypeOf(one)).toBe(Object.getPrototypeOf(two));
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(one), "current")!;
      expect(descriptor.get).toBeTypeOf("function");
      expect(descriptor.enumerable).toBe(false);
      if (index === 1) {
        expect(descriptor.set).toBeUndefined();
        expect(box.isWritableBox(one)).toBe(false);
      } else {
        expect(descriptor.set).toBeTypeOf("function");
        expect(box.isWritableBox(one)).toBe(true);
      }
      expect(box.isBox(one)).toBe(true);
    }
    expect(first.map(value => value.current)).toEqual([1, 2, 2]);
    expect(second.map(value => value.current)).toEqual([2, 4, 4]);
    first[2].current = 40;
    expect(first.map(value => value.current)).toEqual([20, 40, 40]);
    expect(second.map(value => value.current)).toEqual([2, 4, 4]);
    expect(Reflect.set(first[1], "current", 50)).toBe(false);
    await screen.unmount();
  });

  it("preserves deep reactive state, replacement, and initially undefined writable values", async () => {
    const initial = { nested: { count: 1 } };
    const capture = vi.fn<(value: WritableBox<typeof initial>, empty: WritableBox<number | undefined>) => void>();
    const screen = render(html`<script lang="ts">
      let { getInitial, capture } = $props();
      const value = box(getInitial());
      const empty = box<number>();
      capture(value, empty);
    </script>
    <p>count:{value.current.nested.count}</p>
    <button onclick={() => value.current.nested.count++}>Increment</button>
    <button onclick={() => value.current = { nested: { count: 10 } }}>Replace</button>`,
    { getInitial: () => initial, capture });
    const [value, empty] = capture.mock.calls[0];
    expect(empty.current).toBeUndefined();
    empty.current = 3;
    expect(empty.current).toBe(3);
    empty.current = undefined;
    expect(empty.current).toBeUndefined();
    const originalProxy = value.current;
    expect(originalProxy).not.toBe(initial);
    await screen.getByRole("button", { name: "Increment" }).click();
    await expect.element(screen.getByText("count:2")).toBeVisible();
    expect(value.current).toBe(originalProxy);
    expect(initial.nested.count).toBe(1);
    await screen.getByRole("button", { name: "Replace" }).click();
    await expect.element(screen.getByText("count:10")).toBeVisible();
    expect(value.current).not.toBe(originalProxy);
    await screen.getByRole("button", { name: "Increment" }).click();
    await expect.element(screen.getByText("count:11")).toBeVisible();
    expect(originalProxy.nested.count).toBe(2);
    expect(capture).toHaveBeenCalledOnce();
    await screen.unmount();
  });

  it("preserves box conversion and dynamic flattened access through prototype getters and setters", async () => {
    const capture = vi.fn<(values: {
      state: WritableBox<number>;
      readonly: ReadableBox<number>;
      converted: ReadableBox<number>;
      flat: { count: number; readonly double: number; shifted: number; label: string };
      reused: boolean;
    }) => void>();
    const screen = render(html`<script>
      let { capture } = $props();
      const state = box.from(2);
      const readonly = box.with(() => state.current * 2);
      const shifted = box.with(() => state.current + 1, value => state.current = value - 1);
      const converted = box.from(() => state.current * 3);
      const flat = box.flatten({ count: state, double: readonly, shifted, label: "counter" });
      capture({ state, readonly, converted, flat,
        reused: box.from(state) === state && box.from(readonly) === readonly && box.from(shifted) === shifted });
    </script><p>{flat.label}:{flat.count}:{flat.double}:{flat.shifted}:{converted.current}</p>
    <button onclick={() => flat.count++}>Increment</button>
    <button onclick={() => flat.shifted = 10}>Set projection</button>`, { capture });
    const { state, readonly, converted, flat, reused } = capture.mock.calls[0][0];
    expect(reused).toBe(true);
    expect(Object.getPrototypeOf(flat)).toBe(Object.prototype);
    expect(Object.hasOwn(flat, "double")).toBe(true);
    expect(Reflect.set(flat, "double", 100)).toBe(false);
    await expect.element(screen.getByText("counter:2:4:3:6")).toBeVisible();
    await screen.getByRole("button", { name: "Increment" }).click();
    await expect.element(screen.getByText("counter:3:6:4:9")).toBeVisible();
    await screen.getByRole("button", { name: "Set projection" }).click();
    await expect.element(screen.getByText("counter:9:18:10:27")).toBeVisible();
    expect(state.current).toBe(9);
    expect(readonly.current).toBe(18);
    expect(converted.current).toBe(27);
    await screen.unmount();
  });

  it("lazily caches projections, preserves payload identity, and switches dependencies on immediate reads", async () => {
    type Payload = { label: string };
    const first: Payload = { label: "first" };
    const second: Payload = { label: "second" };
    const project = vi.fn((payload: Payload) => ({ payload }));
    const capture = vi.fn<(api: {
      value: ReadableBox<{ payload: Payload }>;
      setFirst: (value: Payload) => void;
      setSecond: (value: Payload) => void;
      selectSecond: () => void;
    }) => void>();
    const screen = render(html`<script lang="ts">
      let { getFirst, getSecond, project, capture } = $props();
      let left = $state.raw<undefined | { label: string }>();
      let right = $state.raw<undefined | { label: string }>();
      let useFirst = $state(true);
      const value = box.with(() => project(useFirst ? left ?? getFirst() : right ?? getSecond()));
      capture({ value, setFirst: v => left = v, setSecond: v => right = v,
        selectSecond: () => useFirst = false });
    </script>`, { getFirst: () => first, getSecond: () => second, project, capture });

    const api = capture.mock.calls[0][0];
    expect(project).not.toHaveBeenCalled();
    const initial = api.value.current;
    expect(initial.payload).toBe(first);
    expect(api.value.current).toBe(initial);
    expect(project).toHaveBeenCalledTimes(1);
    expect(Reflect.set(api.value, "current", initial)).toBe(false);
    expect(box.isBox(api.value)).toBe(true);
    expect(box.isWritableBox(api.value)).toBe(false);

    const replacement = { label: "replacement" };
    api.setFirst(replacement);
    const next = api.value.current;
    expect(next).not.toBe(initial);
    expect(next.payload).toBe(replacement);
    expect(api.value.current).toBe(next);
    expect(project).toHaveBeenCalledTimes(2);

    api.selectSecond();
    const selected = api.value.current;
    expect(selected.payload).toBe(second);
    expect(project).toHaveBeenCalledTimes(3);
    api.setFirst({ label: "irrelevant" });
    expect(api.value.current).toBe(selected);
    expect(project).toHaveBeenCalledTimes(3);
    api.setSecond(replacement);
    expect(api.value.current.payload).toBe(replacement);
    expect(project).toHaveBeenCalledTimes(4);
    await screen.unmount();
  });

  it("shares cached reads with writable projections and readonly views without adding an effect", async () => {
    const project = vi.fn((count: number) => ({ count }));
    const observe = vi.fn<(count: number) => void>();
    const cleanup = vi.fn();
    const capture = vi.fn<(api: {
      value: WritableBox<{ count: number }>;
      readonly: ReadableBox<{ count: number }>;
    }) => void>();
    const screen = render(html`<script lang="ts">
      let { project, observe, cleanup, capture } = $props();
      const count = box(0);
      const value = box.with(() => project(count.current), v => count.current = v.count);
      const readonly = box.readonly(value);
      capture({ value, readonly });
      $effect(() => { observe(readonly.current.count); return cleanup; });
    </script><p>count:{readonly.current.count}</p>
    <button onclick={() => value.current = { count: value.current.count + 1 }}>Increment</button>`,
    { project, observe, cleanup, capture });
    const { value, readonly } = capture.mock.calls[0][0];
    await expect.element(screen.getByText("count:0")).toBeVisible();
    expect(readonly.current).toBe(value.current);
    expect(box.readonly(readonly)).toBe(readonly);
    expect(box.isWritableBox(value)).toBe(true);
    expect(box.isWritableBox(readonly)).toBe(false);
    expect(Reflect.set(readonly, "current", { count: 10 })).toBe(false);
    expect(project).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenLastCalledWith(0);
    await screen.getByRole("button", { name: "Increment" }).click();
    await expect.element(screen.getByText("count:1")).toBeVisible();
    expect(readonly.current).toBe(value.current);
    expect(project).toHaveBeenCalledTimes(2);
    expect(observe).toHaveBeenLastCalledWith(1);
    await screen.unmount();
    expect(cleanup).toHaveBeenCalledTimes(2);
    observe.mockClear();
    project.mockClear();
    value.current = { count: 2 };
    await tick();
    expect(project).not.toHaveBeenCalled();
    expect(observe).not.toHaveBeenCalled();
  });

  it("caches context records while preserving nearest-provider and fallback ownership", async () => {
    const context = Context.boxed("test context", { label: "fallback" });
    const capture = vi.fn<(name: string, value: ReadableBox<{ label: string }>) => void>();
    const Reader = html`<script>
      let { context, capture, name } = $props();
      const value = context.get();
      capture(name, value);
    </script><p>{name}:{value.current.label}</p>`;
    const Provider = html`<script>
      let { context, label, children } = $props();
      context.setWith(() => ({ label }));
    </script>{@render children()}`;
    const screen = render(scope(Reader, Provider).html`<script>
      let { context, capture } = $props();
      let label = $state("outer");
    </script>
    <Provider {context} {label}>
      <Reader {context} {capture} name="outer" />
      <Provider {context} label="inner"><Reader {context} {capture} name="inner" /></Provider>
    </Provider>
    <Reader {context} {capture} name="sibling" />
    <button onclick={() => label = "changed"}>Change</button>`, { props: { context, capture } });
    const handles = new Map(capture.mock.calls);
    const outer = handles.get("outer")!;
    const inner = handles.get("inner")!;
    const sibling = handles.get("sibling")!;
    const initial = outer.current;
    const nested = inner.current;
    const fallback = sibling.current;
    expect(outer.current).toBe(initial);
    expect(inner.current).toBe(nested);
    expect(fallback).toEqual({ label: "fallback" });
    await screen.getByRole("button", { name: "Change" }).click();
    await expect.element(screen.getByText("outer:changed")).toBeVisible();
    await expect.element(screen.getByText("inner:inner")).toBeVisible();
    await expect.element(screen.getByText("sibling:fallback")).toBeVisible();
    expect(outer.current).not.toBe(initial);
    expect(outer.current.label).toBe("changed");
    expect(inner.current).toBe(nested);
    expect(sibling.current).toBe(fallback);
    expect(capture).toHaveBeenCalledTimes(3);
    await screen.unmount();
  });

  it("preserves writable element-ref attachment and cleanup", async () => {
    const capture = vi.fn<(ref: WritableBox<HTMLDivElement | null>) => void>();
    const changed = vi.fn<(node: HTMLDivElement | null) => void>();
    const screen = render(html`<script lang="ts">
      let { capture, changed } = $props();
      const ref = box<HTMLDivElement | null>(null);
      let shown = $state(true);
      capture(ref);
    </script>
    {#if shown}<div {...attachRef(ref, changed)}>Attached</div>{/if}
    <button onclick={() => shown = !shown}>Toggle</button>`, { capture, changed });
    const ref = capture.mock.calls[0][0];
    const initial = screen.getByText("Attached").element();
    expect(ref.current).toBe(initial);
    expect(changed).toHaveBeenLastCalledWith(initial);
    await screen.getByRole("button", { name: "Toggle" }).click();
    expect(ref.current).toBeNull();
    expect(changed).toHaveBeenLastCalledWith(null);
    await screen.getByRole("button", { name: "Toggle" }).click();
    const replacement = screen.getByText("Attached").element();
    expect(ref.current).toBe(replacement);
    expect(replacement).not.toBe(initial);
    await screen.unmount();
    expect(ref.current).toBeNull();
    expect(changed).toHaveBeenCalledTimes(4);
  });
});
