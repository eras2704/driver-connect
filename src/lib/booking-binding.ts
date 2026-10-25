import "server-only";
import { hashToken } from "./security";

// Public binding, not an authorization grant: prevents a stale form from silently
// changing its intended driver when a physical card address is reassigned.
export function bookingProfileKey(driverId: string, slug: string) {
  return hashToken(`booking-profile:${driverId}:${slug}`);
}
