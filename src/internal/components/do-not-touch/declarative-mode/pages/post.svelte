<script lang="ts">
  import { useParams, useNavigate } from "$lib/index.js";

  let params = useParams();
  let navigate = useNavigate();

  $effect(() => {
    console.log("params", params);
  });
</script>

<h1>This is the Post {params.postId}</h1>

<button onclick={() => navigate("/post/456")}>Post 456</button>
<button onclick={() => navigate("/")}>Home</button>
