'use strict';

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const { pool, init } = require('./db');
const { sign, requireAuth } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

const api = express.Router();

// ---------------------------------------------------------------- health
api.get('/health', (req, res) => res.json({ ok: true }));

// ---------------------------------------------------------------- auth
api.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  const [rows] = await pool.query('SELECT * FROM admin_user WHERE username = ? LIMIT 1', [username]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ token: sign(user), username: user.username });
});

// --------------------------------------------------- public timetables
// Returns all sections with their nested routes, ordered.
api.get('/timetables', async (req, res) => {
  const [sections] = await pool.query('SELECT id, title, subtitle, position FROM timetable_section ORDER BY position, id');
  const [routes] = await pool.query('SELECT id, section_id, origin, destinations, times, position FROM route ORDER BY position, id');
  const bySection = {};
  for (const s of sections) bySection[s.id] = { ...s, routes: [] };
  for (const r of routes) {
    if (bySection[r.section_id]) bySection[r.section_id].routes.push(r);
  }
  res.json(Object.values(bySection));
});

// ------------------------------------------ admin: sections CRUD
api.post('/admin/sections', requireAuth, async (req, res) => {
  const { title, subtitle = null, position = 0 } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title required' });
  const [r] = await pool.query(
    'INSERT INTO timetable_section (title, subtitle, position) VALUES (?, ?, ?)',
    [title, subtitle, position]
  );
  res.status(201).json({ id: r.insertId, title, subtitle, position, routes: [] });
});

api.put('/admin/sections/:id', requireAuth, async (req, res) => {
  const { title, subtitle = null, position = 0 } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title required' });
  await pool.query(
    'UPDATE timetable_section SET title = ?, subtitle = ?, position = ? WHERE id = ?',
    [title, subtitle, position, req.params.id]
  );
  res.json({ id: Number(req.params.id), title, subtitle, position });
});

api.delete('/admin/sections/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM timetable_section WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

// ------------------------------------------ admin: routes CRUD
api.post('/admin/routes', requireAuth, async (req, res) => {
  const { section_id, origin, destinations, times, position = 0 } = req.body || {};
  if (!section_id || !origin || !destinations || !times) {
    return res.status(400).json({ error: 'section_id, origin, destinations, times required' });
  }
  const [r] = await pool.query(
    'INSERT INTO route (section_id, origin, destinations, times, position) VALUES (?, ?, ?, ?, ?)',
    [section_id, origin, destinations, times, position]
  );
  res.status(201).json({ id: r.insertId, section_id, origin, destinations, times, position });
});

api.put('/admin/routes/:id', requireAuth, async (req, res) => {
  const { origin, destinations, times, position = 0 } = req.body || {};
  if (!origin || !destinations || !times) {
    return res.status(400).json({ error: 'origin, destinations, times required' });
  }
  await pool.query(
    'UPDATE route SET origin = ?, destinations = ?, times = ?, position = ? WHERE id = ?',
    [origin, destinations, times, position, req.params.id]
  );
  res.json({ id: Number(req.params.id), origin, destinations, times, position });
});

api.delete('/admin/routes/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM route WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

app.use('/api', api);

// centralised error handler (avoids leaking stack traces)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT || 3000);

init()
  .then(() => {
    app.listen(PORT, () => console.log(`samibus backend listening on :${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialise database', err);
    process.exit(1);
  });
