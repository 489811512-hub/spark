const { toggleMachineLock, jsonResponse, parseBody } = require('../../_utils');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    const r = jsonResponse({}, 200);
    res.writeHead(r.status, r.headers);
    res.end(r.body);
    return;
  }

  try {
    const machineId = req.query.id;
    if (!machineId) {
      const r = jsonResponse({ error: 'Machine ID not found' }, 400);
      res.writeHead(r.status, r.headers);
      res.end(r.body);
      return;
    }

    const data = await parseBody(req);
    const message = data.message !== undefined ? data.message : null;
    const machine = await toggleMachineLock(machineId, message);

    if (!machine) {
      const r = jsonResponse({ error: 'Machine not found or update failed' }, 404);
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
  } catch (err) {
    console.error('Toggle lock error:', err);
    const r = jsonResponse({ error: err.message }, 500);
    res.writeHead(r.status, r.headers);
    res.end(r.body);
  }
};
