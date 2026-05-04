
const express = require('express');
const cors = require('cors');
require('dotenv').config();



const authRouter = require('./routes/auth');	const authRouter = require('./routes/auth');


const app = express();	const app = express();

app.get('/', (req, res) => {
const postsRouter = require('./routes/posts');	const postsRouter = require('./routes/posts');
app.use('/posts', postsRouter);	app.use('/posts', postsRouter);


const usersRouter = require('./routes/users');	
app.use('/users', usersRouter);	

const PORT = process.env.PORT || 3000;	const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {	app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);	  console.log(`서버 실행 중: http://localhost:${PORT}`);
});