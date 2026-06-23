#!/usr/bin/env python3
import os

hospitals = [
    '/var/www/cheema-hospital/dist/index.html',
    '/var/www/demohospital/dist/index.html',
    '/var/www/pebs/dist/index.html',
    '/var/www/NazirHospital/dist/index.html',
    '/var/www/sialkotmedical/dist/index.html',
    '/var/www/JinnahMedical/dist/index.html',
]

for f in hospitals:
    if not os.path.exists(f):
        print(f"SKIP (not found): {f}")
        continue
    content = open(f).read()
    if './assets/' in content:
        content = content.replace('src="./assets/', 'src="/assets/')
        content = content.replace('href="./assets/', 'href="/assets/')
        open(f, 'w').write(content)
        print(f"FIXED: {f}")
    else:
        print(f"OK (already absolute): {f}")

print("\nAll done.")
