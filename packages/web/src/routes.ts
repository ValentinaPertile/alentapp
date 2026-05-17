import { createBrowserRouter } from "react-router";

import { MembersView } from "./views/Members";
import { HomeView } from "./views/Home";
import { EquipmentLoansView } from "./views/EquipmentLoans"; // <-- 1. Importamos tu futura vista
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
    ],
  },
]);