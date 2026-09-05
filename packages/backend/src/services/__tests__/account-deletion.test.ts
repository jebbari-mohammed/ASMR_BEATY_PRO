import { AccountDeletionService } from '../account-deletion.service.js';

describe('AccountDeletionService GDPR & Privacy Tests', () => {
  it('cascades deletion through all Firestore subcollections, conversations, spot journals, and Cloud Storage', async () => {
    const deletedDocs: string[] = [];
    const deletedBatches: any[][] = [];
    const deletedStoragePrefixes: string[] = [];

    // Mock Firestore batch
    const mockBatch = () => {
      const ops: any[] = [];
      return {
        delete: (docRef: any) => ops.push(docRef.path),
        commit: async () => {
          deletedBatches.push([...ops]);
        }
      };
    };

    // Mock document
    const mockDoc = (path: string) => ({
      path,
      ref: {
        path,
        delete: async () => deletedDocs.push(path),
        collection: (subName: string) => mockCollection(`${path}/${subName}`)
      }
    });

    // Mock collection
    const mockCollection = (colPath: string) => ({
      path: colPath,
      doc: (docId: string) => ({
        path: `${colPath}/${docId}`,
        collection: (subName: string) => mockCollection(`${colPath}/${docId}/${subName}`),
        delete: async () => deletedDocs.push(`${colPath}/${docId}`)
      }),
      get: async () => {
        if (colPath.includes('conversations') && !colPath.includes('messages')) {
          return { docs: [mockDoc(`${colPath}/conv_1`)] };
        }
        if (colPath.includes('spotJournals') && !colPath.includes('entries')) {
          return { docs: [mockDoc(`${colPath}/spot_1`)] };
        }
        return {
          docs: [mockDoc(`${colPath}/doc_a`), mockDoc(`${colPath}/doc_b`)]
        };
      }
    });

    const mockFirestore: any = {
      collection: mockCollection,
      batch: mockBatch
    };

    const mockStorage: any = {
      bucket: () => ({
        deleteFiles: async (options: { prefix: string; force?: boolean }) => {
          deletedStoragePrefixes.push(options.prefix);
        }
      })
    };

    const service = new AccountDeletionService(mockFirestore, mockStorage);
    const result = await service.deleteUserAccountData('usr_test_gdpr');

    expect(result.deleted).toBe(true);
    expect(result.deletedCollections).toContain('skinScans');
    expect(result.deletedCollections).toContain('skinSnapshots');
    expect(result.deletedCollections).toContain('routines');
    expect(result.deletedCollections).toContain('shelf');
    expect(result.deletedCollections).toContain('conversations');
    expect(result.deletedCollections).toContain('users_profile');

    // Verify storage cleanup
    expect(deletedStoragePrefixes).toContain('transient-scans/usr_test_gdpr/');
    expect(deletedStoragePrefixes).toContain('progress-photos/usr_test_gdpr/');
    expect(deletedStoragePrefixes).toContain('spot-journal/usr_test_gdpr/');

    // Verify user root document was deleted
    expect(deletedDocs).toContain('users/usr_test_gdpr');
  });
});
