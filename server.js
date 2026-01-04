const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { createUser, GetNewToken, verifyToken, log, Getids, IncrementImageId, GetUserToken, verifyCredentials } = require('./database');

const app = express();
const PORT = 3000;
const uploadFolder = 'image';
const fallbackFilename = `0.png`; // this is the image which is shown when the requested image is not present
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(express.json());

app.post('/upload', upload.single('image'), async (req, res) => {
	try {
		const { token } = req.body;

		if (!token) {
			return res.status(400).json({
				success: false,
				error: 'Token is required'
			});
		}

		const tokenResult = await verifyToken(token);
		if (tokenResult.status !== "success") {
			return res.status(401).json({
				success: false,
				error: 'Invalid or expired token'
			});
		}

		const username = tokenResult.username;

		if (!req.file) {
			return res.status(400).json({
				success: false,
				error: 'No file uploaded'
			});
		}

		const data = await Getids(username);
		if (data.status === "fail") {
			return res.status(401).json({
				success: false,
				error: data.reason
			});
		}

		const userid = data.id;
		const format = req.body.format || 'jpg';
		const filename = `${userid}_${data.image_id}.${format}`;
		const filePath = path.join(uploadFolder, filename);

		const image = sharp(req.file.buffer);

		if (format === 'png') {
			await image.png().toFile(filePath);
		} else if (format === 'webp') {
			await image.webp({ quality: 90 }).toFile(filePath);
		} else {
			await image.jpeg({ quality: 90 }).toFile(filePath);
		}

		const logDetails = JSON.stringify({
			username,
			savedfilename: filename,
			posted_filename: req.file.originalname,
			ip: req.ip,
			useragent: req.headers['user-agent'],
			referer: req.headers['referer'] || 'unknown'
		});

		log(logDetails);
		IncrementImageId(userid);

		res.json({
			success: true,
			data: {
				filename: `${userid}_${data.image_id}`
			}
		});
	} catch (error) {
		console.error('Upload error:', error);
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		});
	}
});
app.post('/reset_token', async (req, res) => {
	try {
		const { username, password } = req.body;
		const result = await GetNewToken(username, password);

		if (result.status === "success") {
			res.json({
				success: true,
				data: { token: result.token }
			});
		} else {
			res.status(401).json({
				success: false,
				error: result.reason
			});
		}
	} catch (error) {
		console.error('Reset token error:', error);
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		});
	}
});
app.post('/get_token', async (req, res) => {
	try {
		const { username, password } = req.body;

		if (!username || !password) {
			return res.status(400).json({
				success: false,
				error: 'Username and password required'
			});
		}

		const result = await verifyCredentials(username, password);

		if (result.status === "success") {
			res.json({
				success: true,
				data: { token: result.token }
			});
		} else {
			res.status(401).json({
				success: false,
				error: result.reason
			});
		}
	} catch (error) {
		console.error('Get token error:', error);
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		});
	}
});
app.post('/create_user', async (req, res) => {
	try {
		const { admin_password, username, password } = req.body;
		const result = await createUser(admin_password, username, password);

		if (result.status === "success") {
			res.json({
				success: true,
				data: {
					message: 'User created successfully',
					username: username,
					token: result.token
				}
			});
		} else {
			res.status(400).json({
				success: false,
				error: result.reason
			});
		}
	} catch (error) {
		console.error('Create user error:', error);
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		});
	}
});
app.delete('/delete_image', async (req, res) => {
	try {
		const { token, filename } = req.body;

		if (!token) {
			return res.status(401).json({
				success: false,
				error: 'Token required'
			});
		}

		if (!filename) {
			return res.status(400).json({
				success: false,
				error: 'Filename required'
			});
		}

		const tokenResult = await verifyToken(token);
		if (tokenResult.status !== "success") {
			return res.status(401).json({
				success: false,
				error: 'Invalid or expired token'
			});
		}

		const username = tokenResult.username;
		const data = await Getids(username);
		if (data.status === "fail") {
			return res.status(401).json({
				success: false,
				error: data.reason
			});
		}
		const userid = data.id;

		if (!filename.startsWith(userid.toString())) {
			return res.status(403).json({
				success: false,
				error: 'You can only delete your own images'
			});
		}


		let actualFilename = filename;
		let filePath = path.join(uploadFolder, filename);

		if (!fs.existsSync(filePath)) {
			const extensions = ['jpg', 'png', 'webp'];
			let found = false;

			for (const ext of extensions) {
				const testFilename = `${filename}.${ext}`;
				const testPath = path.join(uploadFolder, testFilename);

				if (fs.existsSync(testPath)) {
					actualFilename = testFilename;
					filePath = testPath;
					found = true;
					break;
				}
			}

			if (!found) {
				return res.status(404).json({
					success: false,
					error: 'Image not found'
				});
			}
		}

		fs.unlinkSync(filePath);

		res.json({
			success: true,
			data: {
				message: 'Image deleted successfully'
			}
		});

	} catch (error) {
		console.error('Delete image error:', error);
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		});
	}
});
app.get('/image/:filename', (req, res) => {
	const baseFilename = req.params.filename;
	const extensions = ['jpg', 'png', 'webp'];

	for (const ext of extensions) {
		const filename = `${baseFilename}.${ext}`;
		const filePath = path.join(uploadFolder, filename);

		if (fs.existsSync(filePath)) {
			return res.sendFile(path.resolve(filePath));
		}
	}
	const fallbackPath = path.join(uploadFolder, fallbackFilename);
	if (fs.existsSync(fallbackPath)) {
		return res.status(404).sendFile(path.resolve(fallbackPath));
	}
	res.status(404).json({
		success: false,
		error: 'Image not found and no fallback available'
	});
});
app.post('/api/login', async (req, res) => {
	try {
		const { username, password } = req.body;

		if (!username || !password) {
			return res.status(400).json({
				success: false,
				error: 'Username and password required'
			});
		}

		const result = await verifyCredentials(username, password);

		if (result.status === "success") {
			res.json({
				success: true,
				data: {
					username: result.username,
					token: result.token
				}
			});
		} else {
			res.status(401).json({
				success: false,
				error: result.reason
			});
		}
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		});
	}
});
app.get('/api/user-images', async (req, res) => {
	try {
		const { token } = req.query;

		if (!token) {
			return res.status(401).json({
				success: false,
				error: 'Token required'
			});
		}

		const tokenResult = await verifyToken(token);
		if (tokenResult.status !== "success") {
			return res.status(401).json({
				success: false,
				error: 'Invalid or expired token'
			});
		}

		const username = tokenResult.username;
		const data = await Getids(username);
		if (data.status === "fail") {
			return res.status(401).json({
				success: false,
				error: data.reason
			});
		}
		const userid = data.id;
		const image_max = data.image_id;
		const images = [];

		for (let i = 1; i <= image_max; i++) {
			const extensions = ['jpg', 'png', 'webp'];

			for (const ext of extensions) {
				const filename = `${userid}_${i}.${ext}`;
				const filePath = path.join(uploadFolder, filename);

				if (fs.existsSync(filePath)) {
					const stats = fs.statSync(filePath);
					images.push({
						id: i,
						filename: filename,
						url: `/images/${filename}`,
						size: stats.size,
						uploadDate: stats.mtime,
						extension: ext
					});
					break;
				}
			}
		}

		images.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

		res.json({
			success: true,
			data: {
				images: images,
				count: images.length,
				username: username
			}
		});

	} catch (error) {
		console.error('User images error:', error);
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		});
	}
});
app.use(express.static('public'));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
