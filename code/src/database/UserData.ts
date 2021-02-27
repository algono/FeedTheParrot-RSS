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
  // The getTime() function returns the time in millis. We need it in seconds (and as an integer)
  return { ...code, expirationDate: Math.round(code.expirationDate.getTime() / 1000) };
}

export interface UserDocData {
  userId: string;
}

export interface UserData {
  feeds: { [x: string]: Feed };
  feedNames: string[];

  authCode?: AuthCode;
}
