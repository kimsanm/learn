export type UserRole = "student" | "teacher" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "banned";
  points: number;
  bio?: string;
  avatar_url?: string;
  joined_at?: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  discount: number;
  category: string;
  tags: string[];
  instructor: string;
  duration: string;
  rating: number;
  thumbnail: string;
  intro_video: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  video_url: string;
  attachments: string[];
  order: number;
  details: string;
  quiz?: QuizQuestion[];
}

export interface Order {
  id: string;
  user_id: string;
  course_id: string;
  amount: number;
  payment_method: string;
  payment_status: "pending" | "completed" | "refunded";
  referral_code?: string;
  transaction_id: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  order_id: string;
  amount: number;
  transaction_id: string;
  payment_method: string;
  status: "pending" | "completed" | "failed";
  screenshot_url?: string;
  verified_at?: string;
  verified_by?: string;
  user_name?: string;
  user_email?: string;
  course_title?: string;
  created_at?: string;
}

export interface DashboardMetrics {
  totalUsers: number;
  activeStudents: number;
  totalCourses: number;
  totalSales: number;
  completedTransactions: number;
  pendingTransactions: number;
  logs: {
    timestamp: string;
    user: string;
    action: string;
    details: string;
  }[];
}
