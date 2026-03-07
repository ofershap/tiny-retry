# tiny-retry

[![npm version](https://img.shields.io/npm/v/tiny-pretry.svg)](https://www.npmjs.com/package/tiny-pretry)
[![npm downloads](https://img.shields.io/npm/dm/tiny-pretry.svg)](https://www.npmjs.com/package/tiny-pretry)
[![CI](https://github.com/ofershap/tiny-retry/actions/workflows/ci.yml/badge.svg)](https://github.com/ofershap/tiny-retry/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Retry async functions with exponential backoff. Same API as [`p-retry`](https://github.com/sindresorhus/p-retry), but ships both ESM and CJS with zero dependencies.

```ts
import { pRetry } from "tiny-pretry";

const data = await pRetry(
  () => fetch("https://api.example.com/data").then((r) => r.json()),
  { retries: 3 },
);
```

> ~800 bytes gzipped. Zero dependencies. Replaces p-retry without the ESM-only headache.

![Demo](assets/demo.gif)

<sub>Demo built with <a href="https://github.com/ofershap/remotion-readme-kit">remotion-readme-kit</a></sub>

## Install

```bash
npm install tiny-pretry
```

## Usage

```ts
import { pRetry } from "tiny-pretry";

const result = await pRetry(
  async (attemptNumber) => {
    console.log(`Attempt ${attemptNumber}`);
    const res = await fetch("https://api.example.com");
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  },
  { retries: 5 },
);
```

### Stop retrying early

```ts
import { pRetry, AbortError } from "tiny-pretry";

await pRetry(
  async () => {
    const res = await fetch("https://api.example.com");
    if (res.status === 401) {
      throw new AbortError("Not authorized, retrying won't help");
    }
    return res.json();
  },
  { retries: 5 },
);
```

### Track failed attempts

```ts
await pRetry(doWork, {
  retries: 5,
  onFailedAttempt: (error) => {
    console.log(
      `Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`,
    );
  },
});
```

### Cancel with AbortSignal

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 10000);

await pRetry(unreliableCall, {
  retries: 10,
  signal: controller.signal,
});
```

## Differences from `p-retry`

`p-retry` v6+ is ESM-only. If you `require("p-retry")` in a CommonJS project, you get `ERR_REQUIRE_ESM`. `tiny-retry` works with both `import` and `require()`.

|              | `p-retry`                   | `tiny-retry` |
| ------------ | --------------------------- | ------------ |
| CJS support  | v5 only (v6+ ESM-only)      | ESM + CJS    |
| Dependencies | `retry`, `is-network-error` | 0            |
| TypeScript   | separate @types             | native       |
| Export       | default                     | named        |

## Migrating from p-retry

```diff
- import pRetry from "p-retry";
+ import { pRetry } from "tiny-pretry";
```

One line. Everything else stays the same.

## API

### `pRetry(fn, options?)`

Retries `fn` until it succeeds or retries are exhausted.

- `fn(attemptNumber)` - function to retry (attempt starts at 1)
- `options.retries` - max retries (default: `10`)
- `options.factor` - exponential factor (default: `2`)
- `options.minTimeout` - initial delay in ms (default: `1000`)
- `options.maxTimeout` - max delay cap in ms (default: `Infinity`)
- `options.randomize` - add jitter to delays (default: `false`)
- `options.signal` - `AbortSignal` for cancellation
- `options.onFailedAttempt(error)` - called after each failure

### `AbortError`

Throw `new AbortError(message)` or `new AbortError(error)` inside `fn` to stop retrying immediately.

### `FailedAttemptError`

The error passed to `onFailedAttempt` has two extra properties:

- `attemptNumber` - which attempt just failed (1-based)
- `retriesLeft` - how many retries remain

## The tiny-\* family

Drop-in replacements for sindresorhus async utilities. All ship ESM + CJS with zero dependencies.

| Package                                                | Replaces             | What it does                   |
| ------------------------------------------------------ | -------------------- | ------------------------------ |
| [tiny-limit](https://github.com/ofershap/tiny-limit)   | p-limit              | Concurrency limiter            |
| [tiny-map](https://github.com/ofershap/tiny-map)       | p-map                | Concurrent map with order      |
| **tiny-retry**                                         | p-retry              | Retry with exponential backoff |
| [tiny-queue](https://github.com/ofershap/tiny-queue)   | p-queue              | Priority task queue            |
| [tiny-ms](https://github.com/ofershap/tiny-ms)         | ms                   | Parse/format durations         |
| [tiny-escape](https://github.com/ofershap/tiny-escape) | escape-string-regexp | Escape regex chars             |

Want all async utilities in one import? Use [`tiny-pasync`](https://github.com/ofershap/tiny-async).

## Author

[![Made by ofershap](https://gitshow.dev/api/card/ofershap)](https://gitshow.dev/ofershap)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/ofershap)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat&logo=github&logoColor=white)](https://github.com/ofershap)

---

If this saved you from `ERR_REQUIRE_ESM`, [star the repo](https://github.com/ofershap/tiny-retry) or [open an issue](https://github.com/ofershap/tiny-retry/issues) if something breaks.

---

<sub>README built with [README Builder](https://ofershap.github.io/readme-builder/)</sub>

## License

[MIT](LICENSE) &copy; [Ofer Shapira](https://github.com/ofershap)
