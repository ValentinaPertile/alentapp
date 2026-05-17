import { createBrowserRouter } from "react-router";
<<<<<<< HEAD
import { LockersView } from "./views/Lockers";
=======
>>>>>>> origin/main
import { MembersView } from "./views/Members";
import { HomeView } from "./views/Home";
import { PaymentsView } from "./views/Payments"; //le dice al Frontend que componente mostrar según la URl que el usuario visita
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
<<<<<<< HEAD
      {
        path: "/lockers",
        Component: LockersView,
=======
            {
        path: "/payments",
        Component: PaymentsView,
>>>>>>> origin/main
      },
    ],
  },
]);
