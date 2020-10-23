import { instance, mock } from 'ts-mockito';
import { Database } from '../../src/database/Database';

export function mockDatabase() {
  const mockedDatabase = mock(Database);
  jest
    .spyOn(Database, 'instance', 'get')
    .mockImplementation(() => instance(mockedDatabase));
  return mockedDatabase;
}
