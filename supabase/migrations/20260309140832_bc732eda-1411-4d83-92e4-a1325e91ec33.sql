
CREATE TABLE public.meal_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  tolerance integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total meal_types" ON public.meal_types
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default meal types
INSERT INTO public.meal_types (name, start_time, end_time, tolerance) VALUES
  ('DESJEJUM', '05:30', '07:30', 5),
  ('ALMOÇO', '10:00', '13:30', 5),
  ('JANTAR', '17:00', '20:30', 5),
  ('CEIA', '00:30', '04:00', 5);
