import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus, UserMinus, MessageCircle, Heart, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const ProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isOwnProfile = userId === currentUser?.id;

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      const [userRes, postsRes, followersRes, followingRes] = await Promise.all([
        axios.get(`${API}/users/${userId}`),
        axios.get(`${API}/users/${userId}/posts`),
        axios.get(`${API}/users/${userId}/followers`),
        axios.get(`${API}/users/${userId}/following`)
      ]);

      setUser(userRes.data);
      setPosts(postsRes.data);
      setFollowers(followersRes.data);
      setFollowing(followingRes.data);

      if (!isOwnProfile) {
        const followRes = await axios.get(`${API}/users/${userId}/is-following`);
        setIsFollowing(followRes.data.is_following);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      toast.error('فشل تحميل الملف الشخصي');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await axios.delete(`${API}/users/${userId}/follow`);
        toast.success('تم إلغاء المتابعة');
      } else {
        await axios.post(`${API}/users/${userId}/follow`);
        toast.success('تمت المتابعة');
      }
      setIsFollowing(!isFollowing);
      fetchUserData();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const likePost = async (postId, isLiked) => {
    try {
      if (isLiked) {
        await axios.delete(`${API}/posts/${postId}/like`);
      } else {
        await axios.post(`${API}/posts/${postId}/like`);
      }
      fetchUserData();
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
          data-testid="back-btn"
          variant="ghost"
          onClick={() => navigate('/home')}
          className="mb-6 text-slate-200 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          عودة
        </Button>

        <Card className="glass-effect p-8 mb-8 border-slate-700">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="w-32 h-32">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-4xl">
                {user?.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-right">
              <h1 className="text-3xl font-bold text-white mb-2" style={{fontFamily: 'Playfair Display'}}>
                {user?.username}
              </h1>
              <p className="text-slate-300 mb-4">{user?.email}</p>
              {user?.bio && (
                <p className="text-slate-200 mb-6">{user.bio}</p>
              )}

              <div className="flex justify-center md:justify-start gap-8 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{user?.posts_count || 0}</div>
                  <div className="text-sm text-slate-400">منشور</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{user?.followers_count || 0}</div>
                  <div className="text-sm text-slate-400">متابع</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{user?.following_count || 0}</div>
                  <div className="text-sm text-slate-400">يتابع</div>
                </div>
              </div>

              {!isOwnProfile && (
                <div className="flex gap-3">
                  <Button
                    data-testid="follow-btn"
                    onClick={handleFollow}
                    className={isFollowing ? 'bg-slate-600 hover:bg-slate-700' : 'btn-sapphire'}
                  >
                    {isFollowing ? (
                      <><UserMinus className="w-4 h-4 mr-2" /> إلغاء المتابعة</>
                    ) : (
                      <><UserPlus className="w-4 h-4 mr-2" /> متابعة</>
                    )}
                  </Button>
                  <Button
                    data-testid="message-btn"
                    onClick={() => navigate('/messages', { state: { selectedUser: user } })}
                    variant="outline"
                    className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    رسالة
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="glass-effect border-slate-700 w-full mb-6">
            <TabsTrigger data-testid="posts-tab" value="posts" className="flex-1 data-[state=active]:bg-blue-600">
              المنشورات
            </TabsTrigger>
            <TabsTrigger data-testid="followers-tab" value="followers" className="flex-1 data-[state=active]:bg-blue-600">
              المتابعون
            </TabsTrigger>
            <TabsTrigger data-testid="following-tab" value="following" className="flex-1 data-[state=active]:bg-blue-600">
              يتابع
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-6">
            {posts.length === 0 ? (
              <Card className="glass-effect p-12 text-center border-slate-700">
                <p className="text-slate-400">لا توجد منشورات بعد</p>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="glass-effect p-6 border-slate-700">
                  <p className="text-slate-200 mb-4 whitespace-pre-wrap">{post.content}</p>
                  {post.image_url && (
                    <img 
                      src={post.image_url} 
                      alt="Post" 
                      className="w-full rounded-lg mb-4 max-h-96 object-cover"
                    />
                  )}
                  <div className="flex items-center gap-6 text-slate-400">
                    <button
                      onClick={() => likePost(post.id, post.liked_by_current_user)}
                      className="flex items-center gap-2 hover:text-red-400"
                    >
                      <Heart 
                        className={`w-5 h-5 ${post.liked_by_current_user ? 'fill-red-500 text-red-500' : ''}`} 
                      />
                      {post.likes_count}
                    </button>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      {post.comments_count}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="followers" className="space-y-4">
            {followers.length === 0 ? (
              <Card className="glass-effect p-12 text-center border-slate-700">
                <p className="text-slate-400">لا يوجد متابعون بعد</p>
              </Card>
            ) : (
              followers.map((follower) => (
                <Card key={follower.id} className="glass-effect p-4 border-slate-700">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => navigate(`/profile/${follower.id}`)}
                    >
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                          {follower.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-white">{follower.username}</p>
                        <p className="text-sm text-slate-400">{follower.email}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate(`/profile/${follower.id}`)}
                      size="sm"
                      variant="outline"
                      className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                    >
                      عرض
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="following" className="space-y-4">
            {following.length === 0 ? (
              <Card className="glass-effect p-12 text-center border-slate-700">
                <p className="text-slate-400">لا يتابع أحد بعد</p>
              </Card>
            ) : (
              following.map((followedUser) => (
                <Card key={followedUser.id} className="glass-effect p-4 border-slate-700">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => navigate(`/profile/${followedUser.id}`)}
                    >
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                          {followedUser.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-white">{followedUser.username}</p>
                        <p className="text-sm text-slate-400">{followedUser.email}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate(`/profile/${followedUser.id}`)}
                      size="sm"
                      variant="outline"
                      className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                    >
                      عرض
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfilePage;