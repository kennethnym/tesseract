import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";
import { useTemplateEditorStore } from "./template-editor-store";
import { TemplateMetadataDialog } from "./template-metadata-dialog";

function TemplateEditorSidebar() {
	const templateName = useTemplateEditorStore((state) => state.template.name);
	const templateDescription = useTemplateEditorStore(
		(state) => state.template.description || "No description",
	);
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
				<div className="flex justify-between items-center">
					<div className="flex flex-col px-2">
						<p className="font-semibold">{templateName}</p>
						<p className="text-xs opacity-80">{templateDescription}</p>
					</div>
					<TemplateNameDescriptionEditButton />
				</div>
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

function TemplateNameDescriptionEditButton() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon">
					<Pencil />
				</Button>
			</DialogTrigger>
			<TemplateMetadataDialog />
		</Dialog>
	);
}

export { TemplateEditorSidebar };
