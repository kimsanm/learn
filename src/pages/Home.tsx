import { Play, BookOpen, Clock, Star, Users, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { Course } from "../types";
import { Language, getTranslation } from "../utils/translate";

interface HomeProps {
  courses: Course[];
  lang: Language;
  onNavigate: (path: string) => void;
  onSelectCourse: (id: string) => void;
  theme: "light" | "dark";
}

export default function Home({ courses, lang, onNavigate, onSelectCourse, theme }: HomeProps) {
  const t = (key: any) => getTranslation(lang, key);

  // Dynamic Statistics
  const stats = [
    { label: lang === "en" ? "Active Students" : "សិស្សសកម្មសរុប", value: "3,500+", icon: Users, color: "text-indigo-500 bg-indigo-500/10" },
    { label: lang === "en" ? "Expert Instructors" : "សាស្រ្តាចារ្យអាជីព", value: "15+", icon: ShieldCheck, color: "text-emerald-500 bg-emerald-500/10" },
    { label: lang === "en" ? "Study Hours" : "ម៉ោងវីដេអូរៀនសរុប", value: "450+", icon: Clock, color: "text-amber-500 bg-amber-500/10" },
    { label: lang === "en" ? "Success Rate" : "អត្រាកើនសមត្ថភាព", value: "98.2%", icon: Star, color: "text-rose-500 bg-rose-500/10" },
  ];

  // Course Categories
  const categories = [
    { title: lang === "en" ? "Software & Web Development" : "ការអភិវឌ្ឍន៍វិបសាយ និង កូដ", count: 8, bg: "from-blue-600/20 to-blue-500/5", border: "border-blue-500/20" },
    { title: lang === "en" ? "AI & Marketing Strategics" : "យុទ្ធសាស្ត្រទីផ្សារ និង AI ជំនួយ", count: 5, bg: "from-emerald-600/20 to-emerald-500/5", border: "border-emerald-500/20" },
    { title: lang === "en" ? "System Design & DevOps" : "ស្ថាបត្យកម្ម Cloud & DevOps", count: 3, bg: "from-purple-600/20 to-purple-500/5", border: "border-purple-500/20" },
    { title: lang === "en" ? "UX/UI Creative Design" : "រចនាប្លង់ UX/UI App & Web", count: 4, bg: "from-amber-600/20 to-amber-500/5", border: "border-amber-500/20" },
  ];

  // Testimonials
  const testimonials = [
    {
      name: "Sokha Chamnan",
      role: "Lead Front-end Developer at ABA Bank",
      comment: lang === "en" 
        ? "The Next.js 15 course is superb! Delivered with unmatched code quality. Successfully helped me upgrade our retail team interfaces." 
        : "វគ្គសិក្សា Next.js 15 ពិតជាល្អឥតខ្ចោះ! ជួយខ្ញុំពង្រឹងសមត្ថភាពក្រុមការងារបង្កើត Interface នៅធនាគារ ABA បានលឿន និងមានសុវត្ថិភាពខ្ពស់។",
      stars: 5,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150"
    },
    {
      name: "Dara Kimsour",
      role: "SME Store Creator",
      comment: lang === "en"
        ? "Integrating ABA QR code checkout bots via AI tools simplified my shop orders. It operates beautifully 24/7!"
        : "ការប្រើប្រាស់ AI បង្កើត Telegram/ABA QR សម្រាប់ការលក់ដូរពិតជាជួយសម្រាលការងារខ្ញុំច្រើនណាស់។ ដំណើរការគ្រឹះ ២៤ម៉ោងលើ២៤ម៉ោង!",
      stars: 5,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150"
    }
  ];

  return (
    <div className="space-y-10 sm:space-y-16 animate-fade-in px-1 sm:px-0">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-radial from-slate-900 via-indigo-950 to-slate-950 p-5 sm:p-12 text-white border border-slate-800/80 shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative max-w-3xl space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] sm:text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            {lang === "en" ? "🎓 No.1 localized skills academy in Cambodia" : "🎓 វិទ្យាស្ថានបណ្តុះបណ្តាលបច្ចេកវិទ្យាលេខ១ ក្នុងប្រទេសកម្ពុជា"}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight leading-tight md:leading-none">
            {lang === "en" ? "Unlocking Potential with " : "ស្ថាបនាអនាគតរបស់អ្នកជាមួយ "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-emerald-300">
              {lang === "en" ? "Modern Digital Skills" : "ជំនាញបច្ចេកវិទ្យាទំនើបបំផុត"}
            </span>
          </h1>

          <p className="text-xs sm:text-sm md:text-lg text-slate-300 max-w-2xl font-light leading-relaxed">
            {t("tagline")}. {lang === "en" 
              ? "Master high-paying coding & marketing frameworks taught in Khmer. Buy courses securely via ABA PayWay, earn micro-study points, and receive international-grade certificates instantly."
              : "រៀនជំនាញកូដ ទីផ្សារ គណនាទិន្នន័យ និងផលិតមាតិកាជាមួយគ្រូជំនាញច្បាស់លាស់។ ទូទាត់រហ័សតាមធនាគារក្នុងស្រុក មានប្រព័ន្ធវាយពិន្ទុ និងទទួលបានវិញ្ញាបនបត្របញ្ជាក់ការសិក្សាភ្លាមៗ។"}
          </p>

          <div className="flex flex-wrap gap-2.5 sm:gap-4 pt-2">
            <button
              onClick={() => onNavigate("courses")}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-indigo-500 to-indigo-650 hover:from-indigo-650 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              {lang === "en" ? "Explore Courses" : "ស្វែងរកវគ្គសិក្សាទាំងអស់"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate("about")}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              {lang === "en" ? "How LMS Works" : "អំពីរបៀបសិក្សា"}
            </button>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 z-10 relative">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl transition-all duration-200 hover:scale-[1.01] hover:shadow-md border ${
              theme === 'dark' ? 'glass-card text-white border-white/10' : 'glass-card-light border-slate-100/80 bg-white'
            }`}>
              <div className="flex items-center gap-2.5 sm:gap-4">
                <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl shrink-0 flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-base sm:text-2xl md:text-3xl font-black tracking-tight truncate">{stat.value}</div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-slate-500 mt-0.5 truncate font-medium">{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Popular Categories Section */}
      <section className="space-y-4 sm:space-y-6">
        <div className="space-y-1 sm:space-y-2">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
            {lang === "en" ? "Popular Categories" : "មុខជំនាញពេញនិយមបំផុត"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {lang === "en" ? "Hand Picked career specializations for maximum job options." : "វគ្គសិក្សាកែសម្រួលពិសេសសម្រាប់តម្រូវការការងារក្នុងទីផ្សារបច្ចុប្បន្ន"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 relative z-10">
          {categories.map((cat, i) => (
            <div
              key={i}
              onClick={() => onNavigate("courses")}
              className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl transition-all cursor-pointer group shadow-sm hover:scale-[1.01] hover:shadow-md border ${
                theme === 'dark' 
                  ? 'glass-card bg-gradient-to-br from-indigo-500/10 to-transparent border-white/10 text-white' 
                  : 'glass-card-light bg-gradient-to-br from-indigo-50/40 to-transparent border-slate-100 bg-white'
              }`}
            >
              <h3 className="text-sm sm:text-base md:text-lg font-bold group-hover:text-indigo-500 transition-colors">{cat.title}</h3>
              <div className="mt-4 sm:mt-8 flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-mono font-medium opacity-80">{cat.count} {t("courses")}</span>
                <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Courses Segment */}
      <section className="space-y-8">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {lang === "en" ? "Featured Course Catalog" : "វគ្គសិក្សាគំរូឆ្នើម"}
            </h2>
            <p className="text-slate-500">
              {lang === "en" ? "Kickstart your future. Highly detailed curriculum lessons await." : "ចាប់ផ្ដើមការជឿនលឿនជាមួយវីដេអូមេរៀន កម្រងតេស្ត និងឯកសារជំនួយលម្អិត"}
            </p>
          </div>
          <button
            onClick={() => onNavigate("courses")}
            className="text-sm font-semibold text-indigo-500 inline-flex items-center gap-1.5 hover:underline cursor-pointer"
          >
            {lang === "en" ? "View All Courses" : "មើលទាំងអស់"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          {courses.slice(0, 4).map((c) => {
            const finalPrice = c.price * (1 - c.discount / 100);
            return (
              <div
                key={c.id}
                className={`group flex flex-col justify-between overflow-hidden rounded-2xl transition-all shadow-sm hover:shadow-md ${
                  theme === 'dark' ? 'glass-card text-white border-white/10' : 'glass-card-light'
                }`}
              >
                {/* Visual Header */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                  <img
                    referrerPolicy="no-referrer"
                    src={c.thumbnail}
                    alt={c.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 shadow">
                    {c.category}
                  </div>
                  {c.discount > 0 && (
                    <div className="absolute top-3 right-3 rounded-lg px-2 text-xs font-black uppercase text-rose-100 bg-rose-600 shadow animate-pulse">
                      -{c.discount}% OFF
                    </div>
                  )}
                </div>

                {/* Content body */}
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex items-center font-mono text-xs text-slate-500 gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {c.duration}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {c.rating.toFixed(1)}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold tracking-tight line-clamp-1 group-hover:text-indigo-500 transition-colors">
                    {c.title}
                  </h3>

                  <p className="text-sm text-slate-500 line-clamp-2 font-light">
                    {c.description}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/10">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-indigo-500">
                        ${finalPrice.toFixed(2)}
                      </span>
                      {c.discount > 0 && (
                        <span className="text-sm text-slate-400 line-through">
                          ${c.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onSelectCourse(c.id)}
                      className="inline-flex items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-200 transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 gap-1 mr-1 fill-current" />
                      <span className="text-xs font-bold pr-1">{t("buyNow")}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {lang === "en" ? "Validated Student Reviews" : "មតិយោបល់ពិតពីសិស្សានុសិស្ស"}
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            {lang === "en" ? "Read how PRO DIGITAL learners transform their professional careers across local agencies." : "ស្ដាប់សម្តីសិស្សដែលទទួលបានអាហារូបករណ៍ ឬការងារល្អៗបន្ទាប់ពីសិក្សាចប់"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {testimonials.map((test, index) => (
            <div
              key={index}
              className={`p-6 rounded-2xl transition-all shadow-sm space-y-4 ${
                theme === 'dark' ? 'glass-card text-white border-white/10' : 'glass-card-light'
              }`}
            >
              <div className="flex items-center gap-4">
                <img
                  referrerPolicy="no-referrer"
                  src={test.avatar}
                  alt={test.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-300"
                />
                <div>
                  <h4 className="font-bold">{test.name}</h4>
                  <p className="text-xs text-slate-500">{test.role}</p>
                </div>
              </div>
              <div className="flex text-amber-400 gap-0.5">
                {[...Array(test.stars)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-sm italic text-slate-600 line-height-relaxed font-light">
                "{test.comment}"
              </p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
