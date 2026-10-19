import { createBrowserRouter, type RouteObject } from "react-router";

import { RootLayout, NotFound, RootError } from "./routes/root";
import { Index } from "./routes/index";
import { AppShell } from "./routes/app";
import { SignIn } from "./routes/signin";
import { SignUp } from "./routes/signup";

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RootError />,
    children: [
      { path: "/", element: <Index /> },
      { path: "/app", element: <AppShell /> },
      { path: "/signin", element: <SignIn /> },
      { path: "/signup", element: <SignUp /> },
      { path: "*", element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
