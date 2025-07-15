<script module>
  import type { LoaderFunction } from "$lib/core/router/utils.js";

  export const loader = async ({ params }: Parameters<LoaderFunction>[0]) => {
    const res = await fetch(`https://jsonplaceholder.typicode.com/users/${params.id}`);
    const data = await res.json();
    return {
      name: data.name,
    };
  };
</script>

<script lang="ts">
  import { useLoaderData, useParams } from "$lib/index.js";

  const params = useParams();
  const data = useLoaderData<typeof loader>();
</script>

<h1>Show</h1>
<p>Params: {JSON.stringify(params)}</p>
<p>Data: {data.name}</p>
