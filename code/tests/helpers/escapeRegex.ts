export function escapeRegex(currentValue: string) {
  return currentValue.replace(/[\W]/g, '\\$&');
}
