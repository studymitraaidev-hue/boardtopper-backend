import os
import sys

possible_files = ['src/app.ts', 'src/index.ts', 'src/server.ts', 'app.ts', 'index.ts', 'server.ts']
app_file = None
for f in possible_files:
    if os.path.exists(f):
        app_file = f
        break

if not app_file:
    print("❌ No app file found")
    sys.exit(1)

print(f"Found: {app_file}")

with open(app_file, 'r') as f:
    content = f.read()

if '/api/health' in content:
    print("✅ Already exists!")
    sys.exit(0)

health = '''
// Health check for UptimeRobot - NO AUTH needed
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
'''

for pattern, replacement in [
    ('app.listen', health + '\napp.listen'),
    ('export default app', health + '\nexport default app'),
    ('module.exports = app', health + '\nmodule.exports = app'),
]:
    if pattern in content:
        content = content.replace(pattern, replacement, 1)
        with open(app_file, 'w') as f:
            f.write(content)
        print(f"✅ Added /api/health to {app_file}")
        sys.exit(0)

# Fallback: append
with open(app_file, 'a') as f:
    f.write(health)
print(f"✅ Appended /api/health to {app_file}")
