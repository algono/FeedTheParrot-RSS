import { Database } from '../../src/database/Database';
import { instance, mock } from 'ts-mockito';

export function mockDatabase() {
  const mockDatabase = mock(Database);
  jest
    .spyOn(Database, 'instance', 'get')
    .mockImplementation(() => instance(mockDatabase));
  return mockDatabase;
}
