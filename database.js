require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { promisify } = require('util');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.getAsync = promisify(db.get).bind(db);
db.runAsync = promisify(db.run).bind(db);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            token TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            savedfilename TEXT NOT NULL,
            posted_filename TEXT NOT NULL,
            ip TEXT NOT NULL,
            useragent TEXT NOT NULL,
            referer TEXT NOT NULL
        )
    `);
});

async function createUser(admin_password, username, password) {
    if (process.env.ADMIN_PASSWORD !== admin_password) {
        return {
            status: "fail",
            reason: "admin password wrong"
        };
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
        stmt.run([username, hashedPassword], function (err) {
            if (err) {
                console.error('Database error:', err);
            } else {
                console.log(`New user created with username: ${username}`);
            }
        });
        stmt.finalize();

        return {
            status: "success"
        };
    } catch (err) {
        console.error('Error in createUser:', err);
        return {
            status: "fail",
            reason: "internal error"
        };
    }
}

async function GetNewToken(username, password) {
    try {
        const row = await db.getAsync(
            `SELECT * FROM users WHERE username = ?`,
            [username]
        );

        if (!row) {
            return {
                status: "fail",
                reason: "username not found"
            };
        }

        const isPasswordMatch = await bcrypt.compare(password, row.password);
        if (!isPasswordMatch) {
            return {
                status: "fail",
                reason: "password incorrect"
            };
        }

        const apiKey = crypto.randomBytes(32).toString('hex');
        const userId = row.id;

        await db.runAsync(
            `UPDATE users SET token = ? WHERE id = ?`,
            [apiKey, userId]
        );

        console.log(`Token generated for ${username}`);

        return {
            status: "success",
            token: apiKey
        };

    } catch (err) {
        console.error('Database error in GetNewToken:', err);
        throw err;
    }
}

async function verifyToken(token) {
    try {
        const row = await db.getAsync(
            `SELECT * FROM users WHERE token = ?`,
            [token]
        );

        if (!row) {
            return {
                status: "fail",
                reason: "token not found"
            };
        }

        return {
            status: "success",
            username: row.username
        };
    } catch (err) {
        console.error('Database error in verifyToken:', err);
        throw err;
    }
}

function log(logdetails) {
    try {
        const data = JSON.parse(logdetails);
        const stmt = db.prepare("INSERT INTO log (username, savedfilename, posted_filename, ip, useragent, referer) VALUES (?, ?, ?, ?, ?, ?)");
        stmt.run([data.username, data.savedfilename, data.posted_filename, data.ip, data.useragent, data.referer], function (err) {
            if (err) {
                console.error('Database error:', err);
            }
        });
        stmt.finalize();
    } catch (err) {
        console.error('Error in log function:', err);
        throw err;
    }
}

module.exports = {
    createUser,
    GetNewToken,
    verifyToken,
    log
};