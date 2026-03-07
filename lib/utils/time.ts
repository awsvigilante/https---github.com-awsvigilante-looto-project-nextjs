export function parseDurationToMs(durationStr: string | undefined): number {
  if (!durationStr) return 0;
  
  const str = durationStr.toLowerCase().trim();
  const match = str.match(/^(\d+(?:\.\d+)?)\s*(days?|d|hours?|hrs?|h|minutes?|mins?|m)$/);
  
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  const ONE_MINUTE = 60 * 1000;
  const ONE_HOUR = 60 * ONE_MINUTE;
  const ONE_DAY = 24 * ONE_HOUR;
  
  if (unit.startsWith('d')) {
    return value * ONE_DAY;
  } else if (unit.startsWith('h')) {
    return value * ONE_HOUR;
  } else if (unit.startsWith('m')) {
    return value * ONE_MINUTE;
  }
  
  return 0;
}
