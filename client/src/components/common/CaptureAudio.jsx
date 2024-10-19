import { reducerCases } from '@/context/constants';
import { useStateProvider } from '@/context/StateContext';
import { ADD_AUDIO_MESSAGE_ROUTE } from '@/utils/ApiRoutes';
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import {
  FaMicrophone,
  FaPauseCircle,
  FaPlay,
  FaStop,
  FaTrash,
} from 'react-icons/fa';
import { MdSend } from 'react-icons/md';
import WaveSurfer from 'wavesurfer.js';

const CaptureAudio = ({ hide }) => {
  const [{ userInfo, currentChatUser, socket }, dispatch] = useStateProvider();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [waveForm, setWaveForm] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [renderedAudio, setRenderedAudio] = useState(null);

  const audioRef = useRef(null);
  const mediaRecorderRed = useRef(null);
  const waveFormRef = useRef(null);

  //setting interval
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prevDuration) => {
          setTotalDuration(prevDuration + 1);
          return prevDuration + 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(interval);
    };
  }, [isRecording]);

  //1. As soon as this component loads getting wavesurfer instance and setting it to a state, when wavesurfer event is finished setting setIsPlaying to false to reset the waveforms, then destroying component and destroying waveform.
  useEffect(() => {
    const wavesurfer = WaveSurfer.create({
      container: waveFormRef.current,
      waveColor: '#ccc',
      progressColor: '#7ae3c3',
      barWidth: 2,
      height: 30,
      responsive: true,
    });
    setWaveForm(wavesurfer);

    wavesurfer.on('finish', () => {
      setIsPlaying(false);
    });

    return () => {
      wavesurfer.destroy();
    };
  }, []);

  useEffect(() => {
    if (waveForm) {
      handleStartRecording();
    }
  }, [waveForm]);

  //2. soon as getting the waveform we start recording here. Set some states to 0 and setIsRecording to true. Grabbing userMedia and setting it into audioRef.  Grabbing checks of data when data is available then pushing into chunks. When recorder stops changes chunks into audio/ogg codecs turns into a blob and then turning it into a audioURL. Then setting audioURL to audio. Then putting audio into the setRecordedAudio state. Also setting waveform with audioURL
  const handleStartRecording = () => {
    setRecordingDuration(0);
    setCurrentPlaybackTime(0);
    setTotalDuration(0);
    setIsRecording(true);
    setRecordedAudio(null)

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRed.current = mediaRecorder;
        audioRef.current.srcObject = stream;

        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
          chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
          const audioURL = URL.createObjectURL(blob);
          const audio = new Audio(audioURL);
          setRecordedAudio(audio);
          waveForm.load(audioURL);
        };

        mediaRecorder.start();
      })
      .catch((error) => {
        console.error('Error accessing microphone:', error);
      });
  };

  //3. When stop recording stopping waveForm. Destroy the recording add addeventListener of dataavailable and setting audio in blob / file. Putting rendered audio in setRenderedAudio state.
  const handleStopRecording = () => {
    if (mediaRecorderRed.current && isRecording) {
      mediaRecorderRed.current.stop();
      setIsRecording(false);
      waveForm.stop();

      const audioChunks = [];
      mediaRecorderRed.current.addEventListener('dataavailable', (e) => {
        audioChunks.push(e.data);
      });

      mediaRecorderRed.current.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
        const audioFile = new File([audioBlob], 'recording.mp3');
        setRenderedAudio(audioFile);
      });
    }
  };

  //4. useEffect if have recorded Audio:updating the time for the audio
  useEffect(() => {
    if (recordedAudio) {
      const updatePlaybackTime = () => {
        setCurrentPlaybackTime(recordedAudio.currentTime);
      };
      recordedAudio.addEventListener('timeupdate', updatePlaybackTime);
      return () => {
        recordedAudio.removeEventListener('timeupdate', updatePlaybackTime);
      };
    }
  }, [recordedAudio]);

  //5. First stop waveform then play the waveform, play the recordedAudio state and setIsPlaying to true.
  const handlePlayRecording = () => {
    if (recordedAudio) {
      waveForm.stop();
      waveForm.play();
      recordedAudio.play();
      setIsPlaying(true);
    }
  };

  //6. stop the waveform, pause the recordedAudio and set setIsPlaying to false.
  const handlePauseRecording = () => {
    waveForm.stop();
    recordedAudio.pause();
    setIsPlaying(false);
  };

  const sendRecording = async () => {
    try {
      const formData = new FormData(); 
      formData.append("audio", renderedAudio); 
      const response = await axios.post(ADD_AUDIO_MESSAGE_ROUTE, formData, {
        headers: {
          "Content-Type": "multipart/form-data", 
        }, 
        params: {
          from: userInfo.id,
          to: currentChatUser.id
        }, 
      }); 

      if(response.status === 201) {
        socket.current.emit("send-msg", {
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
      }; 

    } catch (error) {
      console.error(error)
    }
  };

  // formats The time for recording
  const formatTime = (time) => {
    if (isNaN(time)) {
      return '00:00';
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="xs:justify-between w-full flex justify-end items-center text-2xl">
      <div className="pt-1">
        <FaTrash
          className="xs:text-lg text-panel-header-icon cursor-pointer"
          onClick={() => hide()}
        />
      </div>
      <div className="xs:px-0 w-full flex justify-center items-center text-white text-lg gap-3 mx-4 px-4 py-2 bg-search-input-container-background rounded-full drop-shadow-lg">
        {isRecording ? (
          <div className="xs:w-full xs:text-sm xs:flex xs:flex-row xs:gap-2 xs:items-center xs:justify-center text-red-500 animate-pulse w-60 text-center">
            Recording <span>{recordingDuration}s</span>
          </div>
        ) : (
          <div>
            {recordedAudio && (
              <div className=" xs:text-sm xs:flex xs:flex-row xs:gap-2 xs:items-center xs:justify-center w-60 text-center xs:w-10">
                {!isPlaying ? (
                  <FaPlay onClick={handlePlayRecording} />
                ) : (
                  <FaStop onClick={handlePauseRecording} />
                )}
              </div>
            )}
          </div>
        )}
        <div className="xs:w-10 w-60" ref={waveFormRef} hidden={isRecording} />
        {recordedAudio && isPlaying && (
          <span>{formatTime(currentPlaybackTime)}</span>
        )}
        {recordedAudio && !isPlaying && (
          <span>{formatTime(totalDuration)}</span>
        )}
        <audio ref={audioRef} hidden />
      </div>
      <div className='xs:mr-2 mr-4'>
        {!isRecording ? (
          <FaMicrophone
            className="text-red-500 cursor-pointer"
            onClick={handleStartRecording}
          />
        ) : (
          <FaPauseCircle
            className="text-red-500 cursor-pointer"
            onClick={handleStopRecording}
          />
        )}
      </div>

      <div>
        <MdSend
          className="xs:mr-0 text-panel-header-icon cursor-pointer mr-4"
          title="send"
          onClick={sendRecording}
        />
      </div>
    </div>
  );
};

export default CaptureAudio;
