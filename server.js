const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);

  // URL에서 파일 경로 추출
  let filePath = req.url;
  if (filePath === '/' || filePath === '') {
    filePath = '/debug-prompt.html';
  }

  // 보안: 상위 디렉토리 접근 방지
  filePath = path.join(__dirname, filePath);

  // 파일 확장자 추출
  const extname = path.extname(filePath);

  // 기본 Content-Type 설정
  let contentType = MIME_TYPES[extname] || 'application/octet-stream';

  // 파일 읽기
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // 파일을 찾을 수 없음
        console.log(`File not found: ${filePath}`);
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>404 Not Found</h1><p>File not found</p></body></html>');
      } else {
        // 서버 오류
        console.error(`Server error: ${err.code}`);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>500 Internal Server Error</h1><p>Server error</p></body></html>');
      }
    } else {
      // 성공: 파일 전송
      console.log(`Serving: ${filePath} (${contentType})`);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Test page: http://localhost:${PORT}/debug-prompt.html`);
  console.log(`Press Ctrl+C to stop the server`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});