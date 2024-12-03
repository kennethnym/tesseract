import { type ApiErrorDetails, isApiErrorResponse } from "@/api";
import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import { buildTemplate } from "./api";
import type { Template, TemplateMeta } from "./types";

interface TemplateEditorState {
	template: Template;
	currentFilePath: string;
	isBuildInProgress: boolean;
	isBuildOutputVisible: boolean;
	isVimModeEnabled: boolean;
	buildOutput: string;
	buildError: ApiErrorDetails | null;

	startBuild: ({
		imageTag,
		buildArgs,
	}: { imageTag: string; buildArgs: Record<string, string> }) => Promise<void>;

	setCurrentFilePath: (path: string) => void;

	addBuildOutputChunk: (chunk: string) => void;

	toggleBuildOutput: () => void;

	setIsVimModeEnabled: (enabled: boolean) => void;

	updateTemplateMetadata: (templateMetadata: TemplateMeta) => void;
}

type TemplateEditorStore = ReturnType<typeof createTemplateEditorStore>;

function createTemplateEditorStore({
	template,
	currentFilePath,
	isVimModeEnabled,
}: { template: Template; currentFilePath: string; isVimModeEnabled: boolean }) {
	return createStore<TemplateEditorState>()((set, get) => ({
		template,
		currentFilePath,
		isVimModeEnabled,
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

		setIsVimModeEnabled: (enabled: boolean) =>
			set({ isVimModeEnabled: enabled }),

		updateTemplateMetadata: (templateMetadata) =>
			set((state) => ({
				...state,
				template: { ...state.template, ...templateMetadata },
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
