import { ApiError } from "@/api";
import { CodeMirrorEditor } from "@/components/codemirror-editor";
import { Button } from "@/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { superstructResolver } from "@hookform/resolvers/superstruct";
import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ChevronDown,
	ChevronUp,
	Hammer,
	Loader2,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { object, pattern, string, type Infer } from "superstruct";
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
import { DialogClose } from "@radix-ui/react-dialog";

const BuildOptionForm = object({
	imageName: pattern(string(), /^[\w-]+$/),
});

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
			return (
				<main className="w-full h-full flex flex-col items-center justify-center space-y-2">
					<p>Template does not exist</p>
					<Button variant="secondary">Create template</Button>
				</main>
			);
		}

		let message = "";
		switch (error) {
			case ApiError.Network:
				message = "We are having trouble contacting the server.";
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

function _TemplateEditor({
	template,
	currentFilePath,
}: { template: Template; currentFilePath: string }) {
	const store = useRef<TemplateEditorStore | null>(null);
	if (!store.current) {
		store.current = createTemplateEditorStore({ template, currentFilePath });
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
					<EditorTopBar />
					<main className="w-full h-full flex flex-col">
						<Editor />
						<TemplateBuildOutputPanel />
					</main>
				</div>
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
	const { updateTemplateFile } = useUpdateTemplateFile(templateName);

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
		/>
	);
}

function EditorTopBar() {
	const currentFilePath = useTemplateEditorStore(
		(state) => state.currentFilePath,
	);
	const isBuildInProgress = useTemplateEditorStore(
		(state) => state.isBuildInProgress,
	);

	return (
		<Dialog>
			<header className="sticky top-0 flex shrink-0 items-center justify-between gap-2 border-b bg-background p-4">
				<p className="font-bold">{currentFilePath}</p>
				<DialogTrigger>
					<Button>
						{isBuildInProgress ? (
							<Loader2 className="animate-spin" />
						) : (
							<Hammer />
						)}{" "}
						Build
					</Button>
				</DialogTrigger>
			</header>
			<BuildOptionDialog />
		</Dialog>
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

function BuildOptionDialog() {
	const templateName = useTemplateEditorStore((state) => state.template.name);
	const startBuild = useTemplateEditorStore((state) => state.startBuild);
	const form = useForm({
		resolver: superstructResolver(BuildOptionForm),
		defaultValues: {
			imageName: templateName,
		},
	});

	function onSubmit(values: Infer<typeof BuildOptionForm>) {
		startBuild({
			imageTag: values.imageName,
		});
	}

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Build options</DialogTitle>
				<DialogDescription>
					Build options for this Docker image
				</DialogDescription>
			</DialogHeader>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<FormField
						control={form.control}
						name="imageName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Image name</FormLabel>
								<FormControl>
									<Input placeholder={templateName} {...field} />
								</FormControl>
								<FormDescription>
									Must only contain alphanumeric characters and "-".
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<DialogFooter className="pt-4">
						<DialogClose asChild>
							<Button type="submit">Build template</Button>
						</DialogClose>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}

export { TemplateEditor };
