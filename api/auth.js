const { registerOrUpdateMachine, jsonResponse, parseBody } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    const r = jsonResponse({}, 200);
    res.writeHead(r.status, r.headers);
    res.end(r.body);
    return;
  }

  try {
    const data = await parseBody(req);
    const machineId = data.machine_id;
    const action = data.action;

    if (!machineId) {
      const r = jsonResponse({ error: 'machine_id is required' }, 400);
      res.writeHead(r.status, r.headers);
      res.end(r.body);
      return;
    }

    if (action === 'register' || action === 'check_status') {
      const machine = await registerOrUpdateMachine(machineId);
      if (!machine) {
        const r = jsonResponse({ error: 'Failed to register machine' }, 500);
        res.writeHead(r.status, r.headers);
        res.end(r.body);
        return;
      }
      const r = jsonResponse({
        success: true,
        locked: machine.locked,
        message: machine.message || ''
      });
      res.writeHead(r.status, r.headers);
      res.end(r.body);
      return;
    }

    const r = jsonResponse({ error: 'Invalid action' }, 400);
    res.writeHead(r.status, r.headers);
    res.end(r.body);
  } catch (err) {
    console.error('Auth error:', err);
    const r = jsonResponse({ error: err.message }, 500);
    res.writeHead(r.status, r.headers);
    res.end(r.body);
  }
};
