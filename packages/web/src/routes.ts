import { createBrowserRouter } from "react-router";
import { LockersView } from "./views/Lockers";
import { MembersView } from "./views/Members";
import { HomeView } from "./views/Home";
import { PaymentsView } from "./views/Payments";
import Layout from "./Layout";

export let router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      {
        path: "/",
        Component: HomeView,
      },
      {
        path: "/members",
        Component: MembersView,
      },
      {
        path: "/lockers",
        Component: LockersView,
      },
      {
        path: "/payments",
        Component: PaymentsView,
      },
    ],
  },
]);
