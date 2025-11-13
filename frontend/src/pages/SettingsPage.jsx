import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [theme, setTheme] = useState('blue'); // blue or red

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('app-theme') || 'blue';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, [user, navigate]);

  const applyTheme = (selectedTheme) => {
    const root = document.documentElement;
    
    if (selectedTheme === 'red') {
      // Red ruby theme
      root.style.setProperty('--theme-primary', '#DC2626'); // red-600
      root.style.setProperty('--theme-primary-light', '#EF4444'); // red-500
      root.style.setProperty('--theme-primary-dark', '#991B1B'); // red-800
      root.style.setProperty('--theme-secondary', '#7F1D1D'); // red-900
      root.style.setProperty('--theme-accent', '#FCA5A5'); // red-300
    } else {
      // Blue sapphire theme (default)
      root.style.setProperty('--theme-primary', '#2563EB'); // blue-600
      root.style.setProperty('--theme-primary-light', '#3B82F6'); // blue-500
      root.style.setProperty('--theme-primary-dark', '#1E40AF'); // blue-800
      root.style.setProperty('--theme-secondary', '#1E3A8A'); // blue-900
      root.style.setProperty('--theme-accent', '#93C5FD'); // blue-300
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    applyTheme(newTheme);
    toast.success(`تم تغيير اللون إلى ${newTheme === 'red' ? 'الأحمر الياقوتي' : 'الأزرق الياقوتي'}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/home')}
          className="mb-6 text-slate-200 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          عودة
        </Button>

        <h1 className="text-3xl font-bold text-white mb-8" style={{fontFamily: 'Playfair Display'}}>
          الإعدادات
        </h1>

        {/* Theme Settings */}
        <Card className="glass-effect border-slate-700 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🎨</span>
            <span>لون التطبيق</span>
          </h2>
          <p className="text-slate-300 text-sm mb-6">
            اختر اللون الياقوتي المفضل لك
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blue Theme */}
            <div
              onClick={() => handleThemeChange('blue')}
              className={`cursor-pointer rounded-xl p-6 border-2 transition-all ${
                theme === 'blue'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-600 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  {theme === 'blue' && <span className="text-white text-xl">✓</span>}
                </div>
                <div>
                  <h3 className="text-white font-bold">الياقوت الأزرق</h3>
                  <p className="text-slate-400 text-sm">اللون الافتراضي</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded bg-blue-600"></div>
                <div className="w-8 h-8 rounded bg-blue-500"></div>
                <div className="w-8 h-8 rounded bg-blue-400"></div>
                <div className="w-8 h-8 rounded bg-blue-300"></div>
              </div>
            </div>

            {/* Red Theme */}
            <div
              onClick={() => handleThemeChange('red')}
              className={`cursor-pointer rounded-xl p-6 border-2 transition-all ${
                theme === 'red'
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-slate-600 hover:border-red-400'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                  {theme === 'red' && <span className="text-white text-xl">✓</span>}
                </div>
                <div>
                  <h3 className="text-white font-bold">الياقوت الأحمر</h3>
                  <p className="text-slate-400 text-sm">لون بديل</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded bg-red-600"></div>
                <div className="w-8 h-8 rounded bg-red-500"></div>
                <div className="w-8 h-8 rounded bg-red-400"></div>
                <div className="w-8 h-8 rounded bg-red-300"></div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
            <p className="text-slate-300 text-sm">
              💡 اللون المختار حالياً: <span className="font-bold text-white">
                {theme === 'red' ? 'الياقوت الأحمر 💎' : 'الياقوت الأزرق 💙'}
              </span>
            </p>
            <p className="text-slate-400 text-xs mt-2">
              سيتم حفظ اختيارك تلقائياً وتطبيقه على جميع الصفحات
            </p>
          </div>
        </Card>

        {/* Account Info */}
        <Card className="glass-effect border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>👤</span>
            <span>معلومات الحساب</span>
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-300">اسم المستخدم</span>
              <span className="text-white font-bold">{user?.username}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-300">البريد الإلكتروني</span>
              <span className="text-white">{user?.email}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
