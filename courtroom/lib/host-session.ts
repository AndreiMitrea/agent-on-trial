import { cookies } from 'next/headers';
import { HOST_COOKIE, secretMatches } from './host';

/** Server-component check for host pages. Kept apart from host.ts so middleware does not import next/headers. */
export async function isHostSession(): Promise<boolean> {
  const jar = await cookies();
  return secretMatches(jar.get(HOST_COOKIE)?.value);
}
