import React, { useState, useRef, useEffect } from "react";
import { Play, CheckCircle, Award, Sparkles, BookOpen, ChevronRight, FileDown, Eye, Volume2, Maximize, HelpCircle, FastForward } from "lucide-react";
import { Course, Lesson, User } from "../types";
import { Language, getTranslation } from "../utils/translate";

interface StudentDashboardProps {
  unlockedCourses: Course[];
  allLessons: Lesson[];
  currentUser: User | null;
  lang: Language;
  onUpdatePoints: (newPoints: number) => void;
  langToggle: () => void;
  theme: "light" | "dark";
}

export default function StudentDashboard({ unlockedCourses, allLessons, currentUser, lang, onUpdatePoints, theme }: StudentDashboardProps) {
  const t = (key: any) => getTranslation(lang, key);

  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activePlaybackRate, setActivePlaybackRate] = useState(1);
  const [subtitleLang, setSubtitleLang] = useState<"none" | "en" | "kh">("en");

  // Track lesson study completions
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  // Quiz progress
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizError, setQuizError] = useState("");

  // Certificates Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showCertOption, setShowCertOption] = useState<string | null>(null);

  // Subtitles content structure
  const dummySubtitles: Record<string, { en: string; kh: string }[]> = {
    "welcome": [
      { en: "Welcome back to Sabai Academy E-Learning Platform.", kh: "សូមស្វាគមន៍មកកាន់ប្រព័ន្ធសិក្សា សាបាយ អាខាដឺមី។" },
      { en: "In this session, we investigate major tech standards and layouts.", kh: "មេរៀននេះ យើងនឹងស្វែងយល់ពីប្លង់បច្ចេកវិទ្យា និងស្តង់ដារកូដ។" },
      { en: "Make sure to answer the lesson quiz to earn points.", kh: "សូមកុំភ្លេចធ្វើតេស្តវាស់ស្ទង់សមត្ថភាព ដើម្បីទទួលបានពិន្ទុសន្សំ។" },
    ]
  };

  const getSubtitlesForTime = () => {
    // Return a random subtitle chunk for high demonstration fidelity
    const subs = dummySubtitles["welcome"];
    const randomIndex = Math.floor(Date.now() / 6000) % subs.length;
    return subs[randomIndex];
  };

  // Safe fetch of course lessons
  const filteredLessons = activeCourse
    ? allLessons.filter(l => l.course_id === activeCourse.id).sort((a, b) => a.order - b.order)
    : [];

  useEffect(() => {
    if (filteredLessons.length > 0 && !activeLesson) {
      setActiveLesson(filteredLessons[0]);
    }
  }, [activeCourse, filteredLessons]);

  // Handle Mark completed & Trigger Next
  const handleMarkCompleted = () => {
    if (!activeLesson) return;
    if (!completedLessons.includes(activeLesson.id)) {
      const updated = [...completedLessons, activeLesson.id];
      setCompletedLessons(updated);
      
      // Award study points
      onUpdatePoints((currentUser?.points || 15) + 5);

      // Check if there is a next lesson
      const currentIndex = filteredLessons.findIndex(l => l.id === activeLesson.id);
      if (currentIndex >= 0 && currentIndex < filteredLessons.length - 1) {
        setActiveLesson(filteredLessons[currentIndex + 1]);
        setQuizScore(null);
        setQuizAnswers({});
        setQuizError("");
      } else {
        // End of course! Open certificate option
        setShowCertOption(activeCourse!.id);
      }
    }
  };

  // Verify Quiz answers
  const handleQuizSubmit = () => {
    if (!activeLesson || !activeLesson.quiz) return;
    
    let allCorrect = true;
    activeLesson.quiz.forEach((q, idx) => {
      if (quizAnswers[idx] !== q.answerIndex) {
        allCorrect = false;
      }
    });

    if (allCorrect) {
      setQuizScore(100);
      setQuizError("");
      onUpdatePoints((currentUser?.points || 15) + 10);
    } else {
      setQuizScore(0);
      setQuizError(t("quizFailed"));
    }
  };

  // Generate certificate on HTML Canvas
  const handleDrawCertificate = (courseTitle: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high resolution canvas dimensions
    canvas.width = 800;
    canvas.height = 550;

    // Draw solid elegant cream backdrop
    ctx.fillStyle = "#FDFBF7";
    ctx.fillRect(0, 0, 800, 550);

    // Draw gold borders
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, 760, 510);

    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 740, 490);

    // Draw Branded Titles
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 26px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("SABAI ACADEMY LMS", 400, 80);

    ctx.fillStyle = "#D4AF37";
    ctx.font = "14px 'JetBrains Mono', Courier, monospace";
    ctx.fillText("OFFICIAL GRADUATION CREDENTIAL", 400, 110);

    // Main Certificate Body Text
    ctx.fillStyle = "#475569";
    ctx.font = "italic 16px Georgia, serif";
    ctx.fillText("This document certifies that", 400, 180);

    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 28px 'Inter', sans-serif";
    ctx.fillText(currentUser?.name || "Accomplished Student", 400, 230);

    ctx.fillStyle = "#475569";
    ctx.font = "italic 16px Georgia, serif";
    ctx.fillText("has successfully finalized all curriculum chapters for", 400, 280);

    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 18px 'Inter', sans-serif";
    // Clean course title to fit bounding canvas
    const displayTitle = courseTitle.length > 55 ? `${courseTitle.slice(0, 55)}...` : courseTitle;
    ctx.fillText(displayTitle, 400, 320);

    ctx.fillStyle = "#64748B";
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillText(`ID CODE: CERT-SABAI-${Math.floor(1000 + Math.random() * 9000)}`, 400, 360);

    // Signature blocks
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(150, 440);
    ctx.lineTo(310, 440);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(490, 440);
    ctx.lineTo(650, 440);
    ctx.stroke();

    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 12px 'Inter', sans-serif";
    ctx.fillText("Chan Sophal", 230, 460);
    ctx.fillText("Academy Director", 230, 475);

    ctx.fillText(currentUser?.name || "Accomplished Student", 570, 460);
    ctx.fillText("Graduate Student ID", 570, 475);

    // Decorative School Seal Stamp
    ctx.fillStyle = "rgba(212, 175, 55, 0.4)";
    ctx.beginPath();
    ctx.arc(400, 440, 35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#B45309";
    ctx.font = "bold 10px 'Inter', sans-serif";
    ctx.fillText("SABAI SEAL", 400, 442);
  };

  // Triggers Canvas drawing once credential option is opened
  useEffect(() => {
    if (showCertOption) {
      const activeC = unlockedCourses.find(c => c.id === showCertOption);
      if (activeC) {
        setTimeout(() => handleDrawCertificate(activeC.title), 200);
      }
    }
  }, [showCertOption]);

  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `Certificate-Sabai-${currentUser?.name || "Student"}.png`;
    link.href = url;
    link.click();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Back to course selection when active player is loaded */}
      {activeCourse ? (
        <button
          onClick={() => {
            setActiveCourse(null);
            setActiveLesson(null);
            setShowCertOption(null);
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-500 hover:underline cursor-pointer"
        >
          ← {lang === "en" ? "Exit classroom player" : "ចាកចេញមកផ្ទាំងដើមវិញ"}
        </button>
      ) : (
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-indigo-500" />
            {t("welcomeBack")}, {currentUser?.name || "Student"}!
          </h1>
          <p className="text-slate-500">
            {lang === "en" ? "Track your progress milestones, watch unlocked lectures, and design custom graduate certificates." : "តាមដានវឌ្ឍនភាពសិក្សា មើលវីដេអូមេរៀនដែលបានទិញ និងទាញយកវិញ្ញាបនបត្រទូទៅជំនាញ៖"}
          </p>
        </div>
      )}

      {/* Main Container Views */}
      {!activeCourse ? (
        // --- 1. COURSES GRID ON THE STUDENT HOME ---
        <div className="space-y-8">
          
          {/* Student Status Summary Card */}
          <div className={`p-6 rounded-2xl backdrop-blur-md shadow-md flex flex-wrap gap-6 items-center justify-between border ${
            theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light'
          }`}>
            <div className="space-y-2">
              <div className="text-xs text-slate-300 uppercase tracking-widest">{lang === "en" ? "Learning Milestone Score Ledger" : "គណនីវាយតម្លៃដំណើរការសិស្ស"}</div>
              <div className="text-2xl sm:text-3xl font-black flex items-center gap-2 text-amber-400">
                ⭐ {currentUser?.points || 15} <span className="text-white text-base font-medium">{t("points")}</span>
              </div>
            </div>
            
            <div className="h-10 w-[1px] bg-slate-800 hidden sm:block"></div>

            <div className="space-y-2">
              <div className="text-xs text-slate-300 uppercase tracking-widest">{t("level")}</div>
              <div className="text-lg font-bold">
                {currentUser?.points && currentUser.points > 80 ? "🏆 Elite Dev Champion" : "🚀 Active Tech Builder"}
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-400 max-w-xs">
              💡 {lang === "en" ? "Watch lectures and complete lesson mini-quizzes to earn rewards and points!" : "💡 មើលវីដេអូមេរៀន និងឆ្លើយកម្រងសំណួរចម្លើយ ដើម្បីសន្ការពិន្ទុបញ្ជាក់ការសិក្សា!"}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">{t("myCourses")}</h2>
            
            {unlockedCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {unlockedCourses.map((c) => {
                  // Calculate mock progress bar value
                  const isCompleted = showCertOption === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm border transition-all ${
                        theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light'
                      }`}
                    >
                      <div className="flex gap-4">
                        <img referrerPolicy="no-referrer" src={c.thumbnail} alt={c.title} className="w-16 h-16 rounded-xl object-cover shrink-0 border" />
                        <div className="space-y-1">
                          <h3 className="font-bold text-sm sm:text-base line-clamp-1">{c.title}</h3>
                          <p className="text-xs text-slate-500">{t("category")}: {c.category}</p>
                          <p className="text-2xs font-mono text-slate-400">{t("instructor")}: {c.instructor}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1 pt-2">
                        <div className="flex justify-between text-2xs font-bold text-slate-500">
                          <span>{lang === "en" ? "Course Progress:" : "វឌ្ឍនភាពសិក្សា៖"}</span>
                          <span>{isCompleted ? "100%" : "35%"}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: isCompleted ? "100%" : "35%" }}></div>
                        </div>
                      </div>

                      {/* Launch operations */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setActiveCourse(c)}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          {t("continueLearning")}
                        </button>

                        <button
                          onClick={() => {
                            setActiveCourse(c);
                            setShowCertOption(c.id);
                          }}
                          className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            theme === 'dark' ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
                          }`}
                          title="Generate Certificate"
                        >
                          <Award className="w-4 h-4 text-emerald-500" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`p-12 text-center rounded-3xl transition-all shadow-sm ${
                theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light'
              }`}>
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-bold text-lg">{t("noCoursesJoined")}</h3>
                <p className="text-sm text-slate-500 mt-2">
                  {lang === "en" ? "Browse our curriculum catalog and explore skills today!" : "សូមចូលទៅកាន់មុខវគ្គសិក្សាដើម្បីបញ្ជាទិញវគ្គសិក្សាល្អៗ។"}
                </p>
              </div>
            )}

          </div>

        </div>
      ) : (
        // --- 2. LEARNING SCREEN + PLAYER VIEW ---
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main custom video player & lecture logs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Custom secured learning video player */}
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none group">
              
              {/* Users Email Rotating Watermark in order to prevent recordings */}
              <div className="absolute top-1/4 left-1/3 text-[10px] sm:text-xs font-mono font-bold tracking-wider text-white/10 dark:text-white/5 uppercase select-none pointer-events-none rotate-12 z-20 animate-pulse">
                🔐 PROPERTY OF: {currentUser?.email || "STUDENT SECRET"}
              </div>
              <div className="absolute bottom-1/4 right-1/4 text-[10px] sm:text-xs font-mono font-bold tracking-wider text-white/10 dark:text-white/5 uppercase select-none pointer-events-none -rotate-12 z-20 animate-pulse">
                🔐 DO NOT COPY / SABAI ACADEMY ID-{currentUser?.id || "MEMBER"}
              </div>

              {/* Base Simulated Lecture Image */}
              <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-tr from-indigo-950 via-slate-900 to-slate-950">
                <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-400/20 mb-4 animate-bounce">
                  <Play className="w-10 h-10 fill-indigo-400/20 ml-1 translate-x-0.5" />
                </div>
                <h3 className="text-sm sm:text-lg font-bold text-slate-200 line-clamp-1">{activeLesson?.title}</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm font-light">Watching secure study video stream via CDN pipeline...</p>
                
                {/* Embedded dynamic subtitle tracks */}
                {subtitleLang !== "none" && (
                  <div className="absolute bottom-12 left-4 right-4 text-center z-10">
                    <span className="inline-block px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur text-sm font-light tracking-wide text-amber-200 border border-amber-400/10 max-w-lg">
                      {subtitleLang === "en" ? getSubtitlesForTime().en : getSubtitlesForTime().kh}
                    </span>
                  </div>
                )}
              </div>

              {/* Secure Player control utility board */}
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between gap-4 z-30 transition-opacity opacity-100 group-hover:opacity-100 sm:opacity-90">
                <div className="flex items-center gap-3">
                  <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 focus:outline-none cursor-pointer">
                    <Volume2 className="w-4 h-4" /> 100%
                  </button>
                  
                  {/* Playback speed selector */}
                  <div className="relative">
                    <select
                      value={activePlaybackRate}
                      onChange={(e) => setActivePlaybackRate(parseFloat(e.target.value))}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-2xs font-extrabold focus:outline-none cursor-pointer border border-white/10"
                    >
                      <option value="1">1.0x (Normal)</option>
                      <option value="1.25">1.25x</option>
                      <option value="1.5">1.5x (Fast)</option>
                      <option value="2">2.0x</option>
                    </select>
                  </div>
                </div>

                {/* Secure Subtitles selector */}
                <div className="flex items-center gap-2">
                  <div className="flex border rounded-lg overflow-hidden border-white/20">
                    <button
                      onClick={() => setSubtitleLang("none")}
                      className={`px-2 py-1 text-4xs font-bold ${subtitleLang === 'none' ? 'bg-indigo-500 text-white' : 'bg-white/15 text-slate-300'}`}
                    >
                      OFF
                    </button>
                    <button
                      onClick={() => setSubtitleLang("en")}
                      className={`px-2 py-1 text-4xs font-bold ${subtitleLang === 'en' ? 'bg-indigo-500 text-white' : 'bg-white/15 text-slate-300'}`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => setSubtitleLang("kh")}
                      className={`px-2 py-1 text-4xs font-bold ${subtitleLang === 'kh' ? 'bg-indigo-500 text-white' : 'bg-white/15 text-slate-300'}`}
                    >
                      KH
                    </button>
                  </div>

                  <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer">
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

            {/* Title & Complete triggers */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold tracking-tight">{activeLesson?.title}</h2>
                <p className="text-xs text-slate-400 font-light max-w-lg">{activeLesson?.details}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleMarkCompleted}
                  className="px-5 py-2.5 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow shadow-indigo-500/10 cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm"
                >
                  <CheckCircle className="w-4 h-4 fill-current" />
                  {lang === "en" ? "Mark Chapter Completed" : "បញ្ចប់មេរៀននេះ"}
                </button>
              </div>
            </div>

            {/* Study Attachments list */}
            {activeLesson?.attachments && activeLesson.attachments.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-sm tracking-widest uppercase text-slate-400 flex items-center gap-1.5">
                  <FileDown className="w-4 h-4" /> {lang === "en" ? "Study Attachments PDF / Source Code" : "ទាញយកឯកសារមេរៀន និងកូដ៖"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                  {activeLesson.attachments.map((file, idx) => (
                    <a
                      key={idx}
                      href="#"
                      onClick={(e) => { e.preventDefault(); alert(`Downloading file outline: ${file}`); }}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold hover:bg-indigo-500/5 transition-all ${
                        theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light'
                      }`}
                    >
                      <span className="truncate">{file}</span>
                      <span className="text-indigo-500">Download</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive MCQ Quiz Panel */}
            {activeLesson?.quiz && activeLesson.quiz.length > 0 && (
              <div className={`p-6 rounded-2xl border transition-all space-y-6 ${
                theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light bg-amber-500/5 border-amber-505/10'
              }`}>
                <h3 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-500" /> {t("quizTitle")}
                </h3>

                <div className="space-y-4">
                  {activeLesson.quiz.map((q, qIdx) => (
                    <div key={qIdx} className="space-y-2">
                      <div className="text-xs font-bold text-slate-500">
                        {lang === "en" ? "Question " : "សំណួរទី "} {qIdx + 1}៖ {q.question}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = quizAnswers[qIdx] === optIdx;
                          return (
                            <button
                              key={optIdx}
                              onClick={() => setQuizAnswers({ ...quizAnswers, [qIdx]: optIdx })}
                              className={`p-3 text-left rounded-xl text-xs font-medium border focus:outline-none transition-all ${
                                isSelected
                                  ? "bg-amber-500 text-white border-amber-600 shadow"
                                  : theme === 'dark' ? "glass-card border-white/5 hover:bg-white/5 text-white/90" : "glass-card-light bg-white border-slate-200"
                              }`}
                            >
                              {optIdx + 1}. {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  {quizScore === 100 ? (
                    <div className="p-3 text-xs font-semibold text-emerald-500 bg-emerald-500/10 rounded-lg animate-pulse">
                      🎉 {t("quizPassed")}
                    </div>
                  ) : quizError ? (
                    <div className="p-3 text-xs font-semibold text-rose-500 bg-rose-500/10 rounded-lg">
                      ✕ {quizError}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Answer all questions correctly for +10 studying points.</span>
                  )}

                  {quizScore !== 100 && (
                    <button
                      type="button"
                      onClick={handleQuizSubmit}
                      className="px-5 py-2.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-white text-xs cursor-pointer"
                    >
                      {t("submitQuiz")}
                    </button>
                  )}
                </div>

              </div>
            )}

          </div>

          {/* Secure Video list sidebar */}
          <div className="space-y-6">
            
            {/* Lessons Curriculum Drawer */}
            <div className={`p-5 rounded-2xl shadow-md space-y-4 border transition-all ${
              theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light'
            }`}>
              <h3 className="font-extrabold text-sm tracking-wider uppercase text-slate-400">{lang === "en" ? "Course Lectures" : "វីដេអូមេរៀនសរុប"}</h3>
              <div className="space-y-2">
                {filteredLessons.map((l, index) => {
                  const isActive = activeLesson?.id === l.id;
                  const isCompleted = completedLessons.includes(l.id);
                  return (
                    <div
                      key={l.id}
                      onClick={() => {
                        setActiveLesson(l);
                        setQuizScore(null);
                        setQuizAnswers({});
                        setQuizError("");
                      }}
                      className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer border transition-all ${
                        isActive
                          ? "bg-indigo-500 border-indigo-600 text-white shadow-md shadow-indigo-500/10"
                          : isCompleted
                            ? "bg-emerald-500/5 border-emerald-500/15"
                            : theme === 'dark' ? "glass-card border-white/5 hover:bg-white/5 text-white" : "glass-card-light border-slate-100 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className={`p-1.5 rounded-lg text-4xs font-mono font-black shrink-0 ${
                          isActive ? "bg-white text-indigo-500" : "bg-slate-500/15 text-slate-400"
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-xs font-semibold truncate">{l.title}</span>
                      </div>
                      
                      {isCompleted && (
                        <CheckCircle className={`w-4 h-4 shrink-0 col-span-1 ${isActive ? "text-white" : "text-emerald-500"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Canvas dynamic Certificate preview box */}
            {showCertOption === activeCourse.id && (
              <div className={`p-5 rounded-2xl border text-center transition-all space-y-4 ${
                theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light text-slate-800'
              }`}>
                <Award className="w-10 h-10 text-emerald-500 mx-auto mb-2 animate-pulse" />
                <h4 className="font-bold text-sm">{currentUser?.name}! {lang === "en" ? "Finalized!" : "បញ្ចប់ការសិក្សាជោគជ័យ!"}</h4>
                <p className="text-xs text-slate-400">{lang === "en" ? "Branded official graduate certificate drawn on Canvas below is configured for print." : "កូដវិញ្ញាបនបត្រផ្លូវការសាលារបស់លោកអ្នកត្រូវបានបង្កើតជោគជ័យ។ លោកអ្នកអាចទាញយកបាន៖"}</p>

                {/* Drawn canvas showing live */}
                <div className="overflow-hidden border rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-shadow">
                  <canvas ref={canvasRef} className="w-full h-auto aspect-[800/550] bg-slate-100" />
                </div>

                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors shadow shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1"
                >
                  <FileDown className="w-4 h-4" />
                  {t("downloadCert")}
                </button>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
