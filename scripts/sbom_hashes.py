#!/usr/bin/env python3
"""Adds sha512 hashes from package-lock.json integrity fields to sbom.json."""
import base64, json, sys

lock = json.load(open('package-lock.json'))
sbom = json.load(open('sbom.json'))

integrity = {}
for name, pkg in lock['packages'].items():
    if not name or 'integrity' not in pkg:
        continue
    alg, _, digest = pkg['integrity'].partition('-')
    if alg == 'sha512':
        name = pkg.get('name') or name.split('node_modules/')[-1]
        integrity[f"{name}@{pkg['version']}"] = base64.b64decode(digest).hex()

missing = []
for comp in sbom['components']:
    purl = comp.get('purl', '').removeprefix('pkg:npm/').replace('%40', '@')
    key = purl.rsplit('@', 1)[0] if '@' in purl else f"{comp['name']}@{comp['version']}"
    key = f"{key}@{comp['version']}"
    if key in integrity:
        comp['hashes'] = [{'alg': 'SHA-512', 'content': integrity[key]}]
    else:
        missing.append(key)

json.dump(sbom, open('sbom.json', 'w'), indent=2)
print(f"hashes added: {len(sbom['components']) - len(missing)}, missing: {missing}")
sys.exit(1 if missing else 0)
