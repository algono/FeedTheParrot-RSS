export function lastCallTo<T, Y extends any[]>(
  instance: jest.MockInstance<T, Y>
) {
  return instance.mock.calls[instance.mock.calls.length - 1];
}

export function lastResultOf<T, Y extends any[]>(
  instance: jest.MockInstance<T, Y>
) {
  return instance.mock.results[instance.mock.calls.length - 1];
}

export function lastInstanceOf<T, Y extends any[]>(
  instance: jest.MockInstance<T, Y>
) {
  return instance.mock.instances[instance.mock.instances.length - 1];
}
