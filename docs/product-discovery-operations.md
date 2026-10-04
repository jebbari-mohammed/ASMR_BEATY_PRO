# Curated product discovery operations

`getProductDiscovery({})` returns a small US English editorial list for signed-in,
email-verified app users. App Check is enforced. The list is not personalized and
does not assert that a product suits anyone's skin. My Shelf remains behind the
app's membership gate. The response is:

```ts
{
  products: Array<{
    id: string;
    brand: string;
    name: string;
    category: 'Cleanser' | 'Moisturizer' | 'Sunscreen';
    merchant: 'Ulta Beauty';
    url: string;
    isCommissioned: boolean;
  }>;
  approvedTrackingHosts: string[];
}
```

The bundled list has five direct Ulta product pages, checked on October 3, 2026.
Every bundled URL is a clean `https://www.ulta.com/p/...` link with
`isCommissioned: false`. No affiliate account, partner URL, earnings, price,
stock, or individual product fit is asserted. This bundled list is the fallback
if the optional Firestore override is absent, unreadable, or invalid. An
intentional override with `products: []` hides all discovery links.

## Import or update the list

Run these commands from the repository root with an administrator's Google
Application Default Credentials authorized for the Firebase project. The CLI
requires an explicit project ID and dry-runs by default. A changed list is
written only with `--apply`; repeating the same import makes no write.

```sh
npm -w @asmr/backend run build
node packages/backend/dist/scripts/manage-product-discovery.js template > /tmp/asmr-product-discovery.json
node packages/backend/dist/scripts/manage-product-discovery.js publish --project asmr-skin-coach --file /tmp/asmr-product-discovery.json
node packages/backend/dist/scripts/manage-product-discovery.js publish --project asmr-skin-coach --file /tmp/asmr-product-discovery.json --apply
```

Edit that JSON to replace a product or URL, then run the `publish` dry-run and
`publish --apply` commands again. The file may contain the `products` array
alone or `{ "products": [...] }`. IDs must be unique. Direct, noncommissioned
links must be clean HTTPS `www.ulta.com/p/...` URLs with no query or fragment.
Do not put user IDs, email addresses, scan data, or other private information
in the file. The importer never generates tracking tags or changes a URL.

To hide all links without changing the app binary:

```sh
node packages/backend/dist/scripts/manage-product-discovery.js disable --project asmr-skin-coach
node packages/backend/dist/scripts/manage-product-discovery.js disable --project asmr-skin-coach --apply
```

To remove the override and return to the five bundled direct links:

```sh
node packages/backend/dist/scripts/manage-product-discovery.js reset --project asmr-skin-coach
node packages/backend/dist/scripts/manage-product-discovery.js reset --project asmr-skin-coach --apply
```

## Approved partner links, if a partnership exists later

Only use a URL supplied by an approved partner program after the account,
destination, disclosure, and allowed tracking parameters are checked by an
operator. Open the complete URL and verify that it resolves to the *listed*
Ulta product before publishing. Redirect destinations can change outside our
control, so recheck them periodically. There is currently no approved partner
host or commissioned product in the bundled list.

First approve the **exact** partner tracking host and its permitted query-key
names in the separate server-owned `curatedProductDiscovery/approvedTrackingHosts`
document. Use a real internal approval reference; the example values below are
placeholders and must be replaced with actual approved values. Omit
`--query-keys` if the partner URL has no query string.

```sh
node packages/backend/dist/scripts/manage-product-discovery.js approve-host --project asmr-skin-coach --host PARTNER_HOST --reference APPROVAL_REFERENCE --query-keys u,campaign
node packages/backend/dist/scripts/manage-product-discovery.js approve-host --project asmr-skin-coach --host PARTNER_HOST --reference APPROVAL_REFERENCE --query-keys u,campaign --apply
```

Then put the exact partner URL in the appropriate product's `url` field, set
`isCommissioned: true`, and run `publish` followed by `publish --apply` as
above. The server requires the separately approved host, HTTPS, no credentials,
port, fragment, or dynamic placeholders, and only the approved query keys.
It also rejects known personal-data query keys. A URL supplied by the operator
is returned unchanged; the server does not append a user identifier or invent
a campaign tag. The app shows a nearby commission disclosure only for products
whose `isCommissioned` flag is true. To switch or stop a partner link, publish
a new validated catalog JSON with another approved URL or a clean direct Ulta
URL and `isCommissioned: false`. No app binary update is needed after the
callable-enabled app is installed.

After all products stop using a host, remove its approval:

```sh
node packages/backend/dist/scripts/manage-product-discovery.js revoke-host --project asmr-skin-coach --host PARTNER_HOST
node packages/backend/dist/scripts/manage-product-discovery.js revoke-host --project asmr-skin-coach --host PARTNER_HOST --apply
```

Revoking a host while a catalog item still uses it makes the entire override
invalid and serves the five bundled direct links. The catalog override lives
at `curatedProductDiscovery/us`; both Firestore documents are written with the
Admin SDK and are not client-writable. Do not use a personal profile or a
provider feed to auto-select products. An external feed can be adapted to
produce this validated JSON only after its identity, URL, and disclosure
fields are checked.
