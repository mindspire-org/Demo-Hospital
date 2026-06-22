import sys
path = '/var/www/cheema-hospital/backend/dist/app.js'
with open(path, 'r') as f:
    content = f.read()
old = "    env_1.env.CORS_ORIGIN,"
new = "    env_1.env.CORS_ORIGIN ? env_1.env.CORS_ORIGIN.split(',').map(function(s) { return s.trim(); }) : [],"
content = content.replace(old, new)
with open(path, 'w') as f:
    f.write(content)
print('done')
