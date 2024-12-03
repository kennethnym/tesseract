import { rootRoute } from "@/root-route.tsx";
import { TemplatesDashboard } from "@/templates/dashboard.tsx";
import { TemplateEditor } from "@/templates/template-editor.tsx";
import { createRoute } from "@tanstack/react-router";

const templatesDashboardRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/templates",
	component: TemplatesDashboard,
});

const templateEditorRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/templates/$templateName/$",
	component: TemplateEditor,
});

export { templatesDashboardRoute, templateEditorRoute };
