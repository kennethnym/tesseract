import { createRootRoute } from "@tanstack/react-router";
import App from "@/App.tsx";

const rootRoute = createRootRoute({
	component: App,
});

export { rootRoute };
