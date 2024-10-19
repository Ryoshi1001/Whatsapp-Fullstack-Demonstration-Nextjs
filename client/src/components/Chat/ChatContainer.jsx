import { useStateProvider } from '@/context/StateContext';
import CalculateTime from '@/utils/CalculateTime';
import React, { useEffect, useRef } from 'react';
import MessageStatus from '../common/MessageStatus';
import { reducerCases } from '@/context/constants';
import ImageMessage from './ImageMessage';
import dynamic from 'next/dynamic'

const VoiceMessage = dynamic(() => import("./VoiceMessage"), {
  ssr: false
})

const ChatContainer = () => {
  const [{ messages, currentChatUser, userInfo, socket }, dispatch] =
    useStateProvider();
    console.log("message in Chat container", messages)

    //autoscroll for new messages in ChatContainer
    const chatContainerRef = useRef(null)

  console.log('Rendered messages:', messages);
  useEffect(() => {
    if (socket.current) {
      const handleNewMessage = (data) => {
        console.log('Message received:', data);
        dispatch({
          type: reducerCases.ADD_MESSAGE,
          newMessage: {
            ...data.message,
            fromSelf: data.from === userInfo.id,
          },
        });
      };

      socket.current.on('msg-receive', handleNewMessage);

      return () => {
        socket.current.off('msg-receive', handleNewMessage);
      };
    }
  }, [socket, dispatch, userInfo]);

  useEffect(() => {
    scrollToBottom(); 
  }, [messages])

  const scrollToBottom = () => {
    if(chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; 
    }
  }

  return (
    <>
      <div className="w-full h-[80vh] relative flex-grow overflow-hidden">
        {/* Low-opacity background */}
        <div className="absolute inset-0 bg-chat-background opacity-10 z-0"></div>
        
        {/* Higher-opacity content */}
        <div className="relative w-full h-full z-10 overflow-auto custom-scrollbar"
        ref={chatContainerRef}
        >
          <div className="flex w-full">
            <div className="xs:mx-4 xs:my-1 flex flex-col justify-end w-full gap-1 overflow-auto mx-10 my-6 relative left-0 bottom-0">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`${
                    message.senderId === currentChatUser.id
                      ? 'justify-start'
                      : 'justify-end'
                  } mt-2 relative flex`}
                >
                  {message.type === 'text' && (
                    <div
                      className={`xs:py-2 xs:text-[12px] xs:max-w-[80%] xs:flex-col text-white px-2 py-[10px] text-sm rounded-md flex gap-2 items-end max-w-[45%] 
                  ${
                    message.senderId === currentChatUser.id
                      ? 'bg-incoming-background'
                      : 'bg-outgoing-background'
                  }`}
                    >
                      <span className="break-all">{message.message}</span>
                      <div className="flex gap-1 items-end">
                        <span className="text-bubble-meta text-[11px] pt-1 min-w-fit">
                          {CalculateTime(message.createdAt)}
                        </span>
                        {message.senderId === userInfo.id && (
                          <MessageStatus messageStatus={message.messageStatus} />
                        )}
                      </div>
                    </div>
                  )}
                  {message.type === "image"  && (
                    <ImageMessage message={message}/>
                  )}
                  {message.type === "audio" && (
                    <VoiceMessage message={message}/>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatContainer;
