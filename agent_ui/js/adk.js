/* ═══════════════════════════════════════════════════════════════
   GEAP Agent UI — ADK Agent API Client (SSE streaming via FastAPI)
   ═══════════════════════════════════════════════════════════════ */

const AdkApi = (() => {

  function getSessionId() {
    let sid = localStorage.getItem('adk_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('adk_session_id', sid);
    }
    return sid;
  }

  function getUserId() {
    let uid = localStorage.getItem('adk_user_id');
    if (!uid) {
      uid = 'user-' + crypto.randomUUID().slice(0, 8);
      localStorage.setItem('adk_user_id', uid);
    }
    return uid;
  }

  /** Send a message, yield SSE events as an async generator. */
  async function* sendMessage(message) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': getUserId(),
        'X-Session-ID': getSessionId(),
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      let detail = `Server returned ${response.status}`;
      try { const err = await response.json(); detail = err.detail || detail; } catch { /* ok */ }
      throw new Error(detail);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith('data: ')) {
            try { yield JSON.parse(t.slice(6)); } catch { /* skip */ }
          }
        }
      }
      const t = buffer.trim();
      if (t.startsWith('data: ')) { try { yield JSON.parse(t.slice(6)); } catch { /* skip */ } }
    } finally {
      reader.releaseLock();
    }
  }

  /** Convenience: returns the full text response as a string. */
  async function send(message) {
    let text = '';
    for await (const ev of sendMessage(message)) {
      if (ev.type === 'text') text += ev.content;
    }
    return text;
  }

  return { sendMessage, send, getSessionId, getUserId };
})();
