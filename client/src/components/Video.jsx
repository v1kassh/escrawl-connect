import { useState, useRef, useEffect } from 'react';
import { Camera, Mic, PhoneOff, Video, Monitor, MicOff, VideoOff, Copy, UserPlus, Users, MessageSquare, Info, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { useNavigate, useParams } from 'react-router-dom';
import { API_URL } from '../config';

const socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    reconnectionattempts: 5,
    reconnectiondelay: 1000,
    auth: (cb) => {
        const token = localStorage.getItem('token');
        cb({ token });
    }
});

const VideoCall = () => {
    const navigate = useNavigate();
    const { roomId } = useParams();
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [callStatus, setCallStatus] = useState('Initializing...');
    const [copySuccess, setCopySuccess] = useState('');
    const [showInfo, setShowInfo] = useState(false);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);
    const localStream = useRef(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
        ]
    };

    useEffect(() => {
        if (!roomId) {
            navigate('/video');
            return;
        }

        const startCall = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStream.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;

                socket.emit('join-room', roomId, user);
                setCallStatus('Waiting for others...');

                socket.on('notification', (data) => {
                    if (data.text.includes('joined') && !data.text.includes(user.username)) {
                        createOffer();
                    }
                });

                socket.on('offer', handleOffer);
                socket.on('answer', handleAnswer);
                socket.on('ice-candidate', handleIceCandidate);

            } catch (err) {
                console.error('Error accessing media', err);
                setCallStatus('Media Access Error');
            }
        };

        startCall();

        return () => {
            if (localStream.current) localStream.current.getTracks().forEach(track => track.stop());
            if (peerConnection.current) peerConnection.current.close();
            socket.off('notification');
            socket.off('offer');
            socket.off('answer');
            socket.off('ice-candidate');
            socket.emit('leave-room', roomId);
        };
    }, [roomId]);

    const createPeerConnection = () => {
        const pc = new RTCPeerConnection(rtcConfig);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { target: roomId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
                setCallStatus('Connected');
            }
        };

        localStream.current.getTracks().forEach(track => pc.addTrack(track, localStream.current));
        peerConnection.current = pc;
        return pc;
    };

    const createOffer = async () => {
        const pc = createPeerConnection();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { target: roomId, sdp: offer });
        setCallStatus('Calling...');
    };

    const handleOffer = async (payload) => {
        const pc = createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { target: roomId, sdp: answer });
        setCallStatus('Connecting...');
    };

    const handleAnswer = async (payload) => {
        if (!peerConnection.current) return;
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    };

    const handleIceCandidate = async (payload) => {
        if (!peerConnection.current) return;
        try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
            console.error('Error adding ice candidate', e);
        }
    };

    const [localMicOn, setLocalMicOn] = useState(true);
    const [localCamOn, setLocalCamOn] = useState(true);

    const toggleMic = () => {
        if (localStream.current) {
            localStream.current.getAudioTracks().forEach(track => track.enabled = !micOn);
            setMicOn(!micOn);
            setLocalMicOn(!micOn);
        }
    };

    const toggleCam = () => {
        if (localStream.current) {
            localStream.current.getVideoTracks().forEach(track => track.enabled = !camOn);
            setCamOn(!camOn);
            setLocalCamOn(!camOn);
        }
    };

    const copyJoiningInfo = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
    };

    const endCall = () => {
        if (localStream.current) localStream.current.getTracks().forEach(track => track.stop());
        if (peerConnection.current) peerConnection.current.close();
        navigate('/video');
    };

    return (
        <div className="flex flex-col h-screen bg-neutral-950 text-white overflow-hidden relative selection:bg-teal-500/30">

            {/* Top Bar (Call Info) */}
            <div className="absolute top-6 left-6 z-20 flex items-center space-x-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 shadow-lg">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-sm font-medium tracking-wide font-mono text-slate-200">{roomId}</span>
                <div className="h-4 w-px bg-white/10 mx-2"></div>
                <span className="text-xs text-slate-400 font-medium">{callStatus}</span>
            </div>

            {/* Right Top Actions */}
            <div className="absolute top-6 right-6 z-20 flex items-center space-x-3">
                <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/5 hover:bg-white/10 transition-colors"
                >
                    <Info className="w-5 h-5 text-slate-300" />
                </button>
            </div>

            {/* Main Video Area */}
            <div className="flex-1 relative flex items-center justify-center p-4 sm:p-6 lg:p-8">

                {/* Remote Video Container */}
                <div className="relative w-full h-full max-w-[1600px] bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl border border-white/5 ring-1 ring-white/5">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover opacity-100"
                    />

                    {/* Placeholder / Waiting State */}
                    {callStatus !== 'Connected' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 z-10">
                            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-6 animate-pulse ring-4 ring-slate-800/50">
                                <Users className="w-10 h-10 text-slate-500" />
                            </div>
                            <h2 className="text-2xl font-semibold mb-2 text-slate-200">{callStatus}</h2>
                            <p className="text-slate-500 max-w-xs text-center mb-8">Ready to connect. Invite others to join this secure line.</p>

                            <button
                                onClick={copyJoiningInfo}
                                className="flex items-center space-x-2 bg-teal-600/90 hover:bg-teal-600 text-white px-6 py-3 rounded-full font-medium transition-all shadow-lg shadow-teal-500/20 active:scale-95"
                            >
                                <Copy className="w-4 h-4" />
                                <span>{copySuccess || "Copy Joining Link"}</span>
                            </button>
                        </div>
                    )}

                    {/* Encryption Badge */}
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-1.5 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
                        <ShieldCheck className="w-3 h-3 text-teal-400" />
                        <span className="text-[10px] font-medium text-teal-400 uppercase tracking-wider">End-to-End Encrypted</span>
                    </div>
                </div>

                {/* Local Video (Floating PiP) */}
                <motion.div
                    drag
                    dragElastic={0.2}
                    dragConstraints={{ left: -500, right: 500, top: -300, bottom: 300 }}
                    whileHover={{ scale: 1.02 }}
                    className="absolute bottom-8 right-8 w-64 aspect-video bg-neutral-800 rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-30 cursor-grab active:cursor-grabbing group"
                >
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transform -scale-x-100 ${!localCamOn ? 'hidden' : ''}`}
                    />
                    {!localCamOn && (
                        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-teal-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {user.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                        </div>
                    )}

                    {/* Local Status Indicators */}
                    <div className="absolute bottom-3 left-3 flex items-center space-x-2">
                        <div className="bg-black/60 px-2 py-1 rounded-md backdrop-blur-md border border-white/5">
                            <span className="text-[10px] font-bold text-white tracking-wide">YOU</span>
                        </div>
                        {!localMicOn && (
                            <div className="bg-red-500/90 p-1.5 rounded-full shadow-lg shadow-red-500/20">
                                <MicOff className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Bottom Floating Control Bar */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-40">
                <div className="flex items-center space-x-4 bg-neutral-900/90 backdrop-blur-xl px-8 py-4 rounded-full border border-white/10 shadow-2xl shadow-black/50">

                    <button
                        onClick={toggleMic}
                        className={`p-4 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 group ${micOn ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-white/5' : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/40'}`}
                        title={micOn ? "Mute Microphone" : "Unmute Microphone"}
                    >
                        {micOn ? <Mic className="w-5 h-5 group-hover:text-teal-400 transition-colors" /> : <MicOff className="w-5 h-5" />}
                    </button>

                    <button
                        onClick={toggleCam}
                        className={`p-4 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 group ${camOn ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-white/5' : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/40'}`}
                        title={camOn ? "Turn Off Camera" : "Turn On Camera"}
                    >
                        {camOn ? <Camera className="w-5 h-5 group-hover:text-blue-400 transition-colors" /> : <VideoOff className="w-5 h-5" />}
                    </button>

                    {/* Divider */}
                    <div className="w-px h-8 bg-white/10 mx-2"></div>

                    <button
                        onClick={endCall}
                        className="px-8 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl shadow-red-600/20 flex items-center space-x-2"
                        title="End Call"
                    >
                        <PhoneOff className="w-5 h-5" />
                        <span className="hidden sm:inline">End Call</span>
                    </button>
                </div>
            </div>

            {/* Info Modal/Panel (Simple implementation) */}
            <AnimatePresence>
                {showInfo && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute top-20 right-6 z-50 bg-neutral-900/95 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl w-80"
                    >
                        <h3 className="text-lg font-bold text-white mb-4">Meeting Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-semibold">Joining Link</label>
                                <div className="flex items-center mt-1 bg-neutral-800 rounded-lg p-2 border border-white/5">
                                    <p className="text-xs text-slate-300 truncate flex-1 font-mono">{window.location.href}</p>
                                    <button onClick={copyJoiningInfo} className="p-1.5 hover:bg-white/10 rounded-md text-teal-400 transition-colors"><Copy className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/5">
                                <p className="text-xs text-slate-500">
                                    Encryption: <span className="text-teal-400">AES-256 (Simulated)</span>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VideoCall;
