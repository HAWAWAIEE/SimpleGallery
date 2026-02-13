import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createReadStream, existsSync, mkdirSync } from 'fs';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(process.cwd(), 'data', 'selections');
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.tif', '.ico', '.heic', '.heif', '.avif',
]);

function isImageFile(filename) {
  return IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

function sanitizePath(inputPath) {
  const resolved = path.resolve(inputPath);
  return resolved;
}

function selectionFilePath(folderPath) {
  const encoded = Buffer.from(folderPath).toString('base64url');
  return path.join(DATA_DIR, `${encoded}.json`);
}

// Get home directory
app.get('/api/home', (req, res) => {
  res.json({ home: os.homedir() });
});

// List folder contents
app.get('/api/folders', async (req, res) => {
  try {
    const folderPath = sanitizePath(req.query.path || os.homedir());

    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const folders = [];
    const images = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(folderPath, entry.name);

      if (entry.isDirectory()) {
        // Try to find a thumbnail image in the folder
        let thumbnail = null;
        try {
          const subEntries = await fs.readdir(fullPath);
          const firstImage = subEntries.find((f) => isImageFile(f));
          if (firstImage) {
            thumbnail = path.join(fullPath, firstImage);
          }
        } catch {
          // Permission denied or other error
        }

        folders.push({
          name: entry.name,
          path: fullPath,
          thumbnail,
        });
      } else if (isImageFile(entry.name)) {
        const stats = await fs.stat(fullPath);
        images.push({
          name: entry.name,
          path: fullPath,
          size: stats.size,
          modified: stats.mtime,
        });
      }
    }

    folders.sort((a, b) => a.name.localeCompare(b.name));
    images.sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      currentPath: folderPath,
      parentPath: path.dirname(folderPath),
      folders,
      images,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve image file
app.get('/api/image', (req, res) => {
  try {
    const imagePath = sanitizePath(req.query.path);

    if (!existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    if (!isImageFile(imagePath)) {
      return res.status(400).json({ error: 'Not an image file' });
    }

    const ext = path.extname(imagePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
      '.ico': 'image/x-icon',
      '.heic': 'image/heic',
      '.heif': 'image/heif',
      '.avif': 'image/avif',
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    createReadStream(imagePath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve thumbnail (resized image)
app.get('/api/thumbnail', async (req, res) => {
  try {
    const imagePath = sanitizePath(req.query.path);
    const size = parseInt(req.query.size) || 300;

    if (!existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    if (!isImageFile(imagePath)) {
      return res.status(400).json({ error: 'Not an image file' });
    }

    // Try to use sharp for thumbnails, fallback to serving original
    try {
      const sharp = (await import('sharp')).default;
      const thumbnail = await sharp(imagePath)
        .resize(size, size, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 80 })
        .toBuffer();

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(thumbnail);
    } catch {
      // Fallback: serve original image
      const ext = path.extname(imagePath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
      };
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      createReadStream(imagePath).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get selections for a folder
app.get('/api/selections', async (req, res) => {
  try {
    const folderPath = sanitizePath(req.query.path);
    const filePath = selectionFilePath(folderPath);

    if (existsSync(filePath)) {
      const data = await fs.readFile(filePath, 'utf-8');
      res.json(JSON.parse(data));
    } else {
      res.json({ folderPath, selectedImages: [] });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save selections for a folder
app.post('/api/selections', async (req, res) => {
  try {
    const { folderPath, selectedImages } = req.body;
    const sanitized = sanitizePath(folderPath);
    const filePath = selectionFilePath(sanitized);

    const data = {
      folderPath: sanitized,
      selectedImages,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Gallery server running on http://localhost:${PORT}`);
});
