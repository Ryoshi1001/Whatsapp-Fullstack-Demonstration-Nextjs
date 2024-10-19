import { reducerCases } from '@/context/constants';
import { useStateProvider } from '@/context/StateContext';
import { GET_CALL_TOKEN } from '@/utils/ApiRoutes';
import axios from 'axios';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { MdOutlineCallEnd } from 'react-icons/md';

const Container = ({ data }) => {
  const [{ socket, userInfo }, dispatch] = useStateProvider();
  const [callAccepted, setCallAccepted] = useState(false);
  const [token, setToken] = useState(undefined);
  //state used for logging out of zegocloud room
  const [zgVar, setZgVar] = useState(undefined);

  const [localStream, setLocalStream] = useState(undefined);
  const [publishStream, setPublishStream] = useState(undefined);
  const [isMobileScreen, setIsMobileScreen] = useState(false)
 
  const handleResize = () => {
    setIsMobileScreen(window.innerWidth < 640)
  }

  useEffect(() => {
    handleResize(); 

    window.addEventListener("resize", handleResize);
    window.removeEventListener("resize", handleResize)
  }, [])

  //add use Effect to check if call can be accepted
  useEffect(() => {
    if (data.type === 'out-going') {
      socket.current.on('accept-call', () => setCallAccepted(true));
    } else {
      setTimeout(() => {
        setCallAccepted(true);
      }, 1000);
    }
  }, [data]);

  useEffect(() => {
    const getToken = async () => {
      try {
        const {data: { token: returnedToken }} = await axios.get(`${GET_CALL_TOKEN}/${userInfo.id}`);
        setToken(returnedToken);
      } catch (error) {
        console.log(
          'Error: In Container.jsx for function getToken() in useEffect',
          error
        );
      }
    };
    getToken()
  }, [callAccepted]);

  //after getting token with useEffect above with getToken() intialize ZegoCloud
  useEffect(() => {
    const startCall = async () => {
      try {
        const { ZegoExpressEngine } = await import('zego-express-engine-webrtc');
        const zg = new ZegoExpressEngine(
          parseInt(process.env.NEXT_PUBLIC_ZEGO_APP_ID),
          process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET
        );
  
        setZgVar(zg);
  
        zg.on('roomStreamUpdate', async (roomId, updateType, streamList, extendedData) => {
          console.log('Room Stream Update:', { roomId, updateType, streamList });
          if (updateType === 'ADD') {
            console.log('Adding remote stream');
            const rmVideo = document.getElementById('remote-video');
            const vd = document.createElement(data.callType === 'video' ? 'video' : 'audio');
            vd.id = streamList[0].streamID;
            vd.autoplay = true;
            vd.playsInline = true;
            vd.muted = false;
            if (rmVideo) {
              rmVideo.appendChild(vd);
            }
            try {
              const stream = await zg.startPlayingStream(streamList[0].streamID, {
                audio: true,
                video: true,
              });
              console.log('Started playing stream', stream);
              vd.srcObject = stream;
            } catch (error) {
              console.error('Error starting stream:', error);
            }
          } else if (
            updateType === 'DELETE' &&
            zg &&
            localStream &&
            publishStream &&
            streamList[0].streamID
          ) {
            console.log('Destroying stream', streamList[0].streamID);
            zg.destroyStream(localStream);
            zg.stopPublishingStream(streamList[0].streamID);
            zg.logoutRoom(data.roomId.toString());
            dispatch({
              type: reducerCases.END_CALL,
            });
          }
        });
  
        // Log into Zegocloud room
        try {
          await zg.loginRoom(
            data.roomId.toString(),
            token,
            { userID: userInfo.id.toString(), userName: userInfo.name },
            { userUpdate: true }
          );
          console.log('Logged into Zegocloud room successfully');
        } catch (error) {
          console.error('Error logging into Zegocloud room:', error);
        }
  
        // Start for local video
        try {
          const localStream = await zg.createStream({
            camera: {
              audio: true,
              video: data.callType === 'video',
            },
          });
          console.log('Created local stream successfully');
          
          if (localStream && zg) {
            const localVideo = document.getElementById('local-audio');
            if (localVideo) {
              const videoElement = document.createElement(data.callType === 'video' ? 'video' : 'audio');
              videoElement.id = 'video-local-zego';
              videoElement.className = 'h-28 w-32';
              videoElement.autoplay = true;
              videoElement.muted = false;
              videoElement.playsInline = true;
  
              localVideo.appendChild(videoElement);
              const td = document.getElementById('video-local-zego');
              if (td) {
                td.srcObject = localStream;
                const streamID = '123' + Date.now();
                setPublishStream(streamID);
                setLocalStream(localStream);
                zg.startPublishingStream(streamID, localStream);
              } else {
                console.error('video-local-zego element not found');
              }
            } else {
              console.error('local-audio element not found');
            }
          } else {
            console.error('Failed to initialize local stream or Zego instance');
          }
        } catch (error) {
          console.error('Error creating local stream:', error);
        }
  
      } catch (error) {
        console.log("Failed importing or initializing ZegoExpressEngine:", error);
      }
    };
  
    if (token) {
      console.log(token);
      startCall();
    }
  }, [token]);
  

  const endCall = () => {
    const id = data.id;

    // log out of zegocloud room so camera can stop
    if (zgVar && localStream && publishStream) {
      zgVar.destroyStream(localStream);
      zgVar.stopPublishingStream(publishStream);
      zgVar.logoutRoom(data.roomId.toString());
    }

    if (data.callType === 'voice') {
      socket.current.emit('reject-voice-call', {
        from: id,
      });
    } else {
      socket.current.emit('reject-video-call', {
        from: id,
      });
    }
    dispatch({
      type: reducerCases.END_CALL,
    });
    setLocalStream(undefined);
  setPublishStream(undefined);
  };
  
  return (
    <div className="xs:py-24 border-conversation-border border-l w-full bg-conversation-panel-background flex flex-col h-[100vh] overflow-hidden items-center justify-center text-white">
      <div className="flex flex-col gap-3 items-center">
        <span className="xs:text-3xl text-5xl">{data.name}</span>
        <span className="text-lg">
          {callAccepted
            ? 'Ongoing Call'
            : 'Calling'}
        </span>
      </div>
      {(!callAccepted || data.callType === 'audio') && (
        <div className="xs:my-14 my-24">
          <Image
            src={data.profilePicture}
            alt="avatar"
            height={isMobileScreen ? 200 : 300}
            width={isMobileScreen ? 200 : 300}
            className="rounded-full"
          />
        </div>
      )}
      <div className="my-5 relative" id="remote-video">
        <div className="absolute bottom-5 right-5" id="local-audio">
        </div>
      </div>

      <div
        className="h-auto w-auto p-4 bg-red-600 flex items-center justify-center rounded-full cursor-pointer"
        onClick={endCall}
      >
        <MdOutlineCallEnd className="text-3xl cursor-pointer" />
      </div>
    </div>
  );
};

export default Container;
