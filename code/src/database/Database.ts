import {
  AttributesManager,
  getLocale,
  getUserId,
  PersistenceAdapter,
} from 'ask-sdk-core';
import { RequestEnvelope } from 'ask-sdk-model';
import * as firebaseAdmin from 'firebase-admin';
import { NoUserDataError } from '../logic/Errors';
import { Feed, FeedData } from '../logic/Feed';
import { init } from '../util/localization';
import * as firebaseCredentials from './firebaseServiceAccountKey.json';

export const collectionNames = {
  authCodes: 'auth-codes',
  users: 'users',
  feeds: 'feeds',
};

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

export class FirebasePersistenceAdapter implements PersistenceAdapter {
  private readonly _firestore: FirebaseFirestore.Firestore;

  private _userRefId: string;

  private userWasNotFound() {
    // If the user ref id is null, then the user ref was already searched through the database, and it was not found
    return this._userRefId === null;
  }

  public constructor() {
    const app = FirebasePersistenceAdapter.init();
    this._firestore = app.firestore();
  }

  /**
   * Initializes the Database.
   * Must be called before using any database methods.
   */
  private static init() {
    return firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(
        firebaseCredentials as firebaseAdmin.ServiceAccount
      ),
      databaseURL: 'https://feedtheparrot-rss.firebaseio.com',
    });
  }

  private async getUserRefId(requestEnvelope: RequestEnvelope) {
    if (!this._userRefId) await this.getUserRef(requestEnvelope);
    return this._userRefId;
  }

  private async getUserRef(requestEnvelope: RequestEnvelope) {
    const userId = getUserId(requestEnvelope);

    const userDataQuery = await this._firestore
      .collection(collectionNames.users)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (userDataQuery.empty) {
      this._userRefId = null;
      throw new NoUserDataError();
    }
    console.log('(Database) Existing user. Retrieving user data');
    // Get user data from query
    const userDoc = userDataQuery.docs[0];
    const userRef = userDoc.ref;

    this._userRefId = userRef.id;

    return userRef;
  }

  private async getFeedsFromUser(
    requestEnvelope: RequestEnvelope,
    userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
  ): Promise<UserData> {
    const t = await init(getLocale(requestEnvelope));
    const nameField = t('FEED_NAME_FIELD');

    const feedSnapshots = await userRef
      .collection(collectionNames.feeds)
      .orderBy(nameField) // This filters out documents without the field
      .get();

    const feeds: { [x: string]: Feed } = {};
    const feedNames: string[] = [];

    feedSnapshots.forEach((snapshot) => {
      const data = snapshot.data();

      const name: string = data[nameField];

      const feed: Feed = { name, ...(data as FeedData) };

      feedNames.push(name);
      feeds[name] = feed;
    });

    return { feeds, feedNames };
  }

  public async getAttributes(
    requestEnvelope: RequestEnvelope
  ): Promise<UserData> {
    // If the database was already searched and no user was found,
    // there is no need to search for it again until the user is created
    if (this.userWasNotFound()) {
      throw new NoUserDataError();
    }

    const userRef = await this.getUserRef(requestEnvelope);

    return this.getFeedsFromUser(requestEnvelope, userRef);
  }

  private setAuthCode(docId: string, code: AuthCode) {
    return this._firestore
      .collection(collectionNames.authCodes)
      .doc(docId)
      .set(code);
  }

  private async createNewUser(requestEnvelope: RequestEnvelope) {
    const userDocData: UserDocData = { userId: getUserId(requestEnvelope) };
    const newUserRef = await this._firestore
      .collection(collectionNames.users)
      .add(userDocData);

    this._userRefId = newUserRef.id;

    return newUserRef;
  }

  public async saveAttributes(
    requestEnvelope: RequestEnvelope,
    attributes: UserData
  ): Promise<void> {
    if (this.userWasNotFound()) {
      await this.createNewUser(requestEnvelope);
    } else {
      try {
        await this.getUserRefId(requestEnvelope);
      } catch (err) {
        if (err instanceof NoUserDataError) {
          await this.createNewUser(requestEnvelope);
        } else {
          throw err;
        }
      }
    }

    if (attributes.authCode) {
      await this.setAuthCode(this._userRefId, attributes.authCode);
    }
  }
}

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
    try {
      return (await this.attributesManager.getPersistentAttributes()) as UserData;
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
