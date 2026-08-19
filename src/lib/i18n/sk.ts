import { skAuth } from './sk/auth';
import { skShell } from './sk/shell';
import { skLearn } from './sk/learn';
import { skAdmin } from './sk/admin';
import { skAdmin2 } from './sk/admin2';

/** Czech source string -> Slovak translation. */
export const sk: Record<string, string> = {
  ...skAuth,
  ...skShell,
  ...skLearn,
  ...skAdmin,
  ...skAdmin2,
};
