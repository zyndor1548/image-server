const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { createUser, GetNewToken, verifyToken, log } = require('./database');

const app = express();
const PORT = 3000;
const uploadFolder = 'image';
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(express.json());

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { token } = req.body;

    const tokenResult = await verifyToken(token);
    if (tokenResult.status !== "success") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const username = tokenResult.username;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let format = req.body.format || req.query.format || null;
    const originalExt = path.extname(req.file.originalname).slice(1).toLowerCase();

    if (format) {
      format = format.toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(format)) {
        format = originalExt;
      }
      if (format === 'jpeg') format = 'jpg';
    } else {
      format = originalExt || 'jpg';
    }

    const files = fs.readdirSync(uploadFolder).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    const numbers = files.map(f => parseInt(path.basename(f, path.extname(f)))).filter(n => !isNaN(n));
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

    const filename = `${nextNumber}.${format}`;
    const filePath = path.join(uploadFolder, filename);

    const image = sharp(req.file.buffer);

    if (format === 'png') {
      await image.png().toFile(filePath);
    } else if (format === 'webp') {
      await image.webp({ quality: 90 }).toFile(filePath);
    } else {
      await image.jpeg({ quality: 90 }).toFile(filePath);
    }

    console.log(`uploaded ${filename}`);

    const logDetails = JSON.stringify({
      username,
      savedfilename: filename,
      posted_filename: req.file.originalname,
      ip: req.ip,
      useragent: req.headers['user-agent'],
      referer: req.headers['referer'] || 'unknown'
    });

    try {
      log(logDetails);
    } catch (error) {
      console.error('Error logging upload activity:', error);
    }

    res.json({ filename });
  } catch (error) {
    console.error('Error in /upload:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/get_token', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await GetNewToken(username, password);

    if (result.status === "success") {
      res.json({ token: result.token });
    } else {
      res.status(401).json({ error: result.reason });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/create_user', async (req, res) => {
  try {
    const { admin_password, username, password } = req.body;
    const result = await createUser(admin_password, username, password);

    if (result.status === "success") {
      res.json({ message: "User created successfully" });
    } else {
      res.status(400).json({ error: result.reason });
    }
  } catch (error) {
    console.error('Error in /create_user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's images
app.get('/api/user-images', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const tokenResult = await verifyToken(token);
    if (tokenResult.status !== "success") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const username = tokenResult.username;
  
    const images = [];
    
    for (let i = 1; i <= 100; i++) {
      const extensions = ['jpg', 'png', 'webp'];
      
      for (const ext of extensions) {
        const filename = `${i}.${ext}`;
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
      images: images,
      count: images.length,
      username: username
    });
    
  } catch (error) {
    console.error('Error in /api/user-images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use(express.static('public'));

app.use('/images', express.static(uploadFolder));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
