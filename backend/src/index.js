const express = require('express');
const cors = require('cors');
require('dotenv').config();


const authRouter = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);

app.get('/', (req, res) => {
  res.send('Triplan 서버 정상 작동 중');
});

const postsRouter = require('./routes/posts');
app.use('/posts', postsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});