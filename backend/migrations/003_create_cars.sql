CREATE TABLE cars (
  id          SERIAL PRIMARY KEY,
  vin         TEXT NOT NULL CHECK (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  make        TEXT NOT NULL,
  model       TEXT NOT NULL,
  year        INTEGER NOT NULL CHECK (year BETWEEN 1886 AND 2100),
  mileage     INTEGER NOT NULL CHECK (mileage >= 0),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  status      TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX cars_vin_idx ON cars (vin);
