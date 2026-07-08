const crypto = require('crypto');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'my-secret-key-2024';
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

async function redisCall(...args) {
  if (!KV_URL || !KV_TOKEN) {
    console.error('KV URL or Token not configured');
    return null;
  }
  try {
    const res = await fetch(KV_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    });
    if (!res.ok) {
      console.error('Redis call failed:', res.status, res.statusText);
      return null;
    }
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('Redis call error:', e.message);
    return null;
  }
}

async function getMachinesData() {
  try {
    const data = await redisCall('GET', 'machines');
    if (data && typeof data === 'string') {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return { machines: parsed };
      }
    }
  } catch (e) {
    console.error('Failed to get machines from KV:', e.message);
  }
  return { machines: [] };
}

async function saveMachinesData(data) {
  try {
    await redisCall('SET', 'machines', JSON.stringify(data.machines || []));
    return true;
  } catch (e) {
    console.error('Failed to save machines to KV:', e.message);
    return false;
  }
}

async function registerOrUpdateMachine(machineId, updates = {}) {
  const machinesData = await getMachinesData();
  const machines = machinesData.machines || [];
  const now = new Date().toISOString();

  let machine = machines.find(m => m.machine_id === machineId);

  if (machine) {
    machine.last_seen = now;
    Object.assign(machine, updates);
  } else {
    machine = {
      machine_id: machineId,
      locked: false,
      message: '',
      registered_at: now,
      last_seen: now,
      ...updates
    };
    machines.push(machine);
  }

  const saved = await saveMachinesData({ machines });
  return saved ? machine : null;
}

async function toggleMachineLock(machineId, message = null) {
  const machinesData = await getMachinesData();
  const machines = machinesData.machines || [];

  const machine = machines.find(m => m.machine_id === machineId);
  if (!machine) return null;

  machine.locked = !machine.locked;
  if (message !== null) {
    machine.message = message;
  }

  const saved = await saveMachinesData({ machines });
  return saved ? machine : null;
}

function generatePassword(machineId) {
  const hmac = crypto.createHmac('sha256', ADMIN_SECRET);
  hmac.update(machineId);
  return hmac.digest('hex').substring(0, 8).toUpperCase();
}

function jsonResponse(data, statusCode = 200) {
  return {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: JSON.stringify(data)
  };
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function isOnline(machine) {
  if (!machine.last_seen) return false;
  const lastSeen = new Date(machine.last_seen);
  const now = new Date();
  const diffMinutes = (now - lastSeen) / (1000 * 60);
  return diffMinutes < 5;
}

module.exports = {
  getMachinesData,
  saveMachinesData,
  registerOrUpdateMachine,
  toggleMachineLock,
  generatePassword,
  jsonResponse,
  parseBody,
  isOnline
};
