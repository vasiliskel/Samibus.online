'use strict';

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'samibus_online',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

// Seed routes taken from the printed "SPECIAL SUNDAY ROUTES" flyer.
const SUNDAY_ROUTES = [
  ['Sami 1 (Police)', 'Karavomilos, Agia Paraskevi, Agia Efimia', '10.30 14.30 18.30 23.25'],
  ['Sami 1 (Police)', 'Antisamos', '11.30 15.15 19.15'],
  ['Sami 2 (Jecca)', 'Karavomilos, Agia Paraskevi, Agia Efimia', '14.20 18.25 23.20'],
  ['Sami 2 (Jecca)', 'Antisamos', '11.40 15.30 19.20'],
  ['Karavomilos', 'Agia Paraskevi, Agia Efimia', '10.40 14.35 18.35 23.30'],
  ['Karavomilos', 'Sami', '11.25 15.10 19.10 23.55'],
  ['Karavomilos', 'Antisamos', '11.25 15.10 19.10'],
  ['Agia Paraskevi', 'Agia Efimia', '10.50 14.40 18.40 23.35'],
  ['Agia Paraskevi', 'Karavomilos, Sami', '11.20 15.05 19.05 23.50'],
  ['Agia Paraskevi', 'Antisamos', '11.20 15.05 19.05'],
  ['Agia Efimia', 'Agia Paraskevi, Karavomilos, Sami', '11.15 15.00 19.00 23.45'],
  ['Agia Efimia', 'Antisamos', '11.15 15.00 19.00'],
  ['Antisamos', 'Sami, Karavomilos, Agia Paraskevi, Agia Efimia', '14.00 18.00 23.00'],
];

async function init() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin_user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(80) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS timetable_section (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(160) NOT NULL,
        subtitle VARCHAR(255) DEFAULT NULL,
        position INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS route (
        id INT AUTO_INCREMENT PRIMARY KEY,
        section_id INT NOT NULL,
        origin VARCHAR(160) NOT NULL,
        destinations VARCHAR(255) NOT NULL,
        times VARCHAR(255) NOT NULL,
        position INT NOT NULL DEFAULT 0,
        CONSTRAINT fk_route_section FOREIGN KEY (section_id)
          REFERENCES timetable_section(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ----- seed admin user -----
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'changeme';
    const [admins] = await conn.query('SELECT id FROM admin_user LIMIT 1');
    if (admins.length === 0) {
      const hash = bcrypt.hashSync(password, 10);
      await conn.query('INSERT INTO admin_user (username, password_hash) VALUES (?, ?)', [username, hash]);
      console.log(`[seed] created admin user "${username}"`);
      if (password === 'changeme') {
        console.warn('[seed] WARNING: default admin password in use. Set ADMIN_PASSWORD env var!');
      }
    }

    // ----- seed timetable data -----
    const [sections] = await conn.query('SELECT id FROM timetable_section LIMIT 1');
    if (sections.length === 0) {
      const [res] = await conn.query(
        'INSERT INTO timetable_section (title, subtitle, position) VALUES (?, ?, ?)',
        ['Special Sunday Routes', 'Antisamos beach party shuttle', 0]
      );
      const sectionId = res.insertId;
      let pos = 0;
      for (const [origin, destinations, times] of SUNDAY_ROUTES) {
        await conn.query(
          'INSERT INTO route (section_id, origin, destinations, times, position) VALUES (?, ?, ?, ?, ?)',
          [sectionId, origin, destinations, times, pos++]
        );
      }
      // empty placeholder for the daily schedule (admin fills it in)
      await conn.query(
        'INSERT INTO timetable_section (title, subtitle, position) VALUES (?, ?, ?)',
        ['Daily Routes', 'Coming soon', 1]
      );
      console.log(`[seed] inserted ${SUNDAY_ROUTES.length} Sunday routes`);
    }
  } finally {
    conn.release();
  }
}

module.exports = { pool, init };
