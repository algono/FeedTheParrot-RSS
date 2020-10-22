import * as firebaseAdmin from 'firebase-admin';
import { Feed } from '../logic/Feed';
import * as firebaseCredentials from './firebaseServiceAccountKey.json';

namespace Database {
  /**
   * Initializes the Database.
   * Must be called once at application start.
   */
  export function init() {
    return firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(
        firebaseCredentials as firebaseAdmin.ServiceAccount
      ),
      databaseURL: 'https://feedtheparrot-rss.firebaseio.com',
    });
  }

  const firestore = () => firebaseAdmin.firestore();

  export interface AuthCode {
    uid: string;
    code: string;
    expirationDate: Date;
  }

  const AuthCodesCollectionName = 'auth-codes';

  export function addAuthCode(code: AuthCode) {
    return firestore().collection(AuthCodesCollectionName).add(code);
  }

  export interface UserData {
    userId: string;
  }

  export async function getUserData(
    userId: string,
    createIfNotFound: boolean = true
  ) {
    const userDataQuery = await firestore()
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
        userDataRef = await createNewUser(userData);
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

  export function createNewUser(userData: UserData) {
    return firestore().collection('users').add(userData);
  }

  export async function getFeedsFromUser(
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

export default Database;
