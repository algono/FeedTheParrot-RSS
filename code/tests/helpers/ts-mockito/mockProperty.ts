export function mockProperty<
  T extends {},
  M extends jest.NonFunctionPropertyNames<Required<T>>
>(target: T, property: M, get?: () => any, set?: (value: any) => void) {
  Object.defineProperty(target, property, {
    configurable: true,
    get: () => {},
    set: () => {},
  });

  jest.spyOn(target, property, 'get').mockImplementation(get);
  jest.spyOn(target, property, 'set').mockImplementation(set);
}
