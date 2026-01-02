require('dotenv').config({ quiet: true });
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { promisify } = require('util');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
	if (err) {
		console.error('Error opening database:', err);
		process.exit(1);
	}
});

db.getAsync = promisify(db.get).bind(db);
db.runAsync = promisify(db.run).bind(db);

db.serialize(() => {
	db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            token TEXT,
			image_id INTEGER NOT NULL DEFAULT 1
        )
    `, (err) => {
		if (err) {
			console.error('Error creating users table:', err);
		}
	});

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
    `, (err) => {
		if (err) {
			console.error('Error creating log table:', err);
		}
	});
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

		const apiKey = crypto.randomBytes(32).toString('hex');

		const stmt = db.prepare("INSERT INTO users (username, password, token) VALUES (?, ?, ?)");
		stmt.run([username, hashedPassword, apiKey], function (err) {
			if (err) {
				console.error('Database error:', err);
			} else {
				console.log(`New user created with username: ${username}`);
			}
		});
		stmt.finalize();

		return {
			status: "success",
			token: apiKey
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
async function Getids(username) {
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
		return {
			status: "success",
			id: row.id,
			image_id: row.image_id
		};
	} catch (err) {
		console.error('Error getting user id:', err);
		throw err;
	}
}
function IncrementImageId(id) {
	try {
		const stmt = db.prepare("UPDATE users SET image_id = image_id + 1 WHERE id = ?");
		stmt.run(id, function (err) {
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

async function GetUserToken(username) {
	try {
		const row = await db.getAsync(
			`SELECT token FROM users WHERE username = ?`,
			[username]
		);

		if (!row) {
			return {
				status: "fail",
				reason: "username not found"
			};
		}

		return {
			status: "success",
			token: row.token || null
		};
	} catch (err) {
		console.error('Error getting user token:', err);
		throw err;
	}
}

async function verifyCredentials(username, password) {
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

		return {
			status: "success",
			username: row.username,
			token: row.token || null
		};

	} catch (err) {
		console.error('Error verifying credentials:', err);
		throw err;
	}
}

module.exports = {
	createUser,
	GetNewToken,
	verifyToken,
	log,
	Getids,
	IncrementImageId,
	GetUserToken,
	verifyCredentials
};