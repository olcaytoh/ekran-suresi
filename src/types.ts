export type UserRole = 'teacher' | 'parent' | 'admin';

export interface InstitutionInfo {
  id: string;
  code: string; // e.g. "KRM-8842" or "KRM123" — shared with teachers to join
  adminCode: string; // e.g. "ADM-8842" — shared with other admins to join as co-admin
  name: string; // e.g. "AKÇAKOCA İLKOKULU"
  adminUid: string;
  adminName: string;
  adminEmail: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface UserProfile {
  uid: string;
  email?: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  userType?: 'teacher' | 'parent'; // friendly role
  studentName?: string; // If parent, the child's name (e.g. 'Ali Yılmaz')
  parentName?: string; // Name of the parent
  institutionId?: string; // Connected institution document ID
  institutionCode?: string; // e.g. "KRM-8842" — Kurum Kodu (for teachers)
  institutionAdminCode?: string; // e.g. "ADM-8842" — Admin Kodu (for co-admins)
  institutionName?: string; // e.g. "AKÇAKOCA İLKOKULU"
  classId?: string; // Connected classroom document ID
  classCode?: string; // 6-character connect code
  className?: string; // Name of classroom (e.g. '4-A Sınıfı')
  currentWeekId: string;
  currentWeekMinutes: number;
  currentWeekStage: number; // 0 to 14
  hasSeenParentGuide?: boolean;
  updatedAt?: any;
  createdAt?: any;
}

export interface ClassroomInfo {
  id: string;
  code: string; // 6-digit or upper-case code e.g. 'SINIF4A'
  name: string; // e.g. '4-A Sınıfı - Öğretmen Ayşe'
  institutionId?: string; // Parent institution
  institutionCode?: string;
  institutionName?: string;
  teacherUid: string;
  teacherName: string;
  teacherEmail: string;
  studentTargetCount?: number; // e.g. 25
  createdAt?: any;
  updatedAt?: any;
}

export interface WeekRecord {
  weekId: string;
  weekNumber: number;
  year: number;
  weekLabel: string;
  completedStages: number; // 0 to 14
  totalMinutes: number; // completedStages * 30
  stageTimestamps: {
    stage: number;
    timestamp: number;
    addedAt: string;
  }[];
  notes?: string;
  updatedAt?: any;
}

export interface StageDefinition {
  stageNumber: number; // 1 to 14
  durationMinutes: number; // 30
  totalMinutesAtStage: number; // 30, 60, 90 ... 420
  label: string; // "30 dk", "1 sa", "1.5 sa"...
  category: 'safe' | 'moderate' | 'warning' | 'critical';
  categoryLabel: string;
  // Gradient / theme colors
  bgClass: string;
  borderClass: string;
  textClass: string;
  activeBg: string;
  glowColor: string;
  hexColor: string;
}

export interface AcademicWeekConfig {
  weekNum: number; // 1 to 35
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string; // e.g. "7 - 13 Eyl"
  isHoliday: boolean; // true if this week is a holiday / vacation
  holidayName?: string; // e.g. "1. Ara Tatil", "Yarıyıl Tatili", "2. Ara Tatil"
}

export interface AcademicCalendarConfig {
  schoolStartDate: string; // YYYY-MM-DD
  weeks: AcademicWeekConfig[];
  updatedAt?: any;
  updatedBy?: string;
}

export interface InAppMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderRole: 'admin' | 'teacher';
  targetType: 'all' | 'class' | 'student';
  targetClassId?: string;
  targetClassName?: string;
  targetStudentUid?: string;
  targetStudentName?: string;
  title: string;
  content: string;
  weekNum?: number;
  createdAt: any;
  readBy?: string[]; // uids of users who marked this as read
}
