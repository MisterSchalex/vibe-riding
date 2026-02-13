import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  getLockStatus, acquireLock, releaseLock,
  createWorld, getWorldChain, getWorld, getWorldByPosition, getWorldCount
} from './db.js';
import { generateWorldParams } from './world-generator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4180;

app.use(express.json());

// Static files (index.html, main.js, styles.css, etc.)
app.use(express.static(__dirname, {
  index: 'index.html',
  extensions: ['html']
}));

// --- API Routes ---

// Get lock status
app.get('/api/lock', (req, res) => {
  const status = getLockStatus();
  res.json(status);
});

// Acquire lock (first come first served — ES KANN NUR EINEN GEBEN)
app.post('/api/lock/acquire', (req, res) => {
  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  const success = acquireLock(session_id);
  if (!success) {
    const status = getLockStatus();
    return res.status(423).json({
      error: 'ES KANN NUR EINEN GEBEN! Someone else is creating.',
      locked_by: status.locked_by,
      locked_at: status.locked_at
    });
  }
  res.json({ locked: true, session_id });
});

// Release lock (safety endpoint)
app.post('/api/lock/release', (req, res) => {
  const { session_id } = req.body;
  const status = getLockStatus();
  if (status.locked_by === session_id) {
    releaseLock();
    return res.json({ released: true });
  }
  res.status(403).json({ error: 'Not your lock' });
});

// Create a world from prompt
app.post('/api/worlds', (req, res) => {
  const { prompt, session_id } = req.body;
  if (!prompt || !session_id) {
    return res.status(400).json({ error: 'prompt and session_id required' });
  }
  if (prompt.length > 500) {
    return res.status(400).json({ error: 'Prompt too long (max 500 chars)' });
  }

  // Verify this session holds the lock
  const lockStatus = getLockStatus();
  if (!lockStatus.is_locked || lockStatus.locked_by !== session_id) {
    return res.status(403).json({
      error: 'You do not hold the creation lock. Acquire it first.'
    });
  }

  // Generate world params from prompt
  const params = generateWorldParams(prompt);

  // Store in DB
  const world = createWorld(prompt, session_id, params);

  // Release lock after creation
  releaseLock();

  res.json({
    created: true,
    world
  });
});

// Get the full world chain
app.get('/api/worlds', (req, res) => {
  const chain = getWorldChain();
  res.json({ chain, total: chain.length });
});

// Get world count
app.get('/api/worlds/count', (req, res) => {
  res.json({ count: getWorldCount() });
});

// Get world by ID
app.get('/api/worlds/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const world = getWorld(id);
  if (!world) return res.status(404).json({ error: 'World not found' });
  res.json(world);
});

// Get world by chain position
app.get('/api/worlds/position/:pos', (req, res) => {
  const pos = parseInt(req.params.pos);
  if (isNaN(pos)) return res.status(400).json({ error: 'Invalid position' });
  const world = getWorldByPosition(pos);
  if (!world) return res.status(404).json({ error: 'No world at that position' });
  res.json(world);
});

app.listen(PORT, () => {
  console.log(`\n  VIBE RIDING — World Chain Server`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log(`  Worlds in chain: ${getWorldCount()}`);
  console.log(`  Lock status: ${getLockStatus().is_locked ? 'LOCKED' : 'OPEN'}\n`);
});
