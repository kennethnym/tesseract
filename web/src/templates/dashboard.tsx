import { MainSidebar } from "@/components/main-sidebar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header.tsx";
import { Page } from "@/components/ui/page.tsx";
import { SidebarProvider } from "@/components/ui/sidebar.tsx";
import { Toaster } from "@/components/ui/toaster";
import { Plus } from "lucide-react";
import { NewTemplateDialog } from "./new-template-dialog";
import { TemplateTable } from "./template-table";

function TemplatesDashboard() {
	return (
		<SidebarProvider>
			<aside>
				<MainSidebar />
			</aside>
			<Page>
				<PageHeader>Templates</PageHeader>
				<Main />
				<Toaster />
			</Page>
		</SidebarProvider>
	);
}

function Main() {
	return (
		<Dialog>
			<main>
				<DialogTrigger asChild>
					<div className="flex flex-row py-4">
						<Button variant="secondary" size="sm">
							<Plus /> New template
						</Button>
					</div>
				</DialogTrigger>
				<TemplateTable />
			</main>
			<NewTemplateDialog />
		</Dialog>
	);
}

export { TemplatesDashboard };
