import { rootRoute } from "@/root-route.tsx";
import { WorkspaceDashboard } from "@/workspaces/dashboard.tsx";
import { createRoute } from "@tanstack/react-router";

const workspacesRoutes = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: WorkspaceDashboard,
});

export { workspacesRoutes };
