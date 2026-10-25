import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../api/ApiContext';
import { ApiError, messageFrom } from '../api/errors';
import type { Car, CarInput } from '../api/types';
import { carName } from '../lib/format';
import VehicleForm from '../cars/VehicleForm';
import { EMPTY_CAR_FORM, carToFormValues, changedFields } from '../cars/carForm';


function BackLink() {
  return (
    <Link to="/admin" className="font-medium text-indigo-600 hover:underline">
      Back to vehicles
    </Link>
  );
}

function AddVehicle() {
  const api = useApi();
  const navigate = useNavigate();

  async function create(input: CarInput) {
    const car = await api.createCar(input);
    navigate('/admin', { state: { notice: `Added ${carName(car)}` } });
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Add vehicle</h1>
      <VehicleForm mode="create" initial={EMPTY_CAR_FORM} onSubmit={create} />
    </section>
  );
}

type LoadState = { status: 'loading' } | { status: 'not-found' } | { status: 'error'; message: string } | { status: 'ready'; car: Car };

function EditVehicle({ id }: { id: number }) {
  const api = useApi();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let stale = false;
    api.getCar(id).then(
      (car) => !stale && setState({ status: 'ready', car }),
      (error) => {
        if (stale) return;
        setState(error instanceof ApiError && error.status === 404 ? { status: 'not-found' } : { status: 'error', message: messageFrom(error) });
      },
    );
    return () => {
      stale = true;
    };
  }, [api, id]);

  if (state.status === 'loading') return <p role="status" className="text-slate-600">Loading vehicle…</p>;
  if (state.status === 'not-found') return <VehicleNotFound />;
  if (state.status === 'error') {
    return (
      <div className="space-y-4">
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-red-700">
          {state.message}
        </p>
        <BackLink />
      </div>
    );
  }

  const { car } = state;

  async function save(input: CarInput) {
    const changes = changedFields(car, input);
    if (Object.keys(changes).length === 0) {
      navigate('/admin');
      return;
    }
    const updated = await api.updateCar(car.id, changes);
    navigate('/admin', { state: { notice: `Saved ${carName(updated)}` } });
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">{`Edit ${carName(car)}`}</h1>
      <VehicleForm mode="edit" initial={carToFormValues(car)} onSubmit={save} />
    </section>
  );
}

function VehicleNotFound() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Vehicle not found</h1>
      <BackLink />
    </section>
  );
}

/** Add form at /admin/cars/new, edit form at /admin/cars/:id/edit. */
export default function CarFormPage() {
  const { id } = useParams();
  if (id === undefined) return <AddVehicle />;
  // Same rule as the server: a positive whole number that fits a 32-bit integer.
  const carId = /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 2_147_483_647 ? Number(id) : null;
  // keyed so that moving to another vehicle starts from scratch instead of keeping the previous car and form draft
  return carId === null ? <VehicleNotFound /> : <EditVehicle key={carId} id={carId} />;
}
