/**
 * Vérifie que le redirect www ignore le port interne (ex. :8082).
 * Usage : node --import tsx scripts/check-www-redirect.mjs
 */
import { NextRequest } from "next/server";
import { proxy } from "../proxy.ts";

const path = "/archives/2015/01/06/31264439.html";
const search = "?utm=test";
const expected = `https://rustyjamesblog.link${path}${search}`;

const request = new NextRequest(`http://127.0.0.1:8082${path}${search}`, {
  headers: { host: "www.rustyjamesblog.link:8082" },
});

const response = proxy(request);
const location = response.headers.get("location");
const status = response.status;

if (status !== 308) {
  console.error(`FAIL: status=${status}, expected 308`);
  process.exit(1);
}

if (location !== expected) {
  console.error(`FAIL: location=${location}\n      expected=${expected}`);
  process.exit(1);
}

if (location.includes(":8082")) {
  console.error(`FAIL: location still contains :8082 → ${location}`);
  process.exit(1);
}

console.log(`OK: ${status} → ${location}`);
