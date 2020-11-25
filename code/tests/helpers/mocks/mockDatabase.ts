import { instance, mock } from 'ts-mockito';
import { Database, DatabaseHandler } from '../../../src/database/Database';

export function mockDatabase() {
  const mockedDatabase = mock<DatabaseHandler>();
  jest
    .spyOn(Database, 'use')
    .mockImplementation(() => instance(mockedDatabase));
  return mockedDatabase;
}
