# ASMR Beauty Pro website

The `hosting/` directory is the source for the static website at
https://jebbari-mohammed.github.io/ASMR_BEATY_PRO/. It needs no build step.
GitHub Pages publishes the root of the public repository's `main` branch.

The site uses original project imagery, actual private-test app screenshots,
and self-hosted fonts. Keep the font license files with the font files. All
links between regular pages are relative so the site works at a GitHub Pages
project path. The 404 page uses project-root paths so its styles and recovery
links also work for deeply nested missing URLs. The app is still in private
testing, so the site does not link to a public store listing. Add verified
store URLs only when those listings are public. Publishing this website does
not change the mobile app's release.

The public routine guide is editorial content based on linked American Academy
of Dermatology sources. Keep its general cosmetic advice, source links, app
feature descriptions, and publication date accurate when updating it. The
HTML pages use a restrictive meta Content Security Policy because GitHub Pages
does not let this project set response headers. Keep all assets local and test
the pages in a browser after changing the policy.

To preview locally, run `python3 -m http.server 8766 --directory hosting` from
the repository root and open http://127.0.0.1:8766/.

The local repository also contains mobile app and backend work. The public
Pages branch contains **only** this website. After committing changes in
`hosting/`, publish them with:

```sh
git subtree split --prefix=hosting HEAD
git push origin <split-commit-hash>:main
```

The split commit can be pushed normally because the first website deployment
was created with the same subtree split. Check the Pages build and public URL
after each update.

The XML sitemap is at `/ASMR_BEATY_PRO/sitemap.xml`. Because this is a GitHub
Pages project site, a `robots.txt` file inside this directory would be served
under `/ASMR_BEATY_PRO/` rather than the host root, so search crawlers would
not use it. Submit the sitemap through the verified URL-prefix property in
Google Search Console. Keep the `google3e206f76b54dc34c.html` file in the
site root so ownership verification remains valid.

On October 3, 2026, Search Console's verified URL-prefix property confirmed
that the homepage and `/skincare-routine-guide.html` are **on Google** and
**indexed**. Their Page indexing details showed successful Googlebot smartphone
fetches, allowed crawling and indexing, and the inspected URLs as Google's
selected canonicals. The last indexed crawls were at 13:52:28 and 14:26:51
Pacific time, respectively, before the latest FAQ and Product Shelf updates.
Fresh indexing was requested for the updated guide and homepage on the same
day. These requests enter Google's crawl queue; they do not prove that the new
content has already been indexed or that either page ranks for a query.

The sitemap report still shows **Couldn't fetch** / **Sitemap could not be
read**, a temporary processing error, and zero discovered pages, despite a
last-read date of October 3. The full project-path sitemap URL is correct and
was resubmitted in Search Console, which accepted the submission. The XML
returned HTTP 200 with `application/xml` to normal and Googlebot user agents;
all six listed URLs parsed correctly. Search Console's live smartphone URL
inspection also reported a successful fetch, with crawling and indexing
allowed. Recheck the sitemap report later; the live fetch and individual page
indexing are stronger current evidence than the stalled aggregate report. A
sitemap submission is a discovery hint, not proof of indexing or ranking.
