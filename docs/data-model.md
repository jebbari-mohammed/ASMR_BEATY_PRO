# Firestore & Cloud Storage Data Model

## 1. Firestore Collection Hierarchy

```
/products/{productId}                          [Public Read, Admin Write]
    /offers/{offerId}                          [Public Read, Admin Write]

/safetyPolicies/{policyVersion}                [Public Read, Admin Write]

/entitlements/{userId}                         [User Read, Server Write Only]
    Fields: tier, isPro, status, currentPeriodEnd, store, updatedAt

/usage/{userId}                                [User Read, Server Write Only]
    Fields: monthYear, freeScansRemaining, proScansUsedThisMonth, lastScanTimestamp, coachMessagesUsedToday

/users/{userId}                                [User Read/Write (Except server fields)]
    Fields: displayName, skinType, country, sensitivities, goals, createdAt

    /skinScans/{scanId}                        [User Create/Read, Server Update]
        Fields: status, capturedAt, angles, idempotencyKey, storagePaths, resultSnapshotId

    /skinSnapshots/{snapshotId}                [User Read, Server Write Only]
        Fields: capturedAt, provider, metrics, baselineCosmeticScore, topFocusAreas

    /routines/{routineId}                      [User Read/Write]
        Fields: version, complexity, morningSteps, eveningSteps, updatedAt

    /routineLogs/{logId}                       [User Read/Write]
        Fields: date, morningCompleted, eveningCompleted, morningSteps, eveningSteps

    /shelf/{shelfItemId}                       [User Read/Write]
        Fields: productId, inputMethod, status, dateStarted, feedback, reportedIrritation

    /spotJournals/{journalId}                  [User Read/Write]
        Fields: facialRegion, startedAt, status, requiresProfessionalConsultation
        /entries/{entryId}                     [User Read/Write]
            Fields: dayNumber, capturedAt, photoStoragePath, reportedTenderness

    /conversations/{conversationId}            [User Read/Write]
        /messages/{messageId}                  [User Read/Create, Server Write]
            Fields: sender, content, timestamp, structuredResponse

    /recommendations/{recommendationId}        [User Read, Server Write Only]
        Fields: safetyPolicyVersion, candidateProductIds, approvedProductIds, reasonCodes
```

## 2. Cloud Storage Paths

- `transient-scans/{userId}/{scanId}/front.jpg` — 10MB limit, auto-purged post-normalization (<24h lifecycle).
- `progress-photos/{userId}/{scanId}/thumb.jpg` — 5MB limit, user-consented downscaled visual progress tracking.
- `spot-journal/{userId}/{journalId}/{entryId}.jpg` — 5MB limit, close-up tracking images.
- `catalog/products/{productId}.jpg` — Public CDN assets.
