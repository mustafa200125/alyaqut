import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, MonitorOff } from 'lucide-react';
import { toast } from 'sonner';

const VideoCallDialog = ({ open, onClose, isVideo, partnerName, onCallEnd }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  useEffect(() => {
    if (open) {
      startCall();
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [open]);

  const startCall = async () => {
    try {
      // Check if media devices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('متصفحك لا يدعم المكالمات. يرجى استخدام HTTPS أو متصفح حديث.');
        onClose();
        return;
      }

      // Check available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMicrophone = devices.some(device => device.kind === 'audioinput');
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      
      if (!hasMicrophone) {
        toast.error('لم يتم العثور على ميكروفون. يرجى توصيل ميكروفون والمحاولة مرة أخرى.');
        onClose();
        return;
      }
      
      if (isVideo && !hasCamera) {
        toast.error('لم يتم العثور على كاميرا. يرجى توصيل كاميرا أو استخدام المكالمة الصوتية.');
        onClose();
        return;
      }

      const constraints = {
        audio: true,
        video: isVideo && hasCamera ? { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current && isVideo) {
        localVideoRef.current.srcObject = stream;
      }

      toast.success(isVideo ? 'مكالمة فيديو جاهزة' : 'مكالمة صوتية جاهزة');
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Provide specific error messages
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('لم يتم العثور على ' + (isVideo ? 'الكاميرا أو الميكروفون' : 'الميكروفون') + '. يرجى توصيل الأجهزة والمحاولة مرة أخرى.');
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('تم رفض إذن الوصول للأجهزة. يرجى السماح بالوصول من إعدادات المتصفح.');
      } else if (error.name === 'NotReadableError') {
        toast.error('الأجهزة قيد الاستخدام من تطبيق آخر.');
      } else if (error.name === 'OverconstrainedError') {
        toast.error('إعدادات الكاميرا المطلوبة غير مدعومة.');
      } else {
        toast.error('فشل الوصول للأجهزة. يرجى التحقق من الإعدادات والمحاولة مرة أخرى.');
      }
      
      onClose();
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          }
        });
        screenStreamRef.current = screenStream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        toast.success('بدأت مشاركة الشاشة');
      } else {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        setIsScreenSharing(false);
        toast.success('توقفت مشاركة الشاشة');
      }
    } catch (error) {
      console.error('Screen share error:', error);
      toast.error('فشلت مشاركة الشاشة');
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    onCallEnd();
    onClose();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-effect border-slate-700 max-w-6xl p-0">
        <div className="relative bg-slate-900 rounded-lg overflow-hidden">
          {/* Remote Video (Full screen) */}
          <div className="relative w-full h-[600px] bg-slate-800 flex items-center justify-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {!remoteVideoRef.current?.srcObject && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-4">
                  <span className="text-5xl text-white font-bold">
                    {partnerName[0]?.toUpperCase()}
                  </span>
                </div>
                <p className="text-white text-2xl font-bold">{partnerName}</p>
                <p className="text-slate-400 mt-2">في انتظار الاتصال...</p>
              </div>
            )}
          </div>

          {/* Local Video (Picture in Picture) */}
          {isVideo && (
            <div className="absolute top-4 right-4 w-64 h-48 bg-slate-800 rounded-lg overflow-hidden border-2 border-blue-500 shadow-2xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            </div>
          )}

          {/* Call Info */}
          <div className="absolute top-4 left-4 glass-effect px-4 py-2 rounded-lg">
            <p className="text-white text-sm font-semibold">{formatDuration(callDuration)}</p>
          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 glass-effect p-6">
            <div className="flex justify-center items-center gap-4">
              {/* Mute Button */}
              <Button
                onClick={toggleMute}
                size="lg"
                className={`rounded-full w-14 h-14 ${
                  isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>

              {/* Video Toggle */}
              {isVideo && (
                <Button
                  onClick={toggleVideo}
                  size="lg"
                  className={`rounded-full w-14 h-14 ${
                    !isVideoEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </Button>
              )}

              {/* Screen Share */}
              <Button
                onClick={toggleScreenShare}
                size="lg"
                className={`rounded-full w-14 h-14 ${
                  isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {isScreenSharing ? <Monitor className="w-6 h-6" /> : <MonitorOff className="w-6 h-6" />}
              </Button>

              {/* End Call */}
              <Button
                onClick={endCall}
                size="lg"
                className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="w-8 h-8" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallDialog;
