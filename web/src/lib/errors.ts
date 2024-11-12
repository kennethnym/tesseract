async function promiseOrThrow<T, TErr>(
	promise: Promise<T>,
	orThrow: (error: unknown) => TErr,
): Promise<T> {
	try {
		return await promise;
	} catch (err: unknown) {
		throw orThrow(err);
	}
}

export { promiseOrThrow };
