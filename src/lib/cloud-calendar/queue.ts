import type { Prisma } from "@/generated/prisma/client";
export const disconnected = { status: "DISCONNECTED" as const, refreshToken: null, nextSyncAt: null, lastError: null, credentialsVersion: { increment: 1 } };
export async function queueBooking(tx: Prisma.TransactionClient, booking: { id: string; driverId: string }) {
  await tx.calendarConnection.updateMany({ where: { status: "ACTIVE", OR: [{ bookingId: booking.id }, { driverUser: { driverId: booking.driverId } }] }, data: { syncVersion: { increment: 1 }, nextSyncAt: new Date() } });
}
