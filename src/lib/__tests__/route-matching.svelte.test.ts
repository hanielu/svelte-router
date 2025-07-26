import { describe, it, expect } from "vitest";
import { render } from "vitest-browser-svelte";
import { html } from "test-utils";
import type { Snippet } from "svelte";

// svelte:defs
import { MemoryRouter, Outlet, Routes, Route, useParams, useRoutes } from "svelte-router";

const Courses = html`<div>
  <h1>Courses</h1>
  <Outlet />
</div>`;

const Course = html`<script>
    let { id } = useParams();
  </script>
  <div>
    <h2>Course {id}</h2>
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
    let testPaths = [
      "/courses",
      "/courses/routing",
      "/courses/routing/grades",
      "/courses/new",
      "/courses/not/found",
      "/courses/react-fundamentals",
      "/courses/advanced-react",
      "/",
      "/not-found",
    ];

    testPaths.forEach(path => {
      it(`renders the right elements at ${path}`, () => {
        const screen = render(
          html`<script>
              let { path, children } = $props();
            </script>
            <MemoryRouter initialEntries="{[path]}" children="{children}" />`,
          { path, children: routes }
        );

        expect(screen.container.firstElementChild).toMatchSnapshot();
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
