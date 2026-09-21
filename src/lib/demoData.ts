import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentWeekInfo } from './weekUtils';
import { ClassroomInfo, UserProfile } from '../types';

export const DEMO_INSTITUTION = {
  id: 'demo-institution-1',
  name: 'AKÇAKOCA İLKOKULU',
  code: 'KRM-AKC1',
  adminCode: 'ADM-AKC1',
};

export interface DemoStudentDef {
  id: string;
  studentName: string;
  parentName: string;
  stage: number;
  minutes: number;
}

export const DEMO_3_CLASSES: Array<{
  id: string;
  code: string;
  name: string;
  teacherUid: string;
  teacherName: string;
  teacherEmail: string;
  institutionId: string;
  institutionCode: string;
  institutionName: string;
  studentTargetCount: number;
  students: DemoStudentDef[];
}> = [
  {
    id: 'demo-class-1a',
    code: 'AKC-1A',
    name: '1-A Sınıfı',
    teacherUid: 'teacher_demo_olcayto',
    teacherName: 'Olcayto Öğretmen',
    teacherEmail: 'olcaytoh@gmail.com',
    institutionId: DEMO_INSTITUTION.id,
    institutionCode: DEMO_INSTITUTION.code,
    institutionName: DEMO_INSTITUTION.name,
    studentTargetCount: 10,
    students: [
      { id: 'demo_1a_std_01', studentName: 'Ali Yılmaz', parentName: 'Fatma Yılmaz', stage: 2, minutes: 60 },
      { id: 'demo_1a_std_02', studentName: 'Ayşe Kaya', parentName: 'Mehmet Kaya', stage: 4, minutes: 120 },
      { id: 'demo_1a_std_03', studentName: 'Can Demir', parentName: 'Selin Demir', stage: 1, minutes: 30 },
      { id: 'demo_1a_std_04', studentName: 'Zeynep Çelik', parentName: 'Ahmet Çelik', stage: 8, minutes: 240 },
      { id: 'demo_1a_std_05', studentName: 'Emirhan Şahin', parentName: 'Derya Şahin', stage: 11, minutes: 330 },
      { id: 'demo_1a_std_06', studentName: 'Elif Yıldız', parentName: 'Hakan Yıldız', stage: 3, minutes: 90 },
      { id: 'demo_1a_std_07', studentName: 'Burak Öztürk', parentName: 'Gül Öztürk', stage: 6, minutes: 180 },
      { id: 'demo_1a_std_08', studentName: 'Kerem Kılıç', parentName: 'Esra Kılıç', stage: 14, minutes: 420 },
      { id: 'demo_1a_std_09', studentName: 'Tuana Aydın', parentName: 'Murat Aydın', stage: 5, minutes: 150 },
      { id: 'demo_1a_std_10', studentName: 'Metehan Koçak', parentName: 'Ebru Koçak', stage: 9, minutes: 270 },
    ],
  },
  {
    id: 'demo-class-2b',
    code: 'AKC-2B',
    name: '2-B Sınıfı',
    teacherUid: 'teacher_demo_zehra',
    teacherName: 'Zehra Öğretmen',
    teacherEmail: 'zehra.ogretmen@akcakocailkokulu.k12.tr',
    institutionId: DEMO_INSTITUTION.id,
    institutionCode: DEMO_INSTITUTION.code,
    institutionName: DEMO_INSTITUTION.name,
    studentTargetCount: 10,
    students: [
      { id: 'demo_2b_std_01', studentName: 'Deniz Arslan', parentName: 'Banu Arslan', stage: 5, minutes: 150 },
      { id: 'demo_2b_std_02', studentName: 'Ece Doğan', parentName: 'Kerem Doğan', stage: 7, minutes: 210 },
      { id: 'demo_2b_std_03', studentName: 'Mira Koç', parentName: 'Serkan Koç', stage: 2, minutes: 60 },
      { id: 'demo_2b_std_04', studentName: 'Mert Aslan', parentName: 'Tülay Aslan', stage: 9, minutes: 270 },
      { id: 'demo_2b_std_05', studentName: 'Nilüfer Kurt', parentName: 'İsmail Kurt', stage: 3, minutes: 90 },
      { id: 'demo_2b_std_06', studentName: 'Oğuzhan Polat', parentName: 'Nuran Polat', stage: 10, minutes: 300 },
      { id: 'demo_2b_std_07', studentName: 'Selin Aksoy', parentName: 'Bülent Aksoy', stage: 4, minutes: 120 },
      { id: 'demo_2b_std_08', studentName: 'Umut Özkan', parentName: 'Zehra Özkan', stage: 12, minutes: 360 },
      { id: 'demo_2b_std_09', studentName: 'Beren Vural', parentName: 'Hasan Vural', stage: 1, minutes: 30 },
      { id: 'demo_2b_std_10', studentName: 'Arda Çetin', parentName: 'Filiz Çetin', stage: 8, minutes: 240 },
    ],
  },
  {
    id: 'demo-class-3c',
    code: 'AKC-3C',
    name: '3-C Sınıfı',
    teacherUid: 'teacher_demo_mustafa',
    teacherName: 'Mustafa Öğretmen',
    teacherEmail: 'mustafa.ogretmen@akcakocailkokulu.k12.tr',
    institutionId: DEMO_INSTITUTION.id,
    institutionCode: DEMO_INSTITUTION.code,
    institutionName: DEMO_INSTITUTION.name,
    studentTargetCount: 10,
    students: [
      { id: 'demo_3c_std_01', studentName: 'Yağmur Tekin', parentName: 'Orhan Tekin', stage: 6, minutes: 180 },
      { id: 'demo_3c_std_02', studentName: 'Yiğit Korkmaz', parentName: 'Semra Korkmaz', stage: 8, minutes: 240 },
      { id: 'demo_3c_std_03', studentName: 'Defne Güneş', parentName: 'Cem Güneş', stage: 2, minutes: 60 },
      { id: 'demo_3c_std_04', studentName: 'Kaan Şen', parentName: 'Aylin Şen', stage: 5, minutes: 150 },
      { id: 'demo_3c_std_05', studentName: 'Melis Erdem', parentName: 'Volkan Erdem', stage: 3, minutes: 90 },
      { id: 'demo_3c_std_06', studentName: 'Ömer Bulut', parentName: 'Hülya Bulut', stage: 7, minutes: 210 },
      { id: 'demo_3c_std_07', studentName: 'Rüzgar Yaman', parentName: 'Fatih Yaman', stage: 11, minutes: 330 },
      { id: 'demo_3c_std_08', studentName: 'Sude Yalçın', parentName: 'Sevgi Yalçın', stage: 14, minutes: 420 },
      { id: 'demo_3c_std_09', studentName: 'Barış Karaca', parentName: 'Dilek Karaca', stage: 4, minutes: 120 },
      { id: 'demo_3c_std_10', studentName: 'Duru Acar', parentName: 'Tolga Acar', stage: 10, minutes: 300 },
    ],
  },
];

// 30 öğrencinin tüm listesi
export const ALL_DEMO_30_STUDENTS: Array<DemoStudentDef & { classId: string; className: string; classCode: string }> =
  DEMO_3_CLASSES.flatMap((cls) =>
    cls.students.map((st) => ({
      ...st,
      classId: cls.id,
      className: cls.name,
      classCode: cls.code,
    }))
  );

export const ALL_DEMO_24_STUDENTS = ALL_DEMO_30_STUDENTS;
export const DEMO_25_STUDENTS = ALL_DEMO_30_STUDENTS;

/**
 * 3 sınıf ve her sınıfta 10 öğrenci (toplam 30 öğrenci) Firestore'a kaydeder
 */
export async function seed3ClassesAnd30Students(): Promise<void> {
  const { weekId } = getCurrentWeekInfo();

  for (const cls of DEMO_3_CLASSES) {
    // Sınıfı kaydet
    const classRef = doc(db, 'classrooms', cls.id);
    await setDoc(classRef, {
      id: cls.id,
      code: cls.code,
      name: cls.name,
      teacherUid: cls.teacherUid,
      teacherName: cls.teacherName,
      teacherEmail: cls.teacherEmail,
      institutionId: cls.institutionId,
      institutionCode: cls.institutionCode,
      institutionName: cls.institutionName,
      studentTargetCount: 10,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 10 öğrenciyi kaydet
    for (const std of cls.students) {
      const userRef = doc(db, 'users', std.id);
      await setDoc(userRef, {
        uid: std.id,
        email: `${std.id}@akcakocailkokulu.k12.tr`,
        displayName: `${std.studentName} (${std.parentName})`,
        studentName: std.studentName,
        parentName: std.parentName,
        role: 'parent',
        userType: 'parent',
        institutionId: cls.institutionId,
        institutionCode: cls.institutionCode,
        institutionName: cls.institutionName,
        classId: cls.id,
        classCode: cls.code,
        className: cls.name,
        currentWeekId: weekId,
        currentWeekStage: std.stage,
        currentWeekMinutes: std.minutes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }
}

export const seed3ClassesAnd24Students = seed3ClassesAnd30Students;

export async function seed25ClassroomStudents(classId: string, classCode: string, className: string): Promise<void> {
  // Belirtilen sınıfın 8 öğrencisini kaydet
  const targetClass = DEMO_3_CLASSES.find((c) => c.id === classId) || DEMO_3_CLASSES[0];
  const { weekId } = getCurrentWeekInfo();

  for (const std of targetClass.students) {
    const userRef = doc(db, 'users', std.id);
    await setDoc(userRef, {
      uid: std.id,
      email: `${std.id}@akcakocailkokulu.k12.tr`,
      displayName: `${std.studentName} (${std.parentName})`,
      studentName: std.studentName,
      parentName: std.parentName,
      role: 'parent',
      userType: 'parent',
      institutionId: DEMO_INSTITUTION.id,
      institutionCode: DEMO_INSTITUTION.code,
      institutionName: DEMO_INSTITUTION.name,
      classId: classId,
      classCode: classCode,
      className: className,
      currentWeekId: weekId,
      currentWeekStage: std.stage,
      currentWeekMinutes: std.minutes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function remove25ClassroomStudents(): Promise<void> {
  for (const std of ALL_DEMO_24_STUDENTS) {
    const userRef = doc(db, 'users', std.id);
    await deleteDoc(userRef);
  }
}
