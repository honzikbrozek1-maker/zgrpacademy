import { skAuth } from './sk/auth';
import { skShell } from './sk/shell';
import { skLearn } from './sk/learn';
import { skAdmin } from './sk/admin';

/** Czech source string -> Slovak translation. */
export const sk: Record<string, string> = {
  ...skAuth,
  ...skShell,
  ...skLearn,
  ...skAdmin,
};
