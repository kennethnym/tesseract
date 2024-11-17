import { Loader2, type LucideProps } from "lucide-react";

function LoadingSpinner(props: LucideProps) {
	return <Loader2 className="animate-spin" {...props} />;
}

export { LoadingSpinner };
