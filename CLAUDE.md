# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev    # Start with hot reload
bun run start  # Start without hot reload
```

No test runner is configured.

## Architecture

This is a Bun + Hono webhook receiver API for Queue-it sneaker bot queue passes. It has three source files:

- `src/index.ts` — Hono app entry point. Defines all routes, Redis storage logic, SSE broadcasting, and a periodic cleanup job.
- `src/helper.ts` — Parses incoming Discord webhook payloads by inspecting `embeds[0].title` to detect which bot sent it (SecuredBot, OW, TKT, T-Splash), then returns a normalized `ProcessedData` object. TKT and T-Splash also log to PostgreSQL.
- `src/db.ts` — Postgres client (via `postgres` package), initialized from `DATABASE_URL`.

## Data Flow

1. A sneaker bot POSTs a Discord-style webhook payload to `POST /webhook`.
2. `processData()` in `helper.ts` identifies the bot by embed title and extracts the queue link and optional proxy.
3. The normalized item is stored in Redis: item data in a hash (`items:data`, keyed by UUID), and ordering in a list (`items:order`, newest-first).
4. All connected SSE clients (`GET /sse`) are broadcast the new item via `broadcast()`.
5. A `setInterval` cleanup runs every minute: trims to 30 items max, or clears everything if the newest item is older than 5 minutes.

## Redis Schema

- `items:data` — Redis hash: `{ [uuid]: JSON.stringify(ProcessedData) }`
- `items:order` — Redis list: `[newestId, ..., oldestId]`

## Environment Variables

- `REDIS_URL` — Redis connection string
- `DATABASE_URL` — PostgreSQL connection string
- `ACCESS_PIN` — PIN for protected routes (`/data`, `/sse`, `/click/:id`); passed via `x-access-pin` header or `?pin=` query param

## Auth

`POST /auth`, `POST /webhook`, and `POST /tickets` are public. All other routes (`GET /data`, `GET /sse`, `POST /click/:id`) require PIN verification via `verifyPin` middleware.

## Bot Detection

`processData()` dispatches on `embeds[0].title`:

| Title                 | Bot        | Link source                      |
| --------------------- | ---------- | -------------------------------- |
| `"Queue Passed!"`     | SecuredBot | `embeds[0].url`                  |
| `"PASSED QUEUE"`      | OW         | `embeds[0].fields[0].value`      |
| `"--Queue SUCCESS--"` | TKT        | `fields[6].value` (split `\|\|`) |
| `"Exported Link"`     | T-Splash   | `embeds[0].url`                  |

TKT and T-Splash also extract `proxy` from `fields[4].value` and insert a row into the `"Logs"` PostgreSQL table.

## Data Shapes

```ts
interface ProcessedData {
  id: string; // UUID
  bot_name: string;
  link: string; // Queue-it link
  click_count: number;
  timestamp: number; // Date.now()
}

interface TicketData {
  bookingRef: string;
  email: string;
  eventName: string;
  venue: string;
  category: string;
  quantity: number;
  seatAssignment: Record<string, string>[];
  pricePerTicket: number;
  totalPrice: number;
  paymentType: string;
  ticketType: string;
  startTime: string;
}
```
