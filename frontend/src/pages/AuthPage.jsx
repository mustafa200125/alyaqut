import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { Sparkles, Mail, Lock, User, Shield } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showVerification, setShowVerification] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: ''
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const response = await axios.post(`${API}/auth/login`, {
          email: formData.email,
          password: formData.password
        });
        login(response.data.access_token, response.data.user);
        toast.success('مرحباً بك مجدداً!');
        navigate('/home');
      } else {
        const response = await axios.post(`${API}/auth/register`, formData);
        toast.success('تم إرسال كود التحقق');
        setShowVerification(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'حدث خطأ ما');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (verificationCode.length !== 6) {
      toast.error('يرجى إدخال الكود كاملاً');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/verify-email`, {
        email: formData.email,
        code: verificationCode
      });
      login(response.data.access_token, response.data.user);
      toast.success('تم التحقق بنجاح!');
      navigate('/home');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'كود غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await axios.post(`${API}/auth/resend-code`, { email: formData.email });
      toast.success('تم إرسال كود جديد');
    } catch (error) {
      toast.error('فشل إرسال الكود');
    }
  };

  if (showVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-6">
        <Card className="glass-effect max-w-md w-full p-8 border-slate-700">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2" style={{fontFamily: 'Playfair Display'}}>
              التحقق من البريد
            </h2>
            <p className="text-slate-300">
              أدخل الكود المرسل إلى {formData.email}
            </p>
          </div>

          <div className="flex justify-center mb-6" dir="ltr">
            <InputOTP
              data-testid="verification-code-input"
              maxLength={6}
              value={verificationCode}
              onChange={setVerificationCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="border-slate-600 text-white bg-slate-800/50" />
                <InputOTPSlot index={1} className="border-slate-600 text-white bg-slate-800/50" />
                <InputOTPSlot index={2} className="border-slate-600 text-white bg-slate-800/50" />
                <InputOTPSlot index={3} className="border-slate-600 text-white bg-slate-800/50" />
                <InputOTPSlot index={4} className="border-slate-600 text-white bg-slate-800/50" />
                <InputOTPSlot index={5} className="border-slate-600 text-white bg-slate-800/50" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            data-testid="verify-btn"
            onClick={handleVerification}
            disabled={loading || verificationCode.length !== 6}
            className="w-full btn-sapphire mb-4"
          >
            {loading ? 'جاري التحقق...' : 'تحقق'}
          </Button>

          <Button
            data-testid="resend-code-btn"
            onClick={handleResendCode}
            variant="ghost"
            className="w-full text-blue-400 hover:text-blue-300"
          >
            إعادة إرسال الكود
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{fontFamily: 'Playfair Display'}}>
            الياقوت
          </h1>
          <p className="text-slate-300">
            {isLogin ? 'مرحباً بعودتك' : 'انضم إلينا اليوم'}
          </p>
        </div>

        <Card className="glass-effect p-8 border-slate-700">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {!isLogin && (
                <div>
                  <Label htmlFor="username" className="text-slate-200 flex items-center gap-2 mb-2">
                    <User className="w-4 h-4" />
                    اسم المستخدم
                  </Label>
                  <Input
                    data-testid="username-input"
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="أدخل اسم المستخدم"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-slate-200 flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  البريد الإلكتروني
                </Label>
                <Input
                  data-testid="email-input"
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="bg-slate-800/50 border-slate-600 text-white"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-slate-200 flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4" />
                  كلمة المرور
                </Label>
                <Input
                  data-testid="password-input"
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  className="bg-slate-800/50 border-slate-600 text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              data-testid="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full btn-sapphire mt-6"
            >
              {loading ? 'جاري المعالجة...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              data-testid="toggle-auth-mode-btn"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-400 hover:text-blue-300"
            >
              {isLogin ? 'ليس لديك حساب؟ سجّل الآن' : 'لديك حساب؟ سجّل الدخول'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;