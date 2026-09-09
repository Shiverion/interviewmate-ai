export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDemoReaper } = await import("@/lib/demo/ledger");
    startDemoReaper();
  }
}
