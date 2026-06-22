#!/bin/bash
sed -i 's|href="\./|href="/|g; s|src="\./|src="/|g' /var/www/JinnahMedical/dist/index.html
echo "Fixed. Result:"
grep -E 'src=|href=' /var/www/JinnahMedical/dist/index.html
