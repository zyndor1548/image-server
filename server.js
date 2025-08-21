const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const app = express();
const PORT = 3000;
const uploadFolder = 'image';
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let format = req.body.format || req.query.format || null;
  const originalExt = path.extname(req.file.originalname).slice(1).toLowerCase();

  if (format) {
    format = format.toLowerCase();
    if (!['jpg', 'jpeg', 'png','webp'].includes(format)) {
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
  res.json({ filename });
});



app.use('/images', express.static(uploadFolder));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
