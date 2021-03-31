import { PersistenceAdapter, getUserId, getLocale } from 'ask-sdk-core';
import { RequestEnvelope } from 'ask-sdk-model';
import { NoUserDataError } from '../logic/Errors';
import { Feed, FeedData, FeedFilters } from '../logic/Feed';
import { initNewInstance } from '../util/localization';
import { UserData, UserDocData } from './UserData';

import * as firebaseAdmin from 'firebase-admin';
import * as firebaseCredentials from './firebaseServiceAccountKey.json';

export const collectionNames = {
  users: 'users',
  feeds: 'feeds',
} as const;

interface HasFeedFiltersDb {
  filterByText?: string[];
  filterByTextMatchAll?: boolean;
  filterByCategory?: string[];
  filterByCategoryMatchAll?: boolean;
}

function processFeedFilters(filtersDb: HasFeedFiltersDb): FeedFilters {
  return {
    text: {
      values: filtersDb.filterByText,
      matchAll: filtersDb.filterByTextMatchAll,
    },
    category: {
      values: filtersDb.filterByCategory,
      matchAll: filtersDb.filterByCategoryMatchAll,
    },
  };
}

function deleteFeedFiltersFrom(filtersDb: HasFeedFiltersDb) {
  delete filtersDb.filterByCategory;
  delete filtersDb.filterByCategoryMatchAll;
  delete filtersDb.filterByText;
  delete filtersDb.filterByTextMatchAll;
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
    });
  }

  public async getUserRefId(requestEnvelope: RequestEnvelope) {
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
    const t = await initNewInstance(getLocale(requestEnvelope));
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

      const filters = processFeedFilters(data);
      deleteFeedFiltersFrom(data);

      const feed: Feed = { name, filters, ...(data as FeedData) };

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

  private async createNewUser(requestEnvelope: RequestEnvelope) {
    const userDocData: UserDocData = { userId: getUserId(requestEnvelope) };
    const newUserRef = await this._firestore
      .collection(collectionNames.users)
      .add(userDocData);

    this._userRefId = newUserRef.id;

    return newUserRef;
  }

  public async saveAttributes(requestEnvelope: RequestEnvelope): Promise<void> {
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
  }
}
