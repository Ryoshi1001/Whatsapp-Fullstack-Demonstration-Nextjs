//controller for adding a message

import getPrismaInstance from "../utils/PrismaClient.js";
import {renameSync} from 'fs'

//controller for adding messages
export const addMessage = async(req, res, next) => {
  try {
    const prisma = getPrismaInstance()
    const { message, to, from } = req.body; 

    if (!message || !from || !to) {
      return res.status(400).json({ error: "From, to and Message are required" });
    }

    const newMessage = await prisma.messages.create({
      data: {
        message, 
        sender: {connect:{id:parseInt(from)}}, 
        receiver: {connect: {id: parseInt(to)}}, 
        messageStatus: "sent",  
      },
      include: { sender: true, receiver: true }, 
    }); 

    return res.status(201).json({ msg: newMessage })
  } catch (error) {
    console.error("Error creating message:", error)
    return res.status(500).json({ error: error.message || "An error occurred while processing your request" });
  }
}

//controller for getting messages
export const getMessages = async (req, res, next) => {
  try {
    const prisma = getPrismaInstance(); 
    const { from, to } = req.params; 
    //getting all messages with findMany() from prisma
    //using conditions Where and OR, senderId is "from" & "to" and receiverID is "to" and "from" so all messages back and forth between user and currentChatuser
    //Also order by ascending ID's
    const messages = await prisma.messages.findMany({
      where: {
        OR: [
          {
            senderId: parseInt(from), 
            receiverId: parseInt(to), 
          }, 
          {
            senderId: parseInt(to), 
            receiverId: parseInt(from)
          }
        ]
      }, 
      orderBy: {
        id: "asc", 
      }
    })

    //array made checking and looping through messages from query: checking if status is not read and senderId is form "to" then mark message as "read"
    const unreadMessages = []; 
    messages.forEach = (message, index) => {
      if (
        message.messageStatus !== "read" && 
        message.senderId === parseInt(to)
      ) {
        messages[index].messageStatus = "read"; 
        unreadMessages.push(message.id)
      }
    }

    //updating messages to read from delivered or sent
    await prisma.messages.updateMany({
      where: {
        id: {in:unreadMessages}
      }, 
      data: {
        messageStatus: "read", 
      }, 
    })
    res.status(200).json({ messages })
  } catch (error) {
    console.log("getMessages Controller Error:", error); 
    next(error); 
  }
}


//controller for addingImageMessage: for sending images in text chat
// Controller for adding image messages
export const addImageMessage = async (req, res, next) => {
  try {
    // Commenting out file handling logic
    // if (req.file) {
      const date = Date.now(); 
      // let fileName = "uploads/images/" + date + req.file.originalname; 
      // renameSync(req.file.path, fileName); // Comment this line out

      const prisma = getPrismaInstance();
      const { from, to } = req.query;

      if (from && to) {
        const message = await prisma.messages.create({
          data: {
            message: `Image upload disabled for troubleshooting at ${date}`, // Placeholder message
            sender: { connect: { id: parseInt(from) } },
            receiver: { connect: { id: parseInt(to) } },
            type: "image"
          }
        });
        return res.status(201).json({ message });
      }
      return res.status(400).send("From and To are required.");
    // }
    return res.status(400).send("Image is required");
  } catch (error) {
    console.error(error);
    next(error);
  }
};


// Controller for adding audio messages
export const addAudioMessage = async (req, res, next) => {
  try {
    // Commenting out file handling logic
    // if (req.file) {
      const date = Date.now(); 
      // let fileName = "uploads/recordings/" + date + req.file.originalname; 
      // renameSync(req.file.path, fileName); // Comment this line out

      const prisma = getPrismaInstance(); 
      const { from, to } = req.query; 

      if (from && to) {
        const message = await prisma.messages.create({
          data: {
            message: `Audio upload disabled for troubleshooting at ${date}`, // Placeholder message
            sender: { connect: { id: parseInt(from) } }, 
            receiver: { connect: { id: parseInt(to) } }, 
            type: "audio"
          }
        }); 
        return res.status(201).json({ message });
      }
      return res.status(400).send("From and To are required.");
    // }
    return res.status(400).send("Audio is required");
  } catch (error) {
    console.error(error);
    next(error);
  }
};

//controller for contacts list with messages from contacts. has map of users only has key value pairs doesnt repeat value for same key; only want single users not multiple users. 
//start: checking if message is not sent, if calculatedId user is not inside map then destructuring msg and created user object, then checking if sent by isSender then will try to show msg from receiver... 
export const getInitialContactsWithMessages = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.from); 
    const prisma = getPrismaInstance(); 
    const user = await prisma.user.findUnique({
      where: { id: userId }, 
      include: {
        sentMessages: {
          include: {
            receiver: true, 
            sender: true, 
          },
          orderBy: {
            createdAt: "desc", 
          }, 
        }, 
        receivedMessages: {
          include: {
            receiver: true, 
            sender: true, 
          },
          orderBy: {
            createdAt: "desc", 
          }, 
        }, 
      }, 
    }); 
    const messages = [...user.sentMessages, ...user.receivedMessages]; 
    messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); 
    const users = new Map(); 
    const messageStatusChange = []; 

    messages.forEach((msg) => {
      const isSender = msg.senderId === userId; 
      const calculatedId = isSender ? msg.receiverId : msg.senderId; 
      if(msg.messageStatus === "sent") {
        messageStatusChange.push(msg.id)
      }

      const {id, type, message, messageStatus, createdAt, senderId, receiverId,} = msg; 

      if(!users.get(calculatedId)) {
        let user = {
          messageId: id, 
          type, 
          message, 
          messageStatus, 
          createdAt, 
          senderId, 
          receiverId
        }

        if(isSender) {
          user = {
            ...user, 
            ...msg.receiver, 
            totalUnreadMessages: 0, 
          }
        } else {
          user = {
            ...user, 
            ...msg.sender, 
            totalUnreadMessages: messageStatus !== "read" ? 1 : 0, 
          }; 
        }
        users.set(calculatedId, {...user})

      } else if (messageStatus !== "read" && !isSender) {
        const user = users.get(calculatedId); 
        users.set(calculatedId, {
          ...user, 
          totalUnreadMessages: user.totalUnreadMessages + 1, 
        })
      }
    })

    if(messageStatusChange.length) {
      await prisma.messages.updateMany({
        where: {
          id: { in: messageStatusChange }, 
        }, 
        data: {
          messageStatus: "delivered", 
        }, 
      }); 
    }

    return res.status(200).json({
      users:Array.from(users.values()),
      onlineUsers:Array.from(onlineUsers.keys()),
    });
  } catch (error) {
    console.error(error)
    next(error)
  }
}