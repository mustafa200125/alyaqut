import React, { useState, useEffect } from 'react';
import { API } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus } from 'lucide-react';

const ExplorePage = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const response = await axios.get(`${API}/users/suggestions`);
      setSuggestions(response.data);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      toast.error('فشل تحميل الاقتراحات');
    } finally {
      setLoading(false);
    }
  };

  const followUser = async (userId) => {
    try {
      await axios.post(`${API}/users/${userId}/follow`);
      toast.success('تمت المتابعة');
      fetchSuggestions();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          data-testid="back-to-home-btn"
          variant="ghost"
          onClick={() => navigate('/home')}
          className="mb-6 text-slate-200 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          عودة
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2" style={{fontFamily: 'Playfair Display'}}>
            استكشف
          </h1>
          <p className="text-slate-300">
            اعثر على أصدقاء جدد وتواصل معهم
          </p>
        </div>

        <div className="grid gap-6">
          {suggestions.length === 0 ? (
            <Card className="glass-effect p-12 text-center border-slate-700">
              <p className="text-slate-400">لا توجد اقتراحات في الوقت الحالي</p>
            </Card>
          ) : (
            suggestions.map((suggestedUser) => (
              <Card key={suggestedUser.id} className="glass-effect p-6 border-slate-700 hover-lift">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center gap-4 cursor-pointer flex-1"
                    onClick={() => navigate(`/profile/${suggestedUser.id}`)}
                  >
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xl">
                        {suggestedUser.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-white text-lg">{suggestedUser.username}</h3>
                      <p className="text-slate-400">{suggestedUser.email}</p>
                      {suggestedUser.bio && (
                        <p className="text-slate-300 mt-2">{suggestedUser.bio}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-slate-400">
                          {suggestedUser.followers_count} متابع
                        </span>
                        <span className="text-slate-400">
                          {suggestedUser.posts_count} منشور
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    data-testid="follow-user-btn"
                    onClick={() => followUser(suggestedUser.id)}
                    className="btn-sapphire"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    متابعة
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;