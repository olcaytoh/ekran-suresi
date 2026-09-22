import React, { useState } from 'react';
import { Send, X, Check, Bell, MessageSquare, Sparkles, User, School } from 'lucide-react';
import { sendInAppMessage } from '../lib/firebase';
import { UserProfile, ClassroomInfo } from '../types';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderProfile?: UserProfile | null;
  targetStudent?: UserProfile | null;
  targetClassroom?: ClassroomInfo | null;
  defaultTitle?: string;
  defaultContent?: string;
  defaultWeekNum?: number;
  classrooms?: ClassroomInfo[];
  students?: UserProfile[];
}

export const SendMessageModal: React.FC<SendMessageModalProps> = ({
  isOpen,
  onClose,
  senderProfile,
  targetStudent,
  targetClassroom,
  defaultTitle = '',
  defaultContent = '',
  defaultWeekNum,
  classrooms = [],
  students = [],
}) => {
  const [title, setTitle] = useState(defaultTitle || 'Ekran Süresi Bilgilendirmesi');
  const [content, setContent] = useState(defaultContent || '');
  const [targetType, setTargetType] = useState<'student' | 'class' | 'all'>(
    targetStudent ? 'student' : targetClassroom ? 'class' : 'all'
  );
  const [selectedStudentUid, setSelectedStudentUid] = useState<string>(targetStudent?.uid || '');
  const [selectedClassId, setSelectedClassId] = useState<string>(
    targetClassroom?.id || targetStudent?.classId || ''
  );
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Lütfen bir mesaj metni yazınız.');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const senderName =
        senderProfile?.displayName ||
        (senderProfile?.role === 'admin' ? 'Okul Yönetimi' : 'Sınıf Öğretmeni');
      const senderRole = senderProfile?.role === 'admin' ? 'admin' : 'teacher';

      let targetStudentName: string | undefined;
      let targetClassName: string | undefined;

      if (targetType === 'student') {
        const foundStudent = students.find((s) => s.uid === (selectedStudentUid || targetStudent?.uid));
        targetStudentName =
          foundStudent?.studentName ||
          foundStudent?.displayName ||
          targetStudent?.studentName ||
          targetStudent?.displayName;
      } else if (targetType === 'class') {
        const foundClass = classrooms.find((c) => c.id === (selectedClassId || targetClassroom?.id));
        targetClassName = foundClass?.name || targetClassroom?.name;
      }

      await sendInAppMessage({
        senderUid: senderProfile?.uid || 'admin_uid',
        senderName,
        senderRole,
        targetType,
        targetClassId: targetType === 'class' ? (selectedClassId || targetClassroom?.id) : undefined,
        targetClassName: targetType === 'class' ? targetClassName : undefined,
        targetStudentUid: targetType === 'student' ? (selectedStudentUid || targetStudent?.uid) : undefined,
        targetStudentName: targetType === 'student' ? targetStudentName : undefined,
        title: title.trim() || 'Bilgilendirme Mesajı',
        content: content.trim(),
        weekNum: defaultWeekNum,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Send message error:', err);
      setError(err.message || 'Mesaj iletilirken bir hata oluştu.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) onClose();
      }}
    >
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 my-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Uygulama İçi Mesaj Gönder
              </h3>
              <p className="text-[11px] text-slate-500">
                Velilere doğrudan uygulama bildirim kutusuna düşecek mesaj iletin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-900">Mesaj Başarıyla İletildi!</h4>
              <p className="text-xs text-slate-500">
                İlgili velilerin uygulama ekranında bildirim olarak görüntülenecektir.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-3.5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
                {error}
              </div>
            )}

            {/* Hedef Kitle Seçimi (Hedef önceden verilmemişse) */}
            {!targetStudent && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Hedef Alıcı:</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTargetType('all')}
                    className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                      targetType === 'all'
                        ? 'bg-white text-indigo-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tüm Okul
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('class')}
                    className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                      targetType === 'class'
                        ? 'bg-white text-indigo-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sınıf
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('student')}
                    className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                      targetType === 'student'
                        ? 'bg-white text-indigo-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Öğrenci / Veli
                  </button>
                </div>
              </div>
            )}

            {/* Eğer tek bir öğrenci hedeflenmişse göster */}
            {targetStudent && (
              <div className="p-2.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="text-[10px] text-indigo-600 font-bold block uppercase">Alıcı Veli &amp; Öğrenci</span>
                    <strong className="text-slate-900">{targetStudent.studentName || targetStudent.displayName}</strong>
                    {targetStudent.parentName && <span className="text-slate-500 font-normal"> ({targetStudent.parentName})</span>}
                  </div>
                </div>
                {defaultWeekNum && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {defaultWeekNum}. Hafta
                  </span>
                )}
              </div>
            )}

            {/* Sınıf seçimi (targetType === 'class' ise) */}
            {!targetStudent && targetType === 'class' && classrooms.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Hedef Sınıf:</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Sınıf Seçiniz</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Öğrenci seçimi (targetType === 'student' ve önceden verilmemişse) */}
            {!targetStudent && targetType === 'student' && students.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Hedef Öğrenci / Veli:</label>
                <select
                  value={selectedStudentUid}
                  onChange={(e) => setSelectedStudentUid(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Öğrenci Seçiniz</option>
                  {students.map((st) => (
                    <option key={st.uid} value={st.uid}>
                      {st.studentName || st.displayName} {st.parentName ? `(${st.parentName})` : ''} - {st.className || ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mesaj Başlığı */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Mesaj Başlığı:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Haftalık Ekran Analizi Bilgilendirmesi"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              />
            </div>

            {/* Mesaj İçeriği */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Mesaj Metni:</label>
                <span className="text-[10px] text-slate-400 font-mono">{content.length} karakter</span>
              </div>
              <textarea
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Veliye iletmek istediğiniz mesajı buraya yazınız..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white leading-relaxed resize-none font-medium text-slate-800"
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="btn-3d-white py-2 px-3.5 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={sending || !content.trim()}
                className="btn-3d-indigo py-2 px-4 rounded-xl text-xs font-black text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Gönderiliyor...' : 'Uygulama İçi Gönder'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
