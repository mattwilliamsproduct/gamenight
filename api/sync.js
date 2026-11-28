const { timingSafeEqual } = require('crypto');

const BACKUP_KEY = 'gamenight:backup:v1';

function redisEnv() {
  return {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
  };
}

function passwordOk(req) {
  const expected = String(process.env.GN_SYNC_PASSWORD || '');
  const given = String(req.headers['x-porch-key'] || '');
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function looksLikeBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  return Array.isArray(data.history)
    || Array.isArray(data.allPlayers)
    || Array.isArray(data.players)
    || (data.playerProfiles && typeof data.playerProfiles === 'object');
}

async function redisCommand(command) {
  const { url, token } = redisEnv();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'redis-failed');
  }
  return response.json();
}

function parseStored(result) {
  if (result === null) {
    return { empty: true, corrupt: false, backup: null };
  }
  if (result === undefined) {
    return { empty: false, corrupt: true, backup: null };
  }
  if (typeof result === 'object') {
    if (!looksLikeBackup(result)) return { empty: false, corrupt: true, backup: null };
    return { empty: false, corrupt: false, backup: result };
  }
  if (typeof result !== 'string') {
    return { empty: false, corrupt: true, backup: null };
  }
  try {
    const parsed = JSON.parse(result);
    if (!looksLikeBackup(parsed)) return { empty: false, corrupt: true, backup: null };
    return { empty: false, corrupt: false, backup: parsed };
  } catch (error) {
    return { empty: false, corrupt: true, backup: null };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  // Previews share this project's env, so only production may reach Porch Cloud.
  if (process.env.VERCEL_ENV !== 'production') {
    return res.status(503).json({ ok: false, error: 'not-production' });
  }
  const { url, token } = redisEnv();
  if (!process.env.GN_SYNC_PASSWORD || !url || !token) {
    return res.status(503).json({ ok: false, error: 'not-configured' });
  }
  if (!passwordOk(req)) {
    return res.status(401).json({ ok: false, error: 'bad-key' });
  }

  try {
    if (req.method === 'GET' || req.method === 'POST') {
      const stored = await redisCommand(['GET', BACKUP_KEY]);
      if (!stored || typeof stored !== 'object' || Array.isArray(stored) || !Object.prototype.hasOwnProperty.call(stored, 'result')) {
        return res.status(502).json({ ok: false, error: 'store-failed' });
      }
      const parsed = parseStored(stored.result);
      if (parsed.corrupt) {
        return res.status(500).json({ ok: false, error: 'corrupt-backup' });
      }
      return res.status(200).json({
        ok: true,
        backup: parsed.backup
      });
    }

    if (req.method === 'PUT') {
      const backup = req.body;
      if (!looksLikeBackup(backup)) {
        return res.status(400).json({ ok: false, error: 'invalid-backup' });
      }
      const savedAt = new Date().toISOString();
      const payload = Object.assign({}, backup, { savedAt });
      await redisCommand(['SET', BACKUP_KEY, JSON.stringify(payload)]);
      return res.status(200).json({ ok: true, savedAt });
    }
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'store-failed' });
  }

  res.setHeader('Allow', 'GET, POST, PUT');
  return res.status(405).json({ ok: false, error: 'method' });
};
