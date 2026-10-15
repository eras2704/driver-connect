import { serviceAvailable } from "./subscription";
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { hashToken, validTokenFormat } from "./security";
import { HttpError } from "./http";
export const DRIVER_COOKIE = "dc_driver_session";
export const driverTokenHash = (token: string) => hashToken(`driver:${token}`);
export async function currentDriver() {
  const token = (await cookies()).get(DRIVER_COOKIE)?.value;
  if (!token || !validTokenFormat(token)) return null;
  const session = await db().driverSession.findUnique({ where: { tokenHash: driverTokenHash(token) }, select: { expiresAt: true, user: { select: { id: true, driverId: true, active: true, mustChangePassword: true, driver: { select: { name: true, slug: true, active: true, serviceStartsAt: true, serviceExpiresAt: true } } } } } });
  if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
  return { userId: session.user.id, driverId: session.user.driverId, name: session.user.driver.name, slug: session.user.driver.slug, published: session.user.driver.active && serviceAvailable(session.user.driver), serviceStartsAt: session.user.driver.serviceStartsAt, serviceExpiresAt: session.user.driver.serviceExpiresAt, mustChangePassword: session.user.mustChangePassword };
}
export async function requireDriver(allowPasswordChange = false) {
  const driver = await currentDriver();
  if (!driver) redirect("/login-conductor");
  if (!serviceAvailable(driver)) redirect("/servicio-vencido");
  if (driver.mustChangePassword && !allowPasswordChange) redirect("/panel/seguridad");
  return driver;
}
export async function requireApiDriver(allowPasswordChange = false) {
  const driver = await currentDriver();
  if (!driver) throw new HttpError(401, "Inicia sesión para continuar.");
  if (!serviceAvailable(driver)) throw new HttpError(403, "Tu servicio venció o todavía no comienza. Contacta a la administración para renovar.");
  if (driver.mustChangePassword && !allowPasswordChange) throw new HttpError(403, "Cambia tu contraseña inicial antes de continuar.");
  return driver;
}
