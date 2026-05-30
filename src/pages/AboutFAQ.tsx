import React, { useState } from "react";
import { HelpCircle, Mail, MapPin, Phone, MessageSquare, ArrowUpRight, ShieldAlert, Sparkles } from "lucide-react";
import { Language, getTranslation } from "../utils/translate";

interface AboutFAQProps {
  lang: Language;
  theme: "light" | "dark";
}

export default function AboutFAQ({ lang, theme }: AboutFAQProps) {
  const t = (key: any) => getTranslation(lang, key);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userMsg, setUserMsg] = useState("");
  const [msgSent, setMsgSent] = useState(false);

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !userMsg) return;
    setMsgSent(true);
    setTimeout(() => {
      setUserName("");
      setCardEmail("");
      setUserMsg("");
    }, 2000);
  };

  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: lang === "en" ? "How do I gain access to video materials after transaction payouts?" : "តើខ្ញុំអាចទទួលបានវីដេអូរៀនលម្អិតដោយរបៀបណា បន្ទាប់ពីទូទាត់ប្រាក់?",
      a: lang === "en"
        ? "Access is instantaneous. Simply upload your KHQR bank receipt screenshot during checkout, and our administrative officers will verify and validate your orders inside the ledger within minutes."
        : "ការទទួលបានមេរៀនគឺសាមញ្ញបំផុត។ គ្រាន់តែថតរូបវិក្កយបត្រស្កែន (Screenshot) រួចបញ្ចូលវាក្នុងប្រព័ន្ធពេលចំណាយ។ ប្រព័ន្ធនឹងស្វ័យប្រវត្តផ្ញើដំណឹងទៅកាន់ភ្នាក់ងារ រួចបើកវគ្គសិក្សាជូនក្នុងរយៈពេល ២-៥ នាទី។"
    },
    {
      q: lang === "en" ? "Can I download lesson videos for offline studying?" : "តើខ្ញុំអាចទាញយកវីដេអូមេរៀនដើម្បីរៀនពេលគ្មានអ៊ីនធឺណិត (Offline) បានទេ?",
      a: lang === "en"
        ? "To protect intellectual property and creator contents, direct video downloads are disabled. However, our secure LMS player caches playback segments beautifully, enabling reliable viewing even on low bandwidth connections."
        : "ដើម្បីការពារសិទ្ធិមាតិកាអ្នកបង្កើត វីដេអូមិនអាចទាញយកដោយផ្ទាល់បានទេ។ ប៉ុន្តែប្រព័ន្ធ LMS ឆ្លាតវៃអាចផ្ទុកទិន្នន័យ (Buffer Caching) យ៉ាងល្អប្រសើរ ជួយឱ្យអ្នកអាចសិក្សាបានយ៉ាងរលូនទោះស្ថានភាពអ៊ីនធឺណិតខ្សោយ។"
    },
    {
      q: lang === "en" ? "Are coupon codes reusable across courses?" : "តើលេខកូដបញ្ចុះតម្លៃ (Coupon Code) អាចប្រើឡើងវិញបានទេ?",
      a: lang === "en"
        ? "Yes! You can use promotional campaign codes (such as 'PRO20' for 20% savings) to buy any creative courses listed inside PRO DIGITAL."
        : "បាទ/ចាស! លោកអ្នកអាចប្រើប្រាស់លេខកូដប្រូម៉ូសិន (ដូចជា 'PRO20' បញ្ចុះតម្លៃ ២០%) សម្រាប់ទិញរាល់វគ្គសិក្សាទាំងអស់ដែលមាននៅក្នុងប្រព័ន្ធដោយគ្មានកំណត់។"
    }
  ];

  const blogs = [
    {
      title: lang === "en" ? "Why Next.js 15 Server Components represent the future of web" : "មូលហេតុ Next.js 15 Server Components គឺជាអនាគតនៃការសរសេរកូដវិប",
      date: "May 25, 2026",
      desc: lang === "en"
        ? "Exploring server interactions, optimized load speeds, and database querying securely safe from browser leaks."
        : "សិក្សាស្វែងយល់ការដំណើរការ Interface, បង្កើនល្បឿន Render និងការ Query ទិន្នន័យកម្រិតខ្ពស់ដោយសុវត្ថិភាពបំផុត។"
    },
    {
      title: lang === "en" ? "How local businesses in Cambodia streamline orders via QR codes" : "របៀបអាជីវកម្មក្នុងស្រុកបង្កើនចំណូលតាមស្កែន QR កូដ",
      date: "May 18, 2026",
      desc: lang === "en"
        ? "Leveraging Telegram notifying alerts, local KHQR bank templates, and lightweight CRM to automate transactions."
        : "របៀបរួមបញ្ចូល Telegram API និងប្រព័ន្ធស្កែនទូទាត់ QR ស្វ័យប្រវត្ត ដើម្បីសម្រាលការងារលក់ដូរប្រចាំថ្ងៃ។"
    }
  ];

  // Helper setCardEmail
  const setCardEmail = (v: string) => setUserEmail(v);

  return (
    <div className="space-y-16 animate-fade-in text-slate-800 dark:text-white">
      
      {/* About Section */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-12 text-center bg-radial from-slate-900 to-indigo-950 text-white border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-505 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-2xl mx-auto space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {lang === "en" ? "Empowering Cambodian Tech Talents" : "កសាងធនធានបច្ចេកវិទ្យាកម្រិតខ្ពស់សម្រាប់កម្ពុជា"}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed">
            {lang === "en"
              ? "At PRO DIGITAL, we believe digital literacy unlocks high-paying regional careers. We produce premium computer science instruction, complete lesson structures, and validation certificates carefully localized in Khmer."
              : "នៅ PRO DIGITAL យើងជឿជាក់ថាជំនាញបច្ចេកវិទ្យាល្អគឺជាសោរចាក់សោរអនាគត។ យើងផលិតវគ្គសិក្សាដែលមានគុណភាពខ្ពស់ ដំណោះស្រាយកូដជាក់ស្តែង និងវិញ្ញាបនបត្របញ្ជាក់ការសិក្សាបច្ចេកទេសផ្លូវការ។"}
          </p>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* FAQs info heading */}
        <div className="space-y-3">
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-indigo-500" /> {t("faqTitle")}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed font-light">
            {lang === "en" ? "Review quick details regarding course payments, watermarks, certificates, and learning tracks." : "សំណួរចម្លើយដែលសិស្សានុសិស្សតែងតែងឿងឆ្ងល់ និងសាកសួរមកកាន់ក្រុមការងារញឹកញាប់បំផុត៖"}
          </p>
        </div>

        {/* Accordions */}
        <div className="md:col-span-2 divide-y divide-slate-100 dark:divide-slate-800 space-y-2">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl transition-all cursor-pointer border ${
                  isOpen
                    ? theme === 'dark' ? "glass-card border-indigo-500/35 text-white shadow" : "glass-card-light bg-indigo-50/40 border-indigo-500/20 shadow"
                    : theme === 'dark' ? "glass-card border-white/5 text-white/90" : "glass-card-light"
                }`}
                onClick={() => setActiveFaq(isOpen ? null : idx)}
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-xs sm:text-sm font-bold pr-4">{faq.q}</h4>
                  <span className="text-indigo-500 font-bold">{isOpen ? "−" : "+"}</span>
                </div>
                {isOpen && (
                  <p className="text-2xs sm:text-xs text-slate-500 mt-2 leading-relaxed font-light animate-fade-in">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>

      </section>

      {/* Blogs & Insights Section */}
      <section className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h2 className="text-2xl font-extrabold tracking-tight">{t("blogTitle")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {blogs.map((blog, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-2xl transition-all space-y-3 ${
                theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light hover:scale-[1.01]'
              }`}
            >
              <div className="text-2xs font-mono text-slate-400">{blog.date}</div>
              <h4 className="font-bold text-sm sm:text-base hover:text-indigo-500 transition-colors cursor-pointer flex items-center justify-between">
                {blog.title} <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </h4>
              <p className="text-xs text-slate-500 font-light leading-relaxed">{blog.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Support Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100 dark:border-slate-800">
        
        {/* Support coordinates */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight">{t("contactUs")}</h2>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed font-light">
              We respond to developer questions and general assistance requests 24 hours a day. Direct messenger alerts will be forwarded to officers on Telegram.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl"><Phone className="w-5 h-5" /></div>
              <div>
                <div className="font-bold">Khmer Hotline</div>
                <div className="text-slate-400">+855 (0) 96 555 1234</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><Mail className="w-5 h-5" /></div>
              <div>
                <div className="font-bold">Official Email Support</div>
                <div className="text-slate-400">developers@sabaiacademy.com</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><MapPin className="w-5 h-5" /></div>
              <div>
                <div className="font-bold">Phnom Penh Workspace Base</div>
                <div className="text-slate-400">Street 2004, Sen Sok, Phnom Penh, Cambodia</div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact direct Form */}
        <div className={`p-6 rounded-2xl transition-all ${
          theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light'
        }`}>
          <form onSubmit={handleSubmitContact} className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-2xs font-extrabold text-slate-400 block uppercase">Student Name</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Chan Dara"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    theme === 'dark' ? 'glass-input' : 'glass-input-light'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-2xs font-extrabold text-slate-400 block uppercase">Email Coordinates</label>
                <input
                  type="email"
                  required
                  placeholder="dara@gmail.com"
                  value={userEmail}
                  onChange={(e) => setCardEmail(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    theme === 'dark' ? 'glass-input' : 'glass-input-light'
                  }`}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-2xs font-extrabold text-slate-400 block uppercase">Query Description</label>
              <textarea
                required
                rows={4}
                value={userMsg}
                onChange={(e) => setUserMsg(e.target.value)}
                placeholder="Explain what study topics or issues you'd like to ask..."
                className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  theme === 'dark' ? 'glass-input' : 'glass-input-light'
                }`}
              />
            </div>

            {msgSent && (
              <div className="p-3 text-xs font-semibold rounded-lg text-emerald-500 bg-emerald-500/10 text-center animate-pulse">
                🎉 Message dispatched successfully on Telegram backend!
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow shadow-indigo-500/10 text-xs sm:text-sm cursor-pointer"
            >
              Dispatch Message
            </button>
          </form>
        </div>

      </section>

    </div>
  );
}
