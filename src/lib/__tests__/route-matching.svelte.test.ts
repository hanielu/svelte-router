import { describe, it, expect } from "vitest";
import { render } from "vitest-browser-svelte";
import { html } from "test-utils";
import type { Snippet } from "svelte";
import { renderedMarkup } from "./fixtures/rendered-markup.js";

// svelte:defs
import { MemoryRouter, Outlet, Routes, Route, useParams, useRoutes } from "svelte-router";

const Courses = html`<div>
  <h1>Courses</h1>
  <Outlet />
</div>`;

const Course = html`<script>
    const params = useParams();
  </script>
  <div>
    <h2>Course {params.current.id}</h2>
    <Outlet />
  </div>`;

const CourseGrades = html`<p>Course Grades</p>`;
const NewCourse = html`<p>New Course</p>`;
const CoursesIndex = html`<p>All Courses</p>`;
const CoursesNotFound = html`<p>Course Not Found</p>`;
const Landing = html`<div>
  <h1>Welcome to React Training</h1>
  <Outlet />
</div>`;

const ReactFundamentals = html`<p>React Fundamentals</p>`;
const AdvancedReact = html`<p>Advanced React</p>`;
const Home = html`<p>Home</p>`;
const NotFound = html`<p>Not Found</p>`;
const NeverRender = html`
  <script>
    throw new Error("NeverRender should ... uh ... never render");
  </script>
`;

let routes = [
  {
    path: "courses",
    element: Courses,
    children: [
      { index: true, element: CoursesIndex },
      {
        path: ":id",
        element: Course,
        children: [{ path: "grades", element: CourseGrades }],
      },
      { path: "new", element: NewCourse },
      { path: "*", element: CoursesNotFound },
    ],
  },
  {
    path: "courses",
    element: Landing,
    children: [
      { path: "react-fundamentals", element: ReactFundamentals },
      { path: "advanced-react", element: AdvancedReact },
      { path: "*", element: NeverRender },
    ],
  },
  { index: true, element: Home },
  { path: "*", element: NotFound },
];
// sd

describe("route matching", () => {
  function describeRouteMatching(routes: Snippet) {
    // The upstream snapshots' complete DOM shape/content, without compiler anchors.
    const cases = [
      ["/courses", "<div><h1>Courses</h1><p>All Courses</p></div>"],
      ["/courses/routing", "<div><h1>Courses</h1><div><h2>Course routing</h2></div></div>"],
      ["/courses/routing/grades", "<div><h1>Courses</h1><div><h2>Course routing</h2><p>Course Grades</p></div></div>"],
      ["/courses/new", "<div><h1>Courses</h1><p>New Course</p></div>"],
      ["/courses/not/found", "<div><h1>Courses</h1><p>Course Not Found</p></div>"],
      ["/courses/react-fundamentals", "<div><h1>Welcome to React Training</h1><p>React Fundamentals</p></div>"],
      ["/courses/advanced-react", "<div><h1>Welcome to React Training</h1><p>Advanced React</p></div>"],
      ["/", "<p>Home</p>"],
      ["/not-found", "<p>Not Found</p>"],
    ];

    cases.forEach(([path, expected]) => {
      it(`renders the right elements at ${path}`, async () => {
        const screen = await render(
          html`<script>
              let { path, children } = $props();
            </script>
            <MemoryRouter initialEntries="{[path]}" children="{children}" />`,
          { path, children: routes }
        );

        expect(screen.container.children).toHaveLength(1);
        expect(renderedMarkup(screen.container.firstElementChild)).toBe(expected);
      });
    });
  }

  describe("using a route config object", () => {
    const RoutesRenderer = html`<script>
        let renderedRoutes = useRoutes(undefined, routes);
      </script>
      {@render renderedRoutes()}` as Snippet;

    describeRouteMatching(RoutesRenderer);
  });

  describe("using <Routes> with <Route> elements", () => {
    let routes = html`
      <Routes>
        <Route path="courses" element="{Courses}">
          <Route index element="{CoursesIndex}" />
          <Route path=":id" element="{Course}">
            <Route path="grades" element="{CourseGrades}" />
          </Route>
          <Route path="new" element="{NewCourse}" />
          <Route path="*" element="{CoursesNotFound}" />
        </Route>
        <Route path="courses" element="{Landing}">
          <Route path="react-fundamentals" element="{ReactFundamentals}" />
          <Route path="advanced-react" element="{AdvancedReact}" />
          <Route path="*" element="{NeverRender}" />
        </Route>
        <Route index element="{Home}" />
        <Route path="*" element="{NotFound}" />
      </Routes>
    ` as Snippet;

    describeRouteMatching(routes);
  });
});
