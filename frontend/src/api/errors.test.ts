import { ApiError, messageFrom } from './errors';

describe('ApiError', () => {
  it('carries the status and message', () => {
    const error = new ApiError(409, 'Email already registered');

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ name: 'ApiError', status: 409, message: 'Email already registered' });
  });
});

describe('messageFrom', () => {
  it('shows the message of an API error', () => {
    expect(messageFrom(new ApiError(0, 'Cannot reach the server.'))).toBe('Cannot reach the server.');
  });

  it.each([[new Error('db password is hunter2')], ['a string'], [undefined], [{ message: 'looks like an error' }]])(
    'never shows the details of an unexpected failure (%p)',
    (error) => {
      expect(messageFrom(error)).toBe('Something went wrong. Please try again.');
    },
  );
});
