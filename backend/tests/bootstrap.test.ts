import { EventEmitter } from 'events';
import { installShutdownHandlers, runSeed, startServer } from '../src/bootstrap';
import { pool } from '../src/db';

afterAll(() => pool.end());

describe('startServer', () => {
  it('migrates, listens on the requested port, and stops cleanly', async () => {
    const server = await startServer(pool, 0);

    try {
      expect(server.port).toBeGreaterThan(0);
      const res = await fetch(`http://127.0.0.1:${server.port}/api/vehicles`);
      expect(res.status).toBe(401); // the real app is serving, and it requires a login
    } finally {
      await server.close();
    }

    await expect(fetch(`http://127.0.0.1:${server.port}/api/vehicles`)).rejects.toThrow();
  });

  it('rejects when closed twice instead of silently succeeding', async () => {
    const server = await startServer(pool, 0);
    await server.close();

    await expect(server.close()).rejects.toThrow(/not running/i);
  });

  it('refuses to start without JWT_SECRET', async () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      await expect(startServer(pool, 0)).rejects.toThrow('JWT_SECRET is not set');
    } finally {
      process.env.JWT_SECRET = original;
    }
  });

  it('rejects when the port is already taken', async () => {
    const first = await startServer(pool, 0);
    try {
      await expect(startServer(pool, first.port)).rejects.toThrow(/EADDRINUSE/);
    } finally {
      await first.close();
    }
  });
});

describe('runSeed', () => {
  it('creates the admin from the environment and logs who is ready', async () => {
    const log = jest.fn();
    const email = `bootstrap${Date.now()}@example.com`;

    await runSeed(pool, { ADMIN_EMAIL: email, ADMIN_PASSWORD: 'Adm1nSecret!' }, log);

    const { rows } = await pool.query('SELECT role FROM users WHERE email = $1', [email]);
    expect(rows[0].role).toBe('admin');
    expect(log).toHaveBeenCalledWith(expect.stringContaining(email));
  });

  it('rejects with the missing variable name', async () => {
    await expect(runSeed(pool, { ADMIN_PASSWORD: 'Adm1nSecret!' }, jest.fn())).rejects.toThrow('ADMIN_EMAIL is not set');
  });

  it('does not log a password', async () => {
    const log = jest.fn();

    await runSeed(pool, { ADMIN_EMAIL: `bootstrap${Date.now()}b@example.com`, ADMIN_PASSWORD: 'Adm1nSecret!' }, log);

    expect(JSON.stringify(log.mock.calls)).not.toContain('Adm1nSecret!');
  });
});

describe('installShutdownHandlers', () => {
  function fakeProcess() {
    const emitter = new EventEmitter();
    const exit = jest.fn();
    return { once: emitter.once.bind(emitter) as never, exit, emit: (signal: string) => emitter.emit(signal) };
  }
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  it.each(['SIGINT', 'SIGTERM'])('closes the server, releases resources and exits 0 on %s', async (signal) => {
    const order: string[] = [];
    const target = fakeProcess();
    installShutdownHandlers(
      { close: async () => void order.push('server closed') },
      async () => void order.push('resources released'),
      target,
      jest.fn(),
    );

    target.emit(signal);
    await flush();

    expect(order).toEqual(['server closed', 'resources released']);
    expect(target.exit).toHaveBeenCalledWith(0);
  });

  it('shuts down only once when signalled repeatedly', async () => {
    const close = jest.fn(async () => undefined);
    const target = fakeProcess();
    installShutdownHandlers({ close }, async () => undefined, target, jest.fn());

    target.emit('SIGINT');
    target.emit('SIGTERM');
    await flush();

    expect(close).toHaveBeenCalledTimes(1);
    expect(target.exit).toHaveBeenCalledTimes(1);
  });

  it('exits 1 and does not hang when closing fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const target = fakeProcess();
    installShutdownHandlers({ close: async () => Promise.reject(new Error('close failed')) }, async () => undefined, target, jest.fn());

    target.emit('SIGTERM');
    await flush();

    expect(target.exit).toHaveBeenCalledWith(1);
    jest.restoreAllMocks();
  });
});
