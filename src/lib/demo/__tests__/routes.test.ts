/** @jest-environment node */
import { NextRequest } from "next/server";
import { mkdtemp, mkdir } from "node:fs/promises";
import path from "node:path";
import { GET, POST, DELETE } from "@/app/api/demo/voice/route";
import { POST as start } from "@/app/api/demo/start/route";
import { ownedLease } from "../ledger";
import { visitor } from "../http";
jest.mock("../ledger", () => ({
  ...jest.requireActual("../ledger"),
  startDemoReaper: jest.fn(),
}));
const env = { ...process.env };
const origin = "http://localhost:3000";
function request(
  route: string,
  method = "GET",
  cookie = "",
  body?: unknown,
  from = origin
) {
  return new NextRequest(origin + route, {
    method,
    headers: { origin: from, cookie, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
beforeEach(async () => {
  await mkdir("tmp", { recursive: true });
  process.env.DEMO_STATE_DIR = await mkdtemp(
    path.join(process.cwd(), "tmp", "demo-route-")
  );
  process.env.OPENAI_API_KEY = "test-server-secret";
  process.env.DEMO_COOKIE_SECRET = "test-cookie-secret";
});
afterEach(() => {
  process.env = { ...env };
  jest.restoreAllMocks();
});
async function room() {
  const landing = await GET(request("/api/demo/voice"));
  const cookie = landing.headers.get("set-cookie")!.split(";")[0];
  const response = await start(request("/api/demo/start", "POST", cookie));
  return { cookie, ...(await response.json()) };
}
test("same-origin and signed ownership gate funded calls", async () => {
  const fetcher = jest.spyOn(globalThis, "fetch");
  expect((await start(request("/api/demo/start", "POST"))).status).toBe(403);
  const r = await room();
  const body = {
    sessionId: r.sessionId,
    sdp: "v=0\r\nsynthetic-test-offer",
    language: "English",
  };
  expect(
    (
      await POST(
        request(
          "/api/demo/voice",
          "POST",
          r.cookie,
          body,
          "https://outside.example"
        )
      )
    ).status
  ).toBe(403);
  expect(
    (
      await POST(
        request("/api/demo/voice", "POST", "reviewer-demo=forged", body)
      )
    ).status
  ).toBe(429);
  expect(fetcher).not.toHaveBeenCalled();
});
test("SDP exchange keeps host keys private and tracks provider hangup", async () => {
  const r = await room();
  const fetcher = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response("answer-sdp", {
        status: 201,
        headers: { location: "/v1/realtime/calls/rtc_test" },
      })
    );
  const response = await POST(
    request("/api/demo/voice", "POST", r.cookie, {
      sessionId: r.sessionId,
      sdp: "v=0\r\nsynthetic-test-offer",
      language: "Bahasa Indonesia",
    })
  );
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.sdp).toBe("answer-sdp");
  expect(JSON.stringify(data)).not.toContain("test-server-secret");
  const options = fetcher.mock.calls[0][1]!;
  const session = JSON.parse(
    (options.body as FormData).get("session") as string
  );
  expect(session.audio.input.transcription.model).toBe("whisper-1");
  expect(session.instructions).toContain("Bahasa Indonesia");
  fetcher.mockResolvedValueOnce(new Response(null, { status: 500 }));
  expect(
    (
      await DELETE(
        request("/api/demo/voice", "DELETE", r.cookie, {
          sessionId: r.sessionId,
        })
      )
    ).status
  ).toBe(202);
  fetcher.mockResolvedValueOnce(new Response(null, { status: 200 }));
  expect(
    (
      await DELETE(
        request("/api/demo/voice", "DELETE", r.cookie, {
          sessionId: r.sessionId,
        })
      )
    ).status
  ).toBe(200);
});
test("provider failure releases pending connect and invalid input is rejected", async () => {
  const r = await room();
  jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(null, { status: 401 }));
  const req = request("/api/demo/voice", "POST", r.cookie, {
    sessionId: r.sessionId,
    sdp: "v=0\r\nsynthetic-test-offer",
    language: "English",
  });
  expect((await POST(req)).status).toBe(502);
  expect((await ownedLease(visitor(req).id, r.sessionId)).pendingUntil).toBe(0);
  expect(
    (
      await POST(
        request("/api/demo/voice", "POST", r.cookie, { sessionId: r.sessionId })
      )
    ).status
  ).toBe(422);
});
