export class JarvisSpeech {
  constructor(onState, onTranscript, onError) {
    this.onState = onState; this.onTranscript = onTranscript; this.onError = onError;
    this.Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.enabled = true; this.rate = 1; this.recognition = null;
  }
  listen() {
    if (!this.Recognition) { this.onError('Speech recognition is not available in this browser. Try Chrome on Android.'); return; }
    if (!window.isSecureContext) { this.onError('Voice input needs a secure HTTPS website.'); return; }
    if (this.recognition) { this.recognition.stop(); return; }
    const rec = new this.Recognition(); this.recognition = rec;
    rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false;
    rec.onstart = () => this.onState('LISTENING');
    rec.onresult = e => {
      let final = '', interim = '';
      for (let i=e.resultIndex;i<e.results.length;i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      this.onTranscript(final || interim, Boolean(final));
    };
    rec.onerror = e => { this.onError(e.error === 'not-allowed' ? 'Microphone permission was denied in Chrome.' : `Voice input error: ${e.error}`); };
    rec.onend = () => { this.recognition = null; this.onState('STANDBY'); };
    try { rec.start(); } catch { this.recognition = null; this.onState('STANDBY'); }
  }
  stop() { this.recognition?.stop(); this.recognition = null; }
  speak(text) {
    if (!this.enabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_`#>]/g,'').replace(/\s+/g,' ').trim();
    const chunks = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
    const voice = window.speechSynthesis.getVoices().find(v => v.lang === 'en-GB') ||
      window.speechSynthesis.getVoices().find(v => v.lang.startsWith('en'));
    let i = 0;
    const next = () => {
      if (i >= chunks.length) { this.onState('STANDBY'); return; }
      const u = new SpeechSynthesisUtterance(chunks[i++].trim());
      if (voice) u.voice = voice; u.rate = this.rate; u.pitch = .95;
      u.onstart = () => this.onState('SPEAKING'); u.onend = next; u.onerror = () => this.onState('STANDBY');
      window.speechSynthesis.speak(u);
    };
    next();
  }
}
