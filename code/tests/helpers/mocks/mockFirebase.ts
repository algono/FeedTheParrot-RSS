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
  queryMock,
  empty = false,
}: {
  queryMock: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;
  empty?: boolean;
}) {
  when(queryMock.limit(anyNumber())).thenCall(() =>
    resolvableInstance(queryMock)
  );

  when(queryMock.orderBy(anyString())).thenCall(() =>
    resolvableInstance(queryMock)
  );

  const querySnapshotMock = mock<
    FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>
  >();

  when(querySnapshotMock.empty).thenReturn(empty);

  when(queryMock.get()).thenCall(() =>
    Promise.resolve(resolvableInstance(querySnapshotMock))
  );

  when(queryMock.where(anything(), anything(), anything())).thenCall(() =>
    instance(queryMock)
  );

  return { queryMock, querySnapshotMock };
}

export function mockUserRefId({
  firestoreMock,
  id,
}: { firestoreMock?: FirebaseFirestore.Firestore; id?: string } = {}) {
  const { collectionMock } = mockCollectionFirestore({
    firestoreMock,
    collectionPath: collectionNames.users,
  });

  const { querySnapshotMock } = mockQuery({
    empty: id === null,
    queryMock: collectionMock,
  });

  const queryDocumentSnapshotMock = mockQueryDocumentSnapshot();

  const { refMock } = mockCollectionFromRef({ collectionMock });

  when(refMock.id).thenReturn(id);

  when(queryDocumentSnapshotMock.ref).thenCall(() =>
    resolvableInstance(refMock)
  );
  when(queryDocumentSnapshotMock.id).thenReturn(id);

  when(querySnapshotMock.docs).thenCall(() => [
    instance(queryDocumentSnapshotMock),
  ]);

  return {
    collectionMock,
    querySnapshotMock,
    queryDocumentSnapshotMock,
    refMock,
  };
}

export function mockQueryDocumentSnapshot() {
  return mock<
    FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
  >();
}
