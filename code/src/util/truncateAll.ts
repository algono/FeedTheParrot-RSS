import { truncate } from './truncate';

export function truncateAll(
  str: string,
  n: number,
  { readable }: { readable?: boolean } = {}
) {
  const res: string[] = [];
  let remaining = str;
  while (remaining) {
    const current = truncate(remaining, n);
    res.push(readable ? current.readable : current.str);
    remaining = remaining.substring(current.str.length);
  }

  return res;
}
