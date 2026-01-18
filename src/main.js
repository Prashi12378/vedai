import './style.css';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

import { supabase } from './supabaseClient';
// Configure Marked.js for custom code blocks
const renderer = {
  code(token) {
    let code = token;
    let language = arguments[1];

    if (typeof token === 'object' && token !== null && token.text) {
      code = token.text;
      language = token.lang;
    }

    // Syntax Highlighting
    const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
    const highlightedCode = hljs.highlight(code, { language: validLanguage }).value;

    return `
      <div class="code-wrapper">
        <div class="code-header">
          <span class="code-lang">${language || 'Code'}</span>
          <button class="copy-btn" onclick="copyCode(this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          </button>
        </div>
        <pre><code class="hljs language-${validLanguage}">${highlightedCode}</code></pre>
      </div>
    `;
  }
};

marked.use({ renderer });

// Global copy function (attached to window for inline onclick access)
// Global copy function (attached to window for inline onclick access)
window.copyCode = function (btn) {
  const codeBlock = btn.parentElement.nextElementSibling.querySelector('code');
  const text = codeBlock.innerText;

  navigator.clipboard.writeText(text).then(() => {
    const originalHtml = btn.innerHTML;
    btn.innerHTML = 'Copied!';
    btn.classList.add('copied');

    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.classList.remove('copied');
    }, 2000);
  });
};

function createActionsToolbar(text) {
  const toolbar = document.createElement('div');
  toolbar.className = 'actions-toolbar';

  // Copy Button
  const copyBtn = document.createElement('button');
  copyBtn.className = 'action-btn-sm';
  copyBtn.innerHTML = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
  Copy
`;
  // Sanitize text for attribute (basic) or just use closure
  copyBtn.onclick = () => window.copyMessage(text, copyBtn);
  toolbar.appendChild(copyBtn);

  // Share Button
  const shareBtn = document.createElement('button');
  shareBtn.className = 'action-btn-sm';
  shareBtn.innerHTML = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="18" cy="5" r="3"></circle>
    <circle cx="6" cy="12" r="3"></circle>
    <circle cx="18" cy="19" r="3"></circle>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
  </svg>
  Share
`;
  shareBtn.onclick = () => window.shareMessage(text, shareBtn);
  toolbar.appendChild(shareBtn);

  return toolbar;
}

window.copyMessage = function (text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    Copied
  `;
    setTimeout(() => {
      btn.innerHTML = originalHtml;
    }, 2000);
  });
};

window.shareMessage = function (text, btn) {
  if (navigator.share) {
    navigator.share({
      title: 'Common-V Chat',
      text: text,
    }).catch(console.error);
  } else {
    // Fallback to Copy
    navigator.clipboard.writeText(text).then(() => {
      const originalHtml = btn.innerHTML;
      btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Copied!
    `;
      setTimeout(() => {
        btn.innerHTML = originalHtml;
      }, 2000);
    });
  }
};

window.enableEditMode = function (msgDiv, originalText, index) {
  if (typeof index === 'undefined') {
    // Attempt to find index in messages array
    const history = chatManager.messages;
    // Find the last message with this content (simple heuristic)
    index = history.findLastIndex(m => m.content === originalText && m.role === 'user');
  }

  if (index === -1 || index === undefined) return;

  // Clear current display
  msgDiv.innerHTML = '';
  msgDiv.classList.add('editing');

  const form = document.createElement('div');
  form.className = 'edit-form';

  const textarea = document.createElement('textarea');
  textarea.className = 'edit-input';
  textarea.value = originalText;

  const actions = document.createElement('div');
  actions.className = 'edit-actions';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-save';
  saveBtn.textContent = 'Save & Submit';
  saveBtn.onclick = () => window.saveEditedMessage(index, textarea.value);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => {
    chatManager.renderAllMessages(); // Revert to view mode
  };

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);

  form.appendChild(textarea);
  form.appendChild(actions);
  msgDiv.appendChild(form);

  textarea.focus();
};

window.saveEditedMessage = async function (index, newText) {
  // Update message
  if (!newText.trim()) return;

  // Truncate history to this point
  chatManager.messages = chatManager.messages.slice(0, index + 1);
  chatManager.messages[index].content = newText;

  // Save state
  chatManager.saveToStorage();

  // Re-render and re-generate
  chatManager.renderAllMessages();

  // Trigger generation (we need to access generateResponse which is inside initMainApp)
  // Refactoring: generateResponse should be a method of ChatManager or accessible.
  // Ideally, we move generateResponse to ChatManager or trigger an event.
  // For now, let's trigger a custom event or button click?
  // We'll dispatch a custom event that initMainApp listens to.
  window.dispatchEvent(new CustomEvent('trigger-generation'));
};

// --- Supabase Manager ---
class SupabaseManager {
  static async getHistory(userId) {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error("Error fetching history:", e);
      return [];
    }
  }

  static async saveChat(userId, chatData) {
    if (!userId) return;
    try {
      // Upsert: Insert or Update based on ID
      const { error } = await supabase
        .from('chats')
        .upsert({
          id: chatData.id,
          user_id: userId,
          title: chatData.title,
          messages: chatData.messages,
          updated_at: new Date()
        }, { onConflict: 'id' });

      if (error) throw error;
    } catch (e) {
      console.error("Error saving chat:", e);
      // specific error message
      showNotification(`Failed to save: ${e.message || "Unknown error"}`, "error");
    }
  }

  static async loadChat(chatId) {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error("Error loading chat:", e);
      return null;
    }
  }

  static async deleteChat(chatId) {
    if (!chatId) return;
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;
    } catch (e) {
      console.error("Error deleting chat:", e);
      showNotification(`Failed to delete chat: ${e.message}`, "error");
    }
  }

  // Settings could be a separate table or just local for now to simplify
  // Sticking to LocalStorage for settings to avoid extra table complexity for now
  static getSettings() {
    try {
      const settings = localStorage.getItem('vedai_settings');
      // Default Settings
      const defaults = {
        systemInstruction: "You are VedAI, a helpful assistant.",
        theme: 'light',
        language: 'en',
        notifications: true
      };

      return settings ? { ...defaults, ...JSON.parse(settings) } : defaults;
    } catch (e) {
      return {
        systemInstruction: "You are VedAI, a helpful assistant.",
        theme: 'light',
        language: 'en',
        notifications: true
      };
    }
  }

  static saveSettings(settings) {
    try {
      localStorage.setItem('vedai_settings', JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  }

  static async clearAll(userId) {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      console.log("All chats cleared from Supabase");
    } catch (e) {
      console.error("Error clearing data:", e);
    }
  }
}

// --- Chat Manager ---
class ChatManager {
  constructor() {
    // Current chat ID will be set from Firestore or generated
    this.currentChatId = this.generateId();
    this.messages = [];
    // System instruction will be loaded from Firestore in init()
    this.systemInstruction = "You are VedAI, a helpful assistant.";
    this.currentUser = null;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async init() {
    // Check for user
    const { data: { user } } = await supabase.auth.getUser();

    // Load settings from LocalStorage (kept local for now)
    const settings = SupabaseManager.getSettings();
    this.systemInstruction = settings.systemInstruction || "You are VedAI, a helpful assistant.";

    if (user && this.currentChatId) {
      const existingChat = await SupabaseManager.loadChat(this.currentChatId);
      if (existingChat) {
        this.messages = existingChat.messages || [];
        this.renderAllMessages();
        console.log("Chat loaded from Supabase");
      } else {
        this.messages = [];
        console.log("New Chat initialized");
      }
    } else {
      this.messages = [];
      console.log("New Chat initialized (No user/New ID)");
    }
  }

  startNewChat() {
    window.abortTyping = true;
    this.currentChatId = this.generateId();
    // Current chat ID is tracked in Firestore, no localStorage needed
    this.messages = [];
    document.getElementById('chat-container').innerHTML = '';
    this.updateHistoryUI();
  }

  async loadChat(chatId) {
    window.abortTyping = true;
    this.currentChatId = chatId;
    // Current chat ID is tracked in Firestore, no localStorage needed
    document.getElementById('chat-container').innerHTML = '';

    // Show loading state
    const loader = document.createElement('div');
    loader.className = 'message ai';
    loader.innerHTML = '<em>Loading chat...</em>';
    document.getElementById('chat-container').appendChild(loader);

    await this.init();

    loader.remove();
    this.updateHistoryUI(); // Highlight active chat
  }

  addMessage(text, sender, save = true) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender} `;

    if (sender === 'ai') {
      // Avatar
      const avatarDiv = document.createElement('div');
      avatarDiv.className = 'message-avatar';
      avatarDiv.innerHTML = `<img src="/logo.png" alt="VedAI">`;
      msgDiv.appendChild(avatarDiv);

      // Wrapper for content and actions
      const wrapperDiv = document.createElement('div');
      wrapperDiv.className = 'message-content-wrapper';

      const contentDiv = document.createElement('div');
      contentDiv.innerHTML = marked.parse(text);
      wrapperDiv.appendChild(contentDiv);

      const actionsToolbar = createActionsToolbar(text);
      wrapperDiv.appendChild(actionsToolbar);
      msgDiv.appendChild(wrapperDiv);
    } else {
      // User Message
      const wrapperDiv = document.createElement('div');
      wrapperDiv.className = 'message-content-wrapper';

      const contentDiv = document.createElement('div');
      contentDiv.textContent = text;
      wrapperDiv.appendChild(contentDiv);

      const actionsToolbar = createActionsToolbar(text);
      wrapperDiv.appendChild(actionsToolbar);
      msgDiv.appendChild(wrapperDiv);

      const editIcon = document.createElement('div');
      editIcon.className = 'edit-icon';
      editIcon.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
      `;
      editIcon.onclick = () => enableEditMode(msgDiv, text);
      msgDiv.appendChild(editIcon);
    }

    const chatContainer = document.getElementById('chat-container');
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (save) {
      this.messages.push({ role: sender === 'ai' ? 'assistant' : 'user', content: text });
      this.saveToStorage();
    }
  }

  async typeMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender} `;

    let contentDiv;
    let wrapperDiv;

    if (sender === 'ai') {
      wrapperDiv = document.createElement('div');
      wrapperDiv.className = 'message-content-wrapper';
      contentDiv = document.createElement('div');
      wrapperDiv.appendChild(contentDiv);
      msgDiv.appendChild(wrapperDiv);
    } else {
      wrapperDiv = document.createElement('div');
      wrapperDiv.className = 'message-content-wrapper';
      contentDiv = document.createElement('div');
      wrapperDiv.appendChild(contentDiv);
      msgDiv.appendChild(wrapperDiv);
    }

    const chatContainer = document.getElementById('chat-container');
    chatContainer.appendChild(msgDiv);

    // Pre-save to history but don't duplicate if multiple calls
    this.messages.push({ role: sender === 'ai' ? 'assistant' : 'user', content: text });
    this.saveToStorage();

    // Typewriter Effect
    let i = 0;
    const speed = 10; // ms per chunk
    const chunkSize = 2; // chars per chunk

    while (i < text.length) {
      if (window.abortTyping) break; // Safety break

      i += chunkSize;
      const currentText = text.substring(0, i);
      contentDiv.innerHTML = marked.parse(currentText);
      chatContainer.scrollTop = chatContainer.scrollHeight;

      await new Promise(r => setTimeout(r, speed));
    }

    // Finalize
    contentDiv.innerHTML = marked.parse(text);

    // Add Toolbar (only after typing done for AI)
    if (sender === 'ai' && wrapperDiv) {
      const actionsToolbar = createActionsToolbar(text);
      wrapperDiv.appendChild(actionsToolbar);
    }

    // Re-scroll to ensure messages are visible
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  renderAllMessages() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.innerHTML = '';
    this.messages.forEach((msg, index) => {
      const msgDiv = document.createElement('div');
      const sender = msg.role === 'assistant' ? 'ai' : 'user';
      msgDiv.className = `message ${sender} `;

      if (sender === 'ai') {
        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'message-content-wrapper';

        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = marked.parse(msg.content);
        wrapperDiv.appendChild(contentDiv);

        const actionsToolbar = createActionsToolbar(msg.content);
        wrapperDiv.appendChild(actionsToolbar);
        msgDiv.appendChild(wrapperDiv);
      } else {
        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'message-content-wrapper';

        const contentDiv = document.createElement('div');
        contentDiv.textContent = msg.content;
        wrapperDiv.appendChild(contentDiv);

        msgDiv.appendChild(wrapperDiv);

        const editIcon = document.createElement('div');
        editIcon.className = 'edit-icon';
        editIcon.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        `;
        editIcon.onclick = () => enableEditMode(msgDiv, msg.content, index);
        msgDiv.appendChild(editIcon);
      }

      chatContainer.appendChild(msgDiv);
    });
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  async saveToStorage() {
    const chatData = {
      id: this.currentChatId,
      date: new Date().toLocaleDateString(),
      // Use first user message as title, or "New Chat"
      title: this.messages.find(m => m.role === 'user')?.content.substring(0, 30) + '...' || 'New Chat',
      messages: this.messages,
      createdAt: Date.now() // For sorting
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("User not logged in, cannot save chat to cloud.");
      return;
    }

    await SupabaseManager.saveChat(user.id, chatData);
    this.updateHistoryUI(); // Refresh list after saving
  }

  async updateHistoryUI() {
    const list = document.getElementById('history-list');
    if (!list) return;

    // Load history from Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      list.innerHTML = '';
      return;
    }
    const history = await SupabaseManager.getHistory(user.id);

    list.innerHTML = '';
    history.forEach(chat => {
      const el = document.createElement('div');
      el.className = 'history-item';
      if (chat.id === this.currentChatId) el.classList.add('active');

      const titleText = chat.title && chat.title.trim() !== "" ? chat.title : 'Untitled Chat';

      el.innerHTML = `
        <div class="history-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div class="history-title">${titleText}</div>
        <button class="delete-chat-btn icon-btn" title="Delete chat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      `;

      // Set up listeners
      const deleteBtn = el.querySelector('.delete-chat-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteChat(chat.id, titleText);
      });

      el.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        if (window.innerWidth < 768 && sidebar && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
        this.loadChat(chat.id);
      });

      list.appendChild(el);
    });
  }

  async deleteChat(chatId, title) {
    if (!confirm(`Are you sure you want to delete "${title || 'this chat'}"?`)) return;

    await SupabaseManager.deleteChat(chatId);
    showNotification("Chat deleted", "success");

    if (this.currentChatId === chatId) {
      this.startNewChat();
    } else {
      this.updateHistoryUI();
    }
  }
}

// ============================================
// CHAT MANAGER INITIALIZATION
// ============================================
const chatManager = new ChatManager();
window.chatManager = chatManager; // Make available to auth module

// ============================================
// NOTIFICATION SYSTEM
// ============================================
function showNotification(message, type = 'info') {
  // Check setting
  const settings = SupabaseManager.getSettings();
  if (!settings.notifications && type !== 'error') {
    // Always show errors, but skip info/success if disabled
    return;
  }

  const container = document.getElementById('notification-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `notification-toast ${type}`;

  // Icon based on type
  let icon = '';
  if (type === 'success') {
    icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === 'error') {
    icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else {
    icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2196f3" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.animation = 'fadeOutDown 0.3s forwards'; // Match CSS
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
}
window.showNotification = showNotification;

// ============================================
// CONFIRMATION MODAL SYSTEM
// ============================================
function showConfirmation(title, message, onYes) {
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  const yesBtn = document.getElementById('confirm-yes-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');

  titleEl.textContent = title;
  msgEl.textContent = message;

  modal.classList.remove('hidden');

  const cleanup = () => {
    modal.classList.add('hidden');
    yesBtn.replaceWith(yesBtn.cloneNode(true)); // Clear listeners
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  };

  // Re-select after clone
  const newYes = document.getElementById('confirm-yes-btn');
  const newCancel = document.getElementById('confirm-cancel-btn');

  newYes.addEventListener('click', async () => {
    cleanup();
    await onYes();
  });

  newCancel.addEventListener('click', () => {
    cleanup();
  });
}

// ============================================
// MAIN APP INITIALIZATION
// ============================================

// Wait for DOM to be ready before attaching event listeners
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMainApp);
} else {
  initMainApp();
}

function initMainApp() {
  console.log('🚀 Initializing main app...');

  // Initialize Chat Manager
  // chatManager.init() is called after auth check now

  const authModal = document.getElementById('auth-modal');
  const authEmail = document.getElementById('auth-email');
  const authPassword = document.getElementById('auth-password');
  const authSubmit = document.getElementById('auth-submit-btn');
  const authToggle = document.getElementById('auth-toggle-btn');
  const authTitle = document.getElementById('auth-title');
  const authToggleText = document.getElementById('auth-toggle-text');
  const authError = document.getElementById('auth-error');
  // Main App Init Logic for Theme
  function applyTheme(startUp = false) {
    const settings = SupabaseManager.getSettings();
    if (settings.theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }
  applyTheme(true);

  // Auth Logic

  let isSignUp = false;





  // Auth Logic
  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log("User logged in:", session.user.email);
      authModal.style.display = 'none';
      chatManager.init();
      chatManager.updateHistoryUI();
      updateProfileUI(session.user);
      chatManager.setCurrentUser(session.user);
    } else {
      console.log("No user session");
      authModal.style.display = 'flex';
      updateProfileUI(null);
      chatManager.setCurrentUser(null);
    }
  }

  // Check for missing credentials (Vercel Build Protection)
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    const errorMsg = "⚠️ Configuration Error: Supabase credentials are missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel Environment Variables and redeploy.";
    console.error(errorMsg);

    // Show a permanent notification to the user
    setTimeout(() => {
      if (window.showNotification) {
        showNotification(errorMsg, "error");
      } else {
        alert(errorMsg);
      }
    }, 1000);
  }

  checkAuth();

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth Event:", event);
    if (session) {
      authModal.style.display = 'none';
      chatManager.init();
      chatManager.updateHistoryUI();
      updateProfileUI(session.user);
      chatManager.setCurrentUser(session.user);
      resetUiState();
    } else {
      authModal.style.display = 'flex';
      // Clear UI
      document.getElementById('history-list').innerHTML = '';
      document.getElementById('chat-container').innerHTML = '';
      updateProfileUI(null);
      chatManager.setCurrentUser(null);
    }
  });

  const extraControls = document.getElementById('auth-extra-controls');
  const forgotPassLink = document.getElementById('auth-forgot-password');

  function resetUiState() {
    authEmail.value = '';
    authPassword.value = '';
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-confirm-password').value = '';

    document.getElementById('auth-username').classList.add('hidden');
    document.getElementById('auth-confirm-password').classList.add('hidden');
    document.getElementById('toggle-confirm-password').classList.add('hidden');
    authPassword.classList.remove('hidden');

    authError.style.display = 'none';
    authSubmit.innerText = isSignUp ? 'Sign Up' : 'Sign In';
  }

  // Password Toggle Logic
  function setupPasswordToggle(inputId, toggleId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);
    if (input && toggle) {
      toggle.addEventListener('click', () => {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        // Toggle Icon (Eye vs Eye-Off)
        toggle.innerHTML = type === 'password'
          ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
          : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
      });
    }
  }

  setupPasswordToggle('auth-password', 'toggle-password');
  setupPasswordToggle('auth-confirm-password', 'toggle-confirm-password');

  // Google Sign In
  const googleBtn = document.getElementById('google-signin-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
      } catch (err) {
        console.error("Google Auth Error:", err);
        authError.textContent = "Google Sign-In failed: " + err.message;
        authError.style.display = 'block';
      }
    });
  }

  authToggle.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUp = !isSignUp;
    resetUiState(); // Clean slate

    const usernameInput = document.getElementById('auth-username');
    const confirmPassInput = document.getElementById('auth-confirm-password');

    if (isSignUp) {
      authTitle.textContent = 'Create Account';
      authSubmit.textContent = 'Sign Up';
      authToggleText.textContent = 'Already have an account?';
      authToggle.textContent = 'Sign In';

      // Show Sign Up fields
      usernameInput.classList.remove('hidden');
      confirmPassInput.classList.remove('hidden');
      document.getElementById('toggle-confirm-password').classList.remove('hidden');
      extraControls.style.display = 'none'; // No OTP/Forgot during Sign Up
    } else {
      authTitle.textContent = 'Sign In';
      authSubmit.textContent = 'Sign In';
      authToggleText.textContent = "Don't have an account?";
      authToggle.textContent = 'Sign Up';
    }
  });



  // Forgot Password
  forgotPassLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = authEmail.value;
    if (!email) {
      authError.textContent = "Please enter your email address first.";
      authError.style.display = 'block';
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      showNotification(`Password reset link sent to ${email}`, "success");
    } catch (err) {
      authError.textContent = err.message;
      authError.style.display = 'block';
    }
  });

  authSubmit.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    const username = document.getElementById('auth-username').value;
    const confirmPassword = document.getElementById('auth-confirm-password').value;
    const otpCode = otpInput.value.trim();

    authError.style.display = 'none';
    try {
      if (isSignUp) {
        // ... (Existing Sign Up Logic) ...
        if (password !== confirmPassword) throw new Error("Passwords do not match!");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        if (!username.trim()) throw new Error("Username is required.");

        console.log("Signing Up:", email);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: username } }
        });

        if (error) {
          if (error.message && error.message.toLowerCase().includes('already registered')) {
            showNotification("Account exists. Please Sign In.", "error");
            authToggle.click();
            return;
          }
          throw error;
        }
        showNotification("Account created! You can now log in.", "success");
        authToggle.click(); // Switch to Sign In automatically
      } else {
        // --- NORMAL SIGN IN FLOW ---
        console.log("Signing In:", email);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      console.error("Auth Error:", e);
      authError.textContent = e.message;
      authError.style.display = 'block';
      authSubmit.disabled = false;
    }
  });
  const profileContainer = document.getElementById('user-profile-container');

  function updateProfileUI(user) {
    if (user) {
      const email = user.email;
      const displayName = user.user_metadata?.display_name || email.split('@')[0];
      const initial = displayName.charAt(0).toUpperCase();

      profileContainer.innerHTML = `
        <div class="profile-trigger" id="profile-trigger">
          <div class="user-avatar">${initial}</div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="profile-dropdown hidden" id="profile-dropdown">
          <div class="profile-email">${email}</div>
          
          <button class="profile-menu-item" id="profile-edit-btn">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #666;">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
             </svg>
             Edit Profile
          </button>

          <button class="profile-menu-item danger" id="profile-sign-out">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
             Sign Out
          </button>
        </div>
      `;

      // Trigger Logic
      const trigger = document.getElementById('profile-trigger');
      const dropdown = document.getElementById('profile-dropdown');

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
      });



      // Sign Out from Dropdown
      document.getElementById('profile-sign-out').addEventListener('click', async () => {
        await supabase.auth.signOut();
      });

      // Close on outside click
      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });

      // --- EDIT PROFILE LOGIC ---
      const profileModal = document.getElementById('profile-modal');
      const profileEmailInput = document.getElementById('profile-email-input');
      const profileNameInput = document.getElementById('profile-username-input');
      const profileCreatedDiv = document.getElementById('profile-created-at');
      const closeProfileBtn = document.getElementById('close-profile-btn');
      const saveProfileBtn = document.getElementById('save-profile-btn');

      document.getElementById('profile-edit-btn').addEventListener('click', () => {
        dropdown.classList.add('hidden');
        profileModal.classList.remove('hidden');

        // Populate
        profileEmailInput.value = user.email;
        profileNameInput.value = user.user_metadata?.display_name || '';

        const date = new Date(user.created_at).toLocaleDateString(undefined, {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        profileCreatedDiv.textContent = date;
      });

      closeProfileBtn.addEventListener('click', () => {
        profileModal.classList.add('hidden');
      });

      saveProfileBtn.addEventListener('click', async () => {
        const newName = profileNameInput.value.trim();
        if (!newName) {
          showNotification("Username cannot be empty", "error");
          return;
        }

        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = "Saving...";

        try {
          const { data, error } = await supabase.auth.updateUser({
            data: { display_name: newName }
          });

          if (error) throw error;

          showNotification("Profile updated successfully!", "success");
          profileModal.classList.add('hidden');

          // Updates UI locally without page reload
          updateProfileUI(data.user);
          chatManager.setCurrentUser(data.user);

        } catch (e) {
          console.error(e);
          showNotification("Failed to update profile: " + e.message, "error");
        } finally {
          saveProfileBtn.disabled = false;
          saveProfileBtn.textContent = "Save Changes";
        }
      });

    } else {
      profileContainer.innerHTML = `<button class="sign-in-link" id="header-sign-in">Sign In</button>`;
      document.getElementById('header-sign-in').addEventListener('click', () => {
        authModal.style.display = 'flex';
      });
    }
  }

  // --- Event Listen for Edit Regeneration ---
  window.addEventListener('trigger-generation', async () => {
    await generateResponse();
  });

  // --- Event Listeners ---
  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const form = document.getElementById('chat-form');

  if (!input || !sendBtn || !form) {
    console.error('❌ Critical elements not found:', { input, sendBtn, form });
    return;
  }

  input.addEventListener('input', () => {
    sendBtn.disabled = input.value.trim().length === 0;
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // State for generation
  let isGenerating = false;
  let abortController = null;


  const sendIcon = `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
`;

  const stopIcon = `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
  </svg>
`;

  // ------------------------------
  // Generation Helper to be reused by Edit
  // ------------------------------
  async function generateResponse() {
    // Start Generation State
    isGenerating = true;
    abortController = new AbortController();

    // Update UI to "Stop" state
    sendBtn.innerHTML = stopIcon;
    sendBtn.disabled = false;

    // UI Loading
    const chatContainer = document.getElementById('chat-container');
    const loading = document.createElement('div');
    loading.className = 'message ai';
    loading.innerHTML = '<em>Thinking...</em>';
    chatContainer.appendChild(loading);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
      const settings = SupabaseManager.getSettings();
      const modelBtn = document.getElementById('model-btn');
      const selectedModel = modelBtn ? modelBtn.dataset.value : 'llama-3.3-70b-versatile';

      let messagesToSend = [...chatManager.messages];

      let systemContent = settings.systemInstruction || "";


      // Append Language Instruction
      if (settings.language && settings.language !== 'en') {
        const langMap = {
          'es': 'Spanish', 'fr': 'French', 'de': 'German',
          'hi': 'Hindi', 'kn': 'Kannada', 'te': 'Telugu',
          'ta': 'Tamil', 'ml': 'Malayalam',
          'zh': 'Chinese', 'ja': 'Japanese', 'pt': 'Portuguese'
        };
        const langName = langMap[settings.language];
        if (systemContent) systemContent += "\n\n";
        systemContent += `IMPORTANT: Respond in ${langName}.`;
      }

      if (systemContent) {
        messagesToSend.unshift({ role: 'system', content: systemContent });
      }



      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          history: messagesToSend,
          model: selectedModel
        }),
        signal: abortController.signal
      });

      console.log('Testing response', res);
      const data = await res.json();
      console.log('Testing data', data);
      loading.remove();

      if (res.ok && data.reply) {
        console.log('Adding message to chatManager');
        window.abortTyping = false; // Reset abort flag
        await chatManager.typeMessage(data.reply, 'ai');
      } else {
        console.error('Error in response:', data);
        const errorDetail = data.error || data.message || `Status: ${res.status}`;
        chatManager.addMessage(`Error: ${errorDetail}`, 'ai', false);
      }
    } catch (err) {
      loading.remove();
      console.error('Fetch Error:', err);
      if (err.name === 'AbortError') {
        chatManager.addMessage("Generation stopped by user.", 'ai', false);
      } else {
        chatManager.addMessage(`Connection error (${err.message}). Please check the Vercel logs.`, 'ai', false);
      }
    } finally {
      // Reset to "Send" state
      isGenerating = false;
      abortController = null;
      sendBtn.innerHTML = sendIcon;
      sendBtn.disabled = false;
      if (window.innerWidth > 768) {
        input.focus();
      }
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // If currently generating, this acts as a usage of Stop button
    if (isGenerating) {
      if (abortController) {
        abortController.abort();
        abortController = null;
        window.abortTyping = true; // Stop typing effect
      }
      return;
    }

    const text = input.value.trim();
    if (!text) return;

    // --- Guest Usage Limit Check ---
    if (!chatManager.currentUser) {
      const GUEST_LIMIT = 5;
      let guestCount = parseInt(localStorage.getItem('guest_msg_count') || '0');

      if (guestCount >= GUEST_LIMIT) {
        showNotification("Free limit reached! Please Sign In to continue.", "info");
        document.getElementById('auth-modal').style.display = 'flex';
        return; // Block sending
      }

      localStorage.setItem('guest_msg_count', (guestCount + 1).toString());
    }

    chatManager.addMessage(text, 'user');
    input.value = '';

    // Trigger Generation
    await generateResponse();
  });

  // New Chat Button
  document.getElementById('new-chat-btn').addEventListener('click', () => {
    chatManager.startNewChat();
  });

  // Settings Modal
  const settingsModal = document.getElementById('settings-modal');
  const settingsBtn = document.getElementById('settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const exportHistoryBtn = document.getElementById('export-history-btn');


  const themeToggle = document.getElementById('theme-toggle');
  const langSelect = document.getElementById('language-select');
  const notifToggle = document.getElementById('notification-toggle');

  settingsBtn.addEventListener('click', async () => {
    const settings = SupabaseManager.getSettings();
    // Set controls
    themeToggle.checked = settings.theme === 'dark';
    langSelect.value = settings.language || 'en';
    notifToggle.checked = settings.notifications !== false; // Default true

    settingsModal.classList.remove('hidden');
  });

  // Auto-Save Function
  const saveSettings = () => {
    const newSettings = {
      theme: themeToggle.checked ? 'dark' : 'light',
      language: langSelect.value,
      notifications: notifToggle.checked,
      systemInstruction: "You are VedAI, a helpful assistant."
    };

    SupabaseManager.saveSettings(newSettings);
    chatManager.systemInstruction = newSettings.systemInstruction;
    applyTheme(); // Immediate effect

  };

  // Change Listeners
  themeToggle.addEventListener('change', saveSettings);
  langSelect.addEventListener('change', saveSettings);
  notifToggle.addEventListener('change', saveSettings);

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  exportHistoryBtn.addEventListener('click', () => {
    const history = chatManager.messages;
    if (!history || history.length === 0) {
      showNotification("No chat history to export", "info");
      return;
    }

    const textContent = history.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification("Chat exported!", "success");
  });

  clearHistoryBtn.addEventListener('click', async () => {
    showConfirmation(
      "Clear Chat History?",
      "Are you sure? This will delete all chat history from Supabase. This action cannot be undone.",
      async () => {
        const { data: { user } } = await supabase.auth.getUser();
        await SupabaseManager.clearAll(user?.id);
        chatManager.startNewChat();
        settingsModal.classList.add('hidden');
        showNotification('All chat history cleared!', 'success');
      }
    );
  });

  // Sidebar Toggle
  // Sidebar Toggle
  const menuBtn = document.getElementById('menu-btn');
  const sidebar = document.querySelector('.sidebar');

  // Desktop Toggle
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        // On mobile, this button inside the sidebar acts as a Close button
        sidebar.classList.remove('open');
      } else {
        // On desktop, it toggles collapse
        sidebar.classList.toggle('collapsed');
      }
    });
  }

  // Mobile Toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent immediate close
      sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 &&
        sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !mobileMenuBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });

    // Auto-Expand on Hover (Desktop Only)
    sidebar.addEventListener('mouseenter', () => {
      if (window.innerWidth > 768) {
        sidebar.classList.remove('collapsed');
      }
    });

    sidebar.addEventListener('mouseleave', () => {
      if (window.innerWidth > 768) {
        sidebar.classList.add('collapsed');
      }
    });
  }

  // Attachment Button (Placeholder)

  // --- Attachment Logic ---
  const attachBtn = document.getElementById('attach-btn');
  const attachmentMenu = document.getElementById('attachment-menu');
  const fileInputImage = document.getElementById('file-input-image');
  const fileInputFile = document.getElementById('file-input-file');

  // Toggle Menu
  attachBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    attachmentMenu.classList.toggle('hidden');
  });

  // Close Menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!attachmentMenu.contains(e.target) && !attachBtn.contains(e.target)) {
      attachmentMenu.classList.add('hidden');
    }
  });

  // 1. Upload Photo
  document.getElementById('opt-upload-photo').addEventListener('click', () => {
    fileInputImage.click();
    attachmentMenu.classList.add('hidden');
  });

  // 2. Upload File
  document.getElementById('opt-upload-file').addEventListener('click', () => {
    fileInputFile.click();
    attachmentMenu.classList.add('hidden');
  });

  // Handle File Inputs
  [fileInputImage, fileInputFile].forEach(input => {
    input.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        chatManager.addMessage(`[Attachment Selected: ${e.target.files[0].name}](Functionality coming soon with Vision Model)`, 'ai', false);
        input.value = ''; // Reset
      }
    });
  });

  // 3. Take Photo (Camera)
  const cameraModal = document.getElementById('camera-modal');
  const closeCameraBtn = document.getElementById('close-camera-btn');
  const videoCallback = document.getElementById('camera-video');
  const canvasCallback = document.getElementById('camera-canvas');
  const snapBtn = document.getElementById('snap-photo-btn');
  let stream = null;

  document.getElementById('opt-take-photo').addEventListener('click', async () => {
    attachmentMenu.classList.add('hidden');
    cameraModal.classList.remove('hidden');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoCallback.srcObject = stream;
    } catch (err) {
      showNotification("Camera access denied or unavailable.", "error");
      cameraModal.classList.add('hidden');
    }
  });

  closeCameraBtn.addEventListener('click', () => {
    stopCamera();
    cameraModal.classList.add('hidden');
  });

  snapBtn.addEventListener('click', () => {
    const context = canvasCallback.getContext('2d');
    canvasCallback.width = videoCallback.videoWidth;
    canvasCallback.height = videoCallback.videoHeight;
    context.drawImage(videoCallback, 0, 0, canvasCallback.width, canvasCallback.height);

    // Convert to Data URL (or Blob)
    const dataUrl = canvasCallback.toDataURL('image/png');

    stopCamera();
    cameraModal.classList.add('hidden');

    // For now, simple feedback
    chatManager.addMessage(`[Photo Captured](Vision analysis coming soon)`, 'ai', false);
  });

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    videoCallback.srcObject = null;
  }

  // 4. Take Screenshot
  document.getElementById('opt-take-screenshot').addEventListener('click', async () => {
    attachmentMenu.classList.add('hidden');
    try {
      const captureStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      // We just want one frame, so essentially we treat it like the camera
      const track = captureStream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();

      // Stop sharing immediately after grab
      track.stop();

      chatManager.addMessage(`[Screenshot Captured: ${bitmap.width}x${bitmap.height}](Vision analysis coming soon)`, 'ai', false);
    } catch (err) {
      console.error("Screenshot failed", err);
    }
  });






  // --- Custom Model Selector Logic ---
  const modelBtn = document.getElementById('model-btn');
  const modelDropdown = document.getElementById('model-dropdown');
  const modelOptions = document.querySelectorAll('.model-option');

  if (modelBtn && modelDropdown) {
    // Toggle Dropdown
    modelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      modelDropdown.classList.toggle('hidden');
    });

    // Select Option
    modelOptions.forEach(option => {
      option.addEventListener('click', () => {
        const value = option.dataset.value;
        const name = option.querySelector('.model-name').textContent;

        // Update Button state
        modelBtn.dataset.value = value;
        modelBtn.innerHTML = `
        <span class="model-text">${name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 6px;">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      `;

        // Update Selection Styles
        modelOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');

        // Close Dropdown
        modelDropdown.classList.add('hidden');
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!modelBtn.contains(e.target) && !modelDropdown.contains(e.target)) {
        modelDropdown.classList.add('hidden');
      }
    });
  }

  // --- Voice Assistant Logic ---
  const micBtn = document.getElementById('mic-btn');
  const messageInput = document.getElementById('message-input');

  if (micBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false; // Stop after one sentence/pause
    recognition.interimResults = true; // Show results while talking
    recognition.lang = 'en-US';

    let isRecording = false;

    recognition.onstart = () => {
      isRecording = true;
      micBtn.classList.add('recording');
    };

    recognition.onend = () => {
      isRecording = false;
      micBtn.classList.remove('recording');
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');

      // If partial (interim), we could show it differently, 
      // but for now let's just update the input value.
      // Ideally, we want to append only if it's new, but precise handling 
      // of interim results requires caret management. 
      // For simplicity:
      if (event.results[0].isFinal) {
        // Append with space if needed
        const current = messageInput.value;
        messageInput.value = current + (current && !current.endsWith(' ') ? ' ' : '') + transcript;
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      micBtn.classList.remove('recording');
      isRecording = false;
    };

    micBtn.addEventListener('click', () => {
      if (isRecording) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  } else {
    // Hide mic if not supported
    if (micBtn) micBtn.style.display = 'none';
  }
}


console.log('✅ Main app module loaded');
