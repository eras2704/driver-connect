import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiDriver } from "@/lib/driver-session";
import { driverFeedUrl } from "@/lib/calendar-access";
import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
export async function POST(request: Request) {
  return handleApi(async () => {
    const actor = await requireApiDriver(); assertOrigin(request);
    const parsed = z.object({ action: z.enum(["enable", "rotate", "disable"]) }).strict().safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Acción inválida.");
    const user = await db().driverUser.update({ where: { id: actor.userId }, data: { calendarEnabled: parsed.data.action !== "disable", ...(parsed.data.action !== "enable" ? { calendarVersion: { increment: 1 } } : {}) }, select: { id: true, calendarVersion: true, calendarEnabled: true } });
    return json({ enabled: user.calendarEnabled, url: user.calendarEnabled ? driverFeedUrl(user) : null });
  });
}
