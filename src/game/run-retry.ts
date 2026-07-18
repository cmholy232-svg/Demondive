export interface RunStartRequest {
  depth: number;
  seed?: number;
}

export function sameSeedRetryRequest(seed: number): RunStartRequest {
  return { depth:1, seed:seed >>> 0 };
}

export function newRunRequest(): RunStartRequest {
  return { depth:1 };
}
