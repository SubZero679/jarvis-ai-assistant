import { JarvisSpeech } from './speech.js';
import { setReactorState } from './reactor.js';

const $ = id => document.getElementById(id);
const chat = $('chat'), form = $('chatForm'), input = $('messageInput');
const mic = $('micBtn'), transcript = $('transcript');
const STORAGE_KEY = 'jarvis-chat-v1';
let history = [];
try { history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if (!Array.isArray(history)) history=[]; } catch { history=[]; }

function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-30))); } catch {} }
function addMessage(role, content) {
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const meta = document.createElement('small'); meta.textContent = role === 'user' ? 'YOU · COMMAND' : 'J.A.R.V.I.S. · RESPONSE';
  const p = document.createElement('p'); p.textContent = content;
  article.append(meta,p); chat.append(article); chat.scrollTop = chat.scrollHeight;
}
function renderHistory() {
  chat.replaceChildren();
  if (!history.length) addMessage('assistant','Good day. All systems are standing by. How may I assist you?');
  for (const m of history) addMessage(m.role,m.content);
}
function setState(s) { setReactorState(s); transcript.textContent = ({STANDBY:'Systems ready. Awaiting your command.',LISTENING:'Listening for your command…',THINKING:'Processing your request…',SPEAKING:'Responding…'})[s] || s; }
const speech = new JarvisSpeech(setState, (value, final) => {
  transcript.textContent = value || 'Listening…';
  if (final && value.trim()) sendMessage(value.trim());
}, message => { transcript.textContent = message; setState('STANDBY'); });

async function sendMessage(text) {
  const message = text.trim(); if (!message) return;
  speech.stop(); window.speechSynthesis?.cancel();
  addMessage('user',message); history.push({role:'user',content:message}); save();
  input.value=''; setState('THINKING');
  try {
    const response = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,history:history.slice(0,-1)})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The AI service returned an error.');
    addMessage('assistant',data.reply); history.push({role:'assistant',content:data.reply}); save();
    speech.speak(data.reply);
    if (!speech.enabled) setState('STANDBY');
  } catch (err) {
    const error = err.message || 'Connection error.';
    addMessage('assistant',error); history.push({role:'assistant',content:error}); save(); setState('STANDBY');
  }
}
form.addEventListener('submit',e=>{e.preventDefault();sendMessage(input.value);});
mic.addEventListener('click',()=>{
  if (!navigator.mediaDevices?.getUserMedia) { transcript.textContent='Microphone requires HTTPS and browser permission.'; return; }
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    stream.getTracks().forEach(t=>t.stop()); mic.classList.add('listening'); speech.listen();
  }).catch(()=>{transcript.textContent='Please allow microphone access in Chrome site settings.';});
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){speech.stop();window.speechSynthesis?.cancel();setState('STANDBY');mic.classList.remove('listening');}});
$('settingsBtn').addEventListener('click',()=>$('settingsDialog').showModal());
$('voiceToggle').addEventListener('change',e=>{speech.enabled=e.target.checked;if(!speech.enabled)window.speechSynthesis?.cancel();});
$('speechRate').addEventListener('input',e=>{speech.rate=Number(e.target.value);$('rateValue').textContent=`${speech.rate.toFixed(2)}×`;});
$('clearChat').addEventListener('click',()=>{history=[];save();renderHistory();$('settingsDialog').close();setState('STANDBY');});
function updateClock(){const now=new Date();$('clock').textContent=now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});$('date').textContent=now.toLocaleDateString([], {weekday:'short',day:'2-digit',month:'short'}).toUpperCase();}
async function checkServer(){try{const r=await fetch('/api/health');if(!r.ok)throw 0;$('networkStatus').textContent='ONLINE';$('statusDot').classList.remove('offline');}catch{$('networkStatus').textContent='OFFLINE';$('statusDot').classList.add('offline');}}
renderHistory();updateClock();setInterval(updateClock,1000);checkServer();
