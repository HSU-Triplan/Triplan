const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

//firebase admin 초기화
const {admin} = require('./utils/firebase')

const authRouter = require('./routes/auth');
const postsRouter = require('./routes/posts');
const usersRouter = require('./routes/users');

//const { createClient } = require('@supabase/supabase-js');
//const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

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

  // userId 등록
//  socket.on('register', (userId) => {
//    socket.userId = userId;
//  });

  // 채팅방 입장
   socket.on('join_room', ({ roomId, userId }) => {
     socket.join(roomId);
     socket.userId = userId;
     console.log(`소켓 ${socket.id} → 방 ${roomId} 입장`);
   });

  socket.on('send_message', (data) => {
    io.to(data.roomId).emit('receive_message', data);
    //console.log(JSON.stringify(data));
    chatAlarm(data.roomId, data.senderId,data.text);
  });

  //fcm으로 채팅 알람 보내기
  const chatAlarm = async (roomId,senderId,text) => {
    let usersFcmTokens = []
    try{
        let {data , error} = await supabase
            .from('chat_members')
            .select('user_id,users(fcm_token,profile_image,name,nickname)')
            .eq('chat_room_id',roomId);
        console.log("data : "+ JSON.stringify(data))
        for(let i=0 ; i<data.length ; i++){
            //메세지 송신자는 안보냄
            if(data[i].user_id == senderId){
                console.log(data[i].user_id+ "이 아이디는 송신자입니다.");
                continue;
            }
            console.log(i + "번째 token 발송 : ",data[i].users.fcm_token)
            const res = await admin.messaging().send({
                token : data[i].users.fcm_token,

                notification : {
                    title : data[i].users.nickname || data[i].users.name,
                    body : text,
                    imageUrl : data[i].users.profile_image
                },

                android: {
                    priority: 'high'
                },

                data : {
                    type : 'new-message'
                }
            });
            console.log("새 메세지 알람 보내기 완료: "+ res)
        }
    }catch(error){
        console.log("error : "+ error)
    }

  }

  socket.on('disconnect', () => {
    console.log('소켓 해제:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});