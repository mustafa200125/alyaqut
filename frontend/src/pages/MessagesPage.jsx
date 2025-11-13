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
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showImageTypeDialog, setShowImageTypeDialog] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [viewOnceImage, setViewOnceImage] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchConversations();
    if (location.state?.selectedUser) {
      handleSelectUser(location.state.selectedUser);
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
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
    
    // Clear previous polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    try {
      const response = await axios.get(`${API}/messages/${partner.id}`);
      setMessages(response.data);
      
      // Start polling for new messages every 2 seconds
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await axios.get(`${API}/messages/${partner.id}`);
          setMessages(response.data);
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 2000);
      
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

    setIsSending(true);
    
    // Optimistic update - add message immediately to UI
    const optimisticMessage = {
      id: 'temp-' + Date.now(),
      sender_id: user.id,
      receiver_id: selectedUser.id,
      content: dataToSend.content,
      message_type: dataToSend.message_type || 'text',
      media_url: dataToSend.media_url,
      created_at: new Date().toISOString(),
      sending: true
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    if (!messageData) setNewMessage('');
    scrollToBottom();

    try {
      await axios.post(`${API}/messages`, dataToSend);
      
      // Fetch updated messages
      const response = await axios.get(`${API}/messages/${selectedUser.id}`);
      setMessages(response.data);
      fetchConversations();
      scrollToBottom();
    } catch (error) {
      toast.error('فشل إرسال الرسالة');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
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

    // For images, show dialog to choose normal or view-once
    if (type === 'image') {
      setSelectedImageFile(file);
      setShowImageTypeDialog(true);
      return;
    }

    // For videos, send directly (no view-once option for now)
    const loadingToast = toast.loading('جاري تحميل الملف...');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        await sendMessage({
          receiver_id: selectedUser.id,
          content: 'فيديو',
          message_type: type,
          media_url: base64Data,
          media_size: file.size
        });
        toast.dismiss(loadingToast);
        toast.success('تم إرسال الملف بنجاح');
      };
      reader.onerror = () => {
        toast.dismiss(loadingToast);
        toast.error('فشل قراءة الملف');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('فشل تحميل الملف');
    }
  };

  const sendImageWithType = async (isViewOnce) => {
    if (!selectedImageFile) return;
    
    setShowImageTypeDialog(false);
    const loadingToast = toast.loading('جاري إرسال الصورة...');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        await sendMessage({
          receiver_id: selectedUser.id,
          content: isViewOnce ? '🔒 صورة مؤقتة' : 'صورة',
          message_type: 'image',
          media_url: base64Data,
          media_size: selectedImageFile.size,
          is_view_once: isViewOnce
        });
        toast.dismiss(loadingToast);
        toast.success(isViewOnce ? 'تم إرسال الصورة المؤقتة بنجاح' : 'تم إرسال الصورة بنجاح');
        setSelectedImageFile(null);
      };
      reader.onerror = () => {
        toast.dismiss(loadingToast);
        toast.error('فشل قراءة الصورة');
      };
      reader.readAsDataURL(selectedImageFile);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('فشل إرسال الصورة');
    }
  };

  const handleViewOnceImage = async (message) => {
    setViewOnceImage(message);
    
    // Mark as viewed in backend
    try {
      await axios.post(`${API}/messages/${message.id}/mark-viewed`);
    } catch (error) {
      console.error('Failed to mark as viewed:', error);
    }
  };

  const closeViewOnceImage = () => {
    setViewOnceImage(null);
  };

  const startCall = (isVideo) => {
    setCallType(isVideo ? 'video' : 'audio');
    setShowCallDialog(true);
    toast.success(isVideo ? 'بدء مكالمة فيديو...' : 'بدء مكالمة صوتية...');
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const startRecording = async () => {
    try {
      // Check if media devices are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('متصفحك لا يدعم تسجيل الصوت. يرجى استخدام HTTPS أو متصفح حديث.');
        return;
      }

      // Check if microphone is available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMicrophone = devices.some(device => device.kind === 'audioinput');
      
      if (!hasMicrophone) {
        toast.error('لم يتم العثور على ميكروفون. يرجى توصيل ميكروفون والمحاولة مرة أخرى.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        } 
      });
      
      // Determine best supported mime type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          toast.error('متصفحك لا يدعم تسجيل الصوت');
          stream.getTracks().forEach(track => track.stop());
          return;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
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
        
        const sendingToast = toast.loading('جاري إرسال الرسالة الصوتية...');
        
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
          toast.dismiss(sendingToast);
          toast.success('تم إرسال الرسالة الصوتية');
        };
        reader.onerror = () => {
          toast.dismiss(sendingToast);
          toast.error('فشل إرسال الرسالة الصوتية');
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
      
      // Provide specific error messages
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('لم يتم العثور على ميكروفون. يرجى توصيل ميكروفون والمحاولة مرة أخرى.');
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('تم رفض إذن الوصول للميكروفون. يرجى السماح بالوصول من إعدادات المتصفح.');
      } else if (error.name === 'NotReadableError') {
        toast.error('الميكروفون قيد الاستخدام من تطبيق آخر.');
      } else if (error.name === 'OverconstrainedError') {
        toast.error('إعدادات الميكروفون المطلوبة غير مدعومة.');
      } else {
        toast.error('فشل الوصول للميكروفون. يرجى التحقق من الإعدادات والمحاولة مرة أخرى.');
      }
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

  const emojis = [
    '😊', '😂', '❤️', '🥰', '😍', '🤗', '👍', '👏',
    '🙏', '💪', '✨', '🎉', '🔥', '💯', '🌟', '⭐',
    '😎', '🤔', '😢', '😭', '😡', '😴', '🥱', '😇',
    '🤩', '🥳', '😋', '🤤', '😷', '🤒', '🤕', '🤢',
    '👋', '🤝', '💐', '🌹', '🌺', '🌻', '🌷', '🌸',
    '☕', '🍕', '🍔', '🍟', '🎂', '🍰', '🍫', '🍪',
    '🚀', '✈️', '🚗', '🏠', '💼', '📱', '💻', '⌚',
    '🎵', '🎶', '🎤', '🎧', '📷', '🎨', '⚽', '🏀'
  ];

  const insertEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

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
  
  // Cleanup polling when component unmounts or user changes
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [selectedUser]);

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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Show conversations list or chat view */}
        {!selectedUser ? (
          /* Conversations List View */
          <>
            <Button
              data-testid="back-to-home-btn"
              variant="ghost"
              onClick={() => navigate('/home')}
              className="mb-6 text-slate-200 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              عودة للرئيسية
            </Button>

            <Card className="glass-effect border-slate-700 p-6">
              <h2 className="text-2xl font-bold text-white mb-6" style={{fontFamily: 'Playfair Display'}}>
                المحادثات
              </h2>
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="space-y-3">
                  {conversations.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-slate-400 text-lg mb-2">لا توجد محادثات بعد</p>
                      <p className="text-slate-500 text-sm">ابدأ محادثة جديدة من صفحة الاستكشاف</p>
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.partner.id}
                        data-testid="conversation-item"
                        onClick={() => handleSelectUser(conv.partner)}
                        className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-slate-700/50 transition-all border border-transparent hover:border-blue-500/30"
                      >
                        <Avatar className="w-14 h-14">
                          {conv.partner.avatar_url ? (
                            <img src={conv.partner.avatar_url} alt={conv.partner.username} className="w-full h-full object-cover" />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-lg">
                              {conv.partner.username[0]?.toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-lg truncate">{conv.partner.username}</p>
                          <p className="text-sm text-slate-400 truncate">
                            {conv.last_message.content}
                          </p>
                        </div>
                        {conv.unread_count > 0 && (
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white">
                            {conv.unread_count}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </>
        ) : (
          /* Full Screen Chat View */
          <Card className="glass-effect border-slate-700 flex flex-col h-[calc(100vh-100px)]">
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedUser(null)}
                    className="text-slate-200 hover:text-white p-2"
                    title="العودة للمحادثات"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </Button>
                  <Avatar className="w-12 h-12">
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} alt={selectedUser.username} className="w-full h-full object-cover" />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                        {selectedUser.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-white text-lg">{selectedUser.username}</h3>
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
                      title="مكالمة صوتية"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => startCall(true)}
                      size="sm"
                      className="btn-sapphire"
                      data-testid="video-call-btn"
                      title="مكالمة فيديو"
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setShowYouTubePlayer(true)}
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-400 hover:bg-red-500/10"
                      data-testid="youtube-btn"
                      title="مشاهدة يوتيوب معاً"
                    >
                      <Youtube className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Separator className="bg-slate-700 mb-6" />

                <ScrollArea className="flex-1 pr-4 mb-6">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === user.id ? 'justify-start' : 'justify-end'} ${message.sending ? 'opacity-70' : ''}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg ${
                            message.sender_id === user.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-700 text-white'
                          } ${message.sending ? 'animate-pulse' : ''}`}
                        >
                          {message.message_type === 'image' && message.media_url && (
                            <>
                              {message.is_view_once ? (
                                // View-once image - show as button if not viewed yet
                                message.viewed_at && message.sender_id !== user.id ? (
                                  <div className="p-4 text-center">
                                    <div className="text-slate-400 mb-2">🔒</div>
                                    <p className="text-sm text-slate-400">تم عرض الصورة المؤقتة</p>
                                  </div>
                                ) : message.sender_id === user.id ? (
                                  // Sender sees the image normally
                                  <div className="relative">
                                    <img 
                                      src={message.media_url} 
                                      alt="صورة مؤقتة" 
                                      className="rounded-lg max-w-full opacity-70"
                                    />
                                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                                      <span>🔒</span>
                                      <span>صورة مؤقتة</span>
                                    </div>
                                  </div>
                                ) : (
                                  // Receiver can view once
                                  <button
                                    onClick={() => handleViewOnceImage(message)}
                                    className="p-6 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors w-full"
                                  >
                                    <div className="text-4xl mb-2">🔒</div>
                                    <p className="text-sm">اضغط لعرض الصورة المؤقتة</p>
                                    <p className="text-xs text-slate-400 mt-1">يمكن العرض مرة واحدة فقط</p>
                                  </button>
                                )
                              ) : (
                                // Normal image
                                <img 
                                  src={message.media_url} 
                                  alt="صورة" 
                                  className="rounded-lg max-w-full cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(message.media_url, '_blank')}
                                />
                              )}
                            </>
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

                      <div className="relative flex-1">
                        <Input
                          data-testid="message-input"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !isSending && sendMessage()}
                          placeholder="اكتب رسالة..."
                          className="w-full bg-slate-800/50 border-slate-600 text-white pr-10"
                          disabled={isSending}
                        />
                        
                        {/* Emoji Button */}
                        <Button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          size="sm"
                          variant="ghost"
                          className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-700"
                          title="إضافة إيموجي"
                        >
                          <Smile className="w-4 h-4 text-slate-400" />
                        </Button>

                        {/* Emoji Picker Popup */}
                        {showEmojiPicker && (
                          <div
                            ref={emojiPickerRef}
                            className="absolute bottom-full left-0 mb-2 glass-effect rounded-lg p-4 border border-slate-700 shadow-2xl z-50"
                            style={{ width: '320px', maxHeight: '300px' }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-white font-semibold text-sm">اختر إيموجي</h3>
                              <button
                                onClick={() => setShowEmojiPicker(false)}
                                className="text-slate-400 hover:text-white"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="grid grid-cols-8 gap-2 overflow-y-auto" style={{ maxHeight: '240px' }}>
                              {emojis.map((emoji, index) => (
                                <button
                                  key={index}
                                  onClick={() => insertEmoji(emoji)}
                                  className="text-2xl hover:bg-slate-700 rounded p-1 transition-colors"
                                  title={emoji}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <Button 
                        data-testid="send-message-btn"
                        onClick={() => sendMessage()}
                        className="btn-sapphire"
                        disabled={isSending || !newMessage.trim()}
                      >
                        {isSending ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
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

      {/* Shared YouTube Player */}
      <SharedYouTubePlayer
        open={showYouTubePlayer}
        onClose={() => setShowYouTubePlayer(false)}
        partnerId={selectedUser?.id}
        partnerName={selectedUser?.username || ''}
        currentUserId={user?.id}
        onSendControl={handleYouTubeControl}
      />

      {/* Image Type Selection Dialog */}
      {showImageTypeDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="glass-effect border-slate-700 p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4 text-center">اختر نوع الصورة</h2>
            <p className="text-slate-300 text-sm mb-6 text-center">
              كيف تريد إرسال هذه الصورة؟
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => sendImageWithType(false)}
                className="w-full btn-sapphire flex items-center justify-center gap-2"
              >
                <Image className="w-5 h-5" />
                <span>صورة عادية</span>
              </Button>
              <Button
                onClick={() => sendImageWithType(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
              >
                <span>🔒</span>
                <span>صورة مؤقتة (عرض مرة واحدة)</span>
              </Button>
              <Button
                onClick={() => {
                  setShowImageTypeDialog(false);
                  setSelectedImageFile(null);
                }}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                إلغاء
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">
              💡 الصور المؤقتة تُعرض مرة واحدة فقط ولا يمكن حفظها أو مشاركتها
            </p>
          </Card>
        </div>
      )}

      {/* View-Once Image Viewer */}
      {viewOnceImage && (
        <div 
          className="fixed inset-0 bg-black flex items-center justify-center z-50"
          style={{ 
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Overlay to prevent screenshots */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 pointer-events-none" />
          
          <div className="relative max-w-4xl max-h-screen p-4">
            {/* Close button */}
            <button
              onClick={closeViewOnceImage}
              className="absolute top-8 right-8 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full z-10"
            >
              ✕
            </button>

            {/* Warning text */}
            <div className="absolute top-8 left-8 bg-red-600/90 text-white px-4 py-2 rounded-lg text-sm z-10">
              🔒 صورة مؤقتة - عرض مرة واحدة فقط
            </div>

            {/* Image */}
            <img
              src={viewOnceImage.media_url}
              alt="صورة مؤقتة"
              className="max-w-full max-h-screen object-contain rounded-lg"
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                WebkitTouchCallout: 'none'
              }}
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />

            {/* Watermark overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-white/20 text-6xl font-bold rotate-45">
                  {user?.username}
                </div>
              </div>
            </div>
          </div>

          {/* Info at bottom */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full text-sm">
            اضغط ✕ للإغلاق - لا يمكن حفظ أو مشاركة هذه الصورة
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;