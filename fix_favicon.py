import re

for path in ['/var/www/JinnahMedical/dist/index.html', '/var/www/cheema-hospital/dist/index.html']:
    try:
        with open(path, 'r') as f:
            content = f.read()
        old = 'href="./hospital_icon.ico"'
        new = 'href="/hospital_icon.ico"'
        if old in content:
            content = content.replace(old, new)
            with open(path, 'w') as f:
                f.write(content)
            print(f'Fixed favicon path in {path}')
        else:
            print(f'No relative favicon in {path}')
    except Exception as e:
        print(f'Error for {path}: {e}')
