import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Users, MessageCircle, Heart, Camera, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
        
        <nav className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-white" style={{fontFamily: 'Playfair Display'}}>الياقوت</span>
          </div>
          <Button 
            data-testid="nav-get-started-btn"
            onClick={() => navigate('/auth')} 
            className="btn-sapphire"
          >
            ابدأ الآن
          </Button>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-20 text-center">
          <h1 
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
            style={{fontFamily: 'Playfair Display'}}
          >
            <span className="text-white">عالم من </span>
            <span className="text-sapphire">الإبداع</span>
            <br />
            <span className="text-white">والتواصل</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            انضم إلى منصة التواصل الاجتماعي الأكثر تميزاً. شارك لحظاتك، تواصل مع الأصدقاء، واكتشف محتوى مذهل
          </p>
          <Button 
            data-testid="hero-get-started-btn"
            onClick={() => navigate('/auth')} 
            className="btn-sapphire text-lg px-8 py-6 h-auto"
          >
            انضم مجاناً
          </Button>
        </div>

        <div className="relative z-10 container mx-auto px-6 pb-20">
          <div className="glass-effect rounded-3xl p-8 shadow-2xl max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-blue-400 mb-2">10K+</div>
                <div className="text-slate-400">مستخدم نشط</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-400 mb-2">50K+</div>
                <div className="text-slate-400">منشور يومي</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-400 mb-2">100K+</div>
                <div className="text-slate-400">رسالة</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-400 mb-2">1M+</div>
                <div className="text-slate-400">إعجاب</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-20">
        <h2 className="text-4xl sm:text-5xl font-bold text-center mb-16 text-white" style={{fontFamily: 'Playfair Display'}}>
          ميزات استثنائية
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: <Users className="w-8 h-8" />,
              title: 'متابعة الأصدقاء',
              description: 'تواصل مع أصدقائك وعائلتك وابقَ على اطلاع بكل جديد'
            },
            {
              icon: <MessageCircle className="w-8 h-8" />,
              title: 'رسائل فورية',
              description: 'أرسل رسائل خاصة واستمتع بمحادثات آمنة وسريعة'
            },
            {
              icon: <Camera className="w-8 h-8" />,
              title: 'قصص يومية',
              description: 'شارك لحظاتك اليومية مع قصص تختفي بعد 24 ساعة'
            },
            {
              icon: <Heart className="w-8 h-8" />,
              title: 'تفاعل اجتماعي',
              description: 'أعجب، علّق، وشارك المحتوى الذي تحبه'
            },
            {
              icon: <Sparkles className="w-8 h-8" />,
              title: 'ذكاء اصطناعي',
              description: 'اقتراحات محتوى ذكية وفلترة تلقائية للمنشورات'
            },
            {
              icon: <TrendingUp className="w-8 h-8" />,
              title: 'اكتشف الجديد',
              description: 'استكشف مستخدمين جدد ومحتوى رائج يناسب اهتماماتك'
            }
          ].map((feature, index) => (
            <div 
              key={index} 
              className="glass-effect rounded-2xl p-8 hover-lift"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-6 text-white">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white" style={{fontFamily: 'Playfair Display'}}>
                {feature.title}
              </h3>
              <p className="text-slate-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="glass-effect rounded-3xl p-12 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-white" style={{fontFamily: 'Playfair Display'}}>
            ابدأ رحلتك الآن
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            انضم إلى آلاف المستخدمين واستمتع بتجربة تواصل اجتماعي فريدة
          </p>
          <Button 
            data-testid="cta-join-btn"
            onClick={() => navigate('/auth')} 
            className="btn-sapphire text-lg px-8 py-6 h-auto"
          >
            سجل مجاناً
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="container mx-auto px-6 text-center text-slate-400">
          <p>© 2024 الياقوت. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
