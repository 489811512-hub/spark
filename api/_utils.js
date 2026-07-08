const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'my-secret-key-2024';

let redisClient = null;

function getRedis() {
  if (redisClient) return redisClient;
  try {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      console.error('Redis URL or Token not configured');
      return null;
    }
    redisClient = new Redis({ url, token });
  } catch (e) {
    console.error('Failed to create Redis client:', e.message);
    redisClient = null;
  }
  return redisClient;
}

async function getMachinesData() {
  const redis = getRedis();
  if (!redis) return { machines: [] };
  try {
    const data = await redis.get('machines');
    if (data && Array.isArray(data)) {
      return { machines: data };
    }
  } catch (e) {
    console.error('Failed to get machines from Redis:', e.message);
  }
  return { machines: [] };
}

async function saveMachinesData(data) {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.set('machines', data.machines || []);
    return true;
  } catch (e) {
    console.error('Failed to save machines to Redis:', e.message);
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
