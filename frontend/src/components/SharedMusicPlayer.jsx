import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Play, Pause, Volume2, VolumeX, SkipForward, SkipBack, Music, X, Loader } from 'lucide-react';
import { Slider } from './ui/slider';
import { toast } from 'sonner';
import { ScrollArea } from './ui/scroll-area';
import axios from 'axios';

const SharedMusicPlayer = ({ open, onClose, partnerId, partnerName, onSendControl, currentUserId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
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
    if (currentSong && window.YT && window.YT.Player) {
      initializePlayer();
    }
  }, [currentSong]);

  // البحث باستخدام YouTube Data API v3 (بدون مفتاح - استخدام طريقة بديلة)
  const searchMusic = async () => {
    if (!searchQuery.trim()) {
      toast.error('الرجاء إدخال اسم الأغنية');
      return;
    }

    setIsSearching(true);
    try {
      // استخدام YouTube oEmbed API للبحث (لا يحتاج API Key)
      // أو يمكن استخدام Invidious API (بديل مجاني لـ YouTube)
      const searchTerm = encodeURIComponent(searchQuery + ' audio');
      
      // محاكاة نتائج البحث من YouTube (في الإنتاج، استخدم API حقيقية)
      // يمكن استخدام: https://invidious.io/api/v1/search?q=query
      const mockResults = [
        {
          id: `search_${Date.now()}_1`,
          videoId: 'dQw4w9WgXcQ', // مثال
          title: `${searchQuery} - Official Audio`,
          artist: 'فنان',
          thumbnail: `https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg`,
          duration: '3:45'
        },
        {
          id: `search_${Date.now()}_2`,
          videoId: 'jNQXAC9IVRw',
          title: `${searchQuery} - Lyrics`,
          artist: 'فنان آخر',
          thumbnail: `https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg`,
          duration: '4:12'
        },
        {
          id: `search_${Date.now()}_3`,
          videoId: '9bZkp7q19f0',
          title: `${searchQuery} - Remix`,
          artist: 'DJ Mix',
          thumbnail: `https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg`,
          duration: '3:30'
        }
      ];

      setSearchResults(mockResults);
      toast.success(`تم العثور على ${mockResults.length} أغنية`);
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

    // إخفاء المشغل (صوت فقط)
    const container = document.getElementById('music-player-container');
    if (container) {
      container.style.display = 'none';
    }

    playerRef.current = new window.YT.Player('music-player', {
      videoId: currentSong.videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        fs: 0,
        iv_load_policy: 3
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
    } else if (event.data === window.YT.PlayerState.ENDED) {
      setIsPlaying(false);
      // تشغيل الأغنية التالية تلقائياً
    }
  };

  const handleSelectSong = (song) => {
    setCurrentSong(song);
    onSendControl({
      type: 'select_song',
      song: song,
      userId: currentUserId
    });
    toast.success(`يتم تشغيل: ${song.title}`);
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
      case 'select_song':
        setCurrentSong(control.song);
        break;
      case 'play':
        playerRef.current.playVideo();
        if (control.time) {
          playerRef.current.seekTo(control.time);
        }
        break;
      case 'pause':
        playerRef.current.pauseVideo();
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
    window.handleMusicControl = handleIncomingControl;
    return () => {
      delete window.handleMusicControl;
    };
  }, [currentUserId, currentSong]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-effect border-slate-700 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              مشغل الموسيقى مع {partnerName}
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
          {/* Search Bar */}
          <div className="glass-effect rounded-lg p-4">
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchMusic()}
                  placeholder="ابحث عن أغنية، فنان، أو ألبوم..."
                  className="bg-slate-800/50 border-slate-600 text-white pl-10"
                  disabled={isSearching}
                />
              </div>
              <Button
                onClick={searchMusic}
                disabled={isSearching}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isSearching ? <Loader className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              ابحث عن أي أغنية من YouTube وشاركها مع {partnerName}
            </p>
          </div>

          {/* Current Song Display */}
          {currentSong && (
            <div className="glass-effect rounded-lg p-6 space-y-4">
              <div className="flex gap-4">
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-24 h-24 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">{currentSong.title}</h3>
                  <p className="text-slate-400 mb-2">{currentSong.artist}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-400">يستمع {partnerName} معك</span>
                  </div>
                </div>
              </div>

              {/* Player Controls */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={togglePlay}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full w-12 h-12"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>

                  <div className="flex-1 space-y-1">
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

                <div className="flex items-center gap-4">
                  <Button
                    onClick={toggleMute}
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>

                  <div className="flex items-center gap-3 flex-1 max-w-xs">
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
              </div>

              {/* Hidden YouTube Player */}
              <div id="music-player-container" style={{ display: 'none' }}>
                <div id="music-player"></div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-white font-semibold px-2">نتائج البحث</h4>
              <ScrollArea className="h-64 rounded-lg">
                <div className="space-y-2">
                  {searchResults.map((song) => (
                    <div
                      key={song.id}
                      onClick={() => handleSelectSong(song)}
                      className={`flex gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        currentSong?.id === song.id
                          ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500'
                          : 'glass-effect hover:bg-slate-700/50'
                      }`}
                    >
                      <img
                        src={song.thumbnail}
                        alt={song.title}
                        className="w-16 h-16 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="text-white font-semibold truncate">{song.title}</h5>
                        <p className="text-slate-400 text-sm truncate">{song.artist}</p>
                        <p className="text-slate-500 text-xs">{song.duration}</p>
                      </div>
                      {currentSong?.id === song.id && (
                        <div className="flex items-center">
                          <div className="flex gap-1">
                            <div className="w-1 h-4 bg-purple-500 animate-pulse"></div>
                            <div className="w-1 h-6 bg-pink-500 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-1 h-5 bg-purple-500 animate-pulse" style={{animationDelay: '0.4s'}}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {!currentSong && searchResults.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-6">
                <Music className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ابحث عن أغنية</h3>
              <p className="text-slate-400">
                ابحث عن أي أغنية واستمع إليها مع {partnerName}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SharedMusicPlayer;
