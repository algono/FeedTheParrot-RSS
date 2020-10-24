import * as firebaseAdmin from 'firebase-admin';
import { Feed } from '../logic/Feed';
import * as firebaseCredentials from './firebaseServiceAccountKey.json';

const AuthCodesCollectionName = 'auth-codes';

export interface AuthCode {
  uid: string;
  code: string;
  expirationDate: Date;
}

export interface UserData {
  userId: string;
}

export class Database {
  private static _instance: Database;

  private readonly _firestore: FirebaseFirestore.Firestore;

  private constructor() {
    Database.init();
    this._firestore = firebaseAdmin.firestore();
  }

  public static get instance() {
    return this._instance || (this._instance = new this());
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

  public addAuthCode(code: AuthCode) {
    return this._firestore
      .collection(AuthCodesCollectionName)
      .add(code);
  }

  public async getUserData(userId: string, createIfNotFound: boolean = true) {
    const userDataQuery = await this._firestore
      .collection('users')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    let userData: UserData,
      userDataRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;

    if (userDataQuery.empty) {
      if (createIfNotFound) {
        userData = { userId: userId };
        console.log('(Database) No user data. Creating new user');
        userDataRef = await this.createNewUser(userData);
      } else {
        return null;
      }
    } else {
      console.log('(Database) Existing user. Retrieving user data');
      // Get user data from query
      const userDataDoc = userDataQuery.docs[0];
      userDataRef = userDataDoc.ref;
      userData = userDataDoc.data() as UserData;
    }

    return { userData, userDataRef };
  }

  public createNewUser(userData: UserData) {
    return this._firestore.collection('users').add(userData);
  }

  public async getFeedsFromUser(
    userDataRef: FirebaseFirestore.DocumentReference<
      FirebaseFirestore.DocumentData
    >,
    nameField: string
  ) {
    const feedSnapshots = await userDataRef
      .collection('feeds')
      .orderBy(nameField) // This filters out documents without the field
      .get();

    const feeds: { [x: string]: Feed } = {};
    const feedNames: string[] = [];

    feedSnapshots.forEach((snapshot) => {
      const data = snapshot.data();

      const name: string = data[nameField];

      const feed: Feed = Object.assign<Feed, FirebaseFirestore.DocumentData>(
        new Feed(name, data.url, data.language),
        data
      );

      feedNames.push(name);
      feeds[name] = feed;
    });

    return { feeds, feedNames };
  }
}