import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useContext } from "react";
import { WorkspaceTableRowContext } from "./workspace-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortInfoTab } from "./workspace-port-info-tab";

function WorkspaceInfoDialog() {
	const workspace = useContext(WorkspaceTableRowContext);

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>{workspace.name}</DialogTitle>
				<DialogDescription>{workspace.imageTag}</DialogDescription>
			</DialogHeader>
			<Tabs defaultValue="ssh">
				<TabsList>
					<TabsTrigger value="ssh">SSH Information</TabsTrigger>
					<TabsTrigger value="ports">Forwarded Ports</TabsTrigger>
				</TabsList>
				<TabsContent value="ssh">
					<SshTab />
				</TabsContent>
				<TabsContent value="ports">
					<PortInfoTab />
				</TabsContent>
			</Tabs>
		</DialogContent>
	);
}

function TabContainer({ children }: React.PropsWithChildren) {
	return <div className="pt-4">{children}</div>;
}

function SshTab() {
	const workspace = useContext(WorkspaceTableRowContext);

	if (!workspace.sshPort) {
		return (
			<p>SSH server is not running in this workspace, so SSH is unavailable.</p>
		);
	}

	return (
		<TabContainer>
			<p className="text-sm text-muted-foreground">SSH Port</p>
			<pre>{workspace.sshPort}</pre>
			<p className="text-sm text-muted-foreground mt-4">Command</p>
			<pre>
				ssh -p {workspace.sshPort} testuser@
				{import.meta.env.VITE_HOST_NAME || window.location.hostname}
			</pre>
		</TabContainer>
	);
}

export { WorkspaceInfoDialog };
