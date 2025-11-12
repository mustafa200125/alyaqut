import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { ArrowLeft, Send } from 'lucide-react';
import { Separator } from '../components/ui/separator';

const MessagesPage = () => {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      await axios.post(`${API}/messages`, {
        receiver_id: selectedUser.id,
        content: newMessage
      });
      setNewMessage('');
      const response = await axios.get(`${API}/messages/${selectedUser.id}`);
      setMessages(response.data);
      fetchConversations();
    } catch (error) {
      toast.error('فشل إرسال الرسالة');
    }
  };

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
                <div className="flex items-center gap-3 mb-6">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                      {selectedUser.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-white">{selectedUser.username}</h3>
                    <p className="text-sm text-slate-400">{selectedUser.email}</p>
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
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.sender_id === user.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-700 text-white'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.created_at).toLocaleTimeString('ar', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
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
                    onClick={sendMessage}
                    className="btn-sapphire"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
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
    </div>
  );
};

export default MessagesPage;