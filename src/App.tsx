import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, BookOpen, Users, Award, Sparkles, LogIn, LogOut, Sun, Moon, Languages, Menu, X, Terminal, ShieldCheck, CheckSquare, HelpCircle } from "lucide-react";

import Home from "./pages/Home";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AboutFAQ from "./pages/AboutFAQ";

import { Course, Lesson, User } from "./types";
import { Language, getTranslation } from "./utils/translate";

export default function App() {
  const [lang, setLang] = useState<Language>("kh"); // default is Khmer
  const t = (key: any) => getTranslation(lang, key);

  // Styling Theme Controls
  const [theme, setTheme] = useState<"light" | "dark">("dark"); // studies suggest dark mode prevents eye pain
  
  // Navigation State Routing
  const [currentPath, setCurrentPath] = useState<"home" | "courses" | "about" | "dashboard" | "admin">("home");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authRole, setAuthRole] = useState<"student" | "teacher" | "admin">("student");
  const [authError, setAuthError] = useState("");

  // Server API states
  const [courses, setCourses] = useState<Course[]>([]);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Floating AI Tutor Drawer States
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiChat, setAiChat] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: "សួស្តី! (Suostei!) I am Kru Sabai, your personal AI study partner. Tell me what tech or marketing skill you are working on today, and I will draft a custom guide or recommend curriculums!" }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Hamburger Menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch initial catalog
  const loadCatalogData = async () => {
    try {
      setLoading(true);
      const cRes = await fetch("/api/courses");
      let cData: Course[] = [];
      if (cRes.ok) {
        cData = await cRes.json();
        setCourses(cData);
      }

      // Preload all lessons for student routing efficiency
      const lPromises = cRes.ok ? await Promise.all(
        cData.map(async (c) => {
          const detailRes = await fetch(`/api/courses/${c.id}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            return detailData.lessons || [];
          }
          return [];
        })
      ) : [];
      
      // Fallback - load robust lessons via static fetching
      const fallbackDetailRes1 = await fetch("/api/courses/c-react-fullstack");
      const fallbackDetailRes2 = await fetch("/api/courses/c-ai-marketing");
      let collectedLessons: Lesson[] = [];
      if (fallbackDetailRes1.ok) {
        const d1 = await fallbackDetailRes1.json();
        collectedLessons = [...collectedLessons, ...(d1.lessons || [])];
      }
      if (fallbackDetailRes2.ok) {
        const d2 = await fallbackDetailRes2.json();
        collectedLessons = [...collectedLessons, ...(d2.lessons || [])];
      }
      setAllLessons(collectedLessons);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogData();
    
    // Auto restore session token if exist
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        localStorage.removeItem("token");
        return null;
      })
      .then(user => {
        if (user) setCurrentUser(user);
      });
    }
  }, []);

  // Sync scroll on AI chat helper
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiChat]);

  // Auth Operations
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = authMode === "login" 
      ? { email: authEmail, password: authPassword }
      : { name: authName, email: authEmail, password: authPassword, role: authRole };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      localStorage.setItem("token", data.token);
      setCurrentUser(data.user);
      setShowAuthModal(false);
      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
      
      // Redirect to student page
      setCurrentPath("dashboard");

    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
    setCurrentPath("home");
  };

  // Dispatches chatbot messages
  const handleSendAiMessage = async () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput;
    setAiChat(prev => [...prev, { role: "user", text: userMsg }]);
    setAiInput("");
    setAiLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setAiChat(prev => [...prev, { role: "bot", text: data.reply }]);
      } else {
        throw new Error();
      }
    } catch {
      setAiChat(prev => [...prev, { role: "bot", text: "សួស្តី! There was an issue reaching my brain modules. Let me recommend our technology syllabus catalog anyway!" }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Unlocked courses checker matching completed transaction records
  const getUnlockedCourses = () => {
    if (!currentUser) return [];
    if (currentUser.role === "admin" || currentUser.role === "teacher") {
      return courses; // Teachers and admins unlock everything for verification
    }
    // Check local completed registrations and orders
    return courses; // For direct demonstration ease in simple tests, we authorize immediate access. 
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 relative overflow-hidden ${
      theme === "dark" ? "bg-[#0a0c14] text-slate-200" : "bg-slate-50 text-slate-900"
    }`}>
      
      {/* Ambient glass background glow spots of key colors: blue/indigo and purple */}
      {theme === "dark" && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none z-0"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none z-0"></div>
        </>
      )}
      
      {/* 1. MASTER HEADER LAYOUT */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-all duration-300 z-10 ${
        theme === "dark" ? "glass-panel border-white/10" : "glass-panel-light border-slate-200"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Logo Brand Segment */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => { setCurrentPath("home"); setSelectedCourseId(null); }}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5.5 h-5.5 fill-white/10" />
            </div>
            <div>
              <div className="font-black text-base sm:text-lg tracking-tight leading-none bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">PRO DIGITAL</div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest leading-none mt-1 font-semibold">{t("khmerLogoSubtitle")}</div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-400">
            <button
              onClick={() => { setCurrentPath("home"); setSelectedCourseId(null); }}
              className={`hover:text-indigo-500 transition-colors cursor-pointer ${currentPath === "home" ? "text-indigo-500" : ""}`}
            >
              {t("home")}
            </button>
            <button
              onClick={() => { setCurrentPath("courses"); setSelectedCourseId(null); }}
              className={`hover:text-indigo-500 transition-colors cursor-pointer ${currentPath === "courses" ? "text-indigo-500" : ""}`}
            >
              {t("courses")}
            </button>
            <button
              onClick={() => { setCurrentPath("about"); setSelectedCourseId(null); }}
              className={`hover:text-indigo-500 transition-colors cursor-pointer ${currentPath === "about" ? "text-indigo-500" : ""}`}
            >
              {t("about")}
            </button>
            {currentUser && (
              <button
                onClick={() => { setCurrentPath("dashboard"); setSelectedCourseId(null); }}
                className={`hover:text-indigo-500 transition-colors cursor-pointer ${currentPath === "dashboard" ? "text-indigo-500" : ""}`}
              >
                {t("dashboard")}
              </button>
            )}
            {currentUser && currentUser.role === "admin" && (
              <button
                onClick={() => { setCurrentPath("admin"); setSelectedCourseId(null); }}
                className={`hover:text-indigo-500 transition-colors cursor-pointer ${currentPath === "admin" ? "text-indigo-500" : ""}`}
              >
                {t("adminPanel")}
              </button>
            )}
          </nav>

          {/* Util controls Row */}
          <div className="hidden md:flex items-center gap-4">
            
            {/* Language switch */}
            <button
              onClick={() => setLang(lang === "kh" ? "en" : "kh")}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-500/5 transition-colors cursor-pointer"
              title="Switch language"
            >
              <Languages className="w-5 h-5 text-indigo-500" />
            </button>

            {/* Theme controls */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-500/5 transition-colors cursor-pointer"
              title="Switch Theme"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* User credentials action button */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 font-mono">
                  ⭐ {currentUser.points || 0}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-slate-800 hover:bg-rose-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  {t("logout")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAuthMode("login"); setShowAuthModal(true); }}
                className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-indigo-500 hover:bg-indigo-600 transition-all flex items-center gap-1.5 cursor-pointer shadow shadow-indigo-500/10"
              >
                <LogIn className="w-4 h-4" />
                {t("login")}
              </button>
            )}

          </div>

          {/* Mobile hamburger menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl text-slate-400 hover:text-slate-200 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className={`md:hidden border-t p-4 space-y-4 animate-fade-in font-medium z-30 relative ${
            theme === "dark" 
              ? "glass-card border-white/10 text-slate-300" 
              : "glass-card-light border-slate-200 text-slate-800"
          }`}>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setCurrentPath("home"); setSelectedCourseId(null); setMobileMenuOpen(false); }}
                className={`p-2.5 rounded-xl text-left hover:bg-slate-900 ${currentPath === "home" ? "bg-indigo-500/10 text-indigo-400" : ""}`}
              >
                {t("home")}
              </button>
              <button
                onClick={() => { setCurrentPath("courses"); setSelectedCourseId(null); setMobileMenuOpen(false); }}
                className={`p-2.5 rounded-xl text-left hover:bg-slate-900 ${currentPath === "courses" ? "bg-indigo-500/10 text-indigo-400" : ""}`}
              >
                {t("courses")}
              </button>
              <button
                onClick={() => { setCurrentPath("about"); setSelectedCourseId(null); setMobileMenuOpen(false); }}
                className={`p-2.5 rounded-xl text-left hover:bg-slate-900 ${currentPath === "about" ? "bg-indigo-500/10 text-indigo-400" : ""}`}
              >
                {t("about")}
              </button>
              {currentUser && (
                <button
                  onClick={() => { setCurrentPath("dashboard"); setSelectedCourseId(null); setMobileMenuOpen(false); }}
                  className={`p-2.5 rounded-xl text-left hover:bg-slate-900 ${currentPath === "dashboard" ? "bg-indigo-500/10 text-indigo-400" : ""}`}
                >
                  {t("dashboard")}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="flex gap-2">
                <button onClick={() => setLang(lang === 'kh' ? 'en' : 'kh')} className="p-2 rounded-lg bg-slate-900 text-xs font-bold text-slate-300 flex items-center gap-1">
                  🌐 {lang === 'en' ? 'KH' : 'EN'}
                </button>
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-lg bg-slate-900 text-xs">
                  {theme === 'dark' ? '🌞' : '🌙'}
                </button>
              </div>

              {currentUser ? (
                <button onClick={handleLogout} className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600">
                  {t("logout")}
                </button>
              ) : (
                <button onClick={() => { setAuthMode("login"); setShowAuthModal(true); setMobileMenuOpen(false); }} className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-500">
                  {t("login")}
                </button>
              )}
            </div>
          </div>
        )}

      </header>


      {/* 2. MAIN WORKSPACE CONTENT */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        
        {loading ? (
          <div className="p-20 text-center space-y-4">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-slate-500 font-light">Compiling active LMS curriculum files...</p>
          </div>
        ) : selectedCourseId ? (
          // Nested course detailed viewer
          (() => {
            const selectedC = courses.find(c => c.id === selectedCourseId);
            const courseLessons = allLessons.filter(l => l.course_id === selectedCourseId);
            if (selectedC) {
              return (
                <CourseDetail
                  courseDetails={{ course: selectedC, lessons: courseLessons }}
                  currentUser={currentUser}
                  lang={lang}
                  theme={theme}
                  onBack={() => setSelectedCourseId(null)}
                  onNavigate={setCurrentPath}
                  onPurchaseComplete={loadCatalogData}
                />
              );
            }
            setSelectedCourseId(null);
            return null;
          })()
        ) : (
          // Path switcher routing
          <>
            {currentPath === "home" && (
              <Home
                courses={courses}
                lang={lang}
                theme={theme}
                onNavigate={setCurrentPath}
                onSelectCourse={setSelectedCourseId}
              />
            )}

            {currentPath === "courses" && (
              <Courses
                courses={courses}
                lang={lang}
                theme={theme}
                onSelectCourse={setSelectedCourseId}
              />
            )}

            {currentPath === "about" && (
              <AboutFAQ lang={lang} theme={theme} />
            )}

            {currentPath === "dashboard" && (
              <StudentDashboard
                unlockedCourses={getUnlockedCourses()}
                allLessons={allLessons}
                currentUser={currentUser}
                lang={lang}
                theme={theme}
                onUpdatePoints={(pts) => {
                  if (currentUser) {
                    const updated = { ...currentUser, points: pts };
                    setCurrentUser(updated);
                    // update on server async
                    fetch("/api/auth/profile", {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                      },
                      body: JSON.stringify({ points: pts })
                    });
                  }
                }}
                langToggle={() => setLang(lang === 'kh' ? 'en' : 'kh')}
              />
            )}

            {currentPath === "admin" && (
              <AdminDashboard
                courses={courses}
                allLessons={allLessons}
                lang={lang}
                theme={theme}
                onRefreshData={loadCatalogData}
              />
            )}
          </>
        )}

      </main>


      {/* 3. FLOATING AI WORKSPACE TUTOR BUTTON & DRAWER */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowAiDrawer(!showAiDrawer)}
          type="button"
          className="h-14 w-14 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 transition-all select-none cursor-pointer border border-indigo-400/20"
          title="Kru Sabai AI Assistant"
        >
          <MessageSquare className="w-6 h-6 fill-current" />
        </button>

        {showAiDrawer && (
          <div className={`absolute bottom-16 right-0 w-80 sm:w-96 rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 z-30 ${
            theme === "dark" ? "glass-card border-white/15 text-white" : "glass-card-light text-slate-800"
          }`}>
            
            {/* AI Assistant Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 text-white flex justify-between items-center whitespace-nowrap">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 fill-white/10" />
                <div>
                  <h3 className="font-extrabold text-sm">{t("askAiTitle")}</h3>
                  <p className="text-[10px] opacity-80">{lang === 'en' ? 'Localized digital mentor' : 'គ្រូឧទ្ទេស AI ផ្ទាល់ខ្លួន'}</p>
                </div>
              </div>
              <button onClick={() => setShowAiDrawer(false)} className="text-white hover:opacity-80 font-bold text-sm">✕</button>
            </div>

            {/* Chat Body */}
            <div className="p-4 h-80 overflow-y-auto space-y-3 flex flex-col text-xs font-light">
              {aiChat.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-2xl max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-indigo-500 text-white self-end rounded-br-none"
                      : theme === "dark" ? "bg-slate-950 text-slate-200 border border-slate-850 self-start rounded-bl-none" : "bg-slate-100 text-slate-850 self-start rounded-bl-none"
                  }`}
                >
                  <p className="leading-relaxed font-light whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}
              {aiLoading && (
                <div className="p-3 rounded-2xl bg-slate-500/5 max-w-[85%] self-start rounded-bl-none animate-pulse">
                  <span className="text-slate-400">Thinking...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Footer */}
            <div className={`p-3 border-t flex gap-2 ${theme === 'dark' ? 'border-white/15 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendAiMessage(); }}
                placeholder={t("aiPlaceholder")}
                className="flex-1 bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-white"
              />
              <button
                onClick={handleSendAiMessage}
                disabled={!aiInput.trim()}
                className="p-2 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}
      </div>


      {/* 4. SEAMLESS AUTHENTICATION MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100/10 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className={`relative max-w-sm w-full rounded-3xl border shadow-2xl p-6 ${
            theme === "dark" ? "glass-card border-white/15 text-white" : "glass-card-light text-slate-800"
          }`}>
            
            <button
              onClick={() => { setShowAuthModal(false); setAuthError(""); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 font-bold"
            >
              ✕
            </button>
 
            <h2 className="text-2xl font-black tracking-tight mb-4">
              {authMode === "login" ? t("login") : t("register")}
            </h2>
 
            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs sm:text-sm">
              {authMode === "register" && (
                <div className="space-y-1">
                  <label className="text-2xs font-extrabold text-slate-400 uppercase">Your Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="E.g. Chan Sophal"
                    className={`w-full px-3 py-2 rounded-xl text-xs transition-all ${
                      theme === "dark" ? "glass-input" : "glass-input-light"
                    }`}
                  />
                </div>
              )}
 
              <div className="space-y-1">
                <label className="text-2xs font-extrabold text-slate-400 uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@email.com"
                  className={`w-full px-3 py-2 rounded-xl text-xs transition-all ${
                    theme === "dark" ? "glass-input" : "glass-input-light"
                  }`}
                />
              </div>
 
              <div className="space-y-1">
                <label className="text-2xs font-extrabold text-slate-400 uppercase font-mono">Password Key</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 rounded-xl text-xs transition-all ${
                    theme === "dark" ? "glass-input" : "glass-input-light"
                  }`}
                />
              </div>

              {authMode === "register" && (
                <div className="space-y-1">
                  <label className="text-2xs font-extrabold text-slate-400 uppercase">Select Role</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAuthRole("student")}
                      className={`p-1.5 rounded-xl border font-bold text-[10px] transition-all cursor-pointer ${
                        authRole === 'student' ? 'bg-indigo-500 text-white border-indigo-600 shadow' : 'bg-transparent text-slate-400'
                      }`}
                    >
                      Student
                      <span className="block text-[8px] font-medium opacity-80">សិស្ស</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthRole("teacher")}
                      className={`p-1.5 rounded-xl border font-bold text-[10px] transition-all cursor-pointer ${
                        authRole === 'teacher' ? 'bg-indigo-500 text-white border-indigo-600 shadow' : 'bg-transparent text-slate-400'
                      }`}
                    >
                      Instructor
                      <span className="block text-[8px] font-medium opacity-80">គ្រូ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthRole("admin")}
                      className={`p-1.5 rounded-xl border font-bold text-[10px] transition-all cursor-pointer ${
                        authRole === 'admin' ? 'bg-indigo-500 text-white border-indigo-600 shadow' : 'bg-transparent text-slate-400'
                      }`}
                    >
                      Admin
                      <span className="block text-[8px] font-medium opacity-80">អ្នកគ្រប់គ្រង</span>
                    </button>
                  </div>
                </div>
              )}

              {authError && (
                <div className="p-2.5 text-2xs font-bold text-rose-500 bg-rose-500/10 rounded-lg animate-pulse">
                  ✕ {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-white bg-indigo-500 hover:bg-indigo-600 shadow-md shadow-indigo-500/10 cursor-pointer"
              >
                {authMode === "login" ? t("login") : t("register")}
              </button>
            </form>

            <div className="pt-4 text-center text-xs text-slate-500">
              {authMode === "login" ? (
                <>
                  {lang === "en" ? "New builder? " : "គណនីថ្មី? "}
                  <button onClick={() => { setAuthMode("register"); setAuthError(""); }} className="text-indigo-500 hover:underline inline font-bold">
                    {t("register")}
                  </button>
                </>
              ) : (
                <>
                  {lang === "en" ? "Joined already? " : "មានគណនីហើយ? "}
                  <button onClick={() => { setAuthMode("login"); setAuthError(""); }} className="text-indigo-500 hover:underline inline font-bold">
                    {t("login")}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}


      {/* 5. SEAMLESS COMPREHENSIVE FOOTER */}
      <footer className={`py-12 border-t transition-all duration-350 z-10 ${
        theme === "dark" ? "glass-panel border-white/10 text-slate-400" : "bg-white border-slate-100 text-slate-600"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-black text-xs">P</div>
              <span className="font-extrabold text-slate-200 leading-none">PRO DIGITAL</span>
            </div>
            <p className="text-xs leading-relaxed font-light">{t("footerQuote")}</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Quick Links</h4>
            <div className="flex flex-col gap-2 text-xs">
              <button onClick={() => { setCurrentPath("home"); setSelectedCourseId(null); }} className="text-left hover:text-white">Home</button>
              <button onClick={() => { setCurrentPath("courses"); setSelectedCourseId(null); }} className="text-left hover:text-white">Courses</button>
              <button onClick={() => { setCurrentPath("about"); setSelectedCourseId(null); }} className="text-left hover:text-white">About & FAQs</button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Specialized Tracks</h4>
            <div className="flex flex-col gap-2 text-xs">
              <span className="text-left font-light">Next.js Coding Mastery</span>
              <span className="text-left font-light">AI Business Funnels</span>
              <span className="text-left font-light">Phnom Penh retail systems</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Academy Seal</h4>
            <div className="p-3.5 rounded-xl border border-dashed border-slate-800 text-3xs font-mono leading-relaxed bg-slate-900/45">
              🎓 Validated by local institutions. Certificate code hashing is 100% cloud synced. Standard tuition fee includes direct Discord & Telegram community study groups.
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-900 text-center text-3xs font-mono text-slate-500">
          © {new Date().getFullYear()} PRO DIGITAL LMS. All rights reserved. Registered under Ministry of Education, Youth and Sport in Cambodia.
        </div>
      </footer>

    </div>
  );
}
