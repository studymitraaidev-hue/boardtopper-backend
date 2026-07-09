import sys
with open('src/pages/DoubtSolver.tsx', 'r') as f:
    content = f.read()

# 1. Add saveStatus state
if 'saveStatus' not in content:
    content = content.replace(
        "const [chatHistory, setChatHistory] = useState<Array<{question: string; answer: string; subject: string}>>([]);",
        "const [chatHistory, setChatHistory] = useState<Array<{question: string; answer: string; subject: string}>>([]);\\n  const [saveStatus, setSaveStatus] = useState<string>('');"
    )
    print('✅ Added saveStatus state')

# 2. Fix fetchHistory - add try/catch + res.ok check
old_fetch = """    const fetchHistory = async () => {
      const token = localStorage.getItem('bt_token');
      if (!token) return;
      const res = await fetch(`${BASE_URL}/api/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setChatHistory(data.map((h: any) => ({
          question: h.question,
          answer: h.answer,
          subject: h.subject,
        })));
      }
    };
    fetchHistory();"""

new_fetch = """    const fetchHistory = async () => {
      const token = localStorage.getItem('bt_token');
      if (!token) return;
      try {
        const res = await fetch(`${BASE_URL}/api/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) { console.error('History fetch failed', res.status); return; }
        const data = await res.json();
        if (Array.isArray(data)) {
          setChatHistory(data.map((h: any) => ({
            question: h.question,
            answer: h.answer,
            subject: h.subject,
          })));
        }
      } catch (e) { console.error('History fetch error', e); }
    };
    fetchHistory();"""

if old_fetch in content:
    content = content.replace(old_fetch, new_fetch)
    print('✅ Fixed fetchHistory')
else:
    print('⚠️ fetchHistory pattern not found')

# 3. Fix save block - wrap in try/catch, add status
old_save = """        // Save to chat history
        const token = localStorage.getItem('bt_token');
        const saveRes = await fetch(`${BASE_URL}/api/history/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ question: questionText, answer: result.text, subject }),
        });
        if (saveRes.ok) {
          setChatHistory(prev => [{ question: questionText, answer: result.text, subject: subject || 'general' }, ...prev].slice(0, 10));
        } else {
          console.error('Save failed', saveRes.status, await saveRes.text());
        }"""

new_save = """        // Save to chat history
        try {
          const token = localStorage.getItem('bt_token');
          const saveRes = await fetch(`${BASE_URL}/api/history/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ question: questionText, answer: result.text, subject }),
          });
          if (saveRes.ok) {
            setChatHistory(prev => [{ question: questionText, answer: result.text, subject: subject || 'general' }, ...prev].slice(0, 10));
            setSaveStatus('Saved!');
            setTimeout(() => setSaveStatus(''), 3000);
          } else {
            const errText = await saveRes.text();
            console.error('Save failed', saveRes.status, errText);
            setSaveStatus('Save failed: ' + saveRes.status);
          }
        } catch (saveErr: any) {
          console.error('Save error', saveErr);
          setSaveStatus('Save error: ' + (saveErr.message || 'network'));
        }"""

if old_save in content:
    content = content.replace(old_save, new_save)
    print('✅ Fixed save block')
else:
    print('⚠️ save block pattern not found')

# 4. Add status badge before history UI
if 'saveStatus && (' not in content:
    content = content.replace(
        "{/* Recent Questions History */}",
        """{saveStatus && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-opacity ${
          saveStatus.startsWith('Saved') ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {saveStatus}
        </div>
      )}
      {/* Recent Questions History */}"""
    )
    print('✅ Added status badge')

with open('src/pages/DoubtSolver.tsx', 'w') as f:
    f.write(content)
print('📝 File saved')
