CREATE OR REPLACE FUNCTION public.admin_overview_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_users int;
  v_paid_users int;
  v_users_7 int;
  v_users_30 int;
  v_revenue_total bigint;
  v_revenue_30 bigint;
  v_payments_total int;
  v_payments_30 int;
  v_daily jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE has_paid),
         count(*) FILTER (WHERE created_at >= now() - interval '7 days'),
         count(*) FILTER (WHERE created_at >= now() - interval '30 days')
    INTO v_total_users, v_paid_users, v_users_7, v_users_30
    FROM public.profiles;

  SELECT COALESCE(sum(amount), 0), count(*),
         COALESCE(sum(amount) FILTER (WHERE created_at >= now() - interval '30 days'), 0),
         count(*) FILTER (WHERE created_at >= now() - interval '30 days')
    INTO v_revenue_total, v_payments_total, v_revenue_30, v_payments_30
    FROM public.payments
   WHERE status = 'paid' AND environment = 'live';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'day', to_char(d.day, 'YYYY-MM-DD'),
           'registrations', COALESCE(r.cnt, 0),
           'payments', COALESCE(p.cnt, 0)
         ) ORDER BY d.day), '[]'::jsonb)
    INTO v_daily
    FROM generate_series((now() - interval '29 days')::date, now()::date, interval '1 day') AS d(day)
    LEFT JOIN (
      SELECT created_at::date AS day, count(*) AS cnt
        FROM public.profiles
       WHERE created_at >= now() - interval '30 days'
       GROUP BY 1
    ) r ON r.day = d.day
    LEFT JOIN (
      SELECT created_at::date AS day, count(*) AS cnt
        FROM public.payments
       WHERE status = 'paid' AND environment = 'live'
         AND created_at >= now() - interval '30 days'
       GROUP BY 1
    ) p ON p.day = d.day;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'paid_users', v_paid_users,
    'users_7d', v_users_7,
    'users_30d', v_users_30,
    'revenue_total', v_revenue_total,
    'revenue_30d', v_revenue_30,
    'payments_total', v_payments_total,
    'payments_30d', v_payments_30,
    'daily', v_daily
  );
END;
$$;