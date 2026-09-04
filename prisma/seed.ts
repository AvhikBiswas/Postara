import { ensureSeeded } from "../src/lib/services/bootstrap";

async function main() {
  await ensureSeeded();
  console.info("Seeded Postara demo users if the database was empty.");
}

void main();
