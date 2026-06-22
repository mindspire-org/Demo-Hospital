path = '/var/www/cheema-hospital/backend/dist/app.js'
with open(path, 'r') as f:
    content = f.read()

old = """const allowedOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    env_1.env.CORS_ORIGIN ? env_1.env.CORS_ORIGIN.split(',').map(function(s) { return s.trim(); }) : [],
].filter(Boolean);"""

new = """const allowedOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
].concat(env_1.env.CORS_ORIGIN ? env_1.env.CORS_ORIGIN.split(',').map(function(s) { return s.trim(); }) : []).filter(Boolean);"""

content = content.replace(old, new)
with open(path, 'w') as f:
    f.write(content)
print('done')
