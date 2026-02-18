DROP FUNCTION IF EXISTS public.get_binned_benchmarks();

CREATE OR REPLACE FUNCTION public.get_binned_benchmarks()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_bins json;
BEGIN
  -- A. Aggregate stats per session
  WITH user_stats AS (
      SELECT 
        AVG(average_time) as x, 
        SUM(correct_answers)::float / NULLIF(SUM(total_questions), 0) * 100 as y
      FROM participant_stats 
      GROUP BY session_id
  ),
  -- B. Quantile Binning (The Fix)
  -- Instead of width_bucket, we use ntile(10) to split users into 10 equal-sized groups.
  -- This creates "Deciles" (Fastest 10%, ... Slowest 10%)
  ranked_data AS (
      SELECT 
        x, y,
        ntile(10) OVER (ORDER BY x) as bucket
      FROM user_stats
  ),
  -- C. Calculate Stats for each Decile
  binned_data AS (
      SELECT 
        bucket,
        AVG(x) as avg_time,
        AVG(y) as avg_accuracy,
        STDDEV(y) as std_dev,
        COUNT(*) as count
      FROM ranked_data
      GROUP BY bucket
      ORDER BY bucket
  )
  -- D. Format Output
  SELECT json_agg(
    json_build_object(
      'x', avg_time, 
      'y', avg_accuracy, 
      'range_min', GREATEST(0, avg_accuracy - COALESCE(std_dev, 0)),
      'range_max', LEAST(100, avg_accuracy + COALESCE(std_dev, 0)),
      'count', count
    )
  ) INTO v_bins FROM binned_data;

  RETURN json_build_object(
    'trend', COALESCE(v_bins, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_binned_benchmarks TO anon, authenticated, service_role;