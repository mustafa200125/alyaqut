import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus, UserMinus, MessageCircle, Heart, MessageSquare, Edit, MapPin, Briefcase, Users2, UserCheck, UserX, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const ProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser, refreshUser } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState('none');
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    bio: '',
    gender: '',
    country: '',
    city: '',
    profession: '',
    avatar_url: ''
  });
  const [imagePreview, setImagePreview] = useState(null);
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
        const [followRes, friendshipRes, blockRes] = await Promise.all([
          axios.get(`${API}/users/${userId}/is-following`),
          axios.get(`${API}/users/${userId}/friendship-status`),
          axios.get(`${API}/users/${userId}/is-blocked`)
        ]);
        setIsFollowing(followRes.data.is_following);
        setFriendshipStatus(friendshipRes.data.status);
        setIsBlocked(blockRes.data.blocked_by_me || blockRes.data.blocked_me);
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

  const handleEditProfile = () => {
    setEditData({
      bio: user?.bio || '',
      gender: user?.gender || '',
      country: user?.country || '',
      city: user?.city || '',
      profession: user?.profession || '',
      avatar_url: user?.avatar_url || ''
    });
    setImagePreview(user?.avatar_url || null);
    setIsEditDialogOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('حجم الصورة كبير جداً. الحد الأقصى 2 ميجابايت');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setImagePreview(base64String);
        setEditData({...editData, avatar_url: base64String});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await axios.put(`${API}/users/profile`, editData);
      toast.success('تم تحديث الملف الشخصي');
      setIsEditDialogOpen(false);
      await fetchUserData();
      if (isOwnProfile) {
        await refreshUser();
      }
    } catch (error) {
      toast.error('فشل تحديث الملف الشخصي');
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
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-4xl">
                  {user?.username[0]?.toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1 text-center md:text-right">
              <h1 className="text-3xl font-bold text-white mb-2" style={{fontFamily: 'Playfair Display'}}>
                {user?.username}
              </h1>
              {isOwnProfile && (
                <p className="text-slate-300 mb-4">{user?.email}</p>
              )}
              {user?.bio && (
                <p className="text-slate-200 mb-4">{user.bio}</p>
              )}
              
              {/* معلومات إضافية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 text-right">
                {user?.gender && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Users2 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">{user.gender}</span>
                  </div>
                )}
                {user?.profession && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Briefcase className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">{user.profession}</span>
                  </div>
                )}
                {user?.country && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">{user.country}</span>
                  </div>
                )}
                {user?.city && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">{user.city}</span>
                  </div>
                )}
              </div>

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

              {isOwnProfile && (
                <div className="mb-4">
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        data-testid="edit-profile-btn"
                        onClick={handleEditProfile}
                        variant="outline"
                        className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        تعديل الملف الشخصي
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-effect border-slate-700 max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-white">تعديل الملف الشخصي</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        {/* صورة الملف الشخصي */}
                        <div className="text-center">
                          <Label className="text-slate-200 mb-2 block">الصورة الشخصية</Label>
                          <div className="flex flex-col items-center gap-4">
                            <Avatar className="w-24 h-24">
                              {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-2xl">
                                  {user?.username[0]?.toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <input
                                type="file"
                                id="avatar"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                              />
                              <Label
                                htmlFor="avatar"
                                className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block"
                              >
                                اختر صورة
                              </Label>
                              <p className="text-xs text-slate-400 mt-2">الحد الأقصى: 2 ميجابايت</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="bio" className="text-slate-200">النبذة الشخصية</Label>
                          <Textarea
                            id="bio"
                            value={editData.bio}
                            onChange={(e) => setEditData({...editData, bio: e.target.value})}
                            className="bg-slate-800/50 border-slate-600 text-white"
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="gender" className="text-slate-200">الجنس</Label>
                          <Select
                            value={editData.gender}
                            onValueChange={(value) => setEditData({...editData, gender: value})}
                          >
                            <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                              <SelectValue placeholder="اختر الجنس" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="ذكر">ذكر</SelectItem>
                              <SelectItem value="أنثى">أنثى</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="country" className="text-slate-200">البلد</Label>
                          <Input
                            id="country"
                            value={editData.country}
                            onChange={(e) => setEditData({...editData, country: e.target.value})}
                            className="bg-slate-800/50 border-slate-600 text-white"
                            placeholder="مثال: السعودية"
                          />
                        </div>

                        <div>
                          <Label htmlFor="city" className="text-slate-200">المدينة</Label>
                          <Input
                            id="city"
                            value={editData.city}
                            onChange={(e) => setEditData({...editData, city: e.target.value})}
                            className="bg-slate-800/50 border-slate-600 text-white"
                            placeholder="مثال: الرياض"
                          />
                        </div>

                        <div>
                          <Label htmlFor="profession" className="text-slate-200">المهنة</Label>
                          <Input
                            id="profession"
                            value={editData.profession}
                            onChange={(e) => setEditData({...editData, profession: e.target.value})}
                            className="bg-slate-800/50 border-slate-600 text-white"
                            placeholder="مثال: مهندس برمجيات"
                          />
                        </div>

                        <Button
                          data-testid="save-profile-btn"
                          onClick={handleSaveProfile}
                          className="w-full btn-sapphire"
                        >
                          حفظ التغييرات
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

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