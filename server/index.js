// nextjs tailwind socket io firebase express nodejs prisma postgresql
import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'

//importing routes
import AuthRoutes from './routes/AuthRoute.js'
import MessageRoutes from './routes/MessageRoutes.js'

const app = express(); 

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000", 
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'], 
  credentials: true, 
}

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); 

// app.use(cors({
//   origin: 'http://localhost:3000', // or whatever your client's URL is
//   methods: ['GET', 'POST'],
//   credentials: true
// }));

app.use(express.json())

//provides images form uploads pointing route to directory also audio
app.use("/uploads/images", express.static("uploads/images"))
app.use("/uploads/recordings", express.static("uploads/recordings"))

//use routes in app
//add routes for auth routes
app.use('/api/auth', AuthRoutes)
//add routes for messages
app.use('/api/messages', MessageRoutes)

const PORT = process.env.PORT || 3005; 

const server = app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT:${PORT}`)
})

//if hosting online change origin also for app 
const io = new Server(server, {
  cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000", // Your React app's URL
      methods: ["GET", "POST"],
      credentials: true,
  },
});

//maintaining sockets and users global
//maintain online offline of users here
//each entry is only one time
global.onlineUsers = new Map()


//new connection request: this function runs
//gets socket, set socket in global.chatsocket
//.on socket user calls add-user gets userId from front end sets userId and socket.id into global onlineUsers
// io.on("connection", (socket) => {
//   global.chatSocket = socket; 
//   socket.on("add-user", (userId) => {
//     onlineUsers.set(userId, socket.id); 
//   })
//   socket.on("send-msg", (data) => {
//     const sendUserSocket = onlineUsers.get(data.to); 
//     if (sendUserSocket) {
//       socket.to(sendUserSocket).emit("msg-receive", {
//         from: data.from, 
//         message: data.message, 
//       })
//       console.log("Message forwarded to recipient:", data);

//     }
//   })
// })

io.on("connection", (socket) => {
  console.log("New client connected");
  global.chatSocket = socket;

  socket.on("add-user", (userId) => {
    console.log("User added:", userId);
    onlineUsers.set(userId, socket.id);
    socket.broadcast.emit("online-users", {
      onlineUsers:Array.from(onlineUsers.keys())
    })
  });

  //socket for logout page
  socket.on("signout", (id) => {
    onlineUsers.delete(id); 
    socket.broadcast.emit("online-users", {
      onlineUsers:Array.from(onlineUsers.keys())
    })
  })

  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-receive", {
        from: data.from,
        message: data.message,
      });
      console.log("Message forwarded to recipient:", data);
    } else {
      console.log("Recipient not found or offline:", data.to);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    // Remove the disconnected user from onlineUsers
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log("User removed from online list:", userId);
        break;
      }
    }
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });



  socket.on("outgoing-voice-call", (data) => {
    const sendUserSocket = onlineUsers.get(data.to); 
    console.log("outgoingvoicecall", data, sendUserSocket)
    if(sendUserSocket) {
      socket.to(sendUserSocket).emit("incoming-voice-call", {
        from: data.from,
        roomId: data.roomId, 
        callType: data.callType,  
      })
    }
  })

  socket.on("outgoing-video-call", (data) => {
    const sendUserSocket = onlineUsers.get(data.to); 
    console.log("outvideocall", data, sendUserSocket)
    if(sendUserSocket) {
      socket.to(sendUserSocket).emit("incoming-video-call", {
        from: data.from,
        roomId: data.roomId, 
        callType: data.callType,  
      })
    }
  })

  //sockets for end reject call and videos 
  // socket.on("reject-voice-call", (data) => {
  //   const sendUserSocket = onlineUsers.get(data.from); 
  //   if(sendUserSocket) {
  //     socket.to(sendUserSocket).emit("voice-call-rejected")
  //   }
  // })

  //with try catch and errors catch better code 
  socket.on("reject-voice-call", (data) => {
    try {
      const sendUserSocket = onlineUsers.get(data.from);
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("voice-call-rejected");
      } else {
        console.log(`User ${data.from} not found or offline`);
      }
    } catch (error) {
      console.error("Error in reject-voice-call index.js:", error);
    }
  });

  //reject video when clicking reject closes senders video chat window also
  socket.on("reject-video-call", (data) => {
    try {
      const sendUserSocket = onlineUsers.get(data.from);
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("video-call-rejected");
      } else {
        console.log(`User ${data.from} not found or offline`);
      }
    } catch (error) {
      console.error("Error in reject-voice-call index.js:", error);
    }
  });

  //this used for voice and video calls 
  socket.on("accept-incoming-call", ({id}) => {
    const sendUserSocket = onlineUsers.get(id); 
    socket.to(sendUserSocket).emit("accept-call")
  })

});



