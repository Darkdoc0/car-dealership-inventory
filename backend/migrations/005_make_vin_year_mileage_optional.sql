-- The brief only requires make, model, category, price and quantity. The CHECK constraints stay: they pass on NULL.
-- The unique index on vin also stays: PostgreSQL allows any number of NULLs in a unique index.
ALTER TABLE cars
  ALTER COLUMN vin DROP NOT NULL,
  ALTER COLUMN year DROP NOT NULL,
  ALTER COLUMN mileage DROP NOT NULL;
