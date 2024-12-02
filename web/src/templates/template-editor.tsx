import { API_ERROR_BAD_TEMPLATE, ApiError } from "@/api";
import { CodeMirrorEditor } from "@/components/codemirror-editor";
import { Button } from "@/components/ui/button.tsx";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { useStore } from "zustand";
import { useTemplate, useTemplateFile, useUpdateTemplateFile } from "./api";
import { templateEditorRoute } from "./routes";
import {
	type TemplateEditorStore,
	TemplateEditorStoreContext,
	createTemplateEditorStore,
	useTemplateEditorStore,
} from "./template-editor-store";
import type { Template } from "./types";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { TemplateEditorTopBar } from "./template-editor-top-bar";

function TemplateEditor() {
	const { templateName, _splat } = templateEditorRoute.useParams();
	const { data: template, isLoading, error } = useTemplate(templateName);

	if (isLoading) {
		return (
			<main className="w-full h-full flex items-center justify-center">
				<Loader2 className="animate-spin" />
			</main>
		);
	}

	if (error || !template) {
		if (error === ApiError.NotFound) {
			return <TemplateNotFound />;
		}

		let message = "";
		switch (error) {
			case ApiError.Network:
				message = "Having trouble contacting the server.";
				break;
			default:
				message = "An error occurred on our end.";
				break;
		}

		return (
			<main className="w-full h-full flex flex-col items-center justify-center space-y-2">
				<p className="text-destructive">{message}</p>
				<Button variant="secondary">Refresh</Button>
			</main>
		);
	}

	return <_TemplateEditor template={template} currentFilePath={_splat ?? ""} />;
}

function TemplateNotFound() {
	const router = useRouter();

	return (
		<main className="w-full h-full flex flex-col items-center justify-center space-y-2">
			<p>Template does not exist</p>
			<Button
				variant="secondary"
				onClick={() => {
					router.navigate({ to: "/templates", replace: true });
				}}
			>
				Show all templates
			</Button>
		</main>
	);
}

function _TemplateEditor({
	template,
	currentFilePath,
}: { template: Template; currentFilePath: string }) {
	const store = useRef<TemplateEditorStore | null>(null);
	if (!store.current) {
		store.current = createTemplateEditorStore({
			template,
			currentFilePath,
			isVimModeEnabled: localStorage.getItem("vimModeEnabled") === "true",
		});
	}

	const setCurrentFilePath = useStore(
		store.current,
		(state) => state.setCurrentFilePath,
	);

	useEffect(() => {
		setCurrentFilePath(currentFilePath);
	}, [setCurrentFilePath, currentFilePath]);

	return (
		<TemplateEditorStoreContext.Provider value={store.current}>
			<SidebarProvider>
				<EditorSidebar />
				<div className="flex flex-col w-full min-w-0">
					<TemplateEditorTopBar />
					<main className="w-full h-full flex flex-col">
						<Editor />
						<TemplateBuildOutputPanel />
					</main>
				</div>
				<Toaster />
				<BuildErrorToast />
			</SidebarProvider>
		</TemplateEditorStoreContext.Provider>
	);
}

function Editor() {
	const templateName = useTemplateEditorStore((state) => state.template.name);
	const currentPath = useTemplateEditorStore((state) => state.currentFilePath);
	const {
		isLoading,
		data: fileContent,
		error,
	} = useTemplateFile(templateName, currentPath);
	const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { updateTemplateFile, error: updateError } =
		useUpdateTemplateFile(templateName);
	const { toast } = useToast();
	const isVimModeEnabled = useTemplateEditorStore(
		(state) => state.isVimModeEnabled,
	);

	useEffect(() => {
		if (updateError) {
			toast({
				variant: "destructive",
				title: "Failed to save template",
			});
		}
	}, [updateError, toast]);

	useEffect(
		() => () => {
			if (saveTimeout.current) {
				clearTimeout(saveTimeout.current);
			}
		},
		[],
	);

	if (!currentPath) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				<p>Select a file from the sidebar</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				<p className="animate-pulse">Loading file…</p>
			</div>
		);
	}

	if (error || fileContent === undefined) {
		let message = "";
		switch (error) {
			case ApiError.NotFound:
				message = "This file does not exist in the template.";
				break;
			case ApiError.Network:
				message = "Having trouble contacting the server.";
				break;
			default:
				message = "An error occured on our end.";
		}

		return (
			<div className="w-full h-full flex items-center justify-center">
				<p className="text-destructive">{message}</p>
			</div>
		);
	}

	function onValueChanged(path: string, value: string) {
		if (saveTimeout.current) {
			clearTimeout(saveTimeout.current);
		}
		saveTimeout.current = setTimeout(() => {
			updateTemplateFile(path, value);
		}, 500);
	}

	return (
		<CodeMirrorEditor
			className="w-full flex-1 grow"
			path={currentPath}
			initialValue={fileContent}
			onValueChanged={onValueChanged}
			vimMode={isVimModeEnabled}
		/>
	);
}

function EditorSidebar() {
	const templateName = useTemplateEditorStore((state) => state.template.name);
	return (
		<Sidebar>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild className="opacity-80">
							<Link to="/templates" className="text-xs">
								<ArrowLeft /> All templates
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
				<p className="px-2 font-semibold">{templateName}</p>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Files</SidebarGroupLabel>
					<EditorSidebarFileTree />
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}

function EditorSidebarFileTree() {
	const template = useTemplateEditorStore((state) => state.template);
	const currentFilePath = useTemplateEditorStore(
		(state) => state.currentFilePath,
	);

	return (
		<SidebarMenu>
			{Object.values(template.files).map((file) => (
				<SidebarMenuItem key={file.path}>
					<SidebarMenuButton isActive={currentFilePath === file.path} asChild>
						<Link to={`/templates/${template.name}/${file.path}`}>
							{file.path}
						</Link>
					</SidebarMenuButton>
				</SidebarMenuItem>
			))}
		</SidebarMenu>
	);
}

function TemplateBuildOutputPanel() {
	const isBuildOutputVisible = useTemplateEditorStore(
		(state) => state.isBuildOutputVisible,
	);
	const toggleBuildOutput = useTemplateEditorStore(
		(state) => state.toggleBuildOutput,
	);

	return (
		<div
			className={cn(
				"flex flex-col overflow-hidden w-full",
				isBuildOutputVisible ? "h-96" : "",
			)}
		>
			<div className="flex justify-between items-center border-y border-y-border pl-4 pr-2 py-0.5">
				<p className="font-semibold text-sm">Build output</p>
				<Button variant="ghost" size="icon" onClick={toggleBuildOutput}>
					{isBuildOutputVisible ? <ChevronDown /> : <ChevronUp />}
				</Button>
			</div>
			{isBuildOutputVisible ? <BuildOutput /> : null}
		</div>
	);
}

function BuildOutput() {
	const buildOutput = useTemplateEditorStore((state) => state.buildOutput);
	const el = useRef<HTMLPreElement | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (el.current) {
			el.current.scrollTo(0, el.current.scrollHeight);
		}
	}, [buildOutput]);

	return (
		<pre ref={el} className="p-4 overflow-auto">
			{buildOutput}
		</pre>
	);
}

function BuildErrorToast() {
	const buildError = useTemplateEditorStore((state) => state.buildError);
	const { toast } = useToast();

	useEffect(() => {
		if (!buildError) return;

		switch (buildError.code) {
			case API_ERROR_BAD_TEMPLATE:
				toast({
					variant: "destructive",
					title: "Invalid template",
					description: buildError.error,
				});
				break;

			default:
				toast({
					variant: "destructive",
					title: "Unexpected error",
					description: buildError.error,
				});
				break;
		}
	}, [buildError, toast]);

	return false;
}

export { TemplateEditor };
