(() => {
  const layer = document.querySelector('[data-support-layer]');
  if (!layer) return;
  const intake = layer.querySelector('[data-support-intake]');
  const chat = layer.querySelector('[data-support-chat]');
  const intakeForm = layer.querySelector('[data-support-intake-form]');
  const compose = layer.querySelector('[data-support-compose]');
  const messages = layer.querySelector('[data-support-messages]');
  const suggestions = layer.querySelector('[data-support-suggestions]');
  const quickQuestions = ['How do I cancel?', 'Where are my files?', 'When will I be charged?', 'How do I reset my password?'];

  const answers = [
    { terms: ['cancel','stop subscription','end subscription'], html: 'You can cancel from <b>My account → Membership → Cancel plan</b>. Your access continues until the end of your current trial or billing period, and no further renewal will be taken.' },
    { terms: ['pause','pause subscription','pause membership'], html: 'Open <b>My account → Membership → Cancel plan</b>, then choose <b>Pause for one month</b>. Billing resumes automatically on the date shown before you confirm.' },
    { terms: ['charge','charged','billing','renew','renewal','price','cost'], html: 'The 50p and £1 seven-day options renew at <b>£49.99 every four weeks</b> unless cancelled. The annual membership is <b>£299.99 per year</b>. Your exact next billing date appears under My account → Membership.' },
    { terms: ['refund','money back'], html: 'Refund requests need to be reviewed by the PDFBreeze support team. Please use <a href="contact.html">Contact support</a> and include the email used for payment. Do not include card details.' },
    { terms: ['file','files','document','saved','storage','where'], html: 'Your saved documents appear under <b>My Files</b> in this dashboard. Files attached to your account remain available when you sign in on another device.' },
    { terms: ['download','cannot download','download failed'], html: 'Open <b>My Files</b> and select the download icon beside the document. If a download does not begin, allow downloads for pdfbreeze.net and try again. You can also use the three-dot file menu.' },
    { terms: ['password','forgot','reset','sign in','login'], html: 'Use <a href="login.html">Sign in</a> and choose <b>Forgot password</b>. PDFBreeze will send a secure reset link to your account email.' },
    { terms: ['convert','conversion','word','excel','jpg'], html: 'Choose <b>Convert Files</b> from the dashboard, upload your document and select the required output. Complex layouts can vary between formats, so check the downloaded result before sharing it.' },
    { terms: ['edit','editor','change pdf'], html: 'Choose <b>Edit PDF</b>, upload or select a saved PDF, make your changes and press <b>Done</b>. You can then choose the download format.' },
    { terms: ['compress','smaller','file size'], html: 'Choose <b>Compress PDF</b>, select your file and then choose light, recommended or strong compression. Stronger compression creates a smaller file but may reduce image quality.' },
    { terms: ['privacy','secure','security','safe'], html: 'PDFBreeze uses authenticated private accounts for saved documents. You can review the <a href="privacy-policy.html">Privacy Policy</a> for full details. Never share passwords or complete payment-card information in support messages.' }
  ];

  const addMessage = (content, role) => {
    const bubble = document.createElement('div');
    bubble.className = `support-message ${role}`;
    bubble.innerHTML = content;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  };
  const answer = (question) => {
    const normalised = question.toLowerCase();
    const match = answers.find(item => item.terms.some(term => normalised.includes(term)));
    window.setTimeout(() => addMessage(match?.html || 'I do not have an approved answer for that yet. Please use <a href="contact.html">Contact support</a> and the PDFBreeze team will help you.', 'bot'), 280);
  };
  const ask = (question) => {
    const clean = question.trim();
    if (!clean) return;
    addMessage(clean.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char])), 'user');
    answer(clean);
  };
  const renderSuggestions = () => {
    suggestions.innerHTML = '';
    quickQuestions.forEach(question => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = question;
      button.addEventListener('click', () => ask(question));
      suggestions.appendChild(button);
    });
  };
  const open = () => {
    layer.hidden = false;
    document.body.style.overflow = 'hidden';
  };
  const close = () => { layer.hidden = true; document.body.style.overflow = ''; };
  document.querySelectorAll('.support-pill,[data-open-support]').forEach(button => button.addEventListener('click', open));
  layer.querySelectorAll('[data-close-support]').forEach(button => button.addEventListener('click', close));
  intakeForm.addEventListener('submit', event => {
    event.preventDefault();
    const name = intakeForm.elements.name.value.trim();
    const email = intakeForm.elements.email.value.trim();
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
      layer.querySelector('[data-support-intake-error]').textContent = 'Please enter your name and a valid email address.';
      return;
    }
    intake.hidden = true; chat.hidden = false;
    addMessage(`Hi ${name.split(/\s+/)[0]}, I’m the PDFBreeze support assistant. Ask me about your files, tools, account, trial or membership.`, 'bot');
    renderSuggestions();
  });
  compose.addEventListener('submit', event => {
    event.preventDefault();
    const field = compose.elements.message;
    ask(field.value); field.value = ''; field.focus();
  });
})();
