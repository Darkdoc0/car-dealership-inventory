import { createMemoryTokenStore } from '../test/fakes';
import { createSession } from './session';

const unauthorized = () =>
  new Response(JSON.stringify({ error: 'Authentication required' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

describe('createSession', () => {
  it('sends the stored token with API requests', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ id: 1, email: 'a@b.co', role: 'user' })));
    const session = createSession(createMemoryTokenStore('jwt-stored'), fetchMock);

    await session.api.me();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer jwt-stored');
  });

  it('notifies listeners when an authenticated request is rejected with 401', async () => {
    const session = createSession(createMemoryTokenStore('jwt-expired'), vi.fn<typeof fetch>(async () => unauthorized()));
    const listener = vi.fn();
    session.onExpired(listener);

    await session.api.me().catch(() => undefined);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops notifying a listener after it unsubscribes', async () => {
    const session = createSession(createMemoryTokenStore('jwt-expired'), vi.fn<typeof fetch>(async () => unauthorized()));
    const listener = vi.fn();
    const unsubscribe = session.onExpired(listener);
    unsubscribe();

    await session.api.me().catch(() => undefined);

    expect(listener).not.toHaveBeenCalled();
  });

  it('does not notify for a 401 on a request that sent no token (a failed login)', async () => {
    const session = createSession(createMemoryTokenStore(null), vi.fn<typeof fetch>(async () => unauthorized()));
    const listener = vi.fn();
    session.onExpired(listener);

    await session.api.login('a@b.co', 'wrong').catch(() => undefined);

    expect(listener).not.toHaveBeenCalled();
  });
});
