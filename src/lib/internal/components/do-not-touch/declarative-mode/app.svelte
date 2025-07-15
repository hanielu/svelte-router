<script lang="ts">
  import About from "./pages/about.svelte";
  import Home from "./pages/home.svelte";
  import Post from "./pages/post.svelte";
  import Layout from "./pages/layout.svelte";
  import Layout1 from "./pages/layout1.svelte";
  import { Routes, Route, BrowserRouter, StaticRouter, useNavigate } from "$lib/index.js";
  import { browser } from "$app/environment";

  const Router = browser ? BrowserRouter : (StaticRouter as typeof BrowserRouter);
</script>

<Router>
  <Routes>
    <Route path="/" Component={Home} />
    <Route path="/">
      {#snippet element()}
        {@const navigate = useNavigate()}
        <button onclick={() => navigate("/post/123")}>Post 123</button>
        <p>This is the new Home</p>
      {/snippet}
    </Route>
    <Route path="/post/:postId" Component={Post} />
    <Route Component={Layout}>
      <Route path="/about" Component={About} />
      <Route Component={Layout1}>
        <Route path="/doom" Component={Home} />
      </Route>
    </Route>
    <Route path="*">
      {#snippet element()}
        <p>404 bruh</p>
      {/snippet}
    </Route>
  </Routes>
</Router>
