import { createBrowserRouter } from "react-router";
import { MembersView } from "./views/Members";
import { HomeView } from "./views/Home";
import { EquipmentLoansView } from "./views/EquipmentLoans";
import { LockersView } from "./views/Lockers";
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
        path: "/equipment-loans",
        Component: EquipmentLoansView,
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