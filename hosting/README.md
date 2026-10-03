# ASMR Beauty Pro website

This directory is the source for the static website at
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
