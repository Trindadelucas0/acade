import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie } from 'hono/cookie';
import crypto from 'node:crypto';
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse
} from '@simplewebauthn/server';
import webpush from 'web-push';
import * as db from './db.js';

const app = new Hono();

// Helper base64url conversion
const b64uToBuf = s => Buffer.from(s, 'base64url');

// Presence (in-memory per worker isolate)
const presence = new Map();
const PRESENCE_TTL = 70000;

function livePresence(uid) {
  const p = presence.get(uid);
  if (!p) return null;
  if (Date.now() - p.updatedAt > PRESENCE_TTL) { presence.delete(uid); return null; }
  return p;
}

// Config helpers
function getConfig(c) {
  const env = c.env;
  const req = c.req;
  const originHeader = req.header('origin') || '';
  const hostHeader = req.header('x-forwarded-host') || req.header('host') || '';

  let hostname = '';
  if (originHeader) {
    try { hostname = new URL(originHeader).hostname; } catch {}
  }
  if (!hostname && hostHeader) {
    hostname = hostHeader.split(':')[0];
  }

  // Desconsidera host de worker direto para o RP_ID se vier pelo proxy do Pages
  if (hostname.endsWith('.workers.dev') && originHeader && !originHeader.endsWith('.workers.dev')) {
    try { hostname = new URL(originHeader).hostname; } catch {}
  }

  const rpId = hostname || env.RP_ID || 'localhost';
  const origin = originHeader || (hostname ? `https://${hostname}` : (env.ORIGIN || 'http://localhost:5173'));

  return {
    RP_NAME: env.RP_NAME || 'natoGym',
    RP_ID: rpId,
    ORIGIN: origin,
    ADMIN_UIDS: (env.ADMIN_UIDS || '').split(',').map(s => s.trim()).filter(Boolean),
    INVITE_ONLY: /^(1|true|yes|on)$/i.test(env.INVITE_ONLY || ''),
    SESSION_DAYS: Math.max(1, +(env.SESSION_DAYS || 90) || 90),
    SECURE: /^https:/i.test(origin)
  };
}

async function getSecret(c) {
  return await db.getOrCreateSecret(c.env);
}

// Session signing & verification
function signPayload(payload, secret) {
  const mac = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return payload + '.' + mac;
}

function verifySig(token, secret) {
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const payload = token.slice(0, i), mac = token.slice(i + 1);
  const expect = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return null;
  } catch { return null; }
  return payload;
}

async function readSession(c) {
  const tok = getCookie(c, 'gymsid');
  if (!tok) return null;
  const secret = await getSecret(c);
  const payload = verifySig(tok, secret);
  if (!payload) return null;
  const [uid, exp, ver] = payload.split(':');
  if (!uid || +exp < Date.now()) return null;
  const user = await db.getUserById(c.env, uid);
  if (!user) return null;
  if (user.disabled) return null;
  const claimed = ver === undefined ? 0 : Number(ver);
  const currentVer = user.sv || 0;
  if (!Number.isInteger(claimed) || claimed !== currentVer) return null;
  return user;
}

function isAdmin(user, cfg) {
  return !!user && (user.admin === 1 || user.admin === true || cfg.ADMIN_UIDS.includes(user.id));
}

async function setSessionCookie(c, user) {
  const cfg = getConfig(c);
  const secret = await getSecret(c);
  const exp = Date.now() + cfg.SESSION_DAYS * 86400000;
  const payload = `${user.id}:${exp}:${user.sv || 0}`;
  const token = signPayload(payload, secret);

  setCookie(c, 'gymsid', token, {
    path: '/',
    maxAge: cfg.SESSION_DAYS * 86400,
    httpOnly: true,
    secure: cfg.SECURE,
    sameSite: 'Lax'
  });
}

function clearSessionCookie(c) {
  const cfg = getConfig(c);
  setCookie(c, 'gymsid', '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: cfg.SECURE,
    sameSite: 'Lax'
  });
}

// CORS Config
app.use('*', async (c, next) => {
  const cfg = getConfig(c);
  const reqOrigin = c.req.header('origin');
  const allowed = (reqOrigin && (reqOrigin === cfg.ORIGIN || reqOrigin.endsWith('.pages.dev') || /^http:\/\/localhost(:\d+)?$/.test(reqOrigin)))
    ? reqOrigin
    : cfg.ORIGIN;
  const corsMiddleware = cors({
    origin: allowed,
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });
  return corsMiddleware(c, next);
});

// Middleware for Admin check
async function requireAdmin(c) {
  const user = await readSession(c);
  if (!user) {
    c.status(401);
    return { error: 'not signed in', user: null };
  }
  const cfg = getConfig(c);
  if (!isAdmin(user, cfg)) {
    c.status(403);
    return { error: 'forbidden', user: null };
  }
  return { user, cfg };
}

// Push Helper
async function sendPushToUser(env, userId, payload) {
  const keys = await db.getOrCreateVapidKeys(env);
  const cfg = { ORIGIN: env.ORIGIN || 'http://localhost:5173' };
  const subject = env.VAPID_SUBJECT || (cfg.ORIGIN.startsWith('https') ? cfg.ORIGIN : 'mailto:admin@localhost');

  webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
  const subs = await db.getUserSubscriptions(env, userId);
  if (!subs.length) return;
  const body = JSON.stringify(payload);

  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body, { urgency: 'high' });
    } catch (e) {
      console.error('Push send error:', e.statusCode, e.message);
      if (e.statusCode === 404 || e.statusCode === 410) {
        await db.removeUserSubscription(env, userId, sub.endpoint);
      }
    }
  }
}

// Rotas da API
app.get('/api/health', async (c) => {
  const users = await db.getAllUsers(c.env);
  return c.json({ ok: true, users: users.length });
});

app.get('/api/config', (c) => {
  const cfg = getConfig(c);
  return c.json({ invite_only: cfg.INVITE_ONLY });
});

app.get('/api/me', async (c) => {
  const user = await readSession(c);
  if (!user) return c.json({ error: 'not signed in' }, 401);
  const cfg = getConfig(c);
  return c.json({ user: { id: user.id, name: user.name, admin: isAdmin(user, cfg) } });
});

app.post('/api/register/options', async (c) => {
  const cfg = getConfig(c);
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 40);
  if (!name) return c.json({ error: 'name required' }, 400);

  const code = String(body.code || '').trim().toUpperCase();
  if (cfg.INVITE_ONLY) {
    const invite = await db.getValidInvite(c.env, code);
    if (!invite) return c.json({ error: 'a valid invite code is required' }, 403);
  }

  const uid = crypto.randomBytes(12).toString('base64url');
  const options = await generateRegistrationOptions({
    rpName: cfg.RP_NAME,
    rpID: cfg.RP_ID,
    userID: Buffer.from(uid),
    userName: name,
    userDisplayName: name,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
    excludeCredentials: []
  });

  const cid = await db.putChallenge(c.env, { challenge: options.challenge, name, uid, code });
  return c.json({ cid, options });
});

app.post('/api/register/verify', async (c) => {
  const cfg = getConfig(c);
  const body = await c.req.json().catch(() => ({}));
  const challengeData = await db.takeChallenge(c.env, body.cid);
  if (!challengeData || !challengeData.uid) return c.json({ error: 'challenge expired — try again' }, 400);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.credential,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: cfg.ORIGIN,
      expectedRPID: cfg.RP_ID,
      requireUserVerification: false
    });
  } catch (e) {
    return c.json({ error: 'verification failed: ' + e.message }, 400);
  }

  if (!verification.verified) return c.json({ error: 'not verified' }, 400);
  const { credential } = verification.registrationInfo;

  const existingCred = await db.getCredentialById(c.env, credential.id);
  if (existingCred) return c.json({ error: 'credential already registered' }, 409);

  let invite = null;
  if (cfg.INVITE_ONLY) {
    invite = await db.getValidInvite(c.env, challengeData.code);
    if (!invite) return c.json({ error: 'invite code is no longer valid — ask for a new one' }, 403);
  }

  const user = { id: challengeData.uid, name: challengeData.name, created: new Date().toISOString(), sv: 0 };
  if (invite) {
    user.invitedBy = invite.code;
    await db.useInvite(c.env, invite.code, user.id, user.created);
  }

  await db.createUser(c.env, user);
  await db.addCredential(c.env, {
    id: credential.id,
    userId: user.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64url'),
    counter: credential.counter || 0,
    transports: body.credential?.response?.transports || []
  });

  await setSessionCookie(c, user);
  return c.json({ user: { id: user.id, name: user.name, admin: isAdmin(user, cfg) } });
});

app.post('/api/login/options', async (c) => {
  const cfg = getConfig(c);
  const options = await generateAuthenticationOptions({
    rpID: cfg.RP_ID, userVerification: 'preferred', allowCredentials: []
  });
  const cid = await db.putChallenge(c.env, { challenge: options.challenge });
  return c.json({ cid, options });
});

app.post('/api/login/verify', async (c) => {
  const cfg = getConfig(c);
  const body = await c.req.json().catch(() => ({}));
  const challengeData = await db.takeChallenge(c.env, body.cid);
  if (!challengeData) return c.json({ error: 'challenge expired — try again' }, 400);

  const cred = await db.getCredentialById(c.env, body.credential?.id);
  if (!cred) return c.json({ error: 'unknown passkey — create a profile first' }, 404);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.credential,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: cfg.ORIGIN,
      expectedRPID: cfg.RP_ID,
      requireUserVerification: false,
      credential: {
        id: cred.id,
        publicKey: b64uToBuf(cred.publicKey),
        counter: cred.counter,
        transports: cred.transports
      }
    });
  } catch (e) {
    return c.json({ error: 'verification failed: ' + e.message }, 400);
  }

  if (!verification.verified) return c.json({ error: 'not verified' }, 400);

  await db.updateCredentialCounter(c.env, cred.id, verification.authenticationInfo.newCounter);
  const user = await db.getUserById(c.env, cred.userId);
  if (!user) return c.json({ error: 'user missing' }, 500);
  if (user.disabled) return c.json({ error: 'this account has been disabled' }, 403);

  await setSessionCookie(c, user);
  return c.json({ user: { id: user.id, name: user.name, admin: isAdmin(user, cfg) } });
});

app.post('/api/logout', (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true });
});

app.post('/api/logout/all', async (c) => {
  const user = await readSession(c);
  if (!user) return c.json({ error: 'not signed in' }, 401);

  user.sv = (user.sv || 0) + 1;
  await db.updateUser(c.env, user);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

app.get('/api/data', async (c) => {
  const user = await readSession(c);
  if (!user) return c.json({ error: 'not signed in' }, 401);

  const state = await db.getUserState(c.env, user.id);
  return c.json({ state });
});

app.put('/api/data', async (c) => {
  const user = await readSession(c);
  if (!user) return c.json({ error: 'not signed in' }, 401);

  const body = await c.req.json().catch(() => ({}));
  if (!body.state || typeof body.state !== 'object') return c.json({ error: 'state required' }, 400);

  delete body.state.active;
  await db.setUserState(c.env, user.id, body.state);
  return c.json({ ok: true, ts: body.state._ts || null });
});

app.get('/api/push/public-key', async (c) => {
  const keys = await db.getOrCreateVapidKeys(c.env);
  return c.json({ key: keys.publicKey });
});

app.post('/api/push/subscribe', async (c) => {
  const user = await readSession(c);
  if (!user) return c.json({ error: 'not signed in' }, 401);

  const body = await c.req.json().catch(() => ({}));
  const sub = body.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return c.json({ error: 'invalid subscription' }, 400);

  await db.saveUserSubscription(c.env, user.id, sub.endpoint, sub.keys);
  return c.json({ ok: true });
});

app.post('/api/push/unsubscribe', async (c) => {
  const user = await readSession(c);
  if (!user) return c.json({ error: 'not signed in' }, 401);

  const body = await c.req.json().catch(() => ({}));
  await db.removeUserSubscription(c.env, user.id, body.endpoint);
  return c.json({ ok: true });
});

app.post('/api/push/test', async (c) => {
  const user = await readSession(c);
  if (!user) return c.json({ error: 'not signed in' }, 401);

  await sendPushToUser(c.env, user.id, { title: 'natoGym', body: 'Test notification ✅ — Cloudflare Worker Push working.', tag: 'test' });
  return c.json({ ok: true });
});

app.post('/api/push/rest-timer', async (c) => {
  const user = await readSession(c);
  if (!user) return c.json({ error: 'not signed in' }, 401);
  return c.json({ ok: true });
});

app.post('/api/push/rest-timer/cancel', async (c) => {
  const user = await readSession(c);
  if (!user) return c.json({ error: 'not signed in' }, 401);
  return c.json({ ok: true });
});

app.post('/api/activity', async (c) => {
  const user = await readSession(c);
  if (!user) return c.json({ error: 'not signed in' }, 401);

  const body = await c.req.json().catch(() => ({}));
  if (body.active) {
    presence.set(user.id, {
      name: String(body.name || '').slice(0, 60),
      exIdx: +body.exIdx || 0, exTotal: +body.exTotal || 0,
      setsDone: +body.setsDone || 0, setsTotal: +body.setsTotal || 0,
      startedAt: +body.startedAt || Date.now(),
      updatedAt: Date.now()
    });
  } else presence.delete(user.id);
  return c.json({ ok: true });
});

// Rotas Administrativas
app.get('/api/admin/users', async (c) => {
  const res = await requireAdmin(c);
  if (res.error) return c.json({ error: res.error });

  const users = await db.getAllUsers(c.env);
  const userList = [];
  for (const u of users) {
    const S = (await db.getUserState(c.env, u.id)) || {};
    const workouts = S.workouts || [];
    const last = workouts[workouts.length - 1];
    const subs = await db.getUserSubscriptions(c.env, u.id);
    userList.push({
      id: u.id, name: u.name, created: u.created || null,
      disabled: !!u.disabled, admin: isAdmin(u, res.cfg), invitedBy: u.invitedBy || null,
      workouts: workouts.length,
      lastWorkout: last ? last.d : null,
      lastSync: S._ts || null,
      hasPush: subs.length > 0,
      live: livePresence(u.id)
    });
  }
  return c.json({ users: userList, invite_only: res.cfg.INVITE_ONLY, now: Date.now() });
});

app.get('/api/admin/user', async (c) => {
  const res = await requireAdmin(c);
  if (res.error) return c.json({ error: res.error });

  const id = c.req.query('id');
  const u = await db.getUserById(c.env, id);
  if (!u) return c.json({ error: 'no such user' }, 404);

  const S = (await db.getUserState(c.env, u.id)) || {};
  return c.json({
    user: { id: u.id, name: u.name, created: u.created || null, disabled: !!u.disabled, admin: isAdmin(u, res.cfg), invitedBy: u.invitedBy || null },
    unit: S.unit || 'kg',
    lastSync: S._ts || null,
    routines: (S.routines || []).map(r => ({ id: r.id, name: r.name, emoji: r.emoji, count: (r.ex || []).length })),
    bodyweight: S.bodyweight || [],
    workouts: (S.workouts || []).slice().reverse()
  });
});

app.post('/api/admin/user/disable', async (c) => {
  const res = await requireAdmin(c);
  if (res.error) return c.json({ error: res.error });

  const body = await c.req.json().catch(() => ({}));
  const u = await db.getUserById(c.env, body.id);
  if (!u) return c.json({ error: 'no such user' }, 404);
  if (isAdmin(u, res.cfg)) return c.json({ error: 'cannot disable an admin' }, 400);

  u.disabled = body.disabled ? 1 : 0;
  if (u.disabled) presence.delete(u.id);
  await db.updateUser(c.env, u);
  return c.json({ ok: true, id: u.id, disabled: !!u.disabled });
});

app.get('/api/admin/invites', async (c) => {
  const res = await requireAdmin(c);
  if (res.error) return c.json({ error: res.error });

  const invites = await db.getAllInvites(c.env);
  return c.json({ invites, invite_only: res.cfg.INVITE_ONLY });
});

app.post('/api/admin/invites/new', async (c) => {
  const res = await requireAdmin(c);
  if (res.error) return c.json({ error: res.error });

  const body = await c.req.json().catch(() => ({}));
  const code = crypto.randomBytes(8).toString('hex').toUpperCase();
  const invite = { code, note: String(body.note || '').slice(0, 60), createdBy: res.user.id, created: new Date().toISOString() };

  await db.createInvite(c.env, invite);
  return c.json({ invite });
});

app.post('/api/admin/invites/revoke', async (c) => {
  const res = await requireAdmin(c);
  if (res.error) return c.json({ error: res.error });

  const body = await c.req.json().catch(() => ({}));
  const code = String(body.code || '').toUpperCase();
  await db.revokeInvite(c.env, code);
  return c.json({ ok: true });
});

// Routine Helper for Cron
function effectiveRoutineId(S, iso) {
  const ov = S.dayPlan?.[iso];
  if (ov === 'rest') return null;
  if (ov && S.routines?.some(r => r.id === ov)) return ov;
  const wd = new Date(iso + 'T12:00:00').getDay();
  return S.week?.[wd] || null;
}

function userNow(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).formatToParts(new Date());
    const g = t => parts.find(p => p.type === t)?.value;
    return { date: `${g('year')}-${g('month')}-${g('day')}`, hhmm: `${g('hour')}:${g('minute')}` };
  } catch { return null; }
}

// Scheduled Handler (Cron Trigger)
export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      const users = await db.getAllUsers(env);
      for (const user of users) {
        const subs = await db.getUserSubscriptions(env, user.id);
        if (!subs.length) continue;
        const S = await db.getUserState(env, user.id);
        if (!S?.reminder?.on) continue;
        const now = userNow(S.reminder.tz || 'UTC');
        if (!now || S.reminder.time !== now.hhmm) continue;
        if (user.lastReminder === now.date) continue;
        if ((S.workouts || []).some(w => w.d === now.date)) continue;
        const rid = effectiveRoutineId(S, now.date);
        if (!rid) continue;
        const routine = (S.routines || []).find(r => r.id === rid);

        user.lastReminder = now.date;
        await db.updateUser(env, user);

        await sendPushToUser(env, user.id, {
          title: routine ? `${routine.emoji || '🏋️'} ${routine.name} today` : 'Workout planned today',
          body: "It's on your plan — let's go 💪",
          tag: 'day-reminder'
        });
      }
    })());
  }
};
