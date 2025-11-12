import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { ArrowLeft, Send, Phone, Video, Image, Film, Paperclip, Smile, Mic, Square, Play, Pause, Youtube } from 'lucide-react';
import { Separator } from '../components/ui/separator';
import VideoCallDialog from '../components/VideoCallDialog';
import AudioPlayer from '../components/AudioPlayer';
import SharedYouTubePlayer from '../components/SharedYouTubePlayer';

const MessagesPage = () => {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callType, setCallType] = useState('audio');
  const [showYouTubePlayer, setShowYouTubePlayer] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchConversations();
    if (location.state?.selectedUser) {
      handleSelectUser(location.state.selectedUser);
    }
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API}/messages/conversations`);
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const handleSelectUser = async (partner) => {
    setSelectedUser(partner);
    try {
      const response = await axios.get(`${API}/messages/${partner.id}`);
      setMessages(response.data);
    } catch (error) {
      toast.error('فشل تحميل الرسائل');
    }
  };

  const sendMessage = async (messageData = null) => {
    const dataToSend = messageData || {
      receiver_id: selectedUser.id,
      content: newMessage,
      message_type: 'text'
    };

    if (!dataToSend.content && !dataToSend.media_url) return;

    try {
      await axios.post(`${API}/messages`, dataToSend);
      if (!messageData) setNewMessage('');
      const response = await axios.get(`${API}/messages/${selectedUser.id}`);
      setMessages(response.data);
      fetchConversations();
      scrollToBottom();
    } catch (error) {
      toast.error('فشل إرسال الرسالة');
    }
  };

  const handleFileSelect = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size
    const maxSize = type === 'video' ? 500 * 1024 * 1024 : 50 * 1024 * 1024; // 500MB for video, 50MB for images
    if (file.size > maxSize) {
      toast.error(`الملف كبير جداً. الحد الأقصى ${type === 'video' ? '500' : '50'} ميجابايت`);
      return;
    }

    toast.info('جاري تحميل الملف...');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        await sendMessage({
          receiver_id: selectedUser.id,
          content: type === 'image' ? 'صورة' : 'فيديو',
          message_type: type,
          media_url: base64Data,
          media_size: file.size
        });
        toast.success('تم إرسال الملف بنجاح');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('فشل تحميل الملف');
    }
  };

  const startCall = (isVideo) => {
    setCallType(isVideo ? 'video' : 'audio');
    setShowCallDialog(true);
    toast.success(isVideo ? 'بدء مكالمة فيديو...' : 'بدء مكالمة صوتية...');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Convert to base64 and send
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          await sendMessage({
            receiver_id: selectedUser.id,
            content: `رسالة صوتية (${formatTime(recordingTime)})`,
            message_type: 'audio',
            media_url: base64Audio,
            media_size: audioBlob.size
          });
          toast.success('تم إرسال الرسالة الصوتية');
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('بدأ التسجيل...');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('فشل الوصول للميكروفون');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      toast.info('تم إلغاء التسجيل');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleYouTubeControl = async (control) => {
    try {
      // إرسال أمر التحكم كرسالة خاصة
      await sendMessage({
        receiver_id: selectedUser.id,
        content: `YouTube Control: ${control.type}`,
        message_type: 'youtube_control',
        media_url: JSON.stringify(control)
      });
    } catch (error) {
      console.error('Failed to send YouTube control:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // استقبال أوامر يوتيوب من الرسائل
  useEffect(() => {
    messages.forEach(message => {
      if (message.message_type === 'youtube_control' && message.sender_id !== user.id) {
        try {
          const control = JSON.parse(message.media_url);
          if (window.handleYouTubeControl) {
            window.handleYouTubeControl(control);
          }
        } catch (error) {
          console.error('Failed to parse YouTube control:', error);
        }
      }
    });
  }, [messages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          data-testid="back-to-home-btn"
          variant="ghost"
          onClick={() => navigate('/home')}
          className="mb-6 text-slate-200 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          عودة
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          <Card className="glass-effect border-slate-700 p-4 col-span-1">
            <h2 className="text-xl font-bold text-white mb-4" style={{fontFamily: 'Playfair Display'}}>
              المحادثات
            </h2>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">لا توجد محادثات</p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.partner.id}
                      data-testid="conversation-item"
                      onClick={() => handleSelectUser(conv.partner)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-slate-700/50 ${
                        selectedUser?.id === conv.partner.id ? 'bg-slate-700/50' : ''
                      }`}
                    >
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                          {conv.partner.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{conv.partner.username}</p>
                        <p className="text-sm text-slate-400 truncate">
                          {conv.last_message.content}
                        </p>
                      </div>
                      {conv.unread_count > 0 && (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">
                          {conv.unread_count}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>

          <Card className="glass-effect border-slate-700 p-6 col-span-1 md:col-span-2 flex flex-col">
            {selectedUser ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {selectedUser.avatar_url ? (
                        <img src={selectedUser.avatar_url} alt={selectedUser.username} className="w-full h-full object-cover" />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                          {selectedUser.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-white">{selectedUser.username}</h3>
                      <p className="text-sm text-slate-400">نشط الآن</p>
                    </div>
                  </div>
                  
                  {/* Call Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => startCall(false)}
                      size="sm"
                      variant="outline"
                      className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                      data-testid="audio-call-btn"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => startCall(true)}
                      size="sm"
                      className="btn-sapphire"
                      data-testid="video-call-btn"
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Separator className="bg-slate-700 mb-6" />

                <ScrollArea className="flex-1 pr-4 mb-6">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === user.id ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg ${
                            message.sender_id === user.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-700 text-white'
                          }`}
                        >
                          {message.message_type === 'image' && message.media_url && (
                            <img 
                              src={message.media_url} 
                              alt="صورة" 
                              className="rounded-lg max-w-full cursor-pointer hover:opacity-90"
                              onClick={() => window.open(message.media_url, '_blank')}
                            />
                          )}
                          {message.message_type === 'video' && message.media_url && (
                            <video 
                              src={message.media_url} 
                              controls 
                              className="rounded-lg max-w-full"
                              style={{ maxHeight: '400px' }}
                            />
                          )}
                          {message.message_type === 'audio' && message.media_url && (
                            <div className="p-2">
                              <AudioPlayer audioUrl={message.media_url} />
                            </div>
                          )}
                          {(message.message_type === 'text' || !message.message_type) && (
                            <p className="whitespace-pre-wrap p-3">{message.content}</p>
                          )}
                          {message.media_url && message.message_type !== 'text' && message.message_type !== 'audio' && (
                            <p className="text-xs px-3 pb-2">{message.content}</p>
                          )}
                          <p className="text-xs opacity-70 px-3 pb-2">
                            {new Date(message.created_at).toLocaleTimeString('ar', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Message Input with Media Buttons */}
                <div className="space-y-3">
                  {isRecording ? (
                    /* Recording Interface */
                    <div className="glass-effect rounded-lg p-4 border border-red-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-white font-semibold">جاري التسجيل...</span>
                          <span className="text-blue-400 font-mono">{formatTime(recordingTime)}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={cancelRecording}
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            إلغاء
                          </Button>
                          <Button
                            onClick={stopRecording}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <Square className="w-4 h-4 mr-2" />
                            إيقاف وإرسال
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Normal Input Interface */
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const isVideo = file.type.startsWith('video/');
                            handleFileSelect(e, isVideo ? 'video' : 'image');
                          }
                        }}
                      />
                      
                      <Button
                        onClick={() => {
                          fileInputRef.current.accept = 'image/*';
                          fileInputRef.current.click();
                        }}
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        title="إرسال صورة"
                      >
                        <Image className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        onClick={() => {
                          fileInputRef.current.accept = 'video/*';
                          fileInputRef.current.click();
                        }}
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        title="إرسال فيديو"
                      >
                        <Film className="w-4 h-4" />
                      </Button>

                      <Button
                        onClick={startRecording}
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-400 hover:bg-red-500/10"
                        title="تسجيل رسالة صوتية"
                        data-testid="voice-record-btn"
                      >
                        <Mic className="w-4 h-4" />
                      </Button>

                      <Input
                        data-testid="message-input"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="اكتب رسالة..."
                      className="flex-1 bg-slate-800/50 border-slate-600 text-white"
                    />
                    <Button 
                      data-testid="send-message-btn"
                      onClick={() => sendMessage()}
                      className="btn-sapphire"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                  )}
                  <p className="text-xs text-slate-400 text-center">
                    الصور: حتى 50 ميجابايت | الفيديوهات: حتى 500 ميجابايت | الرسائل الصوتية بجودة عالية
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400">اختر محادثة للبدء</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Video Call Dialog */}
      <VideoCallDialog
        open={showCallDialog}
        onClose={() => setShowCallDialog(false)}
        isVideo={callType === 'video'}
        partnerName={selectedUser?.username || ''}
        onCallEnd={() => {
          toast.success('انتهت المكالمة');
        }}
      />
    </div>
  );
};

export default MessagesPage;