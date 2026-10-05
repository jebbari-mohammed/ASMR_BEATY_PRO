#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 INPUT.aab OUTPUT.aab" >&2
  exit 2
fi

input=$1
output=$2
keystore=${ASMR_RELEASE_KEYSTORE:-/Users/Apple/Desktop/ASMR-BEAUTY-ANDROID-SDK52-BACKUP-20260927/app/release.keystore}
[[ -f "$input" && -f "$keystore" ]] || { echo "Bundle or registered upload keystore is missing" >&2; exit 1; }
[[ ! -e "$output" ]] || { echo "Output already exists: $output" >&2; exit 1; }

# jarsigner reads passwords from the environment, so they never appear in command arguments or logs.
export ASMR_RELEASE_STORE_PASSWORD
export ASMR_RELEASE_KEY_PASSWORD
ASMR_RELEASE_STORE_PASSWORD=$(security find-generic-password -a com.asmr.beautypro -s asmr-beauty-pro-android-store-password -w)
ASMR_RELEASE_KEY_PASSWORD=$(security find-generic-password -a com.asmr.beautypro -s asmr-beauty-pro-android-key-password -w)
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT

python3 - "$input" "$scratch/unsigned.aab" <<'PY'
import re
import sys
import zipfile

signature = re.compile(r"^META-INF/(?:MANIFEST\.MF|[^/]+\.(?:SF|RSA|DSA|EC))$", re.I)
with zipfile.ZipFile(sys.argv[1]) as source, zipfile.ZipFile(sys.argv[2], "w") as target:
    for entry in source.infolist():
        if not signature.match(entry.filename):
            target.writestr(entry, source.read(entry.filename))
PY

jarsigner -keystore "$keystore" \
  -storepass:env ASMR_RELEASE_STORE_PASSWORD \
  -keypass:env ASMR_RELEASE_KEY_PASSWORD \
  -signedjar "$output" "$scratch/unsigned.aab" asmr_release_key >/dev/null
unset ASMR_RELEASE_STORE_PASSWORD ASMR_RELEASE_KEY_PASSWORD

verification=$(jarsigner -verify "$output")
[[ "$verification" == *"jar verified"* ]] || { echo "Bundle signature verification failed" >&2; exit 1; }

python3 - "$input" "$output" <<'PY'
import hashlib
import re
import sys
import zipfile

signature = re.compile(r"^META-INF/(?:MANIFEST\.MF|[^/]+\.(?:SF|RSA|DSA|EC))$", re.I)
with zipfile.ZipFile(sys.argv[1]) as original, zipfile.ZipFile(sys.argv[2]) as signed:
    names = [name for name in original.namelist() if not signature.match(name)]
    if any(hashlib.sha256(original.read(name)).digest() != hashlib.sha256(signed.read(name)).digest() for name in names):
        raise SystemExit("A bundle payload changed while signing")
print("Signed bundle verified; app payload bytes preserved.")
PY
