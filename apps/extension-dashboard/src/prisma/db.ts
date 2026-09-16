import "dotenv/config";
// Node.js has no global `Temporal` before v26.8.2 (every 22/24 build included),
// but the generated contract decodes timestamptz columns as Temporal.Instant.
// Must load before the first query — see RUNTIME.TEMPORAL_UNAVAILABLE.
import "temporal-polyfill/full/global";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

export const db = postgres<Contract>({
  contractJson,
  url: process.env["DATABASE_URL"]!,
});
