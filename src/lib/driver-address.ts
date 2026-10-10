// Resolve both the current address and every address previously used by the profile.
export function driverAddressWhere(slug: string) {
  return { OR: [{ slug }, { addresses: { some: { slug } } }] };
}
