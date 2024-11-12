function PageHeader({ children }: React.PropsWithChildren) {
	return (
		<h1 className="scroll-m-20 border-border pb-2 text-2xl font-semibold tracking-tight first:mt-0">
			{children}
		</h1>
	);
}

export { PageHeader };
