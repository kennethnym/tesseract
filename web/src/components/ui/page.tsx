function Page({ children }: React.PropsWithChildren) {
	return (
		<div className="w-full flex items-start justify-center">
			<div className="w-3/4 lg:w-1/2 pt-8">{children}</div>
		</div>
	);
}

export { Page };
