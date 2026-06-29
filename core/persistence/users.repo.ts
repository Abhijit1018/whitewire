import { eq } from "drizzle-orm";
import { users } from "./schema";

type Db = any; // drizzle instance (Neon or PGlite); typed loosely to share both

export async function ensureUser(db: Db, u: { id: string; email: string }) {
  await db.insert(users).values(u).onConflictDoNothing();
  const [row] = await db.select().from(users).where(eq(users.id, u.id));
  return row;
}
