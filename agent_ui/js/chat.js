/* ═══════════════════════════════════════════════════════════════
   GEAP Agent UI — Chat Panel
   ═══════════════════════════════════════════════════════════════ */

const Chat = (() => {
  let isStreaming = false;

  function renderMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/### (.+)/g, '<strong>$1</strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
    return html;
  }

  function scrollToBottom() {
    const el = document.getElementById('chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function addMessage(role, content) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `
      <div class="avatar">${role === 'user' ? '👤' : '🤖'}</div>
      <div class="bubble">${renderMarkdown(content)}</div>
    `;
    container.appendChild(div);
    scrollToBottom();
  }

  function showTyping() {
    const container = document.getElementById('chat-messages');
    if (!container) return null;

    const div = document.createElement('div');
    div.className = 'message assistant typing';
    div.id = 'typing-indicator';
    div.innerHTML = `
      <div class="avatar">🤖</div>
      <div class="bubble">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    `;
    container.appendChild(div);
    container.appendChild((() => {
      const el = document.createElement('div');
      el.className = 'message assistant';
      el.id = 'streaming-container';
      el.style.display = 'none';
      el.innerHTML = '<div class="avatar">🤖</div><div class="bubble"><div class="streaming-text"></div></div>';
      return el;
    })());
    scrollToBottom();
    return div;
  }

  function updateStreaming(text) {
    const typing = document.getElementById('typing-indicator');
    const container = document.getElementById('streaming-container');
    if (typing) typing.style.display = 'none';
    if (container) {
      container.style.display = 'flex';
      const bubble = container.querySelector('.streaming-text');
      if (bubble) {
        bubble.style.display = 'block';
        bubble.innerHTML = renderMarkdown(text) + '<span class="streaming-cursor">▌</span>';
      }
    }
    scrollToBottom();
  }

  function hideStreaming() {
    const el = document.getElementById('streaming-container');
    if (el) el.remove();
  }

  function setError(msg) {
    const bar = document.getElementById('error-bar');
    if (bar) {
      bar.textContent = msg;
      bar.style.display = 'block';
    }
  }

  function clearError() {
    const bar = document.getElementById('error-bar');
    if (bar) bar.style.display = 'none';
  }

  async function send(text) {
    if (!text.trim() || isStreaming) return;
    clearError();

    const input = document.getElementById('chat-input');
    const btn = document.getElementById('chat-send');

    isStreaming = true;
    if (input) input.disabled = true;
    if (btn) btn.disabled = true;

    addMessage('user', text.trim());
    const typing = showTyping();

    let fullText = '';

    try {
      for await (const event of AdkApi.sendMessage(text.trim())) {
        if (event.type === 'text') {
          fullText += event.content;
          updateStreaming(fullText);
        } else if (event.type === 'tool_call') {
          // tool calls happen server-side — just a note in UI
          if (!fullText) updateStreaming('⚙️ Calling ' + event.name + '...');
        } else if (event.type === 'done') {
          break;
        } else if (event.type === 'error') {
          throw new Error(event.content || 'Stream Error');
        }
      }
    } catch (err) {
      hideStreaming();
      const removed = document.getElementById('typing-indicator');
      if (removed) removed.remove();
      setError('⚠️ ' + err.message);
      return;
    } finally {
      isStreaming = false;
      if (input) input.disabled = false;
      if (btn) btn.disabled = false;
      if (input) input.focus();
      hideStreaming();
      const removed = document.getElementById('typing-indicator');
      if (removed) removed.remove();
    }

    if (fullText) {
      addMessage('assistant', fullText);
    }
  }

  // ── Init ──
  function init() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        send(input.value);
        input.value = '';
      });
    }
  }

  return { init, send };
})();

document.addEventListener('DOMContentLoaded', () => Chat.init());
