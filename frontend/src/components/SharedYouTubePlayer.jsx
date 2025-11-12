import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Play, Pause, Volume2, VolumeX, Link, X } from 'lucide-react';
import { Slider } from './ui/slider';
import { toast } from 'sonner';

const SharedYouTubePlayer = ({ open, onClose, partnerId, partnerName, onSendControl, currentUserId }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedVideo && window.YT && window.YT.Player) {
      initializePlayer();
    }
  }, [selectedVideo]);

  // استخراج video ID من رابط يوتيوب
  const extractVideoId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // إذا كان ID مباشرة
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const handleLoadVideo = () => {
    if (!videoUrl.trim()) {
      toast.error('الرجاء إدخال رابط يوتيوب');
      return;
    }

    const videoId = extractVideoId(videoUrl);
    
    if (!videoId) {
      toast.error('رابط يوتيوب غير صحيح');
      return;
    }

    const video = {
      id: videoId,
      title: 'فيديو يوتيوب',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };

    setSelectedVideo(video);
    onSendControl({
      type: 'select_video',
      video: video,
      userId: currentUserId
    });
    toast.success('تم تحميل الفيديو');
  };

  const initializePlayer = () => {
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    playerRef.current = new window.YT.Player('youtube-player', {
      videoId: selectedVideo.id,
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        fs: 1,
        cc_load_policy: 0,
        iv_load_policy: 3,
        autohide: 1
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange
      }
    });
  };

  const onPlayerReady = (event) => {
    setDuration(event.target.getDuration());
    playerRef.current.setVolume(volume);
    
    intervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 1000);
  };

  const onPlayerStateChange = (event) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
    } else if (event.data === window.YT.PlayerState.PAUSED) {
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pauseVideo();
      onSendControl({
        type: 'pause',
        time: currentTime,
        userId: currentUserId
      });
    } else {
      playerRef.current.playVideo();
      onSendControl({
        type: 'play',
        time: currentTime,
        userId: currentUserId
      });
    }
  };

  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleSeek = (value) => {
    const newTime = value[0];
    if (playerRef.current) {
      playerRef.current.seekTo(newTime);
      setCurrentTime(newTime);
      onSendControl({
        type: 'seek',
        time: newTime,
        userId: currentUserId
      });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // معالجة التحكم الوارد من الطرف الآخر
  const handleIncomingControl = (control) => {
    if (!playerRef.current || control.userId === currentUserId) return;

    switch (control.type) {
      case 'select_video':
        setSelectedVideo(control.video);
        break;
      case 'play':
        playerRef.current.playVideo();
        if (control.time) {
          playerRef.current.seekTo(control.time);
        }
        break;
      case 'pause':
        playerRef.current.pauseVideo();
        if (control.time) {
          playerRef.current.seekTo(control.time);
        }
        break;
      case 'seek':
        playerRef.current.seekTo(control.time);
        setCurrentTime(control.time);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    window.handleYouTubeControl = handleIncomingControl;
    return () => {
      delete window.handleYouTubeControl;
    };
  }, [currentUserId, selectedVideo]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-effect border-slate-700 max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                <Play className="w-5 h-5 text-white" fill="white" />
              </div>
              مشاهدة يوتيوب مع {partnerName}
            </span>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL Input */}
          {!selectedVideo && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-14 h-14 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">شاهد يوتيوب معاً</h3>
                <p className="text-slate-400 mb-6">الصق رابط أي فيديو من يوتيوب لمشاهدته مع {partnerName}</p>
              </div>

              <div className="glass-effect rounded-lg p-6 space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleLoadVideo()}
                      placeholder="https://youtube.com/watch?v=..."
                      className="bg-slate-800/50 border-slate-600 text-white pl-10"
                    />
                  </div>
                  <Button
                    onClick={handleLoadVideo}
                    className="bg-red-600 hover:bg-red-700 text-white px-6"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    تشغيل
                  </Button>
                </div>
                
                <div className="text-sm text-slate-400 space-y-2">
                  <p className="font-semibold">أمثلة للروابط المدعومة:</p>
                  <div className="space-y-1 text-xs">
                    <p>• https://youtube.com/watch?v=dQw4w9WgXcQ</p>
                    <p>• https://youtu.be/dQw4w9WgXcQ</p>
                    <p>• dQw4w9WgXcQ (معرف الفيديو فقط)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Video Player */}
          {selectedVideo && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl">
                <div id="youtube-player" className="w-full aspect-video"></div>
              </div>

              {/* Controls */}
              <div className="glass-effect rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={togglePlay}
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 rounded-full w-12 h-12"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>

                  <div className="flex-1 space-y-2">
                    <Slider
                      value={[currentTime]}
                      max={duration}
                      step={1}
                      onValueChange={handleSeek}
                      className="cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={toggleMute}
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-300"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>

                    <div className="flex items-center gap-3 w-32">
                      <Slider
                        value={[volume]}
                        max={100}
                        step={1}
                        onValueChange={handleVolumeChange}
                        className="cursor-pointer"
                      />
                      <span className="text-white text-sm min-w-[35px]">{volume}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-slate-300">{partnerName} يشاهد معك</span>
                  </div>
                </div>
              </div>

              {/* Change Video Button */}
              <Button
                onClick={() => {
                  setSelectedVideo(null);
                  setVideoUrl('');
                }}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                تغيير الفيديو
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SharedYouTubePlayer;
