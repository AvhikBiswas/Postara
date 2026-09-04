import { startRuntime } from "./lib/runtime";

async function main() {
  await startRuntime();
  console.info("[postara.worker] listening for executions");
}

void main();
