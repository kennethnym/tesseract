import { rootRoute } from "@/root-route.tsx";
import { workspacesRoutes } from "@/workspaces/routes.ts";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import {
	templateEditorRoute,
	templatesDashboardRoute,
} from "@/templates/routes.tsx";

const router = createRouter({
	routeTree: rootRoute.addChildren([
		workspacesRoutes,
		templatesDashboardRoute,
		templateEditorRoute,
	]),
});

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
