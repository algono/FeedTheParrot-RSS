import { Feed } from '../logic/Feed';

interface AuthCodeBase {
  code: string;
  expirationDate: Date | number;
}

export interface AuthCode extends AuthCodeBase {
  expirationDate: Date;
}

export interface AuthCodeDB extends AuthCodeBase {
  expirationDate: number;
}

export function authCodeToDB(code: AuthCode): AuthCodeDB {
  return { ...code, expirationDate: code.expirationDate.getTime() };
}

export interface UserDocData {
  userId: string;
}

export interface UserData {
  feeds: { [x: string]: Feed };
  feedNames: string[];

  authCode?: AuthCode;
}
