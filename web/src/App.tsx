import {Outlet} from "@tanstack/react-router";
import {TanStackRouterDevtools} from "@tanstack/router-devtools";

function App() {
	return (
		<>
			<Outlet />
			<TanStackRouterDevtools />
		</>
	);
}

export default App;
