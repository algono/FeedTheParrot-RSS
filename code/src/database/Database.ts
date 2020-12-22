import { AttributesManager } from 'ask-sdk-core';
import { NoUserDataError } from '../logic/Errors';
import { AuthCode, UserData } from './UserData';

export namespace Database {
  export function use(attributesManager: AttributesManager): DatabaseHandler {
    return new DatabaseHandlerImpl(attributesManager);
  }
}

export interface GetUserDataOptions {
  throwIfUserWasNotFound?: boolean;
}

export interface DatabaseHandler {
  setAuthCode(code: AuthCode): Promise<void>;
  getUserData({
    throwIfUserWasNotFound,
  }?: GetUserDataOptions): Promise<UserData>;
}

export interface UserDataSessionAttributes {
  userData?: UserData;
}

class DatabaseHandlerImpl implements DatabaseHandler {
  public constructor(private readonly attributesManager: AttributesManager) {}

  public async setAuthCode(code: AuthCode) {
    const userData = await this.getUserData();
    userData.authCode = code;
    return this.attributesManager.savePersistentAttributes();
  }

  public async getUserData({ throwIfUserWasNotFound = false } = {}): Promise<
    UserData
  > {
    const sessionAttributes: UserDataSessionAttributes = this.attributesManager.getSessionAttributes();
    if (sessionAttributes.userData) {
      return sessionAttributes.userData;
    } else {
      try {
        const userData = (await this.attributesManager.getPersistentAttributes()) as UserData;
        sessionAttributes.userData = userData;
        return userData;
      } catch (err) {
        if (!throwIfUserWasNotFound && err instanceof NoUserDataError) {
          const userData: UserData = { feeds: null, feedNames: null };
          this.attributesManager.setPersistentAttributes(userData);
          return userData;
        } else {
          throw err;
        }
      }
    }
  }
}
