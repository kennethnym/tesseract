import { useCallback, useEffect, useState } from "react";

type UiMode = "light" | "dark";

function useUiMode() {
	const [mode, setMode] = useState<UiMode>(
		window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
			? "dark"
			: "light",
	);

	const onColorSchemeChange = useCallback((event: MediaQueryListEvent) => {
		setMode(event.matches ? "dark" : "light");
	}, []);

	useEffect(() => {
		const query = window.matchMedia?.("(prefers-color-scheme: dark)");
		if (!query) return;

		if (query.matches) {
			setMode("dark");
		} else {
			setMode("light");
		}

		query.addEventListener("change", onColorSchemeChange);

		return () => {
			query.removeEventListener("change", onColorSchemeChange);
		};
	}, [onColorSchemeChange]);

	return mode;
}

export { useUiMode };
export type { UiMode };
