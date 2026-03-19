ALTER TABLE public.meal_types RENAME COLUMN tolerance TO tolerance_before;
ALTER TABLE public.meal_types ADD COLUMN tolerance_after integer NOT NULL DEFAULT 5;