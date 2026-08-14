(() => {
  const layer = document.querySelector('[data-support-layer]');
  if (!layer) return;
  const intake = layer.querySelector('[data-support-intake]');
  const chat = layer.querySelector('[data-support-chat]');
  const intakeForm = layer.querySelector('[data-support-intake-form]');
  const compose = layer.querySelector('[data-support-compose]');
  const messages = layer.querySelector('[data-support-messages]');
  const suggestions = layer.querySelector('[data-support-suggestions]');
  const engine = (window.PDFMINT_CONFIG?.engineBaseUrl || '').replace(/\/$/, '');
  let identity = { name: '', email: '' };
  const quickQuestions = ['How do I cancel?', 'Where are my files?', 'When will I be charged?', 'How do I reset my password?', 'Send support a message'];
  const answers = [
    { terms: ['cancel','stop subscription','end subscription'], html: 'You can cancel from <b>My account → Membership → Cancel plan</b>. Your access continues until the end of your current trial or billing period.' },
    { terms: ['charge','charged','billing','renew','price','cost'], html: 'The 50p and £1 seven-day options renew at <b>£49.99 every four weeks</b> unless cancelled. The annual membership is <b>£299.99 per year</b>. Your next billing date appears under My account → Membership.' },
    { terms: ['file','files','document','saved','storage','where'], html: 'Your saved documents appear under <b>My Files</b> in this dashboard and remain available when you sign in on another device.' },
    { terms: ['password','forgot','reset','sign in','login'], html: 'Open <a href="login.html">Sign in</a> and choose <b>Forgot password</b>. PDFBreeze will send a reset link to your account email.' },
    { terms: ['convert','word','excel','jpg'], html: 'Choose <b>Convert Files</b>, select a document and choose the required output format.' },
    { terms: ['edit','editor','change pdf'], html: 'Choose <b>Edit PDF</b>, upload or select a saved PDF, make your changes and press <b>Done</b>.' },
    { terms: ['compress','smaller','file size'], html: 'Choose <b>Compress PDF</b>, select your file and choose the compression level.' },
    { terms: ['privacy','secure','security'], html: 'Your saved documents are held in your authenticated private account. Never share passwords or complete payment-card information in support messages.' }
  ];

  const escapeText = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const avatar = () => '<span class="support-bot-avatar"><span class="support-bot-face"><i></i><i></i><b></b></span></span>';
  const addMessage = (content, role) => {
    const row = document.createElement('div');
    row.className = `support-message-row ${role}`;
    if (role === 'bot') row.innerHTML = avatar();
    const bubble = document.createElement('div');
    bubble.className = `support-message ${role}`;
    bubble.innerHTML = content;
    row.appendChild(bubble); messages.appendChild(row); messages.scrollTop = messages.scrollHeight;
    return bubble;
  };
  const showTyping = () => {
    const row = document.createElement('div');
    row.className = 'support-message-row bot support-typing-row';
    row.innerHTML = `${avatar()}<div class="support-message bot support-typing"><span></span><span></span><span></span></div>`;
    messages.appendChild(row); messages.scrollTop = messages.scrollHeight; return row;
  };
  const showSupportForm = () => {
    addMessage('Tell us what you need help with. Your message will be emailed to PDFBreeze Support and the team can reply directly to you.', 'bot');
    const bubble = addMessage('', 'bot');
    bubble.classList.add('support-message-form-wrap');
    bubble.innerHTML = '<form class="support-message-form"><label>Subject<input name="subject" value="PDFBreeze support request" maxlength="160" required></label><label>Message<textarea name="message" rows="4" minlength="5" maxlength="5000" required placeholder="How can we help?"></textarea></label><button type="submit">Send message</button><small aria-live="polite"></small></form>';
    const form = bubble.querySelector('form');
    form.addEventListener('submit', async event => {
      event.preventDefault(); const button = form.querySelector('button'); const status = form.querySelector('small');
      button.disabled = true; button.textContent = 'Sending…'; status.textContent = '';
      try {
        const response = await fetch(`${engine}/v1/support/message`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:identity.name,email:identity.email,subject:form.elements.subject.value,message:form.elements.message.value,source:'member-chat',website:''})});
        if (!response.ok) throw new Error();
        form.innerHTML = '<strong>Message sent</strong><p>PDFBreeze Support will reply to your email address.</p>';
      } catch (_) { button.disabled = false; button.textContent = 'Send message'; status.textContent = 'The message could not be sent. Please try again.'; }
    });
  };
  const answer = question => {
    const match = answers.find(item => item.terms.some(term => question.toLowerCase().includes(term)));
    const typing = showTyping();
    window.setTimeout(() => { typing.remove(); addMessage(match?.html || 'I do not have an approved answer for that yet. Choose <b>Send support a message</b> and the team will help you.', 'bot'); }, Math.min(1275, Math.max(630, question.length * 24)));
  };
  const ask = question => { const clean = question.trim(); if (!clean) return; addMessage(escapeText(clean), 'user'); answer(clean); };
  const renderSuggestions = () => {
    suggestions.innerHTML = '';
    quickQuestions.forEach(question => { const button = document.createElement('button'); button.type='button'; button.textContent=question; button.addEventListener('click', () => question === 'Send support a message' ? showSupportForm() : ask(question)); suggestions.appendChild(button); });
  };
  const open = () => { layer.hidden=false; document.body.style.overflow='hidden'; };
  const close = () => { layer.hidden=true; document.body.style.overflow=''; };
  document.querySelectorAll('.support-pill,[data-open-support]').forEach(button => button.addEventListener('click', open));
  layer.querySelectorAll('[data-close-support]').forEach(button => button.addEventListener('click', close));
  intakeForm.addEventListener('submit', event => {
    event.preventDefault(); identity = {name:intakeForm.elements.name.value.trim(), email:intakeForm.elements.email.value.trim()};
    if (!identity.name || !/^\S+@\S+\.\S+$/.test(identity.email)) { layer.querySelector('[data-support-intake-error]').textContent='Please enter your name and a valid email address.'; return; }
    intake.hidden=true; chat.hidden=false; const typing=showTyping();
    window.setTimeout(() => { typing.remove(); addMessage(`Hi ${escapeText(identity.name.split(/\s+/)[0])}, I’m the PDFBreeze support assistant. Ask me about your files, tools, account, trial or membership.`, 'bot'); }, 520);
    renderSuggestions();
  });
  compose.addEventListener('submit', event => { event.preventDefault(); const field=compose.elements.message; ask(field.value); field.value=''; field.focus(); });
})();
