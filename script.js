const tabs = document.querySelectorAll('.tool-tab');
const panels = document.querySelectorAll('.tool-panel');
tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(item => item.classList.remove('active'));
  panels.forEach(panel => panel.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById(tab.dataset.target).classList.add('active');
}));

const input = document.getElementById('file-input');
const card = document.getElementById('upload-card');
const status = document.getElementById('file-status');
function showFile(file){
  if(!file) return;
  if(file.type !== 'application/pdf') { status.textContent = 'Please choose a PDF file.'; return; }
  const size = (file.size / 1024 / 1024).toFixed(2);
  status.textContent = `${file.name} selected (${size} MB). Editor functionality comes next.`;
}
input.addEventListener('change', e => showFile(e.target.files[0]));
['dragenter','dragover'].forEach(evt => card.addEventListener(evt, e => {e.preventDefault(); card.classList.add('dragover')}));
['dragleave','drop'].forEach(evt => card.addEventListener(evt, e => {e.preventDefault(); card.classList.remove('dragover')}));
card.addEventListener('drop', e => showFile(e.dataTransfer.files[0]));

const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('.mobile-menu');
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  mobileMenu.hidden = open;
});
