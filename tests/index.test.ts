import { describe, it, expect } from "vitest";
import { pRetry, AbortError } from "../src/index.js";
import type { FailedAttemptError } from "../src/index.js";

describe("pRetry", () => {
  it("returns on first success", async () => {
    const result = await pRetry(() => "ok", { retries: 3 });
    expect(result).toBe("ok");
  });

  it("retries on failure then succeeds", async () => {
    let attempt = 0;
    const result = await pRetry(
      () => {
        attempt++;
        if (attempt < 3) throw new Error("fail");
        return "done";
      },
      { retries: 5, minTimeout: 1, factor: 1 },
    );
    expect(result).toBe("done");
    expect(attempt).toBe(3);
  });

  it("throws after all retries exhausted", async () => {
    await expect(
      pRetry(
        () => {
          throw new Error("always fail");
        },
        { retries: 2, minTimeout: 1, factor: 1 },
      ),
    ).rejects.toThrow("always fail");
  });

  it("passes attemptNumber to the function", async () => {
    const attempts: number[] = [];
    await pRetry(
      (attemptNumber) => {
        attempts.push(attemptNumber);
        if (attemptNumber < 3) throw new Error("retry");
        return "ok";
      },
      { retries: 5, minTimeout: 1, factor: 1 },
    );
    expect(attempts).toEqual([1, 2, 3]);
  });

  it("calls onFailedAttempt with error details", async () => {
    const errors: FailedAttemptError[] = [];
    let calls = 0;

    await pRetry(
      () => {
        calls++;
        if (calls < 3) throw new Error("oops");
        return "ok";
      },
      {
        retries: 5,
        minTimeout: 1,
        factor: 1,
        onFailedAttempt: (err) => {
          errors.push({ ...err } as FailedAttemptError);
        },
      },
    );

    expect(errors).toHaveLength(2);
    expect((errors[0] as FailedAttemptError).attemptNumber).toBe(1);
    expect((errors[0] as FailedAttemptError).retriesLeft).toBe(4);
    expect((errors[1] as FailedAttemptError).attemptNumber).toBe(2);
    expect((errors[1] as FailedAttemptError).retriesLeft).toBe(3);
  });

  it("stops immediately on AbortError with string", async () => {
    let attempts = 0;
    await expect(
      pRetry(
        () => {
          attempts++;
          throw new AbortError("stop now");
        },
        { retries: 5, minTimeout: 1 },
      ),
    ).rejects.toThrow("stop now");
    expect(attempts).toBe(1);
  });

  it("stops immediately on AbortError wrapping an error", async () => {
    const original = new Error("wrapped");
    await expect(
      pRetry(
        () => {
          throw new AbortError(original);
        },
        { retries: 5, minTimeout: 1 },
      ),
    ).rejects.toThrow("wrapped");
  });

  it("supports AbortSignal", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5);

    await expect(
      pRetry(
        () => {
          throw new Error("fail");
        },
        { retries: 100, minTimeout: 10, signal: controller.signal },
      ),
    ).rejects.toThrow();
  });

  it("rejects if signal already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      pRetry(() => "ok", { signal: controller.signal }),
    ).rejects.toThrow();
  });

  it("respects retries: 0", async () => {
    let attempts = 0;
    await expect(
      pRetry(
        () => {
          attempts++;
          throw new Error("fail");
        },
        { retries: 0 },
      ),
    ).rejects.toThrow("fail");
    expect(attempts).toBe(1);
  });

  it("works with async functions", async () => {
    let calls = 0;
    const result = await pRetry(
      async () => {
        calls++;
        if (calls < 2) throw new Error("async fail");
        return 42;
      },
      { retries: 3, minTimeout: 1, factor: 1 },
    );
    expect(result).toBe(42);
  });

  it("uses exponential backoff", async () => {
    const timestamps: number[] = [];

    try {
      await pRetry(
        () => {
          timestamps.push(Date.now());
          throw new Error("fail");
        },
        { retries: 3, minTimeout: 50, factor: 2 },
      );
    } catch {
      // expected
    }

    expect(timestamps.length).toBe(4);
    const gap1 = (timestamps[1] as number) - (timestamps[0] as number);
    const gap2 = (timestamps[2] as number) - (timestamps[1] as number);
    expect(gap1).toBeGreaterThanOrEqual(40);
    expect(gap2).toBeGreaterThan(gap1 * 1.5);
  });

  it("caps delay at maxTimeout", async () => {
    const timestamps: number[] = [];

    try {
      await pRetry(
        () => {
          timestamps.push(Date.now());
          throw new Error("fail");
        },
        { retries: 3, minTimeout: 50, factor: 100, maxTimeout: 60 },
      );
    } catch {
      // expected
    }

    for (let i = 1; i < timestamps.length; i++) {
      const gap = (timestamps[i] as number) - (timestamps[i - 1] as number);
      expect(gap).toBeLessThan(200);
    }
  });

  it("supports async onFailedAttempt", async () => {
    let hookCalled = false;
    let calls = 0;

    await pRetry(
      () => {
        calls++;
        if (calls < 2) throw new Error("fail");
        return "ok";
      },
      {
        retries: 3,
        minTimeout: 1,
        factor: 1,
        onFailedAttempt: async () => {
          await new Promise<void>((r) => setTimeout(r, 1));
          hookCalled = true;
        },
      },
    );

    expect(hookCalled).toBe(true);
  });

  it("retriesLeft is 0 on last failed attempt", async () => {
    let lastRetriesLeft = -1;

    try {
      await pRetry(
        () => {
          throw new Error("fail");
        },
        {
          retries: 2,
          minTimeout: 1,
          factor: 1,
          onFailedAttempt: (err) => {
            lastRetriesLeft = err.retriesLeft;
          },
        },
      );
    } catch {
      // expected
    }

    expect(lastRetriesLeft).toBe(0);
  });
});
