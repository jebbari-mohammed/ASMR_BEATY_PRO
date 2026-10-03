# Privacy disclosure inventory for the release candidate

Prepared September 27, 2026. The Play Data safety form is filled and saved as a draft for the signed binary; it cannot be sent for review until target audience and remaining content information are supplied. Use this inventory to audit future data-practice changes. The App Store privacy label was published after explicit owner approval, covering seven collected types: email, other user content, user ID, device ID, purchase history, other usage data, and other diagnostic data. All are declared linked to the user and not used for tracking. Purchase history serves app functionality and analytics; the other six serve app functionality. The public policy is live at `https://asmr-skin-coach.web.app/privacy` and is saved in both store consoles. The public account deletion instructions are live at `https://asmr-skin-coach.web.app/delete-account`.

| Data | Source in this app | Expected store disclosure | Purpose and link to identity |
| --- | --- | --- | --- |
| Email address | Firebase email/password sign-in | Contact Info → Email Address | Account access and verification; linked to Firebase user ID. |
| Firebase account ID | Firebase Auth and Firestore paths; passed to RevenueCat as its app user ID | Identifiers → User ID | Authentication, syncing, and entitlement verification; linked to account. |
| Store purchase and entitlement | Apple/Google transactions, RevenueCat, Firestore entitlement cache | Purchases → Purchase History | App functionality and RevenueCat purchase analytics; linked to account. |
| Routine steps and product shelf text | User-created Firestore documents | User Content → Other User Content | App functionality; linked to account. Generic free text can include information a user chooses to enter. |
| Daily step completion and dates | Firestore daily records | Usage Data → Other Usage Data | Progress and calendar; linked to account. |
| App Attest/DeviceCheck signals | Firebase App Check on iOS | Review Identifiers → Device ID and Other Diagnostic Data against the final SDK privacy report | Security and fraud prevention. Confirm whether provider retention meets Apple's collection definition. |
| Function request metadata | Firebase Functions | Review Other Diagnostic Data against the deployed logging configuration | Functions collect invocation name and caller IP. Classify any retained IP according to its actual use. |
| Onboarding goals and ritual preferences | Saved locally during the questionnaire; goals, skin feel, sensitivity, available time, routine experience, sunscreen habit, and motivation are copied to the new user's Firestore profile | User Content → Other User Content | Shape the starter routine and explain it on the paywall; linked to the Firebase account. No photo or inferred skin score is used. |
| Optional reminder time | Stored on device | No collection if never transmitted | Local notification scheduling only. |

The app does not request face photos, location, contacts, payment card data, or ad tracking in this release. It does not include Firebase Analytics or Crashlytics in the mobile dependency list. Inspect the final iOS privacy report and any transitive SDKs before making those declarations, since App Store Connect requires data collected by third-party SDKs too.

References: [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/), [Firebase Apple data collection](https://firebase.google.com/docs/ios/app-store-data-collection), [RevenueCat Apple App Privacy](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy).
