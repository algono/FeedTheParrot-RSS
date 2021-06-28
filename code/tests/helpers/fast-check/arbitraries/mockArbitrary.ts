import fc from 'fast-check';
import { instance, mock } from 'ts-mockito';

function buildMockInstance<T>() {
  const withCloneMethod = () => ({
    mock: mock<T>(),
    [fc.cloneMethod]: withCloneMethod,
  });
  return withCloneMethod();
}

export function mockArbitrary<T>(setup?: (mock: T) => void) {
  return fc.constant(buildMockInstance<T>()).map(({ mock }) => {
    if (setup) setup(mock);
    return instance(mock);
  });
}
