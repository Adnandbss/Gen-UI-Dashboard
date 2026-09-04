import { kpis, monthlyPl, transactions } from "./schema";
import { getDb, hasDatabase } from "../lib/db";
import { KPIS, MONTHLY_PL, TRANSACTIONS } from "../lib/warehouse/seed-data";

async function seed() {
  if (!hasDatabase()) {
    console.error("DATABASE_URL is not set. Add it to .env.local and retry.");
    process.exit(1);
  }

  const db = getDb();

  await db.delete(kpis);
  await db.delete(transactions);
  await db.delete(monthlyPl);

  await db.insert(monthlyPl).values(MONTHLY_PL);
  await db.insert(transactions).values(TRANSACTIONS);
  await db.insert(kpis).values(KPIS);

  console.log(
    `Seeded ${MONTHLY_PL.length} months, ${TRANSACTIONS.length} transactions, ${KPIS.length} KPI rows.`,
  );
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
