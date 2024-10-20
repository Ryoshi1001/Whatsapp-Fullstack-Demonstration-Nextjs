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
  const socket = useRef();

  useEffect(() => {
    if (redirectLogin) {
      router.push('/login');
    }
  }, [redirectLogin]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
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
    });

    return () => unsubscribe();
  }, [userInfo, dispatch]);

  // Socket connection
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

      // Incoming video call handling
      socket.current.on('incoming-video-call', ({ from, roomId, callType }) => {
        console.log("Incoming video call detected:", { from, roomId, callType });
        dispatch({
          type: reducerCases.SET_INCOMING_VIDEO_CALL,
          incomingVideoCall: {
            ...from,
            roomId,
            callType,
          },
        });
      });

      dispatch({
        type: reducerCases.SET_SOCKET,
        socket,
      });
    }
  }, [userInfo]);

  // Outgoing call logic
  useEffect(() => {
    // Ensure `data` is defined; you may need to pass it as a prop or state
    if (data && data.type === 'out-going') {
      console.log("Initiating outgoing video call...");
      socket.current.emit('outgoing-video-call', {
        to: data.id,
        from: {
          id: userInfo.id,
          profilePicture: userInfo.profileImage,
          name: userInfo.name,
        },
        callType: data.callType,
        roomId: data.roomId,
      });
    }
  }, [data]); // Ensure `data` is available in this context

  // Message handling
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

      // Cleanup function
      return () => setSocketEvent(true);
    }
  }, [socket.current, dispatch]);

  // Message polling
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

    const intervalId = setInterval(getMessages, 1000); // Poll every second

    return () => clearInterval(intervalId); // Clean up on unmount
  }, [currentChatUser, userInfo]);

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
            <div className={messagesSearch ? 'grid grid-cols-2' : 'grid-cols-2'}>
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