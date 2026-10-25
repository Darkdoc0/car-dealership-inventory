import { render, screen } from '@testing-library/react';
import { createFakeApi } from '../test/fakes';
import { ApiProvider, useApi } from './ApiContext';

function Probe() {
  const api = useApi();
  return <p>{typeof api.listCars}</p>;
}

describe('useApi', () => {
  it('gives components the client it was provided with', () => {
    render(
      <ApiProvider api={createFakeApi()}>
        <Probe />
      </ApiProvider>,
    );

    expect(screen.getByText('function')).toBeInTheDocument();
  });

  it('explains the problem when used outside an ApiProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Probe />)).toThrow('useApi must be used inside an ApiProvider');
  });
});
