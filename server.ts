import express, { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { db, User, Course, Lesson, Order, Payment, UserRole, logActivity, getActivityLogs } from "./server/db";

// Express Initialization
const app = express();
const PORT = 3000;

// Config limit to handle screenshot payloads gracefully
app.use(express.json({ limit: "15mb" }));

// Setup global secrets
const JWT_SECRET = process.env.JWT_SECRET || "sabai-secret-key-12345678-0123456789";

// Initialize Gemini Client
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini AI Client initialized successfully.");
  } catch (err) {
    console.error("Error setting up GoogleGenAI client:", err);
  }
} else {
  console.log("No GEMINI_API_KEY detected in env secrets. AI endpoints will run in high-quality fallback simulator mode.");
}

// Custom Light Cryptography helpers for JWT emulation
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

function generateJWT(payload: any): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 }));
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(signatureInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signatureInput}.${signature}`;
}

function verifyJWT(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    // Verify Signature
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(signatureInput)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    if (expectedSignature !== signature) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp < Date.now()) return null; // Expired

    return payload;
  } catch (err) {
    return null;
  }
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "KHMER_LMS_SALT").digest("hex");
}

// Telegram integration notifier
async function sendTelegramNotification(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log("[Telegram Guard] Notification bypass (no token/chatId in settings). Contents:", message);
    return;
  }
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
      })
    });
    if (!response.ok) {
      console.warn("Telegram API sent non-OK status code:", response.status);
    }
  } catch (err) {
    console.warn("Error triggering Telegram warning dispatch:", err);
  }
}

// Middewares for Request Validation & JWT Parsing
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. Auth token required." });
  }

  const token = authHeader.split(" ")[1];
  const verified = verifyJWT(token);
  if (!verified) {
    return res.status(401).json({ error: "Invalid or expired token session." });
  }

  req.user = verified;
  next();
};

const teacherOrAdminMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== "teacher" && req.user.role !== "admin")) {
    return res.status(403).json({ error: "Forbidden: Restricted to Teachers and Administrators." });
  }
  next();
};

const adminMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Restricted to Administrators only." });
  }
  next();
};


// ----------------- API GATEWAY ROUTINGS -----------------

// 1. AUTHENTICATION API
app.post("/api/auth/register", (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Fields name, email and password are all required." });
  }

  const users = db.getUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email address is already registered." });
  }

  const selectedRole = (role === "teacher" || role === "admin" ? role : "student") as UserRole;
  const passwordHash = hashPassword(password);
  
  const newUser: User = {
    id: `u-${crypto.randomBytes(4).toString("hex")}`,
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: selectedRole,
    status: "active",
    points: 10,
    joined_at: new Date().toISOString()
  };

  db.saveUser(newUser);
  logActivity(name, "User Registration", `Registered as a new ${selectedRole}.`);

  const token = generateJWT({ id: newUser.id, email: newUser.email, role: newUser.role });
  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      points: newUser.points
    }
  });
});

app.post("/api/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required files." });
  }

  const user = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(400).json({ error: "Incorrect email coordinates or password." });
  }

  if (user.status === "banned") {
    return res.status(403).json({ error: "Your account is temporarily banned. Please contact Sabai Academy." });
  }

  const passwordHash = hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    return res.status(400).json({ error: "Incorrect password." });
  }

  // Award studying points dynamically on login
  user.points = (user.points || 0) + 1;
  db.saveUser(user);

  logActivity(user.name, "User Login", "Logged in to the portal.");
  const token = generateJWT({ id: user.id, email: user.email, role: user.role });
  
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      bio: user.bio,
      avatar_url: user.avatar_url,
      points: user.points
    }
  });
});

app.get("/api/auth/profile", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const user = db.getUsers().find(u => u.id === req.user!.id);
  if (!user) {
    return res.status(404).json({ error: "Profile details not found." });
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    bio: user.bio,
    avatar_url: user.avatar_url,
    points: user.points,
    joined_at: user.joined_at
  });
});

app.put("/api/auth/profile", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const user = db.getUsers().find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { name, bio, avatar_url, currentPassword, newPassword } = req.body;
  if (name) user.name = name;
  if (bio !== undefined) user.bio = bio;
  if (avatar_url !== undefined) user.avatar_url = avatar_url;

  if (currentPassword && newPassword) {
    const currentHash = hashPassword(currentPassword);
    if (user.passwordHash !== currentHash) {
      return res.status(400).json({ error: "Current password does not match original hashes." });
    }
    user.passwordHash = hashPassword(newPassword);
    logActivity(user.name, "Password Changed", "Changed user security key.");
  }

  db.saveUser(user);
  logActivity(user.name, "Profile Update", "Updated self account settings.");
  res.json({ message: "Profile saved successfully.", user });
});


// 2. COURSES API
app.get("/api/courses", (req: Request, res: Response) => {
  const courses = db.getCourses();
  res.json(courses);
});

app.get("/api/courses/:id", (req: Request, res: Response) => {
  const course = db.getCourses().find(c => c.id === req.params.id || c.slug === req.params.id);
  if (!course) {
    return res.status(404).json({ error: "Requested e-learning course is not found." });
  }
  
  // Package with associated lessons list order-sorted
  const lessons = db.getLessons()
    .filter(l => l.course_id === course.id)
    .sort((a, b) => a.order - b.order);

  res.json({
    course,
    lessons
  });
});

app.post("/api/courses/create", authMiddleware, teacherOrAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { title, description, price, discount, category, tags, duration, thumbnail, intro_video } = req.body;
  if (!title || !description || price === undefined) {
    return res.status(400).json({ error: "Title, description, and price values are required." });
  }

  const slug = title.toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-");

  const creatorName = db.getUsers().find(u => u.id === req.user!.id)?.name || "Instructor";

  const newCourse: Course = {
    id: `c-${crypto.randomBytes(4).toString("hex")}`,
    title,
    slug,
    description,
    price: parseFloat(price),
    discount: discount ? parseInt(discount) : 0,
    category: category || "General",
    tags: tags || [],
    instructor: creatorName,
    duration: duration || "10 Hours",
    rating: 5.0,
    thumbnail: thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600",
    intro_video: intro_video || "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  };

  db.saveCourse(newCourse);
  logActivity(creatorName, "Course Created", `Created a new course titled: "${title}"`);
  res.status(201).json({ message: "Course successfully generated.", course: newCourse });
});

app.delete("/api/courses/:id", authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const course = db.getCourses().find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: "Target course doesn't exist." });

  db.deleteCourse(course.id);
  logActivity(req.user!.email, "Course Deletion", `Purged course: ${course.title}`);
  res.json({ message: "Course and related lessons purged." });
});


// 3. LESSON MANAGEMENT API
app.post("/api/lessons", authMiddleware, teacherOrAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id, course_id, title, video_url, order, details, attachments, quiz } = req.body;
  if (!course_id || !title || !video_url) {
    return res.status(400).json({ error: "Course ID, Lesson Title, and Video URL are all mandatory." });
  }

  const lessonId = id || `l-${crypto.randomBytes(4).toString("hex")}`;
  const newLesson: Lesson = {
    id: lessonId,
    course_id,
    title,
    video_url,
    order: order ? parseInt(order) : 1,
    details: details || "",
    attachments: attachments || [],
    quiz: quiz || []
  };

  db.saveLesson(newLesson);
  logActivity(req.user!.email, "Lesson Update/Create", `Saved lesson: "${title}" for course ${course_id}`);
  res.json({ message: "Lesson configuration saved.", lesson: newLesson });
});

app.delete("/api/lessons/:id", authMiddleware, teacherOrAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const lesson = db.getLessons().find(l => l.id === req.params.id);
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  db.deleteLesson(lesson.id);
  logActivity(req.user!.email, "Lesson Deleted", `Removed lesson: "${lesson.title}"`);
  res.json({ message: "Lesson purged successfully." });
});


// 4. PAYMENTS & ORDERS INTEGRATION
app.post("/api/payments/create", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { course_id, payment_method, coupon_code } = req.body;
  if (!course_id || !payment_method) {
    return res.status(400).json({ error: "Course ID and checkout payment method are required." });
  }

  const course = db.getCourses().find(c => c.id === course_id);
  if (!course) return res.status(404).json({ error: "Requested course is invalid." });

  // Calculate price taking into account discount percentages
  let originalPrice = course.price;
  if (course.discount > 0) {
    originalPrice = originalPrice - (originalPrice * (course.discount / 100));
  }

  // Coupon Logic
  let finalAmount = originalPrice;
  if (coupon_code && coupon_code.toUpperCase() === "SABAI20") {
    finalAmount = finalAmount * 0.8; // Additional 20% off
  } else if (coupon_code && coupon_code.toUpperCase() === "KHMERFREE") {
    finalAmount = 0.0;
  }

  const orderId = `o-${crypto.randomBytes(4).toString("hex")}`;
  const transactionId = `TRX-${payment_method.toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const isFree = finalAmount === 0;

  // Create registration order
  const newOrder: Order = {
    id: orderId,
    user_id: req.user!.id,
    course_id: course.id,
    amount: parseFloat(finalAmount.toFixed(2)),
    payment_method,
    payment_status: isFree ? "completed" : "pending",
    referral_code: coupon_code,
    transaction_id: transactionId,
    created_at: new Date().toISOString()
  };

  db.saveOrder(newOrder);

  // If not free, write to transaction files waiting screenshot validation
  if (!isFree) {
    const newPayment: Payment = {
      id: `p-${crypto.randomBytes(4).toString("hex")}`,
      order_id: orderId,
      amount: parseFloat(finalAmount.toFixed(2)),
      transaction_id: transactionId,
      payment_method,
      status: "pending"
    };
    db.savePayment(newPayment);
  } else {
    // Grant immediate full-points
    const userObj = db.getUsers().find(u => u.id === req.user!.id);
    if (userObj) {
      userObj.points = (userObj.points || 0) + 10;
      db.saveUser(userObj);
    }
  }

  logActivity(req.user!.email, "Order Initiated", `Purchased "${course.title}" through method ${payment_method}. Status: ${newOrder.payment_status}`);
  
  // Dispatch notification alerts to channels
  sendTelegramNotification(
    `🔔 <b>New Order Placed!</b>\n` +
    `👤 Student ID: <code>${req.user!.id}</code> (${req.user!.email})\n` +
    `📚 Course: <i>${course.title}</i>\n` +
    `💰 Net Total: <b>$${finalAmount.toFixed(2)} USD</b>\n` +
    `💳 Gateway: <code>${payment_method}</code>\n` +
    `📈 Status: <b>${newOrder.payment_status.toUpperCase()}</b>`
  );

  res.status(201).json({ order: newOrder, isFree });
});

// Student uploads receipt screenshot to complete offline Cambodian banking verifying steps
app.post("/api/payments/verify", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { transaction_id, screenshot_url } = req.body;
  if (!transaction_id) {
    return res.status(400).json({ error: "Transaction ID is missing." });
  }

  const payInfo = db.getPayments().find(p => p.transaction_id === transaction_id);
  if (!payInfo) {
    return res.status(404).json({ error: "Failed to locate matching pending payment record." });
  }

  payInfo.screenshot_url = screenshot_url || "";
  db.savePayment(payInfo);

  logActivity(req.user!.email, "Payment Verified Uploaded", `Submitted banking screenshot verifying transition ${transaction_id}.`);

  sendTelegramNotification(
    `📸 <b>Receipt Uploaded for Verification!</b>\n` +
    `💳 TRX: <code>${transaction_id}</code>\n` +
    `💵 Amount: <b>$${payInfo.amount} USD</b>\n` +
    `⚙️ Access Admin Panel in LMS to approve the transaction.`
  );

  res.json({ message: "Verification proof submitted. Course will unlock immediately once approved by administrators.", payment: payInfo });
});

// Admin approves transaction, unlocking courses automatically
app.post("/api/payments/approve", authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { transaction_id, action } = req.body; // action: "approve" | "decline"
  if (!transaction_id) {
    return res.status(400).json({ error: "Transaction ID required." });
  }

  const payInfo = db.getPayments().find(p => p.transaction_id === transaction_id);
  if (!payInfo) return res.status(404).json({ error: "Payment TRX index not found." });

  const orderInfo = db.getOrders().find(o => o.id === payInfo.order_id);
  if (!orderInfo) return res.status(404).json({ error: "Order details referenced by transactions are purged." });

  if (action === "approve") {
    payInfo.status = "completed";
    payInfo.verified_at = new Date().toISOString();
    payInfo.verified_by = req.user!.id;
    
    orderInfo.payment_status = "completed";

    // Award bonus learning points to student
    const student = db.getUsers().find(u => u.id === orderInfo.user_id);
    if (student) {
      student.points = (student.points || 0) + 20; // major point milestones!
      db.saveUser(student);
    }

    db.savePayment(payInfo);
    db.saveOrder(orderInfo);

    logActivity(req.user!.email, "Payment Approved", `Approved and unlocked TRX: ${transaction_id}`);
    
    sendTelegramNotification(
      `✅ <b>Payment Approved & Verified!</b>\n` +
      `💳 TRX: <code>${transaction_id}</code>\n` +
      `👤 User ID: <code>${orderInfo.user_id}</code>\n` +
      `🍀 Course is now fully unlocked for student studying!`
    );

  } else {
    payInfo.status = "failed";
    orderInfo.payment_status = "refunded";
    
    db.savePayment(payInfo);
    db.saveOrder(orderInfo);

    logActivity(req.user!.email, "Payment Declined", `Declined or marked failed TRX: ${transaction_id}`);
  }

  res.json({ message: `Payment successfully marked: ${action}`, order: orderInfo });
});

app.get("/api/payments/transactions", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role === "admin") {
    // Admin receives all transaction records
    const allPayments = db.getPayments();
    const joined = allPayments.map(p => {
      const ord = db.getOrders().find(o => o.id === p.order_id);
      const user = ord ? db.getUsers().find(u => u.id === ord.user_id) : null;
      const course = ord ? db.getCourses().find(c => c.id === ord.course_id) : null;
      return {
        ...p,
        user_name: user?.name || "Unknown Student",
        user_email: user?.email || "",
        course_title: course?.title || "Unknown Course",
        created_at: ord?.created_at || ""
      };
    });
    res.json(joined);
  } else {
    // Student receives self payment list
    const userOrders = db.getOrders().filter(o => o.user_id === req.user!.id);
    const selfPayments = db.getPayments().filter(p => userOrders.some(uo => uo.id === p.order_id));
    const joined = selfPayments.map(p => {
      const ord = userOrders.find(o => o.id === p.order_id);
      const course = ord ? db.getCourses().find(c => c.id === ord.course_id) : null;
      return {
        ...p,
        course_title: course?.title || "",
        created_at: ord?.created_at || ""
      };
    });
    res.json(joined);
  }
});


// 5. USER ACCOUNTS MANAGEMENT (ADMIN CONTROL)
app.get("/api/users", authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const users = db.getUsers().map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    points: u.points,
    joined_at: u.joined_at
  }));
  res.json(users);
});

app.put("/api/users/:id/role", authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = db.getUsers().find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { role, status } = req.body;
  if (role) user.role = role as UserRole;
  if (status) user.status = status as "active" | "banned";

  db.saveUser(user);
  logActivity(req.user!.email, "User Admin Updated", `Modified role/status for profile ${user.email}`);
  res.json({ message: "User status updated saved.", user });
});


// 6. DYNAMIC SYSTEM LAUNCH NOTIFICATIONS & LOGS
app.get("/api/admin/metrics", authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const users = db.getUsers();
  const courses = db.getCourses();
  const orders = db.getOrders();
  const payments = db.getPayments();
  const logs = getActivityLogs();

  const totalSales = payments.filter(p => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);

  res.json({
    totalUsers: users.length,
    activeStudents: users.filter(u => u.role === "student").length,
    totalCourses: courses.length,
    totalSales,
    completedTransactions: payments.filter(p => p.status === "completed").length,
    pendingTransactions: payments.filter(p => p.status === "pending").length,
    logs
  });
});


// 7. MULTIMODAL AI INTELLIGENT APIs

// AI Assist chat helper recommending dynamic curriculums
app.post("/api/ai/chat", async (req: Request, res: Response) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: "User message prompt empty." });
  }

  const catalogSummary = db.getCourses().map(c => `- [ID: ${c.id}] ${c.title}, Category: ${c.category}, Price: $${c.price} USD`).join("\n");

  const systemPrompt = `You are "Kru Sabai", the primary Khmer & English dynamic AI tutor of Sabai Academy LMS, an elite online academy in Cambodia.
Your target is to answer the user's queries in an extremely friendly, helpful, and highly professional manner.
When they ask about writing code, programming, careers, or marketing study paths, guide them perfectly with concrete coding snippets styled beautifully in markdown.
Incorporate polite Khmer greeting phrases (like 'សួស្តី! (Suostei)') or encouragement phrases where natural to maintain beautiful local identity, and use fully readable Unicode.

Currently, Sabai Academy offers the following active courses. Always recommend and reference these to help conversion if relevant:
${catalogSummary}

Provide a comprehensive, high-quality response.`;

  if (aiClient) {
    try {
      // Form structural parameters matching gemini skill instructions
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] }
        ],
        config: {
          temperature: 0.8
        }
      });
      return res.json({ reply: response.text });
    } catch (err: any) {
      console.error("Gemini content generation failed:", err);
      // fallback in order to keep app stable of key lacks limits
    }
  }

  // Pure Local Simulator Fallback - exceptionally smart and context aware
  const lowercase = message.toLowerCase();
  let fallbackReply = "សួស្តី! (Suostei!) I am Kru Sabai, your learning partner. I am happy to guide you! ";
  if (lowercase.includes("react") || lowercase.includes("web") || lowercase.includes("next")) {
    fallbackReply += "\n\nI highly recommend our <b>Next.js 15 & React Fullstack Mastery</b> class! It includes 18 full hours of lessons, curriculum tasks, and templates to start developing your career today. Would you like a coupon? Try typing 'SABAI20' during purchase for 20% savings.";
  } else if (lowercase.includes("marketing") || lowercase.includes("sale") || lowercase.includes("business")) {
    fallbackReply += "\n\nTo build revenue, checkout our <b>AI Tools & Digital Marketing</b> class. You will master digital funnel systems tailored precisely for Cambodian SMEs, integrating ABA QR codes and Facebook chat bots.";
  } else {
    fallbackReply += "\n\nTo help you achieve massive study heights, choose from our specialized programming or digital advertising curriculum tracks. Let me know what you'd like to learn or ask for course recommendations, and I will write a customized guide for you!";
  }
  return res.json({ reply: fallbackReply });
});

// AI Course syllabus generation utilizing structured JSON returns
app.post("/api/ai/course-generate", authMiddleware, teacherOrAdminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { topic, category } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Course topic or prompt is empty." });
  }

  const systemInstruction = `You are an elite syllabus designer.
Generate a structured online course title, description, and exactly 2 detailed lesson drafts based on the user's prompt topic.
You must return the syllabus strictly in JSON matching the specified structure.
Provide localized text fields with elegant Khmer translations (Unicode) alongside the English.

JSON Output structure specification:
{
  "title": "Title with Khmer translation",
  "description": "Short overview description in dual English/Khmer",
  "category": "Technology or Marketing, etc.",
  "duration": "12 Hours",
  "price": 29,
  "lessons": [
    {
      "title": "Lesson 1: Title content",
      "details": "Lesson details summary",
      "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "quiz": [
        {
          "question": "Quiz question details",
          "options": ["Option A", "Option B", "Option C"],
          "answerIndex": 0
        }
      ]
    }
  ]
}`;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Topic: ${topic} Category: ${category || "General"}\n\nGenerate according to schema.`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.9,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              duration: { type: Type.STRING },
              price: { type: Type.NUMBER },
              lessons: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    details: { type: Type.STRING },
                    video_url: { type: Type.STRING },
                    quiz: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          question: { type: Type.STRING },
                          options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                          },
                          answerIndex: { type: Type.INTEGER }
                        },
                        required: ["question", "options", "answerIndex"]
                      }
                    }
                  },
                  required: ["title", "details", "video_url"]
                }
              }
            },
            required: ["title", "description", "category", "price", "lessons"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json(parsed);

    } catch (err: any) {
      console.error("AI Schema outline compilation failed:", err);
    }
  }

  // Intelligent fallback template generator in case API limits or key isn't active
  const simpleSlug = topic.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 15);
  const fallbackOutline = {
    title: `Mastering ${topic} Masterclass (វគ្គសិក្សាជាន់ខ្ពស់ ${topic})`,
    description: `Unlock complete mastery over ${topic} under expert coaching. Designed for modern builders in Cambodia to quickly learn tools, strategies, and real implementations.`,
    category: category || "Specialized Study",
    duration: "10 Hours",
    price: 25,
    lessons: [
      {
        title: `1. Foundations of ${topic} (មេរៀនទី ១៖ គ្រឹះស្ថានលម្អិត)`,
        details: `Detailed overview of core rules, layout, setting standards, and running baseline routines of ${topic}.`,
        video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        quiz: [
          {
            question: `What is the crucial rule when developing ${topic} setups?`,
            options: ["Ignoring best-practices", "Careful planning and responsive styling", "Re-writing entire modules manually"],
            answerIndex: 1
          }
        ]
      },
      {
        title: `2. Intermediate Project Deployments (មេរៀនទី ២៖ ការអនុវត្តផ្ទាល់)`,
        details: `Taking our workspace projects and hosting them into cloud ecosystems safely.`,
        video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        quiz: [
          {
            question: "Which approach is most dynamic?",
            options: ["Automated cloud synchronization pipelines", "Offline static backups", "No deployments"],
            answerIndex: 0
          }
        ]
      }
    ]
  };

  res.json(fallbackOutline);
});


// ----------------- VITE INGRESS SERVER ROUTINE -----------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development server proxying Vite asset loaders
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite Development server pipeline bonded.");
  } else {
    // Production statics files routing
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Vite Static Production Assets loader linked.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Sabai LMS] Server operational on interface http://0.0.0.0:${PORT}`);
  });
}

startServer();
