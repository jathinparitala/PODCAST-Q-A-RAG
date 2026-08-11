/**
 * Database abstraction helper wrapping sql.js methods.
 * Provides clean synchronous methods: get, all, run, exec.
 */

const { getDb, saveDb } = require('./init');

const dbHelper = {
  exec(sql) {
    const db = getDb();
    db.run(sql);
    saveDb();
  },

  get(sql, params = []) {
    const db = getDb();
    const stmt = db.prepare(sql);
    try {
      const p = Array.isArray(params) ? params : [params];
      stmt.bind(p);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return null;
    } catch (err) {
      stmt.free();
      throw err;
    }
  },

  all(sql, params = []) {
    const db = getDb();
    const stmt = db.prepare(sql);
    const results = [];
    try {
      const p = Array.isArray(params) ? params : [params];
      stmt.bind(p);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (err) {
      stmt.free();
      throw err;
    }
  },

  run(sql, params = []) {
    const db = getDb();
    const p = Array.isArray(params) ? params : [params];
    db.run(sql, p);
    saveDb();
    return { changes: db.getRowsModified() };
  }
};

module.exports = dbHelper;
