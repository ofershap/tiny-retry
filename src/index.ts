export class AbortError extends Error {
  readonly name = "AbortError" as const;
  readonly originalError?: Error;

  constructor(messageOrError: string | Error) {
    if (messageOrError instanceof Error) {
      super(messageOrError.message);
      this.originalError = messageOrError;
    } else {
      super(messageOrError);
    }
  }
}

export interface FailedAttemptError extends Error {
  attemptNumber: number;
  retriesLeft: number;
}

export interface Options {
  retries?: number;
  factor?: number;
  minTimeout?: number;
  maxTimeout?: number;
  randomize?: boolean;
  signal?: AbortSignal;
  onFailedAttempt?: (error: FailedAttemptError) => void | Promise<void>;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function pRetry<T>(
  input: (attemptNumber: number) => T | Promise<T>,
  options?: Options,
): Promise<T> {
  const {
    retries = 10,
    factor = 2,
    minTimeout = 1000,
    maxTimeout = Infinity,
    randomize = false,
    signal,
    onFailedAttempt,
  } = options ?? {};

  let attempt = 0;

  while (true) {
    attempt++;

    if (signal?.aborted) {
      throw signal.reason ?? new AbortError("Aborted");
    }

    try {
      return await input(attempt);
    } catch (error) {
      if (error instanceof AbortError) {
        throw error.originalError ?? error;
      }

      if (signal?.aborted) {
        throw signal.reason ?? new AbortError("Aborted");
      }

      const isLastAttempt = attempt > retries;

      const failedError = error as FailedAttemptError;
      failedError.attemptNumber = attempt;
      failedError.retriesLeft = Math.max(retries - attempt, 0);

      if (isLastAttempt) {
        throw failedError;
      }

      if (onFailedAttempt) {
        await onFailedAttempt(failedError);
      }

      let delay = Math.min(
        minTimeout * Math.pow(factor, attempt - 1),
        maxTimeout,
      );

      if (randomize) {
        delay *= 1 + Math.random();
        delay = Math.max(delay, minTimeout);
      }

      await sleep(delay);
    }
  }
}

export default pRetry;
