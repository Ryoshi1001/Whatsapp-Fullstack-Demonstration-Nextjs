import React, { useEffect, useRef, useState } from 'react';
import ChatList from './Chatlist/ChatList';
import Empty from './Empty';
import { useRouter } from 'next/router';
import { useStateProvider } from '@/context/StateContext';
import { onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import { firebaseAuth } from '@/utils/FirebaseConfig';
import { CHECK_USER_ROUTE, GET_MESSAGES_ROUTE, HOST } from '@/utils/ApiRoutes';
import { reducerCases } from '@/context/constants';
import Chat from './Chat/Chat';
import { io } from 'socket.io-client';
import SearchMessages from './Chat/SearchMessages';
import VideoCall from './Call/VideoCall';
import VoiceCall from './Call/VoiceCall';
import IncomingVideoCall from './common/IncomingVideoCall';
import IncomingCall from './common/IncomingCall';

const Main = () => {
  //checking for userInfo in Main first because undefined in nested ChatList: problem with loading avatar in child component. Using method from Firebase: onAuthStateChanged(firebaseAth, ) like a useEffect Hook for Firebase.
  const router = useRouter();
  const [
    {
      userInfo,
      currentChatUser,
      messagesSearch,
      voiceCall,
      videoCall,
      incomingVideoCall,
      incomingVoiceCall,
    },
    dispatch,
  ] = useStateProvider();
  const [redirectLogin, setRedirectLogin] = useState(false);
  const [socketEvent, setSocketEvent] = useState(false);
  //ref for socket io
  const socket = useRef();

  useEffect(() => {
    if (redirectLogin) {
      router.push('/login');
    }
  }, [redirectLogin]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      async (currentUser) => {
        if (!currentUser) {
          setRedirectLogin(true);
        }

        if (!userInfo && currentUser?.email) {
          const { data } = await axios.post(CHECK_USER_ROUTE, {
            email: currentUser.email,
          });

          console.log("user data", data);

          if (!data.status) {
            router.push('/login');
          }

          if (data.data) {
            const {
              id,
              name,
              email,
              profilePicture: profileImage,
              status,
            } = data.data;
            dispatch({
              type: reducerCases.SET_USER_INFO,
              userInfo: {
                id,
                name,
                email,
                profileImage,
                status,
              },
            });
          }
        }
      }
    );

    return () => unsubscribe();
  }, [userInfo, dispatch]);

  //useEffect when have userInfo: import io from socket.io.client
  //HOST from apiRoutes
  //store socket in reducers
  useEffect(() => {
    if (userInfo) {
      socket.current = io(HOST, {
        withCredentials: true,
        transports: ['websocket'],
      });
      socket.current.on('connect', () => {
        console.log('Vercel Socket connected:', socket.current.connected);
        socket.current.emit('add-user', userInfo.id);
      });

      socket.current.on('connect_error', (error) => {
        console.error('Vercel Socket connection error:', error);
      });

      socket.current.on('disconnect', () => {
        console.log('Vercel Socket disconnected. Attempting to reconnect...');
        socket.current.connect(); // Attempt to reconnect
      });

      dispatch({
        type: reducerCases.SET_SOCKET,
        socket,
      });
    }
  }, [userInfo]);



  //check if socket.current has value and is false
  // if (socket.current && !socket.current)
  useEffect(() => {
    if (socket.current && !socketEvent) {

      socket.current.on('msg-receive', (data) => {
        dispatch({
          type: reducerCases.ADD_MESSAGE,
          newMessage: {
            ...data,
            fromSelf: false,
          },
        });
      });

      socket.current.on('incoming-voice-call', ({ from, roomId, callType }) => {
        dispatch({
          type: reducerCases.SET_INCOMING_VOICE_CALL,
          incomingVoiceCall: {
            ...from,
            roomId,
            callType,
          },
        });
      });

      socket.current.on('incoming-video-call', ({ from, roomId, callType }) => {
        console.log("incoming call socket.current working")
        dispatch({
          type: reducerCases.SET_INCOMING_VIDEO_CALL,
          incomingVideoCall: {
            ...from,
            roomId,
            callType,
          },
        });
      });

      socket.current.on('voice-call-rejected', () => {
        dispatch({
          type: reducerCases.END_CALL,
        });
      });

      socket.current.on('video-call-rejected', () => {
        dispatch({
          type: reducerCases.END_CALL,
        });
      });

      socket.current.on("online-users", ({onlineUsers}) => {
        dispatch({
          type: reducerCases.SET_ONLINE_USERS, 
          onlineUsers, 
        })
      })

      setSocketEvent(true);
    }
  }, [socket.current, dispatch]);


  


//new useEffect for messages to work on Vercel
useEffect(() => {
  const getMessages = async () => {
    if (currentChatUser?.id && userInfo?.id) {
      try {
        const response = await axios.get(
          `${GET_MESSAGES_ROUTE}/${userInfo.id}/${currentChatUser.id}`
        );
        dispatch({
          type: reducerCases.SET_MESSAGES,
          messages: response.data.messages,
        });
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    }
  };

  getMessages(); // Fetch messages immediately

  // Set up polling for messages every few seconds
  const intervalId = setInterval(getMessages, 1000); // Poll every 5 seconds

  return () => clearInterval(intervalId); // Clean up on unmount
}, [currentChatUser, userInfo]); // Dependencies include currentChatUser and userInfo

  return (
    <>
      {incomingVideoCall && (<IncomingVideoCall />)}
      {incomingVoiceCall && (<IncomingCall />)}
      {videoCall && (
        <div className="h-screen w-screen max-h-full overflow-hidden">
          <VideoCall />
        </div>
      )}
      {voiceCall && (
        <div className="h-screen w-screen max-h-full overflow-hidden">
          <VoiceCall />
        </div>
      )}
      {!videoCall && !voiceCall && (
        <div className="xs:grid xs:grid-cols-[30%_70%] grid grid-cols-main w-screen h-screen max-h-screen max-w-screen overflow-hidden">
          <ChatList />
          {currentChatUser ? (
            <div
              className={messagesSearch ? 'grid grid-cols-2' : 'grid-cols-2'}
            >
              <Chat />
              {messagesSearch && <SearchMessages />}
            </div>
          ) : (
            <Empty />
          )}
        </div>
      )}
    </>
  );
};

export default Main;
