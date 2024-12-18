import { MainSidebar } from "@/components/main-sidebar.tsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header.tsx";
import { Page } from "@/components/ui/page.tsx";
import { SidebarProvider } from "@/components/ui/sidebar.tsx";
import { Toaster } from "@/components/ui/toaster";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { NewWorkspaceDialog } from "./new-workspace-dialog";
import { WorkspaceTable } from "./workspace-table";

function WorkspaceDashboard() {
	return (
		<SidebarProvider>
			<aside>
				<MainSidebar />
			</aside>
			<Page>
				<header>
					<PageHeader>Workspaces</PageHeader>
				</header>
				<Main />
				<Toaster />
			</Page>
		</SidebarProvider>
	);
}

function Main() {
	const [isNewWorkspaceDialogOpen, setIsNewWorkspaceDialogOpen] =
		useState(false);

	const closeWorkspaceDialog = useCallback(() => {
		setIsNewWorkspaceDialogOpen(false);
	}, []);

	return (
		<Dialog
			open={isNewWorkspaceDialogOpen}
			onOpenChange={setIsNewWorkspaceDialogOpen}
		>
			<main>
				<DialogTrigger asChild>
					<div className="flex flex-row py-4">
						<Button variant="secondary" size="sm">
							<Plus /> New workspace
						</Button>
					</div>
				</DialogTrigger>
				<WorkspaceTable />
			</main>

			<NewWorkspaceDialog onCreateSuccess={closeWorkspaceDialog} />
		</Dialog>
	);
}

export { WorkspaceDashboard };
