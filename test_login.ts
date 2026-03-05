import "reflect-metadata";
import { POST } from "./app/api/auth/login/route.ts";

async function run() {
  const req = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "contractor",
      lotoId: "LOTO-2026-000789",
      contractorNumber: "C-9999"
    })
  });
  const res = await POST(req);
  console.log(res.status);
  console.log(await res.text());
}
run();
