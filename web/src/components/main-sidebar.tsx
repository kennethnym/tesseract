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
import { Link } from "@tanstack/react-router";
import { LayoutPanelLeft, ScrollText } from "lucide-react";

function MainSidebar() {
	return (
		<Sidebar>
			<SidebarHeader>
				<div className="flex flex-col p-2">
					<p className="font-bold">Tesseract</p>
					<p className="text-xs opacity-50">v0.1.0</p>
				</div>
			</SidebarHeader>
			<SidebarSeparator />
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton asChild>
								<Link to="/">
									<LayoutPanelLeft />
									Workspaces
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton asChild>
								<Link to="/templates">
									<ScrollText />
									Templates
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}

export { MainSidebar };
