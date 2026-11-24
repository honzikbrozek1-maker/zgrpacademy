// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const user = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
const admin = '00000000-0000-0000-0000-000000000003';
const unpaid = '00000000-0000-0000-0000-000000000004';
const firstLevel = '20000000-0000-0000-0000-000000000001';
const lockedLevel = '20000000-0000-0000-0000-000000000002';
const openQuestion = '30000000-0000-0000-0000-000000000001';
const lockedQuestion = '30000000-0000-0000-0000-000000000002';
const testQuestion = '30000000-0000-0000-0000-000000000003';
const groupQuestion = '30000000-0000-0000-0000-000000000004';
let db: PGlite;

async function signIn(id: string | null, role = 'authenticated') {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', $2, false)", [id ?? '', role]);
  await db.exec(`SET ROLE ${role}`);
}

async function value<T>(sql: string, args: unknown[] = []) {
  const result = await db.query<{ value: T }>(`SELECT ${sql} AS value`, args);
  return result.rows[0]?.value;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(new URL('./securityPermissions.fixture.sql', import.meta.url), 'utf8'));
  const migrations = new URL('../../drizzle/migrations/', import.meta.url);
  for (const name of readdirSync(migrations).filter(name => /_(scope_selected_security_checks|normalize_security_identity)\.sql$/.test(name)).sort()) {
    await db.exec(readFileSync(new URL(name, migrations), 'utf8'));
  }
  await db.exec(`
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY roles_read ON public.user_roles FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
    ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
    CREATE POLICY levels_read ON public.levels FOR SELECT TO authenticated
      USING (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
    ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY questions_read ON public.questions FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  `);
}, 30_000);

beforeEach(async () => { await signIn(user); });
afterAll(async () => { await db?.close(); });

describe('selected security findings: execute the deployed permission rules', () => {
  it('check_quiz_answer denies a paid learner answers from a locked level', async () => {
    await expect(value('public.check_quiz_answer($1, 1)', [lockedQuestion])).rejects.toThrow('Question not available');
  });

  it('award_points_for_question denies locked answers before awarding anything', async () => {
    await expect(value('public.award_points_for_question($1, 3)', [lockedQuestion])).rejects.toThrow('Question not available');
    await db.exec('RESET ROLE');
    expect(await value('(SELECT count(*)::int FROM public.awarded_question_points WHERE question_id = $1)', [lockedQuestion])).toBe(0);
  });

  it('is_level_unlocked does not reveal another learners unlocked level', async () => {
    expect(await value('public.is_level_unlocked($1, $2)', [other, lockedLevel])).toBe(false);
    await signIn(other);
    expect(await value('public.is_level_unlocked($1, $2)', [other, lockedLevel])).toBe(true);
  });

  it('has_role does not reveal another accounts administrator role', async () => {
    expect(await value('public.has_role($1, $2)', [admin, 'admin'])).toBe(false);
    expect(await value('public.has_role($1, $2)', [user, 'user'])).toBe(true);
  });

  it('is_paid does not reveal another accounts paid status', async () => {
    expect(await value('public.is_paid($1)', [other])).toBe(false);
    expect(await value('public.is_paid($1)', [user])).toBe(true);
  });

  it('anonymous callers cannot discover roles, payment, or progress', async () => {
    await signIn(null, 'anon');
    expect(await value('public.has_role($1, $2)', [admin, 'admin'])).toBe(false);
    expect(await value('public.is_paid($1)', [other])).toBe(false);
    expect(await value('public.is_level_unlocked($1, $2)', [other, firstLevel])).toBe(false);
    await expect(value('public.check_quiz_answer($1, 1)', [openQuestion])).rejects.toThrow('permission denied');
    await expect(value('public.award_points_for_question($1, 2)', [openQuestion])).rejects.toThrow('permission denied');
  });

  it('missing identity claims fail closed with a consistent false result', async () => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', '', false)");
    expect(await value('public.has_role($1, $2)', [admin, 'admin'])).toBe(false);
    expect(await value('public.is_paid($1)', [other])).toBe(false);
    expect(await value('public.is_level_unlocked($1, $2)', [other, firstLevel])).toBe(false);
  });

  it('normal unlocked practice still returns correct and incorrect feedback', async () => {
    expect(await value('public.is_level_unlocked($1, $2)', [user, firstLevel])).toBe(true);
    expect(await value('public.check_quiz_answer($1, 2)', [openQuestion])).toEqual({ correct: true });
    expect(await value('public.check_quiz_answer($1, 1)', [openQuestion])).toEqual({ correct: false, correct_answer: 2 });
  });

  it.each([testQuestion, groupQuestion])('practice answer functions cannot expose test-only question %s', async (id) => {
    await expect(value('public.check_quiz_answer($1, 1)', [id])).rejects.toThrow('Question not available');
    await expect(value('public.award_points_for_question($1, 1)', [id])).rejects.toThrow('Question not available');
  });

  it('unpaid accounts still cannot check or award answers', async () => {
    await signIn(unpaid);
    await expect(value('public.check_quiz_answer($1, 1)', [openQuestion])).rejects.toThrow('Payment required');
    await expect(value('public.award_points_for_question($1, 2)', [openQuestion])).rejects.toThrow('Payment required');
  });

  it('administrators retain authorized checks and question access without payment', async () => {
    await signIn(admin);
    expect(await value('public.has_role($1, $2)', [other, 'user'])).toBe(true);
    expect(await value('public.is_paid($1)', [other])).toBe(true);
    expect(await value('public.is_level_unlocked($1, $2)', [other, lockedLevel])).toBe(true);
    expect(await value('public.check_quiz_answer($1, 1)', [lockedQuestion])).toEqual({ correct: false, correct_answer: 3 });
  });

  it('trusted services retain account checks without a learner identity', async () => {
    await signIn(null, 'service_role');
    expect(await value('public.has_role($1, $2)', [admin, 'admin'])).toBe(true);
    expect(await value('public.is_paid($1)', [other])).toBe(true);
    expect(await value('public.is_level_unlocked($1, $2)', [other, lockedLevel])).toBe(true);
  });

  it('learner row policies remain usable without exposing admin-only question rows', async () => {
    expect((await db.query('SELECT * FROM public.profiles')).rows).toHaveLength(1);
    expect((await db.query('SELECT * FROM public.user_roles')).rows).toHaveLength(1);
    expect((await db.query('SELECT * FROM public.levels')).rows).toHaveLength(3);
    expect((await db.query('SELECT * FROM public.questions')).rows).toHaveLength(0);
    await signIn(admin);
    expect((await db.query('SELECT * FROM public.profiles')).rows).toHaveLength(4);
    expect((await db.query('SELECT * FROM public.questions')).rows).toHaveLength(4);
  });

  it('administrator requests still accept actual admins and reject other targets', async () => {
    await expect(db.query('INSERT INTO public.admin_requests (user_id, target_admin_id) VALUES ($1, $2)', [user, other])).rejects.toThrow('row-level security');
    await db.query('INSERT INTO public.admin_requests (user_id, target_admin_id) VALUES ($1, $2)', [user, admin]);
    expect((await db.query('SELECT target_admin_id FROM public.admin_requests')).rows).toEqual([{ target_admin_id: admin }]);
    await expect(db.query('INSERT INTO public.admin_requests (user_id, target_admin_id) VALUES ($1, $2)', [user, admin])).rejects.toThrow('row-level security');
  });

  it('allowed answers preserve the existing one-time ten-point reward', async () => {
    expect(await value('public.award_points_for_question($1, 1)', [openQuestion])).toEqual({ correct: false, correct_answer: 2, old_points: 0, new_points: 0 });
    expect(await value('public.award_points_for_question($1, 2)', [openQuestion])).toEqual({ correct: true, old_points: 0, new_points: 10 });
    expect(await value('public.award_points_for_question($1, 2)', [openQuestion])).toEqual({ correct: true, old_points: 10, new_points: 10 });
  });
});