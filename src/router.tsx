import Layout from "@/pages/_layout";
import { DraftPage } from "@/pages/draft";
import HomePage from "@/pages/home";
import NotFoundPage from "@/pages/not-found";
import { createBrowserRouter } from "react-router-dom";

// IMPORTANT: Do not remove or modify the code below!
// Normalize basename when hosted in Power Apps
const BASENAME = new URL(".", location.href).pathname;
if (location.pathname.endsWith("/index.html")) {
  history.replaceState(null, "", BASENAME + location.search + location.hash);
}

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout showHeader={true} />,
      errorElement: <NotFoundPage />,
      children: [
        { index: true, element: <DraftPage /> },
        { path: "home", element: <HomePage /> },
      ],
    },
  ],
  {
    basename: BASENAME, // IMPORTANT: Set basename for proper routing when hosted in Power Apps
  },
);
