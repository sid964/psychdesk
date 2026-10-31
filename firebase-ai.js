/* PsychDesk Gemini via Firebase AI Logic + reCAPTCHA Enterprise App Check.
   No Gemini Developer API key or private credential belongs in browser source. */
import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app-check.js';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-ai.js';

const key = String(window.PSYCHDESK_APP_CHECK_SITE_KEY || '').trim();
const firebaseConfig = window.PSYCHDESK_FIREBASE_CONFIG || {};
let ai = null, appCheck = null, app = null;
const state = {status:'setup', message:'App Check setup required'};
const announce = () => window.dispatchEvent(new Event('psychdesk:ai-status'));
const describe = error => String(error?.message || error?.code || error || 'Unknown error').slice(0,300);
const withTimeout = (task, ms, message) => {
  let timer;
  return Promise.race([
    Promise.resolve().then(task),
    new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(Error(message), {code:'psychdesk/timeout'})), ms); })
  ]).finally(() => clearTimeout(timer));
};


window.PsychDeskAI = {
  getStatus: () => ({...state}),
  async generateText({prompt, model='gemini-3.8-flash'}) {
    if (!key || !ai || !appCheck) throw Error(state.message);
    const requestUser=getAuth(app).currentUser;
    if (!requestUser) throw Error('Sign in to PsychDesk with Google before using Gemini.');
    // Validate App Check registration before sending study content to AI Logic.
    try { await withTimeout(() => getToken(appCheck, false), 20000, 'App Check timed out after 20 seconds. The reCAPTCHA site key, allowed hostname, browser protections, or Firebase registration may need attention.'); }
    catch (error) { throw Error('App Check could not verify this browser. Confirm the reCAPTCHA Enterprise site key, allowed domain, and Firebase registration. '+describe(error)); }
    if (getAuth(app).currentUser !== requestUser) throw Error('Your account changed. Sign in again before using Gemini.');
    try {
      const generativeModel = getGenerativeModel(ai, {
        model,
        generationConfig: {temperature:0.5, maxOutputTokens:2200}
      });
      const result = await withTimeout(() => generativeModel.generateContent(prompt), 60000, 'Gemini timed out after 60 seconds while waiting for a response. No server rejection was received. Retry once; if it repeats, check the browser network request and Firebase AI Logic status.');
      const output = result?.response?.text()?.trim();
      if (!output) throw Error('Gemini returned no text. Try again with a different question.');
      return output;
    } catch(error) {
      if(error?.code==='psychdesk/timeout') throw error;
      const message=describe(error);
      if(/\b403\b|PERMISSION_DENIED/i.test(message))
        throw Error('Firebase AI Logic denied access. The server error below may identify an API, project permission, or App Check configuration issue. '+message);
      throw Error(message);
    }
  }
};

try {
  if (!key) {
    state.message='Complete Firebase AI Logic + App Check setup, then add the public reCAPTCHA Enterprise site key in app-check-config.js.';
  } else if (!firebaseConfig?.appId || !firebaseConfig?.projectId) {
    state.status='error';
    state.message='Firebase web configuration is missing.';
  } else {
    app=getApps().length?getApp():initializeApp(firebaseConfig);
    appCheck=initializeAppCheck(app,{
      provider:new ReCaptchaEnterpriseProvider(key),
      isTokenAutoRefreshEnabled:true
    });
    ai=getAI(app,{backend:new GoogleAIBackend()});
    state.status='ready';
    state.message='Firebase AI Logic ready · App Check enabled';
  }
} catch(error) {
  state.status='error';
  state.message='Firebase AI initialization failed: '+describe(error);
  console.error('PsychDesk AI initialization',error);
}
announce();
