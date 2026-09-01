import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://ferasetu.com/callback',
  pretendToBeVisual: true,
});

const defineGlobal = (key: string, value: unknown) => {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
};

defineGlobal('window', dom.window);
defineGlobal('document', dom.window.document);
defineGlobal('navigator', dom.window.navigator);
defineGlobal('localStorage', dom.window.localStorage);
defineGlobal('sessionStorage', dom.window.sessionStorage);
defineGlobal('location', dom.window.location);
defineGlobal('history', dom.window.history);
defineGlobal('HTMLElement', dom.window.HTMLElement);
defineGlobal('HTMLIFrameElement', dom.window.HTMLIFrameElement);
defineGlobal('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
defineGlobal('cancelAnimationFrame', dom.window.cancelAnimationFrame.bind(dom.window));

const { setUnauthorizedHandler } = await import('../src/services/authBridge.ts');
const { remoteApi } = await import('../src/services/api.ts');

test('/users/me 401 delegates to auth state and never performs a browser redirect', async () => {
  const calls: Array<{ url: string; status: number }> = [];
  setUnauthorizedHandler((context) => calls.push(context));
  remoteApi.defaults.adapter = async (config: unknown) => {
    const error = new Error('Request failed with status code 401') as Error & {
      config?: unknown;
      response?: {
        data: unknown;
        status: number;
        statusText: string;
        headers: Record<string, string>;
        config: unknown;
      };
    };
    error.config = config;
    error.response = {
      data: { error: 'Unauthorized' },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config,
    };
    throw error;
  };

  await assert.rejects(() => remoteApi.get('/users/me'));

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/users/me');
  assert.equal(calls[0].status, 401);
  const apiSource = await readFile(new URL('../src/services/api.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(apiSource, /window\.location\.href\s*=\s*['"`]\/login['"`]/);

  setUnauthorizedHandler(null);
});

test('login and register start authentication only from explicit actions', async () => {
  const loginSource = await readFile(new URL('../src/pages/LoginPage.tsx', import.meta.url), 'utf8');
  const registerSource = await readFile(new URL('../src/pages/RegisterPage.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(loginSource, /void handleLogin\(\)/);
  assert.doesNotMatch(registerSource, /void handleRegister\(\)/);
  assert.match(loginSource, /onClick=\{handleLogin\}/);
  assert.match(registerSource, /onClick=\{handleRegister\}/);
});

test('callback, guard, and logout routing semantics remain intact', async () => {
  const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const callbackSource = await readFile(new URL('../src/pages/AuthCallbackPage.tsx', import.meta.url), 'utf8');
  const layoutSource = await readFile(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8');

  assert.match(appSource, /path="login" element=\{user \? <Navigate to="\/dashboard" replace \/> : <LoginPage \/>}/);
  assert.match(appSource, /path="register" element=\{user \? <Navigate to="\/dashboard" replace \/> : <RegisterPage \/>}/);
  assert.match(appSource, /path="callback" element=\{<AuthCallbackPage \/>}/);
  assert.match(appSource, /if \(!user\) return <Navigate to="\/login" replace \/>/);
  assert.match(appSource, /if \(!user\.is_verified && !isVerifyPage\)/);
  assert.match(callbackSource, /navigate\('\/dashboard', \{ replace: true \}\)/);
  assert.match(callbackSource, /Opening your shop\.\.\./);
  assert.match(layoutSource, /logout\(\);\s*navigate\('\/login'\);/);
});
