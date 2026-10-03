import { signOutServices, UnsafeLocalCleanupError } from '../access-signout';

test('Firebase sign-out is attempted even when Keychain cleanup and store logout fail', async () => {
  const calls: string[] = [];
  const result = await signOutServices(
    async () => { calls.push('local'); throw new Error('Keychain locked'); },
    async () => { calls.push('store'); throw new Error('Store offline'); },
    async () => { calls.push('firebase'); }
  );

  expect(calls).toEqual(['local', 'firebase', 'store']);
  expect(result.localCleanupFailed).toBe(true);
});

test('Firebase sign-out failure is still returned to the caller', async () => {
  const authFailure = new Error('Auth unavailable');
  await expect(signOutServices(
    async () => { throw new Error('Keychain locked'); },
    async () => undefined,
    async () => { throw authFailure; }
  )).rejects.toBe(authFailure);
});

test('a stalled store logout does not leave sign-out loading after Firebase closes', async () => {
  let finishStoreLogout: (() => void) | undefined;
  const storeLogout = new Promise<void>(resolve => { finishStoreLogout = resolve; });
  const firebase = jest.fn().mockResolvedValue(undefined);
  await expect(signOutServices(
    async () => undefined,
    () => storeLogout,
    firebase
  )).resolves.toEqual({ localCleanupFailed: false });
  expect(firebase).toHaveBeenCalledTimes(1);
  finishStoreLogout?.();
});

test('stalled notification cancellation cannot prevent Firebase sign-out', async () => {
  const firebase = jest.fn().mockResolvedValue(undefined);
  const reminders = jest.fn(() => new Promise<void>(() => undefined));
  await expect(signOutServices(
    async () => undefined,
    async () => undefined,
    firebase,
    reminders
  )).resolves.toEqual({ localCleanupFailed: false });
  expect(reminders).toHaveBeenCalledTimes(1);
  expect(firebase).toHaveBeenCalledTimes(1);
});

test('Firebase sign-out is held when old device data has no durable cleanup guard', async () => {
  const firebase = jest.fn().mockResolvedValue(undefined);
  await expect(signOutServices(
    async () => { throw new UnsafeLocalCleanupError('No safe data boundary'); },
    async () => undefined,
    firebase
  )).rejects.toThrow('No safe data boundary');
  expect(firebase).not.toHaveBeenCalled();
});
