import { firestore } from 'firebase-admin';
import {
  anyNumber,
  anyString,
  anything,
  instance,
  mock,
  when,
} from 'ts-mockito';
import { collectionNames } from '../../../src/database/FirebasePersistenceAdapter';
import { resolvableInstance } from '../ts-mockito/resolvableInstance';

export function mockCollection() {
  const collectionMock = mock<
    FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>
  >();

  when(collectionMock.add(anything())).thenResolve(
    resolvableInstance(mockRef())
  );

  return collectionMock;
}

export function mockCollectionFirestore({
  firestoreMock = mock<FirebaseFirestore.Firestore>(),
  collectionPath,
}: {
  firestoreMock?: FirebaseFirestore.Firestore;
  collectionPath?: string;
} = {}) {
  const collectionMock = mockCollection();

  when(
    firestoreMock.collection(collectionPath ? collectionPath : anyString())
  ).thenCall(() => resolvableInstance(collectionMock));

  return { firestoreMock, collectionMock };
}

export function mockRef(): FirebaseFirestore.DocumentReference<
  FirebaseFirestore.DocumentData
> {
  return mock<
    FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
  >();
}

export function mockCollectionFromRef({
  collectionMock = mockCollection(),
  refMock = mockRef(),
}: {
  collectionMock?: FirebaseFirestore.CollectionReference<
    FirebaseFirestore.DocumentData
  >;
  refMock?: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
} = {}) {
  when(refMock.collection(anyString())).thenCall(() =>
    resolvableInstance(collectionMock)
  );

  return { refMock, collectionMock };
}

export function mockQuery({
  empty = false,
  collectionMock = mockCollectionFirestore().collectionMock,
}: {
  empty?: boolean;
  collectionMock?: FirebaseFirestore.CollectionReference<
    FirebaseFirestore.DocumentData
  >;
} = {}) {
  when(collectionMock.limit(anyNumber())).thenCall(() =>
    resolvableInstance(collectionMock)
  );

  when(collectionMock.orderBy(anyString())).thenCall(() =>
    resolvableInstance(collectionMock)
  );

  const querySnapshotMock = mock<
    FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>
  >();

  when(querySnapshotMock.empty).thenReturn(empty);

  when(collectionMock.get()).thenCall(() =>
    Promise.resolve(resolvableInstance(querySnapshotMock))
  );

  when(collectionMock.where(anything(), anything(), anything())).thenCall(() =>
    instance(collectionMock)
  );

  return { queryMock: collectionMock, querySnapshotMock };
}

export function mockUserRefId({
  firestoreMock,
  id,
}: { firestoreMock?: firestore.Firestore; id?: string } = {}) {
  const { collectionMock } = mockCollectionFirestore({
    firestoreMock,
    collectionPath: collectionNames.users,
  });

  const { querySnapshotMock } = mockQuery({
    empty: id === null,
    collectionMock,
  });

  const queryDocumentSnapshotMock = mock<
    FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
  >();

  const { refMock } = mockCollectionFromRef({ collectionMock });

  when(refMock.id).thenReturn(id);

  when(queryDocumentSnapshotMock.ref).thenCall(() =>
    resolvableInstance(refMock)
  );
  when(queryDocumentSnapshotMock.id).thenReturn(id);

  when(querySnapshotMock.docs).thenCall(() => [
    instance(queryDocumentSnapshotMock),
  ]);

  return { querySnapshotMock, queryDocumentSnapshotMock };
}
