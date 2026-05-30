import React, { useState, useEffect } from "react";
import { Users, BookOpen, DollarSign, Clock, ShieldCheck, Eye, Terminal, Sparkles, Plus, Trash2, Edit2, BadgeAlert, Check, X, RefreshCw, ChevronDown, ChevronUp, Search, Filter, Copy } from "lucide-react";
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
  const [selectedTrxs, setSelectedTrxs] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [expandedTrxs, setExpandedTrxs] = useState<string[]>([]);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [trxSearchQuery, setTrxSearchQuery] = useState("");
  const [trxCourseFilter, setTrxCourseFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Master Checkbox synchronization metrics
  const masterCheckboxRef = React.useRef<HTMLInputElement>(null);
  const pendingTrxs = [...transactions]
    .filter(t => t.status === "pending")
    .filter(t => {
      if (trxCourseFilter !== "all" && t.course_id !== trxCourseFilter) {
        return false;
      }
      if (!trxSearchQuery) return true;
      const query = trxSearchQuery.toLowerCase();
      return (
        (t.user_name || "").toLowerCase().includes(query) ||
        (t.user_email || "").toLowerCase().includes(query) ||
        (t.course_title || "").toLowerCase().includes(query) ||
        (t.transaction_id || "").toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
    });
  const pendingIds = pendingTrxs.map(t => t.transaction_id);
  const selectedCountOfPending = pendingIds.filter(id => selectedTrxs.includes(id)).length;
  const isAllSelected = pendingIds.length > 0 && selectedCountOfPending === pendingIds.length;
  const isPartiallySelected = selectedCountOfPending > 0 && selectedCountOfPending < pendingIds.length;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);
  
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

  // Bulk approve or decline payment transactions
  const handleBulkPaymentAction = async (action: "approve" | "decline") => {
    if (selectedTrxs.length === 0) return;
    const confirmMsg = lang === "en" 
      ? `Are you sure you want to bulk ${action} ${selectedTrxs.length} selected transaction(s)?`
      : `តើអ្នកប្រាកដជាចង់បញ្ជាក់ ${action} ចំនួន ${selectedTrxs.length} គណនីមែនទេ?`;
    
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setBulkLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/payments/bulk-approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ transaction_ids: selectedTrxs, action })
      });
      if (res.ok) {
        const data = await res.json();
        alert(lang === "en" ? `Bulk operation completed: ${data.message}` : `ប្រតិបត្តិការជោគជ័យ៖ ${data.message}`);
        setSelectedTrxs([]);
        loadAdminData();
        onRefreshData();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed layout action.");
      }
    } catch (error) {
      console.error(error);
      alert("Error.");
    } finally {
      setBulkLoading(false);
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
      <div className="space-y-10">
        
        {/* Core items Catalog management */}
        <div className="space-y-6">
          
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
            <h3 className="font-extrabold text-sm tracking-widest uppercase text-slate-400">
              Pending Receipt Approvals Ledger
            </h3>
            {transactions.filter(t => t.status === "pending").length > 0 && (
              <span className="text-[10px] font-bold uppercase rounded-md bg-indigo-500/10 text-indigo-400 px-2.5 py-1">
                {selectedTrxs.length} / {transactions.filter(t => t.status === "pending").length} Selected
              </span>
            )}
          </div>

          {transactions.filter(t => t.status === "pending").length > 0 ? (
            <div className="space-y-4">
              {/* Search & filter controls panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Search query input */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by student, email, course, or TRX ID..."
                    value={trxSearchQuery}
                    onChange={(e) => setTrxSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-12 py-2 border rounded-xl text-xs transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      theme === 'dark' 
                        ? 'glass-input border-white/10 text-white placeholder-slate-500 focus:border-indigo-500 bg-[#121520]' 
                        : 'glass-input-light border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 bg-white'
                    }`}
                  />
                  {trxSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTrxSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-500 text-[10px] font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Course select filter */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Filter className="w-4 h-4" />
                  </span>
                  <select
                    value={trxCourseFilter}
                    onChange={(e) => setTrxCourseFilter(e.target.value)}
                    className={`w-full pl-9 pr-8 py-2 border rounded-xl text-xs transition-all outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-505 ${
                      theme === 'dark' 
                        ? 'glass-input border-white/10 text-white focus:border-indigo-500 bg-[#121520]' 
                        : 'glass-input-light border-slate-200 text-slate-800 focus:border-indigo-500 bg-white'
                    }`}
                  >
                    <option value="all">All Courses</option>
                    {Array.from(new Set(transactions.filter(t => t.status === "pending").map(t => t.course_id))).map(cid => {
                      const trx = transactions.find(t => t.course_id === cid && t.status === "pending");
                      return (
                        <option key={cid || "na"} value={cid || ""}>
                          {trx?.course_title || cid}
                        </option>
                      );
                    })}
                  </select>
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {/* Bulk operations toolbar */}
              <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs transition-all ${
                theme === 'dark' ? 'glass-card border-white/10' : 'bg-slate-50/80 border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">Bulk Actions ({selectedTrxs.length} Selected):</span>
                </div>

                {selectedTrxs.length > 0 ? (
                  <div className="flex items-center gap-2 animate-fade-in shrink-0">
                    <button
                      onClick={() => handleBulkPaymentAction("approve")}
                      disabled={bulkLoading}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold disabled:opacity-50 transition-all flex items-center gap-1 text-[11px] cursor-pointer shadow-md shadow-emerald-500/10"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve Selected
                    </button>
                    <button
                      onClick={() => handleBulkPaymentAction("decline")}
                      disabled={bulkLoading}
                      className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white disabled:opacity-50 transition-all flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Decline Selected
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic font-medium">Toggle checkbox next to TRX ID on row level or use column bulk check selector.</span>
                )}
              </div>

              {/* Responsive table for pending transactions list */}
              <div className={`rounded-xl border overflow-hidden ${
                theme === 'dark' ? 'glass-card border-white/10' : 'bg-white border-slate-200'
              }`}>
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left font-sans align-middle border-collapse" id="admin-transactions-table">
                    <thead className={`text-[10px] sm:text-xs uppercase font-extrabold border-b ${
                      theme === 'dark' ? 'bg-white/5 text-slate-300 border-white/5' : 'bg-slate-50 text-slate-500 border-slate-250'
                    }`}>
                      <tr>
                        <th className="p-3 w-12 text-center select-none">
                          <input
                            ref={masterCheckboxRef}
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={() => {
                              if (isAllSelected) {
                                setSelectedTrxs(selectedTrxs.filter(id => !pendingIds.includes(id)));
                              } else {
                                setSelectedTrxs(Array.from(new Set([...selectedTrxs, ...pendingIds])));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-transparent cursor-pointer"
                            title="Select All"
                          />
                        </th>
                        <th className="p-3 sm:p-4 text-slate-400">Student Detail</th>
                        <th className="p-3 sm:p-4 text-slate-400">Course Course</th>
                        <th className="p-3 sm:p-4 text-slate-400">Cost</th>
                        <th 
                          onClick={() => setSortDirection(prev => prev === "desc" ? "asc" : "desc")}
                          className="p-3 sm:p-4 text-slate-400 select-none cursor-pointer hover:bg-slate-500/10 transition-colors group"
                          title="Click to sort by date (newest/oldest)"
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            <span>Transaction Date</span>
                            {sortDirection === "desc" ? (
                              <ChevronDown className="w-3.5 h-3.5 text-indigo-500 animate-pulse shrink-0" />
                            ) : (
                              <ChevronUp className="w-3.5 h-3.5 text-indigo-500 animate-pulse shrink-0" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 sm:p-4 text-slate-400">TRX ID / Reference</th>
                        <th className="p-3 sm:p-4 text-slate-400 text-center w-28">Attachment proof</th>
                        <th className="p-3 sm:p-4 text-slate-400 text-right">Instant actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-600 dark:text-slate-300">
                      {pendingTrxs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center">
                            <div className="flex flex-col items-center justify-center space-y-3 py-8 text-slate-500 max-w-sm mx-auto animate-fade-in">
                              <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400 border border-indigo-500/20 shadow-inner">
                                <BadgeAlert className="w-10 h-10 text-indigo-555" />
                              </div>
                              <div className="space-y-1">
                                <p className="font-extrabold text-xs text-slate-850 dark:text-slate-100 uppercase tracking-wider">No matching transactions</p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium leading-relaxed">
                                  There are no ledger entries matching your search query or selected course filter. Double check the spelling or select another option.
                                </p>
                              </div>
                              {(trxSearchQuery || trxCourseFilter !== "all") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTrxSearchQuery("");
                                    setTrxCourseFilter("all");
                                  }}
                                  className="px-3.5 py-1.5 text-2xs font-extrabold uppercase tracking-wide text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg cursor-pointer transition-all active:scale-95 shadow-md shadow-indigo-550/10"
                                >
                                  Reset Filters
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        pendingTrxs.map(trx => {
                        const isSelected = selectedTrxs.includes(trx.transaction_id);
                        const isExpanded = expandedTrxs.includes(trx.transaction_id);
                        return (
                          <React.Fragment key={trx.id}>
                            <tr
                              onClick={() => {
                                if (isExpanded) {
                                  setExpandedTrxs(expandedTrxs.filter(id => id !== trx.transaction_id));
                                } else {
                                  setExpandedTrxs([...expandedTrxs, trx.transaction_id]);
                                }
                              }}
                              className={`cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-indigo-500/10 text-slate-800 dark:text-white"
                                  : isExpanded
                                    ? theme === 'dark' ? 'bg-indigo-950/20 text-white' : 'bg-indigo-50/40 text-slate-900 border-l-2 border-indigo-500'
                                    : theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="p-3 text-center align-middle w-12 select-none" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setSelectedTrxs(selectedTrxs.filter(id => id !== trx.transaction_id));
                                    } else {
                                      setSelectedTrxs([...selectedTrxs, trx.transaction_id]);
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-transparent cursor-pointer"
                                />
                              </td>
                              <td className="p-3 sm:p-4 align-middle">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  )}
                                  <span className="truncate">{trx.user_name}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 leading-tight font-mono truncate max-w-[160px] pl-5" title={trx.user_email}>
                                  {trx.user_email}
                                </div>
                              </td>
                              <td className="p-3 sm:p-4 align-middle">
                                <span className="font-semibold text-slate-700 dark:text-slate-200 block truncate max-w-[180px]" title={trx.course_title}>
                                  {trx.course_title}
                                </span>
                              </td>
                              <td className="p-3 sm:p-4 align-middle font-mono font-bold text-emerald-500">
                                ${trx.amount}
                              </td>
                              <td className="p-3 sm:p-4 align-middle">
                                <div className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                  {trx.created_at ? new Date(trx.created_at).toLocaleDateString() : "N/A"}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium">
                                  {trx.created_at ? new Date(trx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                </div>
                              </td>
                              <td 
                                className="p-3 sm:p-4 align-middle font-mono text-[11px] font-semibold"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="text-indigo-400 select-all" title="Click to select transaction code">
                                    {trx.transaction_id}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await navigator.clipboard.writeText(trx.transaction_id);
                                        setCopiedId(trx.transaction_id);
                                        setTimeout(() => setCopiedId(null), 1500);
                                      } catch (err) {
                                        console.error("Failed to copy text: ", err);
                                      }
                                    }}
                                    className={`p-1 rounded-md transition-all cursor-pointer border ${
                                      copiedId === trx.transaction_id
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                        : theme === 'dark'
                                          ? "hover:bg-white/10 hover:text-white border-transparent text-slate-400"
                                          : "hover:bg-slate-100 hover:text-slate-700 border-transparent text-slate-400"
                                    }`}
                                    title={copiedId === trx.transaction_id ? "Copied!" : "Copy Transaction ID to clipboard"}
                                  >
                                    {copiedId === trx.transaction_id ? (
                                      <Check className="w-3 h-3 animate-bounce" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="p-3 sm:p-4 align-middle text-center w-28" onClick={(e) => e.stopPropagation()}>
                                {trx.screenshot_url ? (
                                  <a
                                    href={trx.screenshot_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block relative w-16 h-10 border border-slate-200 dark:border-white/10 rounded overflow-hidden shadow-sm hover:opacity-85 hover:scale-105 transition-all"
                                    title="View original transfer slip receipt"
                                  >
                                    <img referrerPolicy="no-referrer" src={trx.screenshot_url} alt="Transfer proof attachment slip" className="w-full h-full object-cover" />
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic font-mono">- No Slip -</span>
                                )}
                              </td>
                              <td className="p-3 sm:p-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleApprovePayment(trx.transaction_id, "approve")}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all cursor-pointer flex items-center justify-center gap-0.5 text-[10px] shadow-sm active:scale-95"
                                    title="Instantly Approve"
                                  >
                                    <Check className="w-3 h-3" /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleApprovePayment(trx.transaction_id, "decline")}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-rose-500 hover:text-white hover:border-rose-600 transition-all cursor-pointer flex items-center justify-center gap-0.5 text-[10px] active:scale-95"
                                    title="Instantly Decline"
                                  >
                                    <X className="w-3 h-3" /> Decline
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className={`${theme === 'dark' ? 'bg-indigo-950/10' : 'bg-slate-50/60'}`}>
                                <td colSpan={8} className="p-4 border-t border-b border-dashed border-slate-200 dark:border-white/10">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-sans leading-relaxed">
                                    <div className="space-y-2">
                                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black text-indigo-400">LMS Reference Codes</div>
                                      <div className="space-y-1 font-mono text-[11px]">
                                        <div className="flex items-center gap-2 text-slate-500">
                                          <span>Order unique ID:</span>
                                          <span className="text-slate-800 dark:text-slate-200 font-bold select-all">{trx.order_id}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500">
                                          <span>Course template ID:</span>
                                          <span className="text-slate-800 dark:text-slate-200 font-bold select-all">{trx.course_id || "N/A"}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black text-indigo-400">Marketing Analytics</div>
                                      <div className="space-y-1 text-[11px]">
                                        <div className="flex items-center gap-2 text-slate-500">
                                          <span>Applied Coupon / Code:</span>
                                          <span className={`font-bold font-mono px-1.5 py-0.5 rounded text-[10px] uppercase select-all ${trx.referral_code ? 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400' : 'bg-slate-500/10 text-slate-400'}`}>
                                            {trx.referral_code || "None Applied"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500">
                                          <span>Gateway Channel:</span>
                                          <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{trx.payment_method}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black text-indigo-400 font-bold">Audit Telemetry</div>
                                      <div className="space-y-1 text-slate-500 text-[11px]">
                                        <div>Order Placed At:</div>
                                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 font-mono font-bold">
                                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                                          {trx.created_at ? new Date(trx.created_at).toLocaleString() : "N/A"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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
