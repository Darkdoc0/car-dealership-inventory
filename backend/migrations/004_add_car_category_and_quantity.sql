ALTER TABLE cars
  ADD COLUMN category TEXT NOT NULL DEFAULT 'sedan'
    CHECK (category IN ('sedan', 'suv', 'truck', 'hatchback', 'coupe', 'convertible', 'van')),
  ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1
    CHECK (quantity BETWEEN 0 AND 1000000);

-- Existing rows got a placeholder category; new rows must state one explicitly.
ALTER TABLE cars ALTER COLUMN category DROP DEFAULT;
