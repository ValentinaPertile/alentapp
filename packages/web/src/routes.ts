import { createBrowserRouter } from "react-router";
import { LockersView } from "./views/Lockers";
import { MembersView } from "./views/Members";
import { HomeView } from "./views/Home";
import { EquipmentLoansView } from "./views/EquipmentLoans"; // <-- 1. Importamos tu futura vista
import { PaymentsView } from "./views/Payments"; //le dice al Frontend que componente mostrar según la URl que el usuario visita

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
        path: "/equipment-loans", // <-- 2. Definimos la URL de tu pantalla
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