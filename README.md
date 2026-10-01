# ASMR Beauty Pro website

This directory is the source for the static website at
https://jebbari-mohammed.github.io/ASMR_BEATY_PRO/. It needs no build step.
GitHub Pages publishes the root of the public repository's `main` branch.

The site uses original project imagery, actual private-test app screenshots,
and self-hosted fonts. Keep the font license files with the font files. All
links between pages are relative so the site works at a GitHub Pages project
path. The app is still in private testing, so the site does not link to a
public store listing. Add verified store URLs only when those listings are
public; publishing this website does not change the mobile app's release.

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
