import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "@/components/ui/sidebar.tsx";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutPanelLeft, ScrollText } from "lucide-react";

function MainSidebar() {
	return (
		<Sidebar>
			<SidebarHeader>
				<div className="flex flex-col p-2">
					<p className="font-bold">Tesseract</p>
					<p className="text-xs opacity-50">{import.meta.env.VITE_VERSION}</p>
				</div>
			</SidebarHeader>
			<SidebarSeparator />
			<SidebarContent>
				<SidebarGroup>
					<MainSidebarMenu />
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}

function MainSidebarMenu() {
	const router = useRouterState();

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton asChild isActive={router.location.pathname === "/"}>
					<Link to="/">
						<LayoutPanelLeft />
						Workspaces
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
			<SidebarMenuItem>
				<SidebarMenuButton
					asChild
					isActive={router.location.pathname === "/templates"}
				>
					<Link to="/templates">
						<ScrollText />
						Templates
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}

export { MainSidebar };
