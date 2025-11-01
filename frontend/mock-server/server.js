import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const MOCKS = path.join(__dirname, '..', 'mocks');

// helpers
const sendJson = (res, file) => {
  const p = path.join(MOCKS, file);
  const data = fs.readFileSync(p, 'utf8');
  res.setHeader('Content-Type','application/json');
  res.send(data);
};

const streamNDJSON = (res, file, interval=800) => {
  const p = path.join(MOCKS, file);
  const raw = fs.readFileSync(p, 'utf8').trim();
  const lines = raw.split(/\n\n+/);
  let i = 0;
  const timer = setInterval(() => {
    if (i >= lines.length) {
      clearInterval(timer);
      return;
    }
    res.write(lines[i] + '\n\n');
    i++;
  }, interval);
  req.on('close', () => clearInterval(timer));
};

// REST endpoints
app.get('/api/creators', (req,res)=> sendJson(res,'creators.json'));
app.get('/api/integrations/metricool/brands', (req,res)=> sendJson(res,'metricool-brands.json'));
app.post('/api/story/upload', (req,res)=> sendJson(res,'upload-response.json'));
app.get('/api/story/preset/:presetId', (req,res)=> sendJson(res,'preset.json'));
app.post('/api/story/apply-preset', (req,res)=> sendJson(res,'prepare-response.json'));
app.post('/api/story/manual/preview', (req,res)=> res.json({ previewUrl: 'https://cdn.example/preview.mp4' }));
app.post('/api/story/manual/process', (req,res)=> sendJson(res,'prepare-response.json'));
app.get('/api/storyclips/:jobId/list', (req,res)=> sendJson(res,'clips-list.json'));
app.post('/api/storyclips/publish', (req,res)=> sendJson(res,'publish-start.json'));
// Serve uploaded videos - proxy to a sample video with CORS headers
app.get('/api/uploads/:uploadId.mp4', async (req,res)=> {
  try {
    // Set CORS headers to allow any origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    
    // Proxy the video from the external source
    const videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    const response = await fetch(videoUrl, {
      headers: req.headers.range ? { 'Range': req.headers.range } : {}
    });
    
    // Copy status and relevant headers
    res.status(response.status);
    const headersToProxy = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    headersToProxy.forEach(header => {
      const value = response.headers.get(header);
      if (value) res.setHeader(header, value);
    });
    
    // Stream the response
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Error proxying video:', error);
    res.status(500).send('Error loading video');
  }
});

app.get('/api/jobs/:jobId', (req,res)=> {
  const { jobId } = req.params;
  if (jobId.startsWith('pub_')) return sendJson(res,'publish-status.json');
  if (jobId.startsWith('job_process')) return sendJson(res,'job-status.json');
  return res.json({ status: 'unknown' });
});

// SSE endpoints
app.get('/realtime/upload/:uploadId', (req,res)=> {
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();
  const file = 'sse-upload.ndjson';
  const p = path.join(MOCKS, file);
  const raw = fs.readFileSync(p, 'utf8').trim();
  const chunks = raw.split(/\n\n+/);
  let i = 0;
  const timer = setInterval(()=>{
    if (i >= chunks.length) { clearInterval(timer); return; }
    res.write(chunks[i] + '\n\n');
    i++;
  }, 800);
  req.on('close', ()=> clearInterval(timer));
});

app.get('/realtime/jobs/:jobId', (req,res)=> {
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();
  const file = 'sse-job.ndjson';
  const p = path.join(MOCKS, file);
  const raw = fs.readFileSync(p, 'utf8').trim();
  const chunks = raw.split(/\n\n+/);
  let i = 0;
  const timer = setInterval(()=>{
    if (i >= chunks.length) { clearInterval(timer); return; }
    res.write(chunks[i] + '\n\n');
    i++;
  }, 900);
  req.on('close', ()=> clearInterval(timer));
});

app.get('/realtime/publish/:publishJobId', (req,res)=> {
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();
  const file = 'sse-publish.ndjson';
  const p = path.join(MOCKS, file);
  const raw = fs.readFileSync(p, 'utf8').trim();
  const chunks = raw.split(/\n\n+/);
  let i = 0;
  const timer = setInterval(()=>{
    if (i >= chunks.length) { clearInterval(timer); return; }
    res.write(chunks[i] + '\n\n');
    i++;
  }, 1000);
  req.on('close', ()=> clearInterval(timer));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log(`Mock server running on http://localhost:${PORT}`));
