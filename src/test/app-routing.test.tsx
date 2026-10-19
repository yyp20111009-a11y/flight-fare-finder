import { matchRoutes } from "react-router";
import { describe, expect, it } from "vitest";

import { routes } from "@/router";

// Match routes without rendering: jsdom never loads the stylesheets and the
// auth pages need a Supabase connection the test run lacks.
describe("App routing", () => {
  it.each(["/", "/app", "/signin", "/signup"])("matches a page for %s instead of the 404 fallback", (url) => {
    const matches = matchRoutes(routes, url);

    expect(matches?.at(-1)?.route.path).toBe(url);
  });

  it("falls back to the 404 page for unknown paths", () => {
    const matches = matchRoutes(routes, "/does-not-exist");

    expect(matches?.at(-1)?.route.path).toBe("*");
  });
});
