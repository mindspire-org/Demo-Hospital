#!/usr/bin/env python3
import sys

f = '/var/www/cheema-hospital/backend/src/app.ts'
lines = open(f).readlines()

# Find and replace the CORS_ORIGIN line
for i, line in enumerate(lines):
    if 'env.CORS_ORIGIN' in line and 'split' not in line:
        # Replace with spread of split
        lines[i] = "  ...(env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : []),\n"
        print(f"Fixed line {i+1}: {lines[i].strip()}")
        break
    if "env.CORS_ORIGIN.split(" in line:
        # Already has split but maybe broken from sed
        lines[i] = "  ...(env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : []),\n"
        print(f"Fixed broken line {i+1}: {lines[i].strip()}")
        break

open(f, 'w').writelines(lines)
print("DONE")
