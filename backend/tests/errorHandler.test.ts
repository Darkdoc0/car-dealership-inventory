import type { Request, Response } from 'express';
import { errorHandler } from '../src/errorHandler';

function fakeResponse(headersSent = false) {
  const res = { headersSent, status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

const run = (err: unknown, res: ReturnType<typeof fakeResponse>) => {
  const next = jest.fn();
  errorHandler(err, {} as Request, res as unknown as Response, next);
  return next;
};

describe('errorHandler', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('hands the error to Express when the response has already started', () => {
    const res = fakeResponse(true);
    const err = new Error('boom');

    const next = run(err, res);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('answers 400 with a malformed-body message for a 400 client error', () => {
    const res = fakeResponse();

    run({ status: 400 }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Malformed request body' });
  });

  it('keeps other 4xx statuses with a generic message', () => {
    const res = fakeResponse();

    run({ statusCode: 413 }, res);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid request' });
  });

  it('never leaks the details of a 5xx error', () => {
    const res = fakeResponse();

    run({ status: 503, message: 'db password is hunter2' }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('treats a non-object throw as an internal error', () => {
    const res = fakeResponse();

    run(undefined, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
