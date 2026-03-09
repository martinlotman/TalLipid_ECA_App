
-- Rename full_name to first_name in profiles
ALTER TABLE public.profiles RENAME COLUMN full_name TO first_name;

-- Update the trigger function to save first_name and redcap_record_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, redcap_record_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    NEW.raw_user_meta_data->>'redcap_record_id'
  );
  RETURN NEW;
END;
$$;
