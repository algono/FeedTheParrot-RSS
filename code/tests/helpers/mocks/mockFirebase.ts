import { firestore } from 'firebase-admin';
import { mocked } from 'ts-jest/utils';
import {
  anyNumber,
  anyString,
  anything,
  instance,
  mock,

  when
} from 'ts-mockito';
import { collectionNames } from '../../../src/database/FirebasePersistenceAdapter';
import { resolvableInstance } from '../ts-mockito/resolvableInstance';

function mockCollection() {
  const collectionMock = mock<
    FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>
  >();

  when(collectionMock.add(anything())).thenResolve(null);

  return collectionMock;
}
export function mockCollectionFirestore(collectionPath?: string) {
  const collectionMock = mockCollection();

  const firestoreMock = mock<FirebaseFirestore.Firestore>();

  when(
    firestoreMock.collection(collectionPath ? collectionPath : anyString())
  ).thenCall(() => resolvableInstance(collectionMock));

  mocked(firestore).mockImplementation(() => instance(firestoreMock));
  return { firestoreMock, collectionMock };
}
function mockQuery({
  empty = false,
  collectionMock = mockCollectionFirestore().collectionMock,
}: {
  empty?: boolean;
  collectionMock?: FirebaseFirestore.CollectionReference<
    FirebaseFirestore.DocumentData
  >;
} = {}) {
  when(collectionMock.limit(anyNumber())).thenCall(() => resolvableInstance(collectionMock)
  );

  when(collectionMock.orderBy(anyString())).thenCall(() => resolvableInstance(collectionMock)
  );

  const querySnapshotMock = mock<
    FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>
  >();

  when(querySnapshotMock.empty).thenReturn(empty);

  when(collectionMock.get()).thenCall(() => Promise.resolve(resolvableInstance(querySnapshotMock))
  );

  when(collectionMock.where(anything(), anything(), anything())).thenCall(() => instance(collectionMock)
  );

  return { queryMock: collectionMock, querySnapshotMock };
}
export function mockUserRefId(id?: string) {
  const { querySnapshotMock } = mockQuery({
    collectionMock: mockCollectionFirestore(collectionNames.users)
      .collectionMock,
  });

  const queryDocumentSnapshotMock = mock<
    FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
  >();

  when(queryDocumentSnapshotMock.id).thenReturn(id);

  when(querySnapshotMock.docs).thenCall(() => [
    instance(queryDocumentSnapshotMock),
  ]);

  return { querySnapshotMock, queryDocumentSnapshotMock };
}
