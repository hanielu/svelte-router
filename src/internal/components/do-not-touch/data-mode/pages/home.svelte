<script lang="ts">
  import { Link, useNavigate } from "$lib/index.js";

  const navigate = useNavigate();
</script>

<h1>Home</h1>
<!-- <button onclick={() => navigate("/show/4")}>User 4</button> -->
<Link to="/show/4"><button>User 4</button></Link>
