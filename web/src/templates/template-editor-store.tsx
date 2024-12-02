import { createStore, useStore } from "zustand";
import type { Template } from "./types";
import { createContext, useContext } from "react";
import { buildTemplate } from "./api";
import { isApiErrorResponse, type ApiErrorResponse } from "@/api";

interface TemplateEditorState {
	template: Template;
	currentFilePath: string;
	isBuildInProgress: boolean;
	isBuildOutputVisible: boolean;
	buildOutput: string;
	buildError: ApiErrorResponse | null;

	startBuild: ({
		imageTag,
		buildArgs,
	}: { imageTag: string; buildArgs: Record<string, string> }) => Promise<void>;

	setCurrentFilePath: (path: string) => void;

	addBuildOutputChunk: (chunk: string) => void;

	toggleBuildOutput: () => void;
}

type TemplateEditorStore = ReturnType<typeof createTemplateEditorStore>;

function createTemplateEditorStore({
	template,
	currentFilePath,
}: { template: Template; currentFilePath: string }) {
	return createStore<TemplateEditorState>()((set, get) => ({
		template,
		currentFilePath,
		isBuildInProgress: false,
		isBuildOutputVisible: false,
		buildOutput: "",
		buildError: null,

		startBuild: async ({ imageTag, buildArgs }) => {
			const state = get();

			set({
				isBuildInProgress: true,
				isBuildOutputVisible: true,
				buildOutput: "",
				buildError: null,
			});

			try {
				await buildTemplate({
					imageTag,
					buildArgs,
					templateName: state.template.name,
					onBuildOutput: state.addBuildOutputChunk,
				});
			} catch (error) {
				console.error(error);
				if (isApiErrorResponse(error)) {
					console.log("askdjskdjk");
					set({ buildError: error });
				}
			} finally {
				set({ isBuildInProgress: false });
			}
		},

		setCurrentFilePath: (path) => set({ currentFilePath: path }),

		addBuildOutputChunk: (chunk) =>
			set((state) => ({
				...state,
				buildOutput: state.buildOutput + chunk,
			})),

		toggleBuildOutput: () =>
			set((state) => ({
				...state,
				isBuildOutputVisible: !state.isBuildOutputVisible,
			})),
	}));
}

const TemplateEditorStoreContext = createContext<TemplateEditorStore | null>(
	null,
);

function useTemplateEditorStore<T>(
	selector: (state: TemplateEditorState) => T,
): T {
	const store = useContext(TemplateEditorStoreContext);
	if (!store) throw new Error("TemplateEditorStore not in context");
	return useStore(store, selector);
}

export {
	TemplateEditorStoreContext,
	createTemplateEditorStore,
	useTemplateEditorStore,
};
export type { TemplateEditorStore, TemplateEditorState };
