#!/bin/bash
cd /var/www/JinnahMedical/dist
tar -xzf /tmp/dist_assets.tar.gz --strip-components=1
sed -i 's|href="./|href="/|g' index.html
sed -i 's|src="./|src="/|g' index.html
echo "DONE"
grep -E 'src=|href=' index.html | head -5
