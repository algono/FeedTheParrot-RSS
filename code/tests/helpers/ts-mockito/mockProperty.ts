export function mockProperty<
  T extends {},
  M extends jest.NonFunctionPropertyNames<Required<T>>
>(
  target: T,
  property: M,
  get?: () => Required<T>[M],
  set?: (value: Required<T>[M]) => void
) {
  Object.defineProperty(target, property, {
    configurable: true,
    get: () => {},
    set: () => {},
  });

  const getterSpy = jest.spyOn(target, property, 'get').mockImplementation(get);
  const setterSpy = jest.spyOn(target, property, 'set').mockImplementation(set);

  return { getterSpy, setterSpy };
}
