#!/usr/bin/env python3
import os

f = '/var/www/cheema-hospital/dist/index.html'
content = open(f).read()
content = content.replace('src="./assets/', 'src="/assets/')
content = content.replace('href="./assets/', 'href="/assets/')
open(f, 'w').write(content)
print("DONE")

# Verify
for line in open(f).readlines():
    if 'src=' in line or 'href=' in line:
        print(line.strip())
