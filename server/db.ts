import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

// Define directories for local database fallback
const DATA_DIR = path.join(process.cwd(), "data");
const LOG_FILE = path.join(DATA_DIR, "activity_logs.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// User role enum equivalent
export type UserRole = "student" | "teacher" | "admin";

// Types matching requirements
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: "active" | "banned";
  points: number; // For milestones
  bio?: string;
  avatar_url?: string;
  joined_at: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  discount: number; // Out of 100 or as a promotional price? Let's make it discount percentage (e.g. 20 for 20%)
  category: string;
  tags: string[];
  instructor: string;
  duration: string;
  rating: number;
  thumbnail: string;
  intro_video: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  video_url: string; // supports cloudinary, youtube, vimeo, firebase
  attachments: string[]; // filenames or PDF links
  order: number;
  details: string;
  quiz?: {
    question: string;
    options: string[];
    answerIndex: number;
  }[];
}

export interface Order {
  id: string;
  user_id: string;
  course_id: string;
  amount: number;
  payment_method: string; // ABA, ACLEDA, Wing, Stripe, PayPal, Coupon
  payment_status: "pending" | "completed" | "refunded";
  referral_code?: string;
  transaction_id: string;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  transaction_id: string;
  payment_method: string;
  status: "pending" | "completed" | "failed";
  screenshot_url?: string;
  verified_at?: string;
  verified_by?: string;
}

export interface SystemSettings {
  logo_url: string;
  theme: "light" | "dark";
  seo_keywords: string;
  seo_description: string;
  telegram_notifications_enabled: boolean;
}

// Default Seed Data
const DEFAULT_USERS: User[] = [
  {
    id: "u-admin",
    name: "Sys Admin (សាបាយ)",
    email: "admin@sabaiacademy.com",
    passwordHash: "ab615ef5c2cf52a326c59db625f63d0859ea424a18037a544dfcb29cf6cf8fe7", // SHA256 of "admin123"
    role: "admin",
    status: "active",
    points: 100,
    bio: "Chief Architect at Sabai Academy LMS",
    joined_at: new Date().toISOString()
  },
  {
    id: "u-teacher",
    name: "Chan Sophal (ចាន់ សុផល)",
    email: "sophal@sabaiacademy.com",
    passwordHash: "23c2cca1b48b9415cb53fed3427909b9101ff2a03ee552ff9904d98939c0953a", // SHA256 of "teacher123"
    role: "teacher",
    status: "active",
    points: 50,
    bio: "Senior software engineering lead & researcher specializing in full-stack architecture.",
    joined_at: new Date().toISOString()
  },
  {
    id: "u-student",
    name: "Kagna Meas (មាស កញ្ញា)",
    email: "student@sabaiacademy.com",
    passwordHash: "250f240ed350a80e1ecab0128a1ea2aa173516027a4d55ce715be218c5e9bc1b", // SHA256 of "student123"
    role: "student",
    status: "active",
    points: 15,
    bio: "Enthusiastic tech student learning full-stack web development.",
    joined_at: new Date().toISOString()
  }
];

const DEFAULT_COURSES: Course[] = [
  {
    id: "c-react-fullstack",
    title: "Next.js 15 & React Full-Stack Mastery (React & Next.js ថ្នាក់មេ)",
    slug: "nextjs-react-fullstack-mastery",
    description: "Learn React 19, Next.js 15 App Router, TypeScript, and Tailwind CSS. Built specifically for Cambodian web developers aiming to master server-components, OAuth integrations, database bindings, and deployment pipelines. Course is delivered in dual English and Khmer with interactive quizzes.",
    price: 39,
    discount: 20, // 20% off
    category: "Web Development",
    tags: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
    instructor: "Chan Sophal (ចាន់ សុផល)",
    duration: "18 Hours",
    rating: 4.9,
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600",
    intro_video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  },
  {
    id: "c-ai-marketing",
    title: "AI Tools & Digital Marketing for Businesses (ទីផ្សារឌីជីថល និង ឧបករណ៍ AI)",
    slug: "ai-tools-digital-marketing-businesses",
    description: "Master modern digital advertising, SEO keywords, local Facebook/Telegram community funnel building, and utilizing ChatGPT & Gemini to generate highly engaging visual contents. Fully customized with Cambodian local payment integration setups (ABA PayWay, ACLEDA QR code) for automated retail sales.",
    price: 19,
    discount: 0,
    category: "Business",
    tags: ["AI Tools", "Digital Marketing", "SEO", "ABA PayWay"],
    instructor: "Sophea Kem (កែម សុភា)",
    duration: "8 Hours",
    rating: 4.8,
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600",
    intro_video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }
];

const DEFAULT_LESSONS: Lesson[] = [
  {
    id: "l-react-01",
    course_id: "c-react-fullstack",
    title: "1. Introduction to React 19 Ecosystem (មេរៀនទី ១៖ បទបង្ហាញអំពីប្រព័ន្ធ React 19)",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    attachments: ["react19_syllabus.pdf", "starter_code.zip"],
    order: 1,
    details: "In this session, we investigate the major architectural changes in React 19, including Server Actions, useActionState, dynamic hydration updates, and optimization of assets.",
    quiz: [
      {
        question: "What is the primary benefit of React Server Components (RSC)?",
        options: ["Slower initial load times", "Executing rendering logically on the server to reduce bundle sizes on client side", "Forcing everything to be rendered in the browser", "Replacing CSS frameworks"],
        answerIndex: 1
      },
      {
        question: "Which hook is introduced in React 19 for action state management?",
        options: ["useActionState", "useEffect", "useCallback", "useState"],
        answerIndex: 0
      }
    ]
  },
  {
    id: "l-react-02",
    course_id: "c-react-fullstack",
    title: "2. Exploring Next.js 15 App Router Architecture (មេរៀនទី ២៖ ស្វែងយល់ពី Next.js 15 App Router)",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    attachments: ["nextjs15_routing.pdf"],
    order: 2,
    details: "Master nested route structures, layouts, template configurations, static and dynamic parameter resolutions, and server-side redirects.",
    quiz: [
      {
        question: "Where are dynamic APIs, request credentials, or database keys parsed in Next.js 15 React Server Components?",
        options: ["In client-side console", "On the Server (safe from client leakages)", "Inside Tailwind CSS configuration", "Local sessionStorage"],
        answerIndex: 1
      }
    ]
  },
  {
    id: "l-marketing-01",
    course_id: "c-ai-marketing",
    title: "1. Introduction to Digital Funneling in Cambodia (មេរៀនទី ១៖ បទបង្ហាញអំពីការបង្កើត Channel ទីផ្សារ)",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    attachments: ["marketing_overview.pdf"],
    order: 1,
    details: "Introduction to local digital funnels, understanding social media usage patterns in Cambodia (Telegram channels, FB messenger bots), and leveraging AI tools.",
    quiz: [
      {
        question: "Which communication platform is most widely used by local shops in Cambodia to build transaction alert communities?",
        options: ["WhatsApp", "Telegram Messenger", "Snapchat", "LinkedIn"],
        answerIndex: 1
      }
    ]
  }
];

const DEFAULT_ORDERS: Order[] = [
  {
    id: "o-001",
    user_id: "u-student",
    course_id: "c-react-fullstack",
    amount: 31.2, // 39 - 20%
    payment_method: "ABA",
    payment_status: "completed",
    transaction_id: "TRX-ABA-12495",
    created_at: new Date().toISOString()
  }
];

const DEFAULT_PAYMENTS: Payment[] = [
  {
    id: "p-001",
    order_id: "o-001",
    amount: 31.2,
    transaction_id: "TRX-ABA-12495",
    payment_method: "ABA",
    status: "completed",
    screenshot_url: "/assets/sample_aba_receipt.png",
    verified_at: new Date().toISOString(),
    verified_by: "u-admin"
  }
];

const DEFAULT_SETTINGS: SystemSettings = {
  logo_url: "",
  theme: "dark",
  seo_keywords: "LMS, Cambodia LMS, study, video courses, coders, Khmer e-learning, Sabai Academy",
  seo_description: "Top computer science & e-learning courses localized in Khmer with local Cambodian banking methods.",
  telegram_notifications_enabled: false
};

// Local JSON Storage Helpers
const getLocalDataFile = (name: string): string => {
  return path.join(DATA_DIR, `${name}.json`);
};

const readLocalFile = <T>(name: string, defaultData: T): T => {
  const filePath = getLocalDataFile(name);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf8");
    return defaultData;
  }
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading database file: ${name}. Re-saving default.`, err);
    return defaultData;
  }
};

const writeLocalFile = <T>(name: string, data: T): void => {
  const filePath = getLocalDataFile(name);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
};

// --- Firebase Config & Error Handlers ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userId?: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: userId || null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('[Firestore Error Handled Gracefully]:', JSON.stringify(errInfo));
}

let firebaseApp: any = null;
export let firestoreDb: any = null;
let useFirebase: boolean = false;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    firebaseApp = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    useFirebase = true;
    console.log("Firebase Firestore initialized successfully as the backend database.");
  } else {
    console.log("No firebase-applet-config.json found. Operating without Firebase.");
  }
} catch (err) {
  console.error("Firebase initialization failed:", err);
}

// Helper to fetch collection
async function fetchCollection(colName: string): Promise<any[]> {
  if (!useFirebase || !firestoreDb) return [];
  try {
    const querySnapshot = await getDocs(collection(firestoreDb, colName));
    const list: any[] = [];
    querySnapshot.forEach((doc) => {
      list.push({ ...doc.data() });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, colName);
    return [];
  }
}

// Log activity system
export const logActivity = (user: string, action: string, details: string) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      user,
      action,
      details
    };
    const logs = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, "utf8")) : [];
    logs.unshift(logEntry);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs.slice(0, 100), null, 2), "utf8");

    if (useFirebase && firestoreDb) {
      const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setDoc(doc(firestoreDb, "logs", logId), logEntry).catch((error) => {
        console.error("Failed to write activity log to Firestore:", error);
      });
    }
  } catch (err) {
    console.error("Failed to write to activity log", err);
  }
};

export const getActivityLogs = () => {
  try {
    return fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, "utf8")) : [];
  } catch (err) {
    return [];
  }
};

// Primary DB Class
class GoogleSheetsDatabase {
  private useGoogleSheets: boolean = false;
  private spreadsheetId: string = "";
  private clientEmail: string = "";
  private privateKey: string = "";
  private sheetsInstance: any = null;

  // Cache data locally in memory/JSON
  public cachedUsers: User[] = [];
  public cachedCourses: Course[] = [];
  public cachedLessons: Lesson[] = [];
  public cachedOrders: Order[] = [];
  public cachedPayments: Payment[] = [];
  public cachedSettings: SystemSettings = DEFAULT_SETTINGS;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || "";
    this.clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
    this.privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

    if (this.spreadsheetId && this.clientEmail && this.privateKey) {
      try {
        const auth = new google.auth.JWT({
          email: this.clientEmail,
          key: this.privateKey,
          scopes: ["https://www.googleapis.com/auth/spreadsheets"]
        });
        this.sheetsInstance = google.sheets({ version: "v4", auth });
        this.useGoogleSheets = true;
        console.log("Database initialized successfully with Google Sheets API.");
      } catch (err) {
        console.error("Failed to initialize Google Sheets API SDK. Operating in standalone local cache mode.", err);
        this.useGoogleSheets = false;
      }
    } else {
      console.log("Google Sheets environment config variables not fully complete. Operating in standalone local cache mode.");
      this.useGoogleSheets = false;
    }

    // Always load local cache first, then asynchronously fetch and seed from Firestore
    this.syncFromLocal();
    if (useFirebase) {
      this.syncFromFirestore().then(() => {
        console.log("Initial Firestore synchronization and seeding completed.");
      }).catch(err => {
        console.error("Failed to complete Firestore initial sync & seeding:", err);
      });
    }
  }

  private syncFromLocal() {
    this.cachedUsers = readLocalFile("users", DEFAULT_USERS);
    this.cachedCourses = readLocalFile("courses", DEFAULT_COURSES);
    this.cachedLessons = readLocalFile("lessons", DEFAULT_LESSONS);
    this.cachedOrders = readLocalFile("orders", DEFAULT_ORDERS);
    this.cachedPayments = readLocalFile("payments", DEFAULT_PAYMENTS);
    this.cachedSettings = readLocalFile("settings", DEFAULT_SETTINGS);

    // If Google Sheets is active, let's sync up if empty
    if (this.useGoogleSheets) {
      this.syncFromSheetsAsync().catch(err => {
        console.error("Failed initial synchronization query to Google Sheets spreadsheet API:", err.message);
      });
    }
  }

  private async syncFromFirestore() {
    if (!useFirebase || !firestoreDb) return;
    try {
      // Authenticate server backend with Firebase Auth to gain isAdmin secure privileges
      try {
        const authInstance = getAuth(firebaseApp);
        const email = "admin@sabaiacademy.com";
        const password = "admin123_secure_password";
        try {
          await createUserWithEmailAndPassword(authInstance, email, password);
          console.log("Admin account successfully bootstrapped in Firebase Auth backend.");
        } catch (createErr: any) {
          if (createErr.code === "auth/email-already-in-use" || createErr.code === "auth/email-already-exists") {
            await signInWithEmailAndPassword(authInstance, email, password);
            console.log("Admin successfully authenticated and logged in to Firebase Auth backend.");
          } else {
            throw createErr;
          }
        }
      } catch (authErr) {
        console.error("Backend server authentication with Firebase failed:", authErr);
      }

      console.log("Starting Firestore synchronization...");

      // 1. Settings
      try {
        const settingsSnap = await getDocs(collection(firestoreDb, "settings"));
        let foundSettings = false;
        settingsSnap.forEach((doc) => {
          if (doc.id === "system") {
            this.cachedSettings = doc.data() as SystemSettings;
            foundSettings = true;
          }
        });
        if (!foundSettings) {
          await setDoc(doc(firestoreDb, "settings", "system"), DEFAULT_SETTINGS);
          this.cachedSettings = DEFAULT_SETTINGS;
        }
        writeLocalFile("settings", this.cachedSettings);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "settings/system");
      }

      // 2. Users
      const usersList = await fetchCollection("users");
      if (usersList.length > 0) {
        this.cachedUsers = usersList;
      } else {
        console.log("Seeding DEFAULT_USERS to Firestore...");
        for (const u of DEFAULT_USERS) {
          await setDoc(doc(firestoreDb, "users", u.id), u);
        }
        this.cachedUsers = DEFAULT_USERS;
      }
      writeLocalFile("users", this.cachedUsers);

      // 3. Courses
      const coursesList = await fetchCollection("courses");
      if (coursesList.length > 0) {
        this.cachedCourses = coursesList;
      } else {
        console.log("Seeding DEFAULT_COURSES to Firestore...");
        for (const c of DEFAULT_COURSES) {
          await setDoc(doc(firestoreDb, "courses", c.id), c);
        }
        this.cachedCourses = DEFAULT_COURSES;
      }
      writeLocalFile("courses", this.cachedCourses);

      // 4. Lessons
      const lessonsList = await fetchCollection("lessons");
      if (lessonsList.length > 0) {
        this.cachedLessons = lessonsList;
      } else {
        console.log("Seeding DEFAULT_LESSONS to Firestore...");
        for (const l of DEFAULT_LESSONS) {
          await setDoc(doc(firestoreDb, "lessons", l.id), l);
        }
        this.cachedLessons = DEFAULT_LESSONS;
      }
      writeLocalFile("lessons", this.cachedLessons);

      // 5. Orders
      const ordersList = await fetchCollection("orders");
      if (ordersList.length > 0) {
        this.cachedOrders = ordersList;
      } else {
        console.log("Seeding DEFAULT_ORDERS to Firestore...");
        for (const o of DEFAULT_ORDERS) {
          await setDoc(doc(firestoreDb, "orders", o.id), o);
        }
        this.cachedOrders = DEFAULT_ORDERS;
      }
      writeLocalFile("orders", this.cachedOrders);

      // 6. Payments
      const paymentsList = await fetchCollection("payments");
      if (paymentsList.length > 0) {
        this.cachedPayments = paymentsList;
      } else {
        console.log("Seeding DEFAULT_PAYMENTS to Firestore...");
        for (const p of DEFAULT_PAYMENTS) {
          await setDoc(doc(firestoreDb, "payments", p.id), p);
        }
        this.cachedPayments = DEFAULT_PAYMENTS;
      }
      writeLocalFile("payments", this.cachedPayments);

      console.log("Firestore synchronization and seeding complete.");
    } catch (err) {
      console.error("Failed to synchronize with Firebase Firestore:", err);
    }
  }

  // Push local storage contents to Google Sheets to auto-provision empty files
  public async syncToSheets() {
    if (!this.useGoogleSheets || !this.sheetsInstance) return;
    try {
      // Setup Users Sheet Structure
      const usersData = [
        ["id", "name", "email", "passwordHash", "role", "status", "points", "bio", "joined_at"],
        ...this.cachedUsers.map(u => [u.id, u.name, u.email, u.passwordHash, u.role, u.status, u.points.toString(), u.bio || "", u.joined_at])
      ];
      await this.writeSheetData("Users", usersData);

      // Setup Courses Sheet Structure
      const coursesData = [
        ["id", "title", "slug", "description", "price", "discount", "category", "instructor", "duration", "rating", "thumbnail", "intro_video"],
        ...this.cachedCourses.map(c => [c.id, c.title, c.slug, c.description, c.price.toString(), c.discount.toString(), c.category, c.instructor, c.duration, c.rating.toString(), c.thumbnail, c.intro_video])
      ];
      await this.writeSheetData("Courses", coursesData);

      // Setup Lessons Sheet Structure
      const lessonsData = [
        ["id", "course_id", "title", "video_url", "order", "details", "quizJSON"],
        ...this.cachedLessons.map(l => [l.id, l.course_id, l.title, l.video_url, l.order.toString(), l.details, JSON.stringify(l.quiz || [])])
      ];
      await this.writeSheetData("Lessons", lessonsData);

      // Setup Orders Sheet Structure
      const ordersData = [
        ["id", "user_id", "course_id", "amount", "payment_method", "payment_status", "referral_code", "transaction_id", "created_at"],
        ...this.cachedOrders.map(o => [o.id, o.user_id, o.course_id, o.amount.toString(), o.payment_method, o.payment_status, o.referral_code || "", o.transaction_id, o.created_at])
      ];
      await this.writeSheetData("Orders", ordersData);

      // Setup Payments Sheet Structure
      const paymentsData = [
        ["id", "order_id", "amount", "transaction_id", "payment_method", "status", "screenshot_url", "verified_at", "verified_by"],
        ...this.cachedPayments.map(p => [p.id, p.order_id, p.amount.toString(), p.transaction_id, p.payment_method, p.status, p.screenshot_url || "", p.verified_at || "", p.verified_by || ""])
      ];
      await this.writeSheetData("Payments", paymentsData);

      console.log("Successfully pushed local cache states up into the Google Sheets Spreadsheet.");
    } catch (err: any) {
      console.error("Failed to complete push operation to Google Sheets API:", err.message);
    }
  }

  // Attempt to sync from sheets
  private async syncFromSheetsAsync() {
    if (!this.useGoogleSheets || !this.sheetsInstance) return;
    try {
      const usersRows = await this.readSheetData("Users");
      if (usersRows && usersRows.length > 1) {
        this.cachedUsers = usersRows.slice(1).map(row => ({
          id: row[0],
          name: row[1],
          email: row[2],
          passwordHash: row[3],
          role: row[4] as UserRole,
          status: (row[5] || "active") as "active" | "banned",
          points: parseInt(row[6] || "0"),
          bio: row[7] || "",
          joined_at: row[8] || new Date().toISOString()
        }));
        writeLocalFile("users", this.cachedUsers);
      }

      const coursesRows = await this.readSheetData("Courses");
      if (coursesRows && coursesRows.length > 1) {
        this.cachedCourses = coursesRows.slice(1).map(row => ({
          id: row[0],
          title: row[1],
          slug: row[2],
          description: row[3],
          price: parseFloat(row[4] || "0"),
          discount: parseInt(row[5] || "0"),
          category: row[6] || "Uncategorized",
          tags: (row[6] || "").split(",").filter(Boolean),
          instructor: row[7] || "Instructor",
          duration: row[8] || "N/A",
          rating: parseFloat(row[9] || "5"),
          thumbnail: row[10] || "",
          intro_video: row[11] || ""
        }));
        writeLocalFile("courses", this.cachedCourses);
      }

      const lessonsRows = await this.readSheetData("Lessons");
      if (lessonsRows && lessonsRows.length > 1) {
        this.cachedLessons = lessonsRows.slice(1).map(row => {
          let quiz = [];
          try {
            if (row[6]) quiz = JSON.parse(row[6]);
          } catch(e) {}
          return {
            id: row[0],
            course_id: row[1],
            title: row[2],
            video_url: row[3],
            attachments: row[7] ? row[7].split(",").map((s: string) => s.trim()).filter(Boolean) : [],
            order: parseInt(row[4] || "1"),
            details: row[5] || "",
            quiz
          };
        });
        writeLocalFile("lessons", this.cachedLessons);
      }

      const ordersRows = await this.readSheetData("Orders");
      if (ordersRows && ordersRows.length > 1) {
        this.cachedOrders = ordersRows.slice(1).map(row => ({
          id: row[0],
          user_id: row[1],
          course_id: row[2],
          amount: parseFloat(row[3] || "0"),
          payment_method: row[4] || "",
          payment_status: row[5] as any,
          referral_code: row[6] || "",
          transaction_id: row[7] || "",
          created_at: row[8] || new Date().toISOString()
        }));
        writeLocalFile("orders", this.cachedOrders);
      }

      const paymentsRows = await this.readSheetData("Payments");
      if (paymentsRows && paymentsRows.length > 1) {
        this.cachedPayments = paymentsRows.slice(1).map(row => ({
          id: row[0],
          order_id: row[1],
          amount: parseFloat(row[2] || "0"),
          transaction_id: row[3] || "",
          payment_method: row[4] || "",
          status: row[5] as any,
          screenshot_url: row[6] || "",
          verified_at: row[7] || "",
          verified_by: row[8] || ""
        }));
        writeLocalFile("payments", this.cachedPayments);
      }

      console.log("Successfully synchronized databases down from Google Sheets.");
    } catch (err: any) {
      console.warn("Failed automatic spreadsheet reading synchronize:", err.message, "Using robust local file storage system.");
    }
  }

  // Google sheet I/O helper
  private async readSheetData(range: string): Promise<any[][] | null> {
    try {
      const response = await this.sheetsInstance.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
      });
      return response.data.values;
    } catch (err: any) {
      if (err.message && err.message.includes("Unable to parse range")) {
        console.log(`Sheet "${range}" not found in spreadsheet. Auto-pushing provisioning layout...`);
        this.syncToSheets();
      }
      return null;
    }
  }

  private async writeSheetData(range: string, values: any[][]) {
    try {
      await this.sheetsInstance.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${range}!A1`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
    } catch (err: any) {
      console.error(`Failed pushing values into Spreadsheet Range: ${range}`, err.message);
    }
  }

  // --- External Methods representing standard business interfaces ---

  public isUsingGoogleSheets(): boolean {
    return this.useGoogleSheets;
  }

  // Users CRUD
  public getUsers(): User[] {
    return this.cachedUsers;
  }

  public saveUser(user: User) {
    const idx = this.cachedUsers.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      this.cachedUsers[idx] = user;
    } else {
      this.cachedUsers.push(user);
    }
    writeLocalFile("users", this.cachedUsers);

    if (useFirebase && firestoreDb) {
      setDoc(doc(firestoreDb, "users", user.id), user).catch(error => {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
      });
    }

    if (this.useGoogleSheets) this.syncToSheets();
  }

  public deleteUser(id: string) {
    this.cachedUsers = this.cachedUsers.filter(u => u.id !== id);
    writeLocalFile("users", this.cachedUsers);

    if (useFirebase && firestoreDb) {
      deleteDoc(doc(firestoreDb, "users", id)).catch(error => {
        handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
      });
    }

    if (this.useGoogleSheets) this.syncToSheets();
  }

  // Courses CRUD
  public getCourses(): Course[] {
    return this.cachedCourses;
  }

  public saveCourse(course: Course) {
    const idx = this.cachedCourses.findIndex(c => c.id === course.id);
    if (idx >= 0) {
      this.cachedCourses[idx] = course;
    } else {
      this.cachedCourses.push(course);
    }
    writeLocalFile("courses", this.cachedCourses);

    if (useFirebase && firestoreDb) {
      setDoc(doc(firestoreDb, "courses", course.id), course).catch(error => {
        handleFirestoreError(error, OperationType.WRITE, `courses/${course.id}`);
      });
    }

    if (this.useGoogleSheets) this.syncToSheets();
  }

  public deleteCourse(id: string) {
    this.cachedCourses = this.cachedCourses.filter(c => c.id !== id);
    this.cachedLessons = this.cachedLessons.filter(l => l.course_id !== id); // Cascade
    writeLocalFile("courses", this.cachedCourses);
    writeLocalFile("lessons", this.cachedLessons);

    if (useFirebase && firestoreDb) {
      deleteDoc(doc(firestoreDb, "courses", id)).catch(error => {
        handleFirestoreError(error, OperationType.DELETE, `courses/${id}`);
      });
    }

    if (this.useGoogleSheets) this.syncToSheets();
  }

  // Lessons CRUD
  public getLessons(): Lesson[] {
    return this.cachedLessons;
  }

  public saveLesson(lesson: Lesson) {
    const idx = this.cachedLessons.findIndex(l => l.id === lesson.id);
    if (idx >= 0) {
      this.cachedLessons[idx] = lesson;
    } else {
      this.cachedLessons.push(lesson);
    }
    writeLocalFile("lessons", this.cachedLessons);

    if (useFirebase && firestoreDb) {
      setDoc(doc(firestoreDb, "lessons", lesson.id), lesson).catch(error => {
        handleFirestoreError(error, OperationType.WRITE, `lessons/${lesson.id}`);
      });
    }

    if (this.useGoogleSheets) this.syncToSheets();
  }

  public deleteLesson(id: string) {
    this.cachedLessons = this.cachedLessons.filter(l => l.id !== id);
    writeLocalFile("lessons", this.cachedLessons);

    if (useFirebase && firestoreDb) {
      deleteDoc(doc(firestoreDb, "lessons", id)).catch(error => {
        handleFirestoreError(error, OperationType.DELETE, `lessons/${id}`);
      });
    }

    if (this.useGoogleSheets) this.syncToSheets();
  }

  // Orders CRUD
  public getOrders(): Order[] {
    return this.cachedOrders;
  }

  public saveOrder(order: Order) {
    const idx = this.cachedOrders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      this.cachedOrders[idx] = order;
    } else {
      this.cachedOrders.push(order);
    }
    writeLocalFile("orders", this.cachedOrders);

    if (useFirebase && firestoreDb) {
      setDoc(doc(firestoreDb, "orders", order.id), order).catch(error => {
        handleFirestoreError(error, OperationType.WRITE, `orders/${order.id}`);
      });
    }

    if (this.useGoogleSheets) this.syncToSheets();
  }

  // Payments CRUD
  public getPayments(): Payment[] {
    return this.cachedPayments;
  }

  public savePayment(payment: Payment) {
    const idx = this.cachedPayments.findIndex(p => p.id === payment.id);
    if (idx >= 0) {
      this.cachedPayments[idx] = payment;
    } else {
      this.cachedPayments.push(payment);
    }
    writeLocalFile("payments", this.cachedPayments);

    if (useFirebase && firestoreDb) {
      setDoc(doc(firestoreDb, "payments", payment.id), payment).catch(error => {
        handleFirestoreError(error, OperationType.WRITE, `payments/${payment.id}`);
      });
    }

    if (this.useGoogleSheets) this.syncToSheets();
  }

  // Settings
  public getSettings(): SystemSettings {
    return this.cachedSettings;
  }

  public saveSettings(settings: SystemSettings) {
    this.cachedSettings = settings;
    writeLocalFile("settings", this.cachedSettings);

    if (useFirebase && firestoreDb) {
      setDoc(doc(firestoreDb, "settings", "system"), settings).catch(error => {
        handleFirestoreError(error, OperationType.WRITE, "settings/system");
      });
    }
  }
}

export const db = new GoogleSheetsDatabase();
