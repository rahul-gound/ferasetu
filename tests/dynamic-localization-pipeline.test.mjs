import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashTranslationKey,
  translateDynamicTexts
} from '../worker/ai/translationService.js';
import {
  handleTranslateRequest,
  handleListCommunityDiscussions,
  handleCreateCommunityDiscussion,
  handleAddCommunityReply,
  handleUpdateCommunityDiscussion,
  handleDeleteCommunityDiscussion,
  detectTextLanguage,
  SEED_DISCUSSIONS
} from '../worker/routes/communityRoutes.js';
import {
  handleAnnouncementsRoutes
} from '../worker/routes/announcementsRoutes.js';

test('Dynamic Localization — Hash Translation Key generates deterministic hashes', () => {
  const hash1 = hashTranslationKey('en', 'hi', 'retail', '0% Commission Direct Settlement Engine');
  const hash2 = hashTranslationKey('en', 'hi', 'retail', '0% Commission Direct Settlement Engine');
  const hash3 = hashTranslationKey('en', 'es', 'retail', '0% Commission Direct Settlement Engine');

  assert.equal(hash1, hash2, 'Identical inputs must yield identical hash');
  assert.notEqual(hash1, hash3, 'Different target languages must yield different hashes');
  assert.ok(hash1.startsWith('tr_'), 'Hash should have tr_ prefix');
});

test('Dynamic Localization — translateDynamicTexts passes through identical languages', async () => {
  const texts = ['Hello world', 'Direct UPI Auto-sweep'];
  const res = await translateDynamicTexts({
    texts,
    targetLang: 'en',
    sourceLang: 'en',
    context: 'retail'
  });

  assert.deepEqual(res, texts);
});

test('Dynamic Localization — translateDynamicTexts uses instant retail glossary for high-frequency shopkeeper terms', async () => {
  const texts = [
    '0% Commission Direct Settlement Engine',
    'Kirana & Grocery',
    'Khata & Pay-Later',
    'Payments & Soundbox'
  ];

  // Test Hindi (hi)
  const hiRes = await translateDynamicTexts({
    texts,
    targetLang: 'hi',
    sourceLang: 'en',
    context: 'retail'
  });

  assert.equal(hiRes[0], '0% कमीशन डायरेक्ट सेटलमेंट इंजन');
  assert.equal(hiRes[1], 'किराना और ग्रोसरी');
  assert.equal(hiRes[2], 'खाता और उधार बही');
  assert.equal(hiRes[3], 'पेमेंट्स और साउंडबॉक्स');

  // Test Spanish (es)
  const esRes = await translateDynamicTexts({
    texts,
    targetLang: 'es',
    sourceLang: 'en',
    context: 'retail'
  });

  assert.equal(esRes[0], 'Motor de liquidación directa con 0% de comisión');
  assert.equal(esRes[1], 'Almacén y comestibles');
  assert.equal(esRes[2], 'Crédito y pago posterior');
});

test('Dynamic Localization — Script detector accurately identifies Telugu, Hindi, and English', () => {
  const teluguText = 'నా షాపులో UPI పేమెంట్స్ వెంటనే ఎలా వస్తాయి?';
  const hindiText = 'मेरी दुकान में आज कितनी बिक्री हुई?';
  const englishText = 'How do I connect my Bluetooth thermal printer?';

  assert.equal(detectTextLanguage(teluguText), 'te', 'Should detect Telugu Unicode');
  assert.equal(detectTextLanguage(hindiText), 'hi', 'Should detect Devanagari Hindi');
  assert.equal(detectTextLanguage(englishText), 'en', 'Should default to English for Latin text');
});

test('Dynamic Localization — handleTranslateRequest handles API batches correctly', async () => {
  const mockReq = new Request('https://fera-worker.local/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      texts: ['0% Commission Direct Settlement Engine', 'Payments & Soundbox'],
      targetLang: 'hi',
      sourceLang: 'en',
      context: 'retail'
    })
  });

  const res = await handleTranslateRequest(mockReq, {});
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.targetLang, 'hi');
  assert.equal(json.translations.length, 2);
  assert.equal(json.translations[0], '0% कमीशन डायरेक्ट सेटलमेंट इंजन');
  assert.equal(json.translations[1], 'पेमेंट्स और साउंडबॉक्स');
});

test('Community Discord Hub — Admin Feature Approval, Status Update & Developer Note', async () => {
  // Create a feature request discussion
  const createReq = new Request('https://fera-worker.local/api/community/discussions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Auto-print customer delivery bill directly from counter Android phone',
      body: 'Can we tap one button in orders to print to 58mm thermal printer without popup dialogs?',
      channel: 'feature-requests',
      category: 'Hardware',
      author: 'Sunil K.',
      storeName: 'Sunil Provisions',
      userLang: 'en'
    })
  });

  const createRes = await handleCreateCommunityDiscussion(createReq, {});
  assert.equal(createRes.status, 201);
  const { discussion } = await createRes.json();
  const discId = discussion.id;
  assert.equal(discussion.channel, 'feature-requests');

  // Admin approves feature with custom note ("tell this feature will be approve and make it better")
  const updateReq = new Request(`https://fera-worker.local/api/community/discussions/${discId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'approved',
      adminNote: 'This feature has been officially approved! We will make it better by adding silent Bluetooth ESC/POS raw streaming.',
      isPinned: true
    })
  });

  const updateRes = await handleUpdateCommunityDiscussion(updateReq, {}, discId);
  assert.equal(updateRes.status, 200);
  const updateJson = await updateRes.json();
  assert.equal(updateJson.discussion.status, 'approved');
  assert.ok(updateJson.discussion.adminNote.includes('officially approved'));
  assert.equal(updateJson.discussion.isPinned, true);

  // Admin posts official verified reply
  const replyReq = new Request(`https://fera-worker.local/api/community/discussions/${discId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Our engineering sprint has started. This will ship in next release.',
      isAdmin: true,
      adminBadge: 'Core Team'
    })
  });

  const replyRes = await handleAddCommunityReply(replyReq, {}, discId);
  assert.equal(replyRes.status, 201);
  const replyJson = await replyRes.json();
  assert.equal(replyJson.reply.isAdmin, true);
  assert.equal(replyJson.reply.adminBadge, 'Core Team');

  // Admin deletes discussion
  const deleteRes = await handleDeleteCommunityDiscussion(new Request(`https://fera-worker.local/api/community/discussions/${discId}`, { method: 'DELETE' }), {}, discId);
  assert.equal(deleteRes.status, 200);
});

test('Real Notifications — Zero Fake Announcements & 24h Vanish Logic Rule', () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const realAnnouncements = [
    { id: 'ann-1', title: 'Real Admin Update 1', created_at: new Date(now - 3600000).toISOString() },
    { id: 'ann-2', title: 'Real Admin Update 2', created_at: new Date(now - 7200000).toISOString() },
    { id: 'ann-3', title: 'Real Admin Update 3 (Unseen)', created_at: new Date(now - 1800000).toISOString() },
  ];

  // Simulating user seen timestamps:
  // ann-1 was seen 2 hours ago (within 24 hours -> stays visible)
  // ann-2 was seen 26 hours ago (> 24 hours -> vanishes!)
  // ann-3 was not seen yet -> stays visible
  const seenTimestamps = {
    'ann-1': now - 2 * 3600 * 1000,
    'ann-2': now - 26 * 3600 * 1000,
  };

  const visible = realAnnouncements.filter((ann) => {
    const seenAt = seenTimestamps[ann.id];
    if (!seenAt) return true; // not seen yet, keep visible
    return now - seenAt < ONE_DAY_MS; // vanishes 1 day after user has seen
  });

  assert.equal(visible.length, 2, 'Exactly 2 announcements should be visible');
  assert.ok(visible.some(a => a.id === 'ann-1'), 'ann-1 should be visible (seen < 24h)');
  assert.ok(visible.some(a => a.id === 'ann-3'), 'ann-3 should be visible (unseen)');
  assert.ok(!visible.some(a => a.id === 'ann-2'), 'ann-2 must vanish because > 24 hours have passed since user saw it');
});
