// db.js — Armazenamento do openGym via Cloudflare KV (OPENGYM_KV)
import webpush from 'web-push';

export async function getOrCreateSecret(env) {
  if (env.SECRET) return env.SECRET;
  let secret = await env.OPENGYM_KV.get('app_secret');
  if (!secret) {
    secret = crypto.randomUUID() + crypto.randomUUID();
    await env.OPENGYM_KV.put('app_secret', secret);
  }
  return secret;
}

export async function getOrCreateVapidKeys(env) {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    return { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
  }
  const keysStr = await env.OPENGYM_KV.get('vapid_keys');
  if (keysStr) {
    try { return JSON.parse(keysStr); } catch {}
  }
  const keys = webpush.generateVAPIDKeys();
  await env.OPENGYM_KV.put('vapid_keys', JSON.stringify(keys));
  return keys;
}

async function getMainDb(env) {
  const dbStr = await env.OPENGYM_KV.get('main_db');
  if (!dbStr) return { users: [], creds: [], subs: [], invites: [] };
  try {
    const data = JSON.parse(dbStr);
    return {
      users: data.users || [],
      creds: data.creds || [],
      subs: data.subs || [],
      invites: data.invites || []
    };
  } catch {
    return { users: [], creds: [], subs: [], invites: [] };
  }
}

async function saveMainDb(env, dbData) {
  await env.OPENGYM_KV.put('main_db', JSON.stringify(dbData));
}

export async function getUserById(env, id) {
  const dbData = await getMainDb(env);
  return dbData.users.find(u => u.id === id) || null;
}

export async function getAllUsers(env) {
  const dbData = await getMainDb(env);
  return dbData.users;
}

export async function createUser(env, user) {
  const dbData = await getMainDb(env);
  dbData.users.push(user);
  await saveMainDb(env, dbData);
}

export async function updateUser(env, user) {
  const dbData = await getMainDb(env);
  const idx = dbData.users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    dbData.users[idx] = { ...dbData.users[idx], ...user };
    await saveMainDb(env, dbData);
  }
}

export async function addCredential(env, cred) {
  const dbData = await getMainDb(env);
  dbData.creds.push(cred);
  await saveMainDb(env, dbData);
}

export async function getCredentialById(env, id) {
  const dbData = await getMainDb(env);
  return dbData.creds.find(c => c.id === id) || null;
}

export async function updateCredentialCounter(env, id, newCounter) {
  const dbData = await getMainDb(env);
  const cred = dbData.creds.find(c => c.id === id);
  if (cred) {
    cred.counter = newCounter;
    await saveMainDb(env, dbData);
  }
}

export async function getValidInvite(env, code) {
  if (!code) return null;
  const dbData = await getMainDb(env);
  return dbData.invites.find(i => i.code === code && !i.usedBy && !i.revoked) || null;
}

export async function useInvite(env, code, userId, usedAt) {
  const dbData = await getMainDb(env);
  const invite = dbData.invites.find(i => i.code === code);
  if (invite) {
    invite.usedBy = userId;
    invite.usedAt = usedAt;
    await saveMainDb(env, dbData);
  }
}

export async function getAllInvites(env) {
  const dbData = await getMainDb(env);
  return dbData.invites.map(i => ({
    ...i,
    usedByName: i.usedBy ? (dbData.users.find(u => u.id === i.usedBy) || {}).name || null : null
  }));
}

export async function createInvite(env, invite) {
  const dbData = await getMainDb(env);
  dbData.invites.push(invite);
  await saveMainDb(env, dbData);
}

export async function revokeInvite(env, code) {
  const dbData = await getMainDb(env);
  const idx = dbData.invites.findIndex(i => i.code === code && !i.usedBy);
  if (idx !== -1) {
    dbData.invites.splice(idx, 1);
    await saveMainDb(env, dbData);
  }
}

export async function saveUserSubscription(env, userId, endpoint, keys) {
  const dbData = await getMainDb(env);
  dbData.subs = dbData.subs.filter(s => s.endpoint !== endpoint);
  dbData.subs.push({ userId, endpoint, keys, created: new Date().toISOString() });
  await saveMainDb(env, dbData);
}

export async function removeUserSubscription(env, userId, endpoint) {
  const dbData = await getMainDb(env);
  if (endpoint) {
    dbData.subs = dbData.subs.filter(s => !(s.userId === userId && s.endpoint === endpoint));
  } else {
    dbData.subs = dbData.subs.filter(s => s.userId !== userId);
  }
  await saveMainDb(env, dbData);
}

export async function getUserSubscriptions(env, userId) {
  const dbData = await getMainDb(env);
  return dbData.subs.filter(s => s.userId === userId);
}

export async function getUserState(env, userId) {
  const val = await env.OPENGYM_KV.get(`state:${userId}`);
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

export async function setUserState(env, userId, state) {
  await env.OPENGYM_KV.put(`state:${userId}`, JSON.stringify(state));
}

export async function putChallenge(env, data) {
  const cid = crypto.randomUUID().replace(/-/g, '');
  // Salva no KV com expiração automática de 5 minutos (300s)
  await env.OPENGYM_KV.put(`challenge:${cid}`, JSON.stringify(data), { expirationTtl: 300 });
  return cid;
}

export async function takeChallenge(env, cid) {
  if (!cid) return null;
  const val = await env.OPENGYM_KV.get(`challenge:${cid}`);
  await env.OPENGYM_KV.delete(`challenge:${cid}`);
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}
