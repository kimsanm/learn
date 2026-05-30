import React, { useState } from "react";
import { Play, FileText, CheckCircle2, Award, Users, Star, ArrowLeft, Ticket, CreditCard, Building, ShieldCheck, ShoppingCart, UploadCloud } from "lucide-react";
import { Course, Lesson } from "../types";
import { Language, getTranslation } from "../utils/translate";

interface CourseDetailProps {
  courseDetails: {
    course: Course;
    lessons: Lesson[];
  };
  currentUser: any;
  lang: Language;
  onBack: () => void;
  onNavigate: (path: string) => void;
  onPurchaseComplete: () => void;
  theme: "light" | "dark";
}

export default function CourseDetail({ courseDetails, currentUser, lang, onBack, onNavigate, onPurchaseComplete, theme }: CourseDetailProps) {
  const t = (key: any) => getTranslation(lang, key);
  const { course, lessons } = courseDetails;

  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);

  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"ABA" | "ACLEDA" | "Wing" | "Stripe">("ABA");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");

  const originalPrice = course.price * (1 - course.discount / 100);
  const finalPrice = couponApplied ? originalPrice * (1 - discountPercent / 100) : originalPrice;

  // Handles Coupon application
  const handleApplyCoupon = () => {
    if (coupon.toUpperCase() === "PRO20" || coupon.toUpperCase() === "PRO" || coupon.toUpperCase() === "SABAI20" || coupon.toUpperCase() === "SABAI") {
      setCouponApplied(true);
      setDiscountPercent(20);
      setOrderMessage(t("couponApplied"));
    } else if (coupon.toUpperCase() === "KHMERFREE") {
      setCouponApplied(true);
      setDiscountPercent(100);
      setOrderMessage("100% off coupon applied for developers!");
    } else {
      alert(lang === "en" ? "Invalid coupon code!" : "លេខកូដមិនត្រឹមត្រូវឡើយ!");
    }
  };

  // Handles Receipt drag and drop loading as Base64 string
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Dispatch payment requests to backend APIs
  const handleCheckoutSubmit = async () => {
    if (!currentUser) {
      alert(lang === "en" ? "Please login to enroll in this course!" : "សូមចូលទៅគណនីមុនពេលចុះឈ្មោះសិក្សា!");
      return;
    }

    setCheckoutPending(true);
    try {
      // 1. Initial Order Creation
      const reqHeaders: any = { "Content-Type": "application/json" };
      const token = localStorage.getItem("token");
      if (token) {
        reqHeaders["Authorization"] = `Bearer ${token}`;
      }

      const orderRes = await fetch("/api/payments/create", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({
          course_id: course.id,
          payment_method: paymentMethod,
          coupon_code: couponApplied ? coupon : null
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Order creation failed.");
      }

      const { order, isFree } = orderData;

      if (isFree) {
        setOrderMessage(t("freeUnlockSuccess"));
        setTimeout(() => {
          setCheckoutPending(false);
          setShowCheckout(false);
          onPurchaseComplete();
        }, 1500);
        return;
      }

      // 2. Upload verification screenshot is bank selected
      if (screenshot) {
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: reqHeaders,
          body: JSON.stringify({
            transaction_id: order.transaction_id,
            screenshot_url: screenshot
          })
        });
        
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData.error || "Verification upload failed.");
        }
      }

      setOrderMessage(t("uploadSuccess"));
      setTimeout(() => {
        setCheckoutPending(false);
        setShowCheckout(false);
        onPurchaseComplete();
      }, 2500);

    } catch (err: any) {
      alert(`Checkout error: ${err.message}`);
      setCheckoutPending(false);
    }
  };

  // Generate simulated ABA payload QR
  const abaQRGenerator = () => {
    // Return standard dummy QR image representing clean invoice link
    return "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?q=80&w=200";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-500 hover:underline cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        {lang === "en" ? "Back to course list" : "ត្រឡប់ទៅវគ្គសិក្សាទាំងអស់"}
      </button>

      {/* Main Course Details Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns - Info & Curriculum */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="space-y-4">
            <span className="inline-block rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-500/10">
              {course.category}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {course.title}
            </h1>
            <p className="text-slate-500 font-light leading-relaxed">
              {course.description}
            </p>

            {/* Micro details pill row */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 pt-2">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4 text-slate-400" />
                {lang === "en" ? "Taught by " : "សាស្រ្តាចារ្យ៖ "} <b>{course.instructor}</b>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4 text-slate-400" />
                {lessons.length} {t("lessons")}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                {course.rating.toFixed(1)} {lang === "en" ? "(Rating)" : "(ការវាយតម្លៃ)"}
              </span>
            </div>
          </div>

          {/* Teacher Info Card */}
          <div className={`p-6 rounded-2xl flex items-start gap-4 transition-all ${
            theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light bg-slate-50'
          }`}>
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-lg shrink-0 border border-indigo-500/20">
              {course.instructor.charAt(0)}
            </div>
            <div className="space-y-1">
              <h4 className="font-bold">{course.instructor}</h4>
              <p className="text-xs text-slate-500">{lang === "en" ? "Course Lead Specialist" : "ប្រធានជំនាញវគ្គសិក្សាលីមីត"}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-light pt-1">
                {lang === "en" ? "Dedicated tech lecturer and system architect specializing in digital solutions, assisting developers to unlock standard careers." : "សាស្រ្តាចារ្យជំនាញដែលមានបទពិសោធន៍យូរឆ្នាំក្នុងការស្ថាបនានិងរចនាប្លង់ប្រព័ន្ធកុំព្យូទ័រ ដែលនឹងជួយសិស្សទទួលបានបទពិសោធន៍ជាក់ស្តែង។"}
              </p>
            </div>
          </div>

          {/* Curriculum Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold tracking-tight">
              {lang === "en" ? "Course Syllabus Curriculum" : "មាតិកាវគ្គសិក្សាលម្អិត"}
            </h2>
            <div className={`rounded-2xl overflow-hidden transition-all divide-y ${
              theme === 'dark' 
                ? 'divide-white/5 border border-white/10 glass-card' 
                : 'divide-slate-200 border border-slate-200 glass-card-light bg-white/60'
            }`}>
              {lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-500/5 transition-colors gap-4"
                >
                  <div className="flex items-start gap-3">
                    <Play className="w-4 h-4 mt-1 text-indigo-500 shrink-0 fill-indigo-500/30" />
                    <div>
                      <h4 className="text-sm font-semibold leading-snug">{lesson.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 font-light">{lesson.details}</p>
                    </div>
                  </div>
                  <span className="text-2xs font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                    {lang === "en" ? `Lesson ${index + 1}` : `មេរៀនទី ${index + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column - Sticky checkout anchor */}
        <div className="space-y-6">
          <div className={`sticky top-6 p-6 rounded-2xl shadow-lg space-y-6 transition-all ${
            theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light text-slate-800'
          }`}>
            
            <div className="relative aspect-video rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shadow-inner">
              <img
                referrerPolicy="no-referrer"
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-950/45 flex items-center justify-center">
                <span className="p-3.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white hover:scale-105 transition-transform">
                  <Play className="w-6 h-6 fill-current pr-0.5 translate-x-0.5" />
                </span>
              </div>
            </div>

            {/* Price Segment */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-400">{t("originalPrice")}</div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-indigo-500">${finalPrice.toFixed(2)}</span>
                {course.discount > 0 && (
                  <span className="text-sm text-slate-400 line-through">${course.price.toFixed(2)}</span>
                )}
              </div>
              {course.discount > 0 && (
                <div className="text-xs font-semibold text-rose-500">
                  {t("discount")}: -{course.discount}% {lang === "en" ? "off original costs" : "ដកពីតម្លៃដើម"}
                </div>
              )}
            </div>

            {/* Coupon Code section */}
            <div className="pt-2 border-t border-slate-105 dark:border-white/10 space-y-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5" /> {t("inclusiveCoupon")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="PRO20"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  disabled={couponApplied}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition-all disabled:opacity-65 ${
                    theme === 'dark' ? 'glass-input' : 'glass-input-light'
                  }`}
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponApplied || !coupon}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-505 bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-50 cursor-pointer"
                >
                  {t("apply")}
                </button>
              </div>
              {couponApplied && (
                <div className="text-2xs font-semibold text-emerald-500 bg-emerald-500/10 p-2 rounded-lg flex items-center gap-1 animate-pulse">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {orderMessage}
                </div>
              )}
            </div>

            {/* Guarantee statements */}
            <div className="space-y-2 pt-4 border-t border-slate-105 dark:border-white/10 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{lang === "en" ? "Internship-approved cert code included" : "វិញ្ញាបនបត្រផ្លូវការបញ្ជាក់ការសិក្សា"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>{lang === "en" ? "Lifetime access to video materials" : "សិទ្ធិមើលវីដេអូរៀន និងទិន្នន័យមួយជីវិត"}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-500 shrink-0" />
                <span>{lang === "en" ? "Cambodian payment escrow protection" : "ការការពារទូទាត់ប្រាក់ពីធនាគារក្នុងស្រុក"}</span>
              </div>
            </div>

            {/* Order Call Button */}
            <button
              onClick={() => {
                if (!currentUser) {
                  alert(lang === "en" ? "Login to purchase course!" : "សូមចូលគណនីមុនទិញវគ្គសិក្សា!");
                } else {
                  setShowCheckout(true);
                }
              }}
              className="w-full py-3.5 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
            >
              <ShoppingCart className="w-5 h-5" />
              {t("enrollNow")}
            </button>

          </div>
        </div>

      </div>

      {/* Checkout overlay slider */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className={`relative max-w-lg w-full rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto transition-all ${
            theme === 'dark' ? 'glass-card border-white/15 text-white' : 'glass-card-light text-slate-800'
          }`}>
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-155 dark:border-white/10">
              <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-500" /> {t("checkoutTitle")}
              </h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-1 px-2.5 rounded-lg text-sm bg-slate-100 dark:bg-slate-800 hover:opacity-80 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 pt-4">

              {/* Order amount overview */}
              <div className="rounded-xl p-3 bg-indigo-500/10 text-indigo-400 flex items-center justify-between text-xs sm:text-sm font-semibold">
                <span>{lang === "en" ? "Order Subtotal:" : "ចំនួនទឹកប្រាក់សរុប៖"}</span>
                <span className="text-lg font-black">${finalPrice.toFixed(2)} USD</span>
              </div>

              {/* Method choice tab buttons */}
              <div className="grid grid-cols-4 gap-2">
                {(["ABA", "ACLEDA", "Wing", "Stripe"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`p-2.5 rounded-xl border text-2xs md:text-xs font-bold transition-all focus:outline-none cursor-pointer ${
                      paymentMethod === method
                        ? "bg-indigo-500 text-white border-indigo-600 shadow"
                        : "bg-slate-500/5 hover:bg-slate-500/10 border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {paymentMethod !== "Stripe" ? (
                // Local Cambodian Banks scanned receipts template
                <div className="space-y-4 text-center">
                  <p className="text-2xs text-slate-500 text-left leading-relaxed">
                    {t("payDescription")}
                  </p>

                  <div className="inline-block p-4 rounded-3xl bg-white border border-slate-200 shadow-md">
                    {/* KHQR simulator box */}
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="rounded-lg bg-red-600 text-white px-3 py-1 font-black text-2xs uppercase tracking-widest">
                        KHQR Bank QR
                      </div>
                      <img
                        referrerPolicy="no-referrer"
                        src={abaQRGenerator()}
                        alt="Bank QR prefilled scanned"
                        className="w-40 h-40 object-cover border rounded-xl"
                      />
                      <div className="text-2xs font-bold text-slate-500 font-mono">
                        SABAI ACADEMY / $ {finalPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Screenshot Receipt load controller */}
                  <div className="space-y-2 text-left">
                    <label className="text-xs font-bold text-slate-400 block">{t("uploadReceipt")}</label>
                    
                    <div className={`relative border-2 border-dashed rounded-xl p-4 transition-all text-center cursor-pointer ${
                      theme === 'dark' ? 'border-white/20 hover:bg-white/5' : 'border-slate-300 hover:bg-slate-50/50'
                    }`}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                      <span className="text-2xs font-semibold block text-slate-500">
                        {screenshot ? "✓ Screenshot loaded successfully" : "Drag receipt filename here or click select"}
                      </span>
                    </div>
 
                    {screenshot && (
                      <div className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                        theme === 'dark' ? 'glass-card border-white/10' : 'bg-slate-100 border'
                      }`}>
                        <img src={screenshot} alt="Screenshot receipt loaded preview" className="w-12 h-12 rounded object-cover" />
                        <span className="text-3xs font-mono text-slate-500 truncate flex-1">Loaded Base64 transaction payload string</span>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                // International Stripe simulated flows
                <div className="space-y-4 pt-2">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Pay securely using direct International credit card processing. We process safe card verification steps dynamically.
                  </p>
                  <div className={`space-y-3 p-4 rounded-xl transition-all ${
                    theme === 'dark' ? 'glass-card border-white/10' : 'bg-slate-50 border'
                  }`}>
                    <div className="space-y-1">
                      <label className="text-2xs font-bold text-slate-400 block uppercase">Card Coordinates</label>
                      <input
                        type="text"
                        placeholder="4242 4242 4242 4242"
                        className={`w-full px-3 py-2 rounded-lg text-xs transition-all ${
                          theme === 'dark' ? 'glass-input' : 'glass-input-light'
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="12 / 29"
                        className={`px-3 py-2 rounded-lg text-xs transition-all ${
                          theme === 'dark' ? 'glass-input' : 'glass-input-light'
                        }`}
                      />
                      <input
                        type="text"
                        placeholder="CVC"
                        className={`px-3 py-2 rounded-lg text-xs transition-all ${
                          theme === 'dark' ? 'glass-input' : 'glass-input-light'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Server-Sent Alerts for verifications */}
              {orderMessage && (
                <div className="p-3 text-xs font-semibold rounded-lg text-emerald-500 bg-emerald-500/10 text-center animate-pulse">
                  {orderMessage}
                </div>
              )}

              {/* Submit triggers */}
              <button
                type="button"
                onClick={handleCheckoutSubmit}
                disabled={checkoutPending || (paymentMethod !== "Stripe" && !screenshot && finalPrice > 0)}
                className="w-full py-3 rounded-xl font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 shadow-lg shadow-indigo-500/10 cursor-pointer text-xs sm:text-sm"
              >
                {checkoutPending ? "Processing checkout..." : t("submitConfirmation")}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
