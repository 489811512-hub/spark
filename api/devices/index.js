const { getMachinesData, jsonResponse } = require('../_utils');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    const r = jsonResponse({}, 200);
    res.writeHead(r.status, r.headers);
    res.end(r.body);
    return;
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const page = parseInt(url.searchParams.get('page')) || 1;
    const pageSize = parseInt(url.searchParams.get('pageSize')) || 20;
    const keyword = url.searchParams.get('keyword') || '';
    const status = url.searchParams.get('status') || '';

    const machinesData = await getMachinesData();
    let filtered = machinesData.machines || [];

    if (keyword) {
      filtered = filtered.filter(m =>
        m.machine_id.toLowerCase().includes(keyword.toLowerCase())
      );
    }

    if (status === 'locked') {
      filtered = filtered.filter(m => m.locked);
    } else if (status === 'unlocked') {
      filtered = filtered.filter(m => !m.locked);
    }

    filtered.sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen));

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize);

    const r = jsonResponse({ total, list });
    res.writeHead(r.status, r.headers);
    res.end(r.body);
  } catch (err) {
    console.error('Devices error:', err);
    const r = jsonResponse({ error: err.message }, 500);
    res.writeHead(r.status, r.headers);
    res.end(r.body);
  }
};
