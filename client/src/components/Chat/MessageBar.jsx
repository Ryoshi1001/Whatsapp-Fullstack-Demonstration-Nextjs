import { reducerCases } from '@/context/constants';
import { useStateProvider } from '@/context/StateContext';
import { ADD_IMAGE_MESSAGE_ROUTE, ADD_MESSAGE_ROUTE } from '@/utils/ApiRoutes';
import EmojiPicker from 'emoji-picker-react';
import React, { useState, useEffect, useRef } from 'react';
import { BsEmojiSmile } from 'react-icons/bs';
import { ImAttachment } from 'react-icons/im';
import { MdSend } from 'react-icons/md';
import PhotoPicker from '../common/PhotoPicker';
import axios from 'axios';
import { FaMicrophone } from 'react-icons/fa';
import dynamic from 'next/dynamic';

const CaptureAudio = dynamic(() => import("../common/CaptureAudio"), {
  ssr: false, 
})


const MessageBar = () => {
  const [{ userInfo, currentChatUser, socket }, dispatch] = useStateProvider();
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const [grabPhoto, setGrabPhoto] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);

  const photoPickerChange = async (e) => {
    try {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('image', file);
      const response = await axios.post(ADD_IMAGE_MESSAGE_ROUTE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        params: {
          from: userInfo.id,
          to: currentChatUser.id,
        },
      });
      if (response.status === 201) {
        socket.current.emit('send-msg', {
          to: currentChatUser?.id,
          from: userInfo?.id,
          message: response.data.message,
        });
        dispatch({
          type: reducerCases.ADD_MESSAGE,
          newMessage: {
            ...response.data.message,
          },
          fromSelf: true,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (e.target.id !== 'emoji-modal-window') {
        if (
          emojiPickerRef.current &&
          !emojiPickerRef.current.contains(e.target)
        ) {
          setShowEmojiPicker(false);
        }
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  //Emoji modal function
  const handleEmojiModal = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiClick = (emoji) => {
    setMessage((prev) => (prev += emoji.emoji));
  };

  useEffect(() => {
    if (socket && socket.current) {
      socket.current.on('connect', () => {
        console.log('Connected to WebSocket');
      });

      socket.current.on('disconnect', () => {
        console.log('Disconnected from WebSocket');
      });
    }
  }, [socket]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      const { data } = await axios.post(ADD_MESSAGE_ROUTE, {
        to: currentChatUser?.id,
        from: userInfo?.id,
        message,
      });

      socket.current.emit('send-msg', {
        to: currentChatUser?.id,
        from: userInfo?.id,
        message: data.msg,
      });
      console.log('Message sent:', data.msg);

      dispatch({
        type: reducerCases.ADD_MESSAGE,
        newMessage: {
          ...data.msg,
          fromSelf: true,
        },
      });
      setMessage('');
    } catch (error) {
      console.error(
        'Error sending message:',
        error.response?.data?.error || error.message
      );
    }
  };

  useEffect(() => {
    const inputElement = document.querySelector('input[type="text"]');
    if (inputElement) {
      inputElement.addEventListener('focus', () => {
        if (socket && socket.current) {
          socket.current.emit('cursor-focus', { userId: userInfo.id });
        }
      });

      inputElement.addEventListener('blur', () => {
        if (socket && socket.current) {
          socket.current.emit('cursor-blur', { userId: userInfo.id });
        }
      });
    }

    return () => {
      if (inputElement) {
        inputElement.removeEventListener('focus', () => {});
        inputElement.removeEventListener('blur', () => {});
      }
    };
  }, [userInfo]);

  useEffect(() => {
    if (grabPhoto) {
      const data = document.getElementById('photo-picker');
      data.click();
      document.body.onfocus = (e) => {
        setTimeout(() => {
          setGrabPhoto(false);
        }, 1000);
      };
    }
  }, [grabPhoto]);

  return (
    <div className="xs:h-16 xs:px-3 xs:pr-3 bg-panel-header-background h-20 px-4 flex items-center justify-center gap-6 relative">
      {
        !showAudioRecorder && (
          <>
          <div className="xs:flex-col flex items-center justify-center gap-6 xs:gap-3">
            <BsEmojiSmile
              className="text-panel-header-icon cursor-pointer text-xl xs:text-sm"
              title="Emoji"
              id="emoji-modal-window"
              onClick={handleEmojiModal}
            />
            {showEmojiPicker && (
              <div
                className="absolute bottom-24 left-16 z-30"
                id="emoji-modal"
                ref={emojiPickerRef}
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme="dark"
                  emojiStyle="apple"
                />
              </div>
            )}
            <ImAttachment
              className="text-panel-header-icon cursor-pointer text-xl xs:text-sm"
              title="Attach File"
              onClick={() => setGrabPhoto(true)}
            />
          </div>
          <div className="w-full rounded-lg h-10 flex items-center">
            <input
              type="text"
              placeholder="Type a message"
              className="xs:px-2 bg-input-background text-sm focus:outline-none text-white px-5 h-10 rounded-lg py-4 w-full"
              onChange={(e) => setMessage(e.target.value)}
              value={message}
            />
          </div>
          <div className="w-10 items-center justify-center">
            <button onClick={sendMessage}>
              {message.length ? (
                <MdSend
                  className="text-panel-header-icon cursor-pointer text-xl"
                  title="Send Message"
                />
              ) : (
                <FaMicrophone
                  className="text-panel-header-icon cursor-pointer text-xl"
                  title="Record"
                  onClick={() => setShowAudioRecorder(true)}
                />
              )}
            </button>
          </div>
          </>
        )
      }
      {grabPhoto && <PhotoPicker onChange={photoPickerChange} />}
      {showAudioRecorder && <CaptureAudio hide={setShowAudioRecorder} />}
    </div>
  );
};

export default MessageBar;
