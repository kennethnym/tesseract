import { promiseOrThrow } from "./lib/errors";

enum ApiError {
	NotFound = "NOT_FOUND",
	BadRequest = "BAD_REQUEST",
	Internal = "INTERNAL",
	Network = "NETWORK",
}

async function fetchApi(
	url: URL | RequestInfo,
	init?: RequestInit,
): Promise<Response> {
	const res = await promiseOrThrow(
		fetch(`${import.meta.env.VITE_API_URL}/api${url}`, init),
		() => ApiError.Network,
	);
	if (res.status !== 200) {
		switch (res.status) {
			case 401:
				throw ApiError.BadRequest;
			case 404:
				throw ApiError.NotFound;
			default:
				throw ApiError.Internal;
		}
	}
	return res;
}

export { ApiError, fetchApi };
