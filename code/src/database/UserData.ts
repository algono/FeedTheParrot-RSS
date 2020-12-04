import { Feed } from '../logic/Feed';

export interface AuthCode {
  code: string;
  expirationDate: Date;
}

export interface UserDocData {
  userId: string;
}

export interface UserData {
  feeds: { [x: string]: Feed };
  feedNames: string[];

  authCode?: AuthCode;
}
