import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';
import { 
  Home, 
  Search, 
  MessageCircle, 
  User, 
  LogOut, 
  Heart, 
  MessageSquare,
  Send,
  Sparkles,
  Camera,
  X
} from 'lucide-react';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';

const HomePage = () => {
  const { user, logout } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [stories, setStories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
    fetchStories();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API}/posts`);
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  const fetchStories = async () => {
    try {
      const response = await axios.get(`${API}/stories`);
      setStories(response.data);
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    }
  };

  const createPost = async () => {
    if (!newPost.trim()) return;

    setLoading(true);
    try {
      await axios.post(`${API}/posts`, { content: newPost });
      setNewPost('');
      toast.success('تم نشر منشورك!');
      fetchPosts();
    } catch (error) {
      toast.error('فشل نشر المنشور');
    } finally {
      setLoading(false);
    }
  };

  const likePost = async (postId, isLiked) => {
    try {
      if (isLiked) {
        await axios.delete(`${API}/posts/${postId}/like`);
      } else {
        await axios.post(`${API}/posts/${postId}/like`);
      }
      fetchPosts();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const openComments = async (post) => {
    setSelectedPost(post);
    try {
      const response = await axios.get(`${API}/posts/${post.id}/comments`);
      setComments(response.data);
    } catch (error) {
      toast.error('فشل تحميل التعليقات');
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      await axios.post(`${API}/posts/${selectedPost.id}/comments`, { content: newComment });
      setNewComment('');
      const response = await axios.get(`${API}/posts/${selectedPost.id}/comments`);
      setComments(response.data);
      toast.success('تم إضافة التعليق');
      fetchPosts();
    } catch (error) {
      toast.error('فشل إضافة التعليق');
    }
  };

  const getAISuggestions = async () => {
    try {
      const response = await axios.post(`${API}/ai/content-suggestions`);
      setSuggestions(response.data.suggestions);
    } catch (error) {
      toast.error('فشل الحصول على اقتراحات');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Navigation */}
      <nav className="glass-effect border-b border-slate-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="الياقوت" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-2xl font-bold text-white" style={{fontFamily: 'Playfair Display'}}>الياقوت</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              data-testid="nav-home-btn"
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/home')}
              className="text-slate-200 hover:text-white"
            >
              <Home className="w-5 h-5" />
            </Button>
            <Button 
              data-testid="nav-explore-btn"
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/explore')}
              className="text-slate-200 hover:text-white"
            >
              <Search className="w-5 h-5" />
            </Button>
            <Button 
              data-testid="nav-messages-btn"
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/messages')}
              className="text-slate-200 hover:text-white"
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button 
              data-testid="nav-profile-btn"
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(`/profile/${user.id}`)}
              className="text-slate-200 hover:text-white"
            >
              <User className="w-5 h-5" />
            </Button>
            <Button 
              data-testid="nav-logout-btn"
              variant="ghost" 
              size="icon" 
              onClick={logout}
              className="text-red-400 hover:text-red-300"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Stories */}
        {stories.length > 0 && (
          <div className="mb-8">
            <ScrollArea className="w-full" dir="ltr">
              <div className="flex gap-4 pb-4">
                {stories.map((story) => (
                  <div key={story.id} className="flex flex-col items-center gap-2 cursor-pointer">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 p-1">
                      <Avatar className="w-full h-full border-2 border-slate-900">
                        <AvatarFallback className="bg-slate-700 text-white">
                          {story.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="text-xs text-slate-300 max-w-[70px] truncate">{story.username}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Create Post */}
        <Card className="glass-effect p-6 mb-8 border-slate-700">
          <div className="flex gap-4">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                {user?.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                data-testid="create-post-input"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="ما الجديد؟"
                className="bg-slate-800/50 border-slate-600 text-white resize-none mb-4"
                rows={3}
              />
              <div className="flex justify-between items-center">
                <Button
                  data-testid="ai-suggestions-btn"
                  variant="ghost"
                  size="sm"
                  onClick={getAISuggestions}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  اقتراحات AI
                </Button>
                <Button
                  data-testid="publish-post-btn"
                  onClick={createPost}
                  disabled={loading || !newPost.trim()}
                  className="btn-sapphire"
                >
                  <Send className="w-4 h-4 mr-2" />
                  نشر
                </Button>
              </div>
              {suggestions.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-slate-400">اقتراحات:</p>
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setNewPost(suggestion)}
                      className="w-full text-right justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Posts Feed */}
        <div className="space-y-6">
          {posts.map((post) => (
            <Card key={post.id} className="glass-effect p-6 border-slate-700" data-testid="post-card">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="cursor-pointer" onClick={() => navigate(`/profile/${post.user_id}`)}>
                  {post.avatar_url ? (
                    <img src={post.avatar_url} alt={post.username} className="w-full h-full object-cover" />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                      {post.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <h3 
                    className="font-semibold text-white cursor-pointer hover:text-blue-400"
                    onClick={() => navigate(`/profile/${post.user_id}`)}
                  >
                    {post.username}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {new Date(post.created_at).toLocaleDateString('ar')}
                  </p>
                </div>
              </div>

              <p className="text-slate-200 mb-4 whitespace-pre-wrap">{post.content}</p>

              {post.image_url && (
                <img 
                  src={post.image_url} 
                  alt="Post" 
                  className="w-full rounded-lg mb-4 max-h-96 object-cover"
                />
              )}

              <Separator className="my-4 bg-slate-700" />

              <div className="flex items-center gap-6">
                <Button
                  data-testid="like-post-btn"
                  variant="ghost"
                  size="sm"
                  onClick={() => likePost(post.id, post.liked_by_current_user)}
                  className="text-slate-300 hover:text-red-400"
                >
                  <Heart 
                    className={`w-5 h-5 mr-2 ${post.liked_by_current_user ? 'fill-red-500 text-red-500' : ''}`} 
                  />
                  {post.likes_count}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      data-testid="comments-btn"
                      variant="ghost"
                      size="sm"
                      onClick={() => openComments(post)}
                      className="text-slate-300 hover:text-blue-400"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      {post.comments_count}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-effect border-slate-700 max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-white">التعليقات</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-96 pr-4">
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-slate-700 text-white text-xs">
                                {comment.username[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-white">{comment.username}</p>
                              <p className="text-sm text-slate-300">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="flex gap-2 mt-4">
                      <Textarea
                        data-testid="comment-input"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="أضف تعليق..."
                        className="bg-slate-800/50 border-slate-600 text-white resize-none"
                        rows={2}
                      />
                      <Button 
                        data-testid="add-comment-btn"
                        onClick={addComment}
                        className="btn-sapphire"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;