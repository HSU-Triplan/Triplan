const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRouter = require('./routes/auth');
const postsRouter = require('./routes/posts');
const usersRouter = require('./routes/users');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.set('io', io); // ← 이 줄 추가

app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);
app.use('/posts', postsRouter);
app.use('/users', usersRouter);

app.get('/', (req, res) => {
  res.send('Triplan 서버 정상 작동 중');
});

// Socket.io
io.on('connection', (socket) => {
  console.log('소켓 연결:', socket.id);

  // 채팅방 입장
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`소켓 ${socket.id} → 방 ${roomId} 입장`);
  });

  // 메시지 수신 → 같은 방에 브로드캐스트
  socket.on('send_message', (data) => {
    io.to(data.roomId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('소켓 해제:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});