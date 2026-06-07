export function isPermitEventOnOrBeforeToday({
  occurredOn,
  today,
}: {
  occurredOn: string;
  today: string;
}): boolean {
  return occurredOn <= today;
}
