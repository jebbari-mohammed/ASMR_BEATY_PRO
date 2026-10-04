# Daily skin-feel check-in retention

The `changeSkinFeelCheckin` callable writes one fixed-choice record per local calendar day at `users/{uid}/skinFeelCheckins/{YYYY-MM-DD}`. It validates the live verified account, active purchase, one-time app trial, or store-review grant, and account-deletion guard. The server sets `expireAt` to 30 days after the first save. Changing the choice on the same day keeps the original expiry. Clients cannot create, update, or delete these records directly through Firestore rules.

The Firestore database must have a TTL policy on the `expireAt` timestamp field for collection group `skinFeelCheckins`. It is managed outside `firestore.indexes.json`:

```sh
gcloud firestore fields ttls update expireAt \
  --collection-group=skinFeelCheckins \
  --database='(default)' \
  --enable-ttl \
  --project=asmr-skin-coach

gcloud firestore fields ttls list \
  --database='(default)' \
  --project=asmr-skin-coach
```

Confirm the `skinFeelCheckins/expireAt` policy reaches `ACTIVE` before distributing a build with daily check-ins. Firestore deletes expired records asynchronously, so 30 days is the expiry time rather than an exact deletion deadline. The app reads at most 14 records and displays only the most recent 14 calendar days. The account-deletion service recursively removes all check-in records regardless of TTL status.

Google's [Firestore TTL documentation](https://firebase.google.com/docs/firestore/ttl) says expired documents usually disappear within 24 hours, but that timing is not guaranteed.
