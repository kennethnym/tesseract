import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { StreamLanguage } from "@codemirror/language";
import { dockerFile } from "@codemirror/legacy-modes/mode/dockerfile";
import {
	Compartment,
	EditorState,
	type Extension,
	type StateEffect,
} from "@codemirror/state";
import { vim } from "@replit/codemirror-vim";
import { EditorView, basicSetup } from "codemirror";
import { useEffect, useRef } from "react";
import { useUiMode } from "@/hooks/use-ui-mode";

type CodeMirrorEditorSupportedLanguage = "markdown" | "dockerfile";

interface CodeMirrorEditorProps {
	path: string;
	initialValue: string;
	className?: string;
	onValueChanged?: (path: string, value: string) => void;
}

function languageExtensionFrom(path: string) {
	const basename = path.split("/").at(-1);
	const ext = path.split(".").at(-1);

	if (basename === "Dockerfile") {
		return StreamLanguage.define(dockerFile);
	}

	switch (ext) {
		case "md":
			return markdown();
		default:
			return null;
	}
}

const baseEditorTheme = EditorView.theme({
	"&": {
		height: "100%",
		background: "hsl(var(--background))",
	},
	"& .cm-gutters": {
		background: "hsl(var(--background))",
	},
});

function CodeMirrorEditor({
	path,
	initialValue,
	onValueChanged,
	className,
}: CodeMirrorEditorProps) {
	const editorElRef = useRef<HTMLDivElement | null>(null);
	const editorStates = useRef<Map<string, EditorState>>(new Map());
	const editorViewRef = useRef<EditorView | null>(null);
	const uiMode = useUiMode();
	const editorThemeCompartment = useRef(new Compartment());

	// biome-ignore lint/correctness/useExhaustiveDependencies: this only needs to be called once.
	useEffect(() => {
		if (editorElRef.current && !editorViewRef.current) {
			const state = createEditorState(path, initialValue);
			editorStates.current.set(path, state);
			editorViewRef.current = new EditorView({
				state,
				parent: editorElRef.current,
			});
		}
		return () => {
			editorViewRef.current?.destroy();
			editorViewRef.current = null;
		};
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: only need to be called when path changes because initialValue isn't reactive
	useEffect(() => {
		if (!editorViewRef.current) return;

		let newState = editorStates.current.get(path);
		if (!newState) {
			newState = createEditorState(path, initialValue);
			editorStates.current.set(path, newState);
		}

		editorViewRef.current.setState(newState);
	}, [path]);

	function createEditorState(path: string, initialValue: string) {
		const exts: Extension[] = [
			basicSetup,
			baseEditorTheme,
			editorThemeCompartment.current.of(uiMode === "light" ? [] : oneDark),
			vim(),
			EditorView.updateListener.of((update) => {
				editorStates.current.set(path, update.state);
				if (update.docChanged) {
					onValueChanged?.(path, update.state.doc.toString());
				}
			}),
		];

		const language = languageExtensionFrom(path);
		if (language) {
			exts.push(language);
		}

		return EditorState.create({
			doc: initialValue,
			extensions: exts,
		});
	}

	useEffect(() => {
		let effect: StateEffect<unknown>;
		switch (uiMode) {
			case "light":
				effect = editorThemeCompartment.current.reconfigure([]);
				break;
			case "dark":
				effect = editorThemeCompartment.current.reconfigure(oneDark);
				break;
		}

		editorViewRef.current?.dispatch({
			effects: effect,
		});
	}, [uiMode]);

	return <div className={className} ref={editorElRef} />;
}

export { CodeMirrorEditor };
export type { CodeMirrorEditorProps, CodeMirrorEditorSupportedLanguage };
