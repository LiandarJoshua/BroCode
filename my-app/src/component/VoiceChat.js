import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Users } from 'lucide-react';

const VoiceChat = ({ socketRef, roomId, username }) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [error, setError] = useState('');
  
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const audioContextRef = useRef(null);

  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputs);
        if (audioInputs.length > 0) {
          setSelectedDevice(audioInputs[0].deviceId);
        }
      } catch (err) {
        setError('Failed to initialize audio devices');
        console.error('Audio initialization error:', err);
      }
    };
    
    initAudio();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const createPeerConnection = (peerId, peerUsername) => {
    if (peerConnectionsRef.current[peerId]) {
      peerConnectionsRef.current[peerId].close();
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: 'turn:numb.viagenie.ca',
          username: 'webrtc@live.com',
          credential: 'muazkh'
        }
      ]
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          peerId,
          roomId
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setParticipants(prev => {
        const participantIndex = prev.findIndex(p => p.id === peerId);
        if (participantIndex !== -1) {
          const updatedParticipants = [...prev];
          updatedParticipants[participantIndex] = {
            ...updatedParticipants[participantIndex],
            stream: remoteStream
          };
          return updatedParticipants;
        }
        return [...prev, { id: peerId, name: peerUsername, stream: remoteStream }];
      });
    };

    peerConnectionsRef.current[peerId] = peerConnection;
    return peerConnection;
  };

  const connectToVoiceChat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      localStreamRef.current = stream;
      setIsConnected(true);
      setIsMuted(false);
      
      socketRef.current.emit('voice-join', { roomId, username });
      
      // Add self to participants list
      setParticipants(prev => {
        if (!prev.find(p => p.id === socketRef.current.id)) {
          return [...prev, { id: socketRef.current.id, name: username, stream: null }];
        }
        return prev;
      });
    } catch (err) {
      setError('Failed to access microphone');
      console.error('Voice chat connection error:', err);
    }
  };

  useEffect(() => {
    if (!socketRef.current || !isConnected) return;

    const handleOffer = async ({ offer, peerId, username: peerUsername }) => {
      try {
        const pc = createPeerConnection(peerId, peerUsername);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current.emit('voice-answer', { answer, peerId });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    };

    const handleAnswer = async ({ answer, peerId }) => {
      try {
        const pc = peerConnectionsRef.current[peerId];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    };

    const handleIceCandidate = async ({ candidate, peerId }) => {
      try {
        const pc = peerConnectionsRef.current[peerId];
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    const handleUserJoined = ({ userId, username: peerUsername }) => {
      setParticipants(prev => {
        if (!prev.find(p => p.id === userId)) {
          return [...prev, { id: userId, name: peerUsername }];
        }
        return prev;
      });
      
      // Initiate call to new participant
      const pc = createPeerConnection(userId, peerUsername);
      try {
        pc.createOffer().then(offer => {
          pc.setLocalDescription(offer).then(() => {
            socketRef.current.emit('voice-offer', { 
              offer, 
              peerId: userId,
              username // Include local username in the offer
            });
          });
        });
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    };

    const handleUserLeft = ({ userId }) => {
      setParticipants(prev => prev.filter(p => p.id !== userId));
      if (peerConnectionsRef.current[userId]) {
        peerConnectionsRef.current[userId].close();
        delete peerConnectionsRef.current[userId];
      }
    };

    socketRef.current.on('voice-offer', handleOffer);
    socketRef.current.on('voice-answer', handleAnswer);
    socketRef.current.on('ice-candidate', handleIceCandidate);
    socketRef.current.on('voice-user-joined', handleUserJoined);
    socketRef.current.on('voice-user-left', handleUserLeft);

    return () => {
      socketRef.current.off('voice-offer');
      socketRef.current.off('voice-answer');
      socketRef.current.off('ice-candidate');
      socketRef.current.off('voice-user-joined');
      socketRef.current.off('voice-user-left');
    };
  }, [socketRef, isConnected, roomId, username]);

  const disconnect = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    
    setIsConnected(false);
    setIsMuted(true);
    setIsDeafened(false);
    setParticipants([]);
    socketRef.current.emit('voice-leave', { roomId, username });
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
    participants.forEach(participant => {
      if (participant.audioEl) {
        participant.audioEl.muted = !isDeafened;
      }
    });
  };

  return (
    <div className="fixed bottom-0 right-0 p-4 bg-gray-800 rounded-tl-lg shadow-lg">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <div className="flex items-center space-x-2">
            <Users size={16} />
            <span className="text-sm text-gray-300">{participants.length}</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={toggleMute}
            className={`p-2 rounded ${
              isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          
          <button
            onClick={toggleDeafen}
            className={`p-2 rounded ${
              isDeafened ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
            }`}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            {isDeafened ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <button
            onClick={isConnected ? disconnect : connectToVoiceChat}
            className={`p-2 rounded ${
              isConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>

        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="bg-gray-700 text-white text-sm rounded p-1"
          disabled={isConnected}
        >
          {audioDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
            </option>
          ))}
        </select>

        <div className="max-h-32 overflow-y-auto">
          {participants.map(participant => (
            <div key={participant.id} className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-300">{participant.name}</span>
              {participant.stream && (
                <audio
                  ref={el => {
                    if (el) {
                      el.srcObject = participant.stream;
                      el.play().catch(console.error);
                      participant.audioEl = el;
                    }
                  }}
                  autoPlay
                  playsInline
                  muted={isDeafened}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="text-red-500 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceChat;