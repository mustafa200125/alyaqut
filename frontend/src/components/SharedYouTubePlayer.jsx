import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Play, Pause, Volume2, VolumeX, Maximize2, X } from 'lucide-react';
import { Slider } from './ui/slider';
import { toast } from 'sonner';
import { ScrollArea } from './ui/scroll-area';

const SharedYouTubePlayer = ({ open, onClose, partnerId, partnerName, onSendControl, currentUserId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  // YouTube API Key - يجب أن يكون من المتغيرات البيئية في الإنتاج
  const YOUTUBE_API_KEY = 'AIzaSyDummy'; // استخدم مفتاح حقيقي

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

  const searchYouTube = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // بحث بسيط باستخدام YouTube Data API
      // في حالة الإنتاج، يجب استخدام API حقيقية من الباك اند
      const mockResults = [
        {
          id: 'dQw4w9WgXcQ',
          title: searchQuery + ' - نتيجة 1',
          thumbnail: `https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg`,
          channel: 'قناة تجريبية'
        },
        {
          id: 'jNQXAC9IVRw',
          title: searchQuery + ' - نتيجة 2',
          thumbnail: `https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg`,
          channel: 'قناة تجريبية 2'
        },
        {
          id: '9bZkp7q19f0',
          title: searchQuery + ' - نتيجة 3',
          thumbnail: `https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg`,
          channel: 'قناة تجريبية 3'
        }
      ];
      setSearchResults(mockResults);
      toast.success('تم البحث بنجاح');
    } catch (error) {
      console.error('Search error:', error);
      toast.error('فشل البحث');
    } finally {
      setIsSearching(false);
    }
  };

  const initializePlayer = () => {
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    playerRef.current = new window.YT.Player('youtube-player', {
      videoId: selectedVideo.id,
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0
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

  const handleSelectVideo = (video) => {
    setSelectedVideo(video);
    // إرسال إشعار للطرف الآخر
    onSendControl({
      type: 'select_video',
      video: video,
      userId: currentUserId
    });
    toast.success(`تم اختيار: ${video.title}`);
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
    onSendControl({
      type: 'volume',
      volume: newVolume,
      userId: currentUserId
    });
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
      case 'volume':
        setVolume(control.volume);
        playerRef.current.setVolume(control.volume);
        break;
      case 'seek':
        playerRef.current.seekTo(control.time);
        setCurrentTime(control.time);
        break;
      default:
        break;
    }
  };

  // تصدير دالة للاستخدام من الخارج
  useEffect(() => {
    window.handleYouTubeControl = handleIncomingControl;
    return () => {
      delete window.handleYouTubeControl;
    };
  }, [currentUserId, selectedVideo]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-effect border-slate-700 max-w-6xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <span>مشاهدة يوتيوب مع {partnerName}</span>
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
          {/* Search Bar */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchYouTube()}
              placeholder="ابحث عن فيديو أو أغنية..."
              className="flex-1 bg-slate-800/50 border-slate-600 text-white"
            />
            <Button
              onClick={searchYouTube}
              disabled={isSearching}
              className="btn-sapphire"
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && !selectedVideo && (
            <ScrollArea className="h-64 rounded-lg border border-slate-700 p-4">
              <div className="grid grid-cols-1 gap-3">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleSelectVideo(result)}
                    className="flex gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 cursor-pointer transition-colors"
                  >
                    <img
                      src={result.thumbnail}
                      alt={result.title}
                      className="w-32 h-20 rounded object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="text-white font-semibold line-clamp-2">
                        {result.title}
                      </h4>
                      <p className="text-slate-400 text-sm mt-1">{result.channel}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Video Player */}
          {selectedVideo && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <div id="youtube-player" className="w-full h-[400px]"></div>
              </div>

              {/* Controls */}
              <div className="glass-effect rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={togglePlay}
                    size="sm"
                    className="btn-sapphire"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>

                  <div className="flex-1">
                    <Slider
                      value={[currentTime]}
                      max={duration}
                      step={1}
                      onValueChange={handleSeek}
                      className="cursor-pointer"
                    />
                  </div>

                  <span className="text-white text-sm min-w-[80px]">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    onClick={toggleMute}
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>

                  <div className="flex-1 max-w-xs">
                    <Slider
                      value={[volume]}
                      max={100}
                      step={1}
                      onValueChange={handleVolumeChange}
                      className="cursor-pointer"
                    />
                  </div>

                  <span className="text-white text-sm">{volume}%</span>
                </div>

                <p className="text-slate-400 text-sm text-center">
                  {partnerName} يشاهد معك الآن
                </p>
              </div>

              {/* Change Video Button */}
              <Button
                onClick={() => setSelectedVideo(null)}
                variant="outline"
                className="w-full border-slate-600 text-slate-300"
              >
                تغيير الفيديو
              </Button>
            </div>
          )}

          {searchResults.length === 0 && !selectedVideo && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">ابحث عن فيديو أو أغنية لمشاهدتها معاً</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SharedYouTubePlayer;
