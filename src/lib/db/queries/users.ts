import { getSupabase } from "@/lib/supabase/client";
import { hashPassword } from "@/lib/auth/password";
import type { User } from "@/lib/types/domain";

interface UserRow {
  id: string;
  name: string;
  email: string;
  created_at: string;
  password_hash: string | null;
}

function rowToUser(row: UserRow): User {
  return { id: row.id, name: row.name, email: row.email, createdAt: row.created_at };
}

// Demo-only password (override with DEMO_ACCOUNT_PASSWORD if you want
// something else locally). Real SSO/RTA-intranet identity is out of scope
// for this build — see README.
const DEMO_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD ?? "RtaDemo#2026";

const DEMO_USER = { name: "Amina Al Marri", email: "participant@pilot.rta.gov.ae" };

let seedChecked = false;

export async function ensureSeeded(): Promise<void> {
  if (seedChecked) return;
  const db = getSupabase();
  const { count, error } = await db.from("users").select("id", { count: "exact", head: true });
  if (error) throw new Error(`Supabase error: ${error.message}`);

  if (!count) {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const { error: insertError } = await db
      .from("users")
      .insert({ name: DEMO_USER.name, email: DEMO_USER.email, password_hash: passwordHash });
    if (insertError) throw new Error(`Supabase error: ${insertError.message}`);
  } else {
    // Backfill: a database migrated from 0001 alone has seeded rows with no
    // password_hash yet (the column is new in 0002) — without this those
    // accounts could never sign in.
    const { data: unset, error: unsetError } = await db.from("users").select("id, email").is("password_hash", null);
    if (unsetError) throw new Error(`Supabase error: ${unsetError.message}`);
    const toBackfill = ((unset ?? []) as { id: string; email: string }[]).filter((u) => u.email === DEMO_USER.email);
    if (toBackfill.length > 0) {
      const passwordHash = await hashPassword(DEMO_PASSWORD);
      await Promise.all(toBackfill.map((u) => db.from("users").update({ password_hash: passwordHash }).eq("id", u.id)));
    }
  }
  seedChecked = true;
}

export async function getUserAuthByEmail(email: string): Promise<{ user: User; passwordHash: string | null } | null> {
  await ensureSeeded();
  const db = getSupabase();
  const { data, error } = await db.from("users").select("*").ilike("email", email.trim()).maybeSingle();
  if (error) throw new Error(`Supabase error: ${error.message}`);
  if (!data) return null;
  const row = data as UserRow;
  return { user: rowToUser(row), passwordHash: row.password_hash };
}

export async function getUserById(id: string): Promise<User | null> {
  const db = getSupabase();
  const { data, error } = await db.from("users").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data ? rowToUser(data as UserRow) : null;
}
