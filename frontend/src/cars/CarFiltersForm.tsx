import { useState, type FormEvent } from 'react';
import { CAR_CATEGORIES, type CarCategory } from '../api/types';
import Field from '../components/Field';
import { EMPTY_FILTERS, type CarFilters } from './filters';
import { CATEGORY_LABELS } from './labels';

/** The search form. It keeps its own draft and only reports it when the user presses Search or Clear. */
export default function CarFiltersForm({ onSearch }: { onSearch: (filters: CarFilters) => void }) {
  const [draft, setDraft] = useState<CarFilters>(EMPTY_FILTERS);
  const set = <K extends keyof CarFilters>(key: K, value: CarFilters[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(draft);
  }

  function handleClear() {
    setDraft(EMPTY_FILTERS);
    onSearch(EMPTY_FILTERS);
  }

  return (
    <form
      role="search"
      aria-label="Search vehicles"
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-lg bg-white p-4 shadow sm:grid-cols-2 lg:grid-cols-6"
    >
      <Field label="Make" value={draft.make} onChange={(e) => set('make', e.target.value)} />
      <Field label="Model" value={draft.model} onChange={(e) => set('model', e.target.value)} />
      <div className="space-y-1">
        <label htmlFor="category-filter" className="block text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="category-filter"
          value={draft.category}
          onChange={(e) => set('category', e.target.value as CarCategory | '')}
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All categories</option>
          {CAR_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>
      <Field label="Min price ($)" type="number" min="0" step="any" inputMode="decimal" value={draft.minPrice} onChange={(e) => set('minPrice', e.target.value)} />
      <Field label="Max price ($)" type="number" min="0" step="any" inputMode="decimal" value={draft.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} />
      <div className="flex items-end gap-2">
        <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500">
          Search
        </button>
        <button type="button" onClick={handleClear} className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
          Clear
        </button>
      </div>
    </form>
  );
}
