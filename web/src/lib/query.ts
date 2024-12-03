interface IdleStatus {
	type: "idle";
}

interface LoadingStatus {
	type: "loading";
}

interface ErrorStatus<TErr = unknown> {
	type: "error";
	error: TErr;
}

interface OkStatus {
	type: "ok";
}

type QueryStatus<TErr = unknown> =
	| IdleStatus
	| LoadingStatus
	| ErrorStatus<TErr>
	| OkStatus;

export type { QueryStatus, IdleStatus, LoadingStatus, ErrorStatus, OkStatus };
