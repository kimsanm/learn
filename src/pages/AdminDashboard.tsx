import React, { useState, useEffect } from "react";
import { Users, BookOpen, DollarSign, Clock, ShieldCheck, Eye, Terminal, Sparkles, Plus, Trash2, Edit2, BadgeAlert, Check, X, RefreshCw } from "lucide-react";
import { Course, Lesson, User, PaymentTransaction, DashboardMetrics } from "../types";
import { Language, getTranslation } from "../utils/translate";

interface AdminDashboardProps {
  courses: Course[];
  allLessons: Lesson[];
  lang: Language;
  onRefreshData: () => void;
  theme: "light" | "dark";
}

export default function AdminDashboard({ courses, allLessons, lang, onRefreshData, theme }: AdminDashboardProps) {
  const t = (key: any) => getTranslation(lang, key);

  // States
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  
  // AI Generator States
  const [aiTopic, setAiTopic] = useState("");
  const [aiCategory, setAiCategory] = useState("Technology");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);

  // General course editor states
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [coursePrice, setCoursePrice] = useState("29");
  const [courseCategory, setCourseCategory] = useState("Software");

  // Dynamic fetcher helper
  const loadAdminData = async () => {
    try {
      const headers: any = { "Content-Type": "application/json" };
      const token = localStorage.getItem("token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // 1. Metrics
      const mRes = await fetch("/api/admin/metrics", { headers });
      if (mRes.ok) {
        const mData = await mRes.json();
        setMetrics(mData);
      }

      // 2. Users lists
      const uRes = await fetch("/api/users", { headers });
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData);
      }

      // 3. Payments
      const pRes = await fetch("/api/payments/transactions", { headers });
      if (pRes.ok) {
        const pData = await pRes.json();
        setTransactions(pData);
      }

    } catch (err) {
      console.error("Error fetching admin files:", err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Update user roles & status
  const handleUpdateUser = async (userId: string, role?: string, status?: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ role, status })
      });
      if (res.ok) {
        loadAdminData();
        alert(lang === "en" ? "User configuration saved." : "រក្សាទុកគណនីបានសម្រេច។");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Approve course payment transactions
  const handleApprovePayment = async (trxId: string, action: "approve" | "decline") => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/payments/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ transaction_id: trxId, action })
      });
      if (res.ok) {
        loadAdminData();
        onRefreshData();
        alert(`Transaction ${action} completed successfully.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Publish manual Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle || !courseDesc) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/courses/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: courseTitle,
          description: courseDesc,
          price: parseFloat(coursePrice),
          category: courseCategory
        })
      });
      if (res.ok) {
        setCourseTitle("");
        setCourseDesc("");
        setShowCourseForm(false);
        onRefreshData();
        loadAdminData();
        alert("Course created successfully!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Triggers Gemini AI course creator
  const handleAiCourseGenerate = async () => {
    if (!aiTopic) return;
    setAiGenerating(true);
    setAiResult(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/ai/course-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ topic: aiTopic, category: aiCategory })
      });
      const data = await res.json();
      if (res.ok) {
        setAiResult(data);
      } else {
        alert(data.error || "AI Generation failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiGenerating(false);
    }
  };

  // Commit AI outline directly into active DB Collections
  const handlePublishAiCourse = async () => {
    if (!aiResult) return;
    try {
      const token = localStorage.getItem("token");
      // 1. Create main course item
      const cRes = await fetch("/api/courses/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: aiResult.title,
          description: aiResult.description,
          price: aiResult.price || 29,
          category: aiResult.category || "AI Generated"
        })
      });
      
      const cData = await cRes.json();
      if (!cRes.ok) throw new Error(cData.error || "Failed inserting main course");

      // 2. Commit all generated syllabus lessons
      if (aiResult.lessons && aiResult.lessons.length > 0) {
        for (const lesson of aiResult.lessons) {
          await fetch("/api/lessons", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              course_id: cData.course.id,
              title: lesson.title,
              video_url: lesson.video_url || "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              details: lesson.details || "",
              quiz: lesson.quiz || []
            })
          });
        }
      }

      setAiResult(null);
      setAiTopic("");
      onRefreshData();
      loadAdminData();
      alert("AI Course successfully committed and published in LMS catalog!");

    } catch (err: any) {
      alert(`Publishing failed: ${err.message}`);
    }
  };

  // Purge/delete course
  const handleDeleteCourse = async (id: string) => {
    if (!confirm(lang === "en" ? "Delete course & related chapters permanently?" : "លុបវគ្គសិក្សានេះចោលជាអចិន្ត្រៃយ៍?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/courses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        onRefreshData();
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
      
      {/* Title */}
      <div className="flex justify-between items-center whitespace-nowrap">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">{t("adminPanel")}</h1>
          <p className="text-sm text-slate-500">{t("brand")} {lang === 'en' ? 'Administrative panel controls' : 'ផ្ទាំងបញ្ជ្ជាការទិន្នន័យរួម'}</p>
        </div>
        <button
          onClick={loadAdminData}
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-500/5 flex items-center gap-1 cursor-pointer"
          title="Refresh statistics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className={`p-5 rounded-2xl border transition-all shadow-sm ${theme === 'dark' ? 'glass-card border-white/15 text-white' : 'glass-card-light'}`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl"><Users className="w-5 h-5" /></div>
            <div>
              <div className="text-xl font-bold">{metrics?.totalUsers || "..."}</div>
              <p className="text-xs text-slate-500">{t("totalUsers")}</p>
            </div>
          </div>
        </div>
        
        <div className={`p-5 rounded-2xl border transition-all shadow-sm ${theme === 'dark' ? 'glass-card border-white/15 text-white' : 'glass-card-light'}`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><DollarSign className="w-5 h-5" /></div>
            <div>
              <div className="text-xl font-bold">${metrics?.totalSales?.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-slate-500">{t("totalSales")}</p>
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border transition-all shadow-sm ${theme === 'dark' ? 'glass-card border-white/15 text-white' : 'glass-card-light'}`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><BookOpen className="w-5 h-5" /></div>
            <div>
              <div className="text-xl font-bold">{metrics?.totalCourses || "..."}</div>
              <p className="text-xs text-slate-500">{lang === "en" ? "Catalog Courses" : "វគ្គសិក្សាសរុប"}</p>
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border transition-all shadow-sm ${theme === 'dark' ? 'glass-card border-white/15 text-white' : 'glass-card-light'}`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <div className="text-xl font-bold">{metrics?.pendingTransactions || "0"}</div>
              <p className="text-xs text-slate-500">{lang === "en" ? "Pending Approvals" : "រង់ចាំការបញ្ជាក់"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Course Creator Section */}
      <section className={`p-6 rounded-2xl border transition-all shadow-md space-y-6 ${
        theme === 'dark' 
          ? 'glass-card bg-gradient-to-br from-indigo-950/20 to-transparent border-indigo-500/25 text-white' 
          : 'glass-card-light bg-gradient-to-br from-indigo-50/50 to-white/70 border-indigo-200/50'
      }`}>
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-indigo-500/20 text-indigo-400">
            <Sparkles className="w-5 h-5 fill-indigo-400/20" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">AI Multi-Language Syllabus Generator</h2>
            <p className="text-2xs text-slate-500">Auto generate complete course outline titles, curriculum, and interactive lesson MCQ quizzes utilizing Gemini AI</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="text-2xs font-bold text-slate-500 block uppercase">Course Theme / Target Skill Scope</label>
            <input
              type="text"
              placeholder={t("aiTopicPlaceholder")}
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              disabled={aiGenerating}
              className={`w-full px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm transition-all ${
                theme === 'dark' ? 'glass-input' : 'glass-input-light'
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className="text-2xs font-bold text-slate-500 block uppercase">Select Category Tag</label>
            <select
              value={aiCategory}
              onChange={(e) => setAiCategory(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm transition-all ${
                theme === 'dark' ? 'glass-input' : 'glass-input-light'
              }`}
            >
              <option value="Technology" className="bg-white dark:bg-slate-950">Technology</option>
              <option value="Digital Marketing" className="bg-white dark:bg-slate-950">Digital Marketing</option>
              <option value="Design & UX/UI" className="bg-white dark:bg-slate-950">Design & UX/UI</option>
              <option value="SME Business" className="bg-white dark:bg-slate-950">SME Business</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAiCourseGenerate}
          disabled={aiGenerating || !aiTopic}
          className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          {aiGenerating ? "Gemini structuring outline blueprints..." : "Generate Syllabus Outline"}
        </button>

        {aiResult && (
          <div className={`p-5 rounded-xl border transition-all space-y-4 ${
            theme === 'dark' ? 'glass-card border-white/10' : 'glass-card-light'
          }`}>
            <div className="flex justify-between items-start border-b border-slate-155 dark:border-white/10 pb-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase rounded-md bg-indigo-500/10 text-indigo-400 px-2 py-0.5">{aiResult.category || "AI Dynamic"}</span>
                <h4 className="font-bold text-base text-indigo-400">{aiResult.title}</h4>
                <p className="text-2xs text-slate-400 font-light">{aiResult.description}</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-emerald-500">${aiResult.price || 29}</div>
                <div className="text-[10px] text-slate-400">{aiResult.duration || "10 Hours"}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chapters Outline draft Structure</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {aiResult.lessons?.map((les: any, i: number) => (
                  <div key={i} className={`p-3 rounded-lg border transition-all space-y-1.5 ${
                    theme === 'dark' ? 'glass-card border-white/5' : 'bg-white border'
                  }`}>
                    <div className="font-bold">{les.title}</div>
                    <p className="text-2xs text-slate-500 max-h-12 overflow-hidden line-clamp-2">{les.details}</p>
                    {les.quiz?.length > 0 && (
                      <span className="inline-block text-3xs font-semibold text-amber-500 bg-amber-505 bg-amber-500/10 rounded px-1.5 py-0.5">
                        📝 Includes {les.quiz.length} MCQ Questions
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handlePublishAiCourse}
              className="w-full py-2 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors shadow shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" /> Publish Outline Directly to Course Feed
            </button>
          </div>
        )}

      </section>

      {/* Grid: Course management & Direct transaction ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Core items Catalog management (Column span 2) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-lg tracking-tight">Active E-Learning Courses Catalog</h3>
            <button
              onClick={() => setShowCourseForm(!showCourseForm)}
              className="p-1 px-3 text-xs font-bold ring-1 ring-slate-300 dark:ring-slate-700 rounded-lg hover:bg-slate-500/5 cursor-pointer flex items-center gap-0.5"
            >
              <Plus className="w-4 h-4" /> {lang === "en" ? "Add Manual" : "បន្ថែមវគ្គសិក្សា"}
            </button>
          </div>

          {showCourseForm && (
            <form onSubmit={handleCreateCourse} className={`p-4 rounded-xl space-y-4 animate-fade-in text-xs sm:text-sm border transition-all ${
              theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light bg-slate-50/70'
            }`}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-2xs font-bold text-slate-400">COURSE TITLE</label>
                  <input type="text" placeholder="E.g. Front-end React CSS" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} className={`w-full px-3 py-2 rounded-xl text-xs transition-all ${theme === 'dark' ? 'glass-input' : 'glass-input-light'}`} />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-400">PRICE ($)</label>
                  <input type="text" placeholder="29" value={coursePrice} onChange={e => setCoursePrice(e.target.value)} className={`w-full px-3 py-2 rounded-xl text-xs transition-all ${theme === 'dark' ? 'glass-input' : 'glass-input-light'}`} />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-400">CATEGORY</label>
                  <input type="text" placeholder="Software" value={courseCategory} onChange={e => setCourseCategory(e.target.value)} className={`w-full px-3 py-2 rounded-xl text-xs transition-all ${theme === 'dark' ? 'glass-input' : 'glass-input-light'}`} />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-2xs font-bold text-slate-400">DESCRIPTION OVERVIEW</label>
                  <textarea rows={3} placeholder="Syllabus descriptions..." value={courseDesc} onChange={e => setCourseDesc(e.target.value)} className={`w-full px-3 py-2 rounded-xl text-xs transition-all ${theme === 'dark' ? 'glass-input' : 'glass-input-light'}`} />
                </div>
              </div>
              <button type="submit" className="px-4 py-2 font-bold text-white bg-indigo-500 rounded text-xs cursor-pointer">
                Submit and Publish
              </button>
            </form>
          )}

          <div className="space-y-2">
            {courses.map(c => (
              <div
                key={c.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                  theme === 'dark' ? 'glass-card border-white/10' : 'glass-card-light bg-slate-50/60'
                } text-xs`}
              >
                <div className="truncate space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5 truncate text-slate-800 dark:text-slate-100">
                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase text-white bg-indigo-500 rounded">{c.category}</span>
                    <span className="truncate">{c.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Instructor: {c.instructor} | Base cost: ${c.price}</div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleDeleteCourse(c.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                    title="Purge"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Offline local bank transactions approvals ledgers */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-sm tracking-widest uppercase text-slate-400">Pending Receipt Approvals Ledger</h3>
          
          {transactions.filter(t => t.status === "pending").length > 0 ? (
            <div className="space-y-3">
              {transactions.filter(t => t.status === "pending").map(trx => (
                <div
                  key={trx.id}
                  className={`p-4 rounded-xl border shadow-sm transition-all space-y-3 text-xs ${
                    theme === 'dark' ? 'glass-card border-white/10' : 'glass-card-light'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold">{trx.user_name}</div>
                    <p className="text-slate-400 text-3xs truncate">{trx.user_email}</p>
                    <p className="font-semibold text-2xs truncate text-indigo-400">Book: {trx.course_title}</p>
                  </div>

                  <div className="p-2 border rounded bg-indigo-500/5 text-indigo-400 text-2xs font-mono flex items-center justify-between">
                    <span>TRX ID: {trx.transaction_id}</span>
                    <span className="font-bold">${trx.amount}</span>
                  </div>

                  {/* Attachment receipt review */}
                  {trx.screenshot_url && (
                    <div className="space-y-1">
                      <span className="text-3xs font-medium text-slate-400 uppercase tracking-widest">Graduation Payment Screenshot</span>
                      <a href={trx.screenshot_url} target="_blank" rel="noreferrer" className="block relative aspect-video border rounded overflow-hidden hover:opacity-80 transition-opacity">
                        <img referrerPolicy="no-referrer" src={trx.screenshot_url} alt="Bank transfer screenshot attachment" className="w-full h-full object-cover" />
                      </a>
                    </div>
                  )}

                  {/* Verifications approvals triggers */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleApprovePayment(trx.transaction_id, "approve")}
                      className="py-1.5 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors cursor-pointer flex items-center justify-center gap-0.5 text-2xs"
                    >
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => handleApprovePayment(trx.transaction_id, "decline")}
                      className="py-1.5 rounded-lg border border-slate-700 hover:bg-rose-500 hover:text-white hover:border-rose-600 transition-colors cursor-pointer flex items-center justify-center gap-0.5 text-2xs"
                    >
                      <X className="w-3 h-3" /> Decline
                    </button>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className={`p-8 text-center rounded-xl text-xs ${
              theme === 'dark' ? 'glass-card border-white/10 text-slate-400' : 'glass-card-light text-slate-500'
            }`}>
              ☕ Excellent. No pending receipt verification requests remaining.
            </div>
          )}

        </div>

      </div>

      {/* System Telemetry Activity logs */}
      <section className="space-y-3 pt-4 border-t border-slate-105 dark:border-white/10">
        <h3 className="font-extrabold text-sm tracking-widest uppercase text-slate-400 flex items-center gap-1.5">
          <Terminal className="w-4 h-4" /> {t("logsTitle")}
        </h3>
        <div className={`rounded-xl overflow-hidden text-xs max-h-[224px] overflow-y-auto ${
          theme === 'dark' ? 'glass-card border border-white/10' : 'glass-card-light border'
        }`}>
          <table className="w-full text-left">
            <thead className={`text-[10px] uppercase font-bold border-b ${
              theme === 'dark' ? 'bg-white/5 text-slate-300 border-white/5' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              <tr>
                <th className="p-2 sm:p-3">Time</th>
                <th className="p-2 sm:p-3">User</th>
                <th className="p-2 sm:p-3">Action</th>
                <th className="p-2 sm:p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[10px] text-slate-400">
              {metrics?.logs?.map((log, idx) => (
                <tr key={idx}>
                  <td className="p-2 sm:p-3 whitespace-nowrap text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="p-2 sm:p-3 font-semibold text-slate-300">{log.user}</td>
                  <td className="p-2 sm:p-3 whitespace-nowrap"><span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{log.action}</span></td>
                  <td className="p-2 sm:p-3 truncate max-w-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
