import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { HttpError } from "./http";
import { hashToken, SESSION_COOKIE, validTokenFormat } from "./security";

export async function currentAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !validTokenFormat(token)) return null;
  const session = await db().adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiresAt: true, admin: { select: { id: true, name: true, active: true } } },
  });
  if (!session || session.expiresAt <= new Date() || !session.admin.active) return null;
  return { id: session.admin.id, name: session.admin.name };
}
export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/login-admin");
  return admin;
}
export async function requireApiAdmin() {
  const admin = await currentAdmin();
  if (!admin) throw new HttpError(401, "Inicia sesión para continuar.");
  return admin;
}
