import { NextResponse } from "next/server";
import { getUserAuthByEmail } from "@/lib/db/queries/users";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const record = await getUserAuthByEmail(email);
  const isValid = record?.passwordHash ? await verifyPassword(password, record.passwordHash) : false;

  if (!record || !isValid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createSession(record.user.id);
  return NextResponse.json({ user: { id: record.user.id, name: record.user.name } });
}
