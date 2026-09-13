<script lang="ts">
  import { getContext } from "svelte";
  import {
    Form,
    useFetcher,
    type FetcherController,
    type FormProps,
  } from "svelte-router";
  let { name }: { name: string } = $props();
  const options = getContext<{
    keys?: Record<string, string>;
    form?: FormProps;
    keyedForm?: boolean;
    capture(
      name: string,
      controller: { fetcher: FetcherController; setKey(key: string): void }
    ): void;
  }>("fetcher-fixture");
  // Initial key belongs to this instance; setKey exercises a reactive key change.
  // svelte-ignore state_referenced_locally
  let key = $state(options.keys?.[name]);
  const fetcher = useFetcher(() => ({ key }));
  // Fixture identity is fixed for this mounted owner, unlike its shared key.
  // svelte-ignore state_referenced_locally
  options.capture(name, { fetcher, setKey: next => (key = next) });
</script>

<p data-testid={name}>
  {fetcher.current.state}:{JSON.stringify(fetcher.current.data) ?? "empty"}
</p>
<Form
  navigate={false}
  fetcherKey={options.keyedForm === false ? undefined : fetcher.key}
  {...options.form}
>
  <input name="key" value="value" />
  <button type="submit" name="increment" value="10">Submit {name}</button>
</Form>
