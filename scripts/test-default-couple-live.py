"""Read-only administrative check: ssh opencraft python3 - < scripts/test-default-couple-live.py"""
import json
import os
from pathlib import Path
import urllib.request

for line in (Path.home() / '.config/diet-yuk/ai-worker.env').read_text().splitlines():
    if '=' in line:
        key, value = line.split('=', 1)
        os.environ[key] = value


def get(path):
    key = os.environ['DIET_YUK_SUPABASE_SERVICE_KEY']
    request = urllib.request.Request(os.environ['DIET_YUK_SUPABASE_URL'] + path,
        headers={'apikey': key, 'Authorization': 'Bearer ' + key})
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


emails = ('mrayandika.work@gmail.com', 'anggun.rizkye@gmail.com')
users = {u['email'].lower(): u for u in get('/auth/v1/admin/users?per_page=1000')['users']
    if u.get('email', '').lower() in emails and not u.get('is_anonymous', False)
    and u.get('email_confirmed_at') and u.get('app_metadata', {}).get('provider') == 'google'}
couples = set()
eligible_ids = set()
for email in emails:
    user = users.get(email)
    if user is None:
        print(json.dumps({'email': email, 'status': 'waiting_for_first_google_login'}))
        continue
    profiles = get('/rest/v1/profiles?id=eq.' + user['id'] + '&select=id')
    memberships = get('/rest/v1/couple_members?user_id=eq.' + user['id'] + '&select=couple_id')
    if not profiles:
        assert not memberships, 'Membership exists without a saved profile'
        print(json.dumps({'email': email, 'status': 'waiting_for_onboarding'}))
        continue
    assert len(memberships) == 1, 'Saved profile not automatically linked'
    couples.add(memberships[0]['couple_id'])
    eligible_ids.add(user['id'])
    print(json.dumps({'email': email, 'status': 'automatically_linked'}))

assert len(couples) == 1, 'Onboarded accounts do not share one default couple'
members = get('/rest/v1/couple_members?couple_id=eq.' + next(iter(couples)) + '&select=user_id')
assert {m['user_id'] for m in members} == eligible_ids, 'Unexpected couple member'
print('PASS: existing profiles automatically linked; no invitations or unrelated members')
