ALTER TABLE public.cars
  ADD CONSTRAINT cars_price_non_negative CHECK (price >= 0) NOT VALID,
  ADD CONSTRAINT cars_horsepower_non_negative CHECK (horsepower IS NULL OR horsepower >= 0) NOT VALID,
  ADD CONSTRAINT cars_top_speed_non_negative CHECK (top_speed IS NULL OR top_speed >= 0) NOT VALID,
  ADD CONSTRAINT cars_acceleration_non_negative CHECK (acceleration IS NULL OR acceleration >= 0) NOT VALID,
  ADD CONSTRAINT cars_engine_size_non_negative CHECK (engine_size IS NULL OR engine_size >= 0) NOT VALID,
  ADD CONSTRAINT cars_seats_non_negative CHECK (seats IS NULL OR seats >= 0) NOT VALID,
  ADD CONSTRAINT cars_import_days_non_negative CHECK (estimated_import_days IS NULL OR estimated_import_days >= 0) NOT VALID;