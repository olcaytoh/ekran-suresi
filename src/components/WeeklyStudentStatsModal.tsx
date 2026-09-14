import React, { useState } from 'react';
import { AcademicWeekConfig, UserProfile } from '../types';
import { getStageCategory } from '../lib/stagesData';
import { formatMinutes } from '../lib/weekUtils';
import {
  X,
  Users,
  Search,
  Sparkles,
  Award,
  Calendar,
  Clock,
  Palmtree,
  ShieldCheck,
  AlertTriangle,
  Flame,
} from 'lucide-react';

interface WeeklyStudentStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekConfig: AcademicWeekConfig;
  students: UserProfile[];
  isActiveWeek?: boolean;
  activeWeekNumber?: number;
  classNameTitle?: string;
}

export const WeeklyStudentStatsModal: React.FC<WeeklyStudentStatsModalProps> = ({
  isOpen,
  onClose,
  weekConfig,
  students,
  isActiveWeek = false,
  activeWeekNumber = 1,
  classNameTitle = 'Sınıf Detayı',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'critical' | 'warning' | 'moderate' | 'safe'>('all');

  if (!isOpen) return null;

  const isFuture = weekConfig.weekNum > activeWeekNumber;
  const isHoliday = !!weekConfig.isHoliday;

  // Sadece öğrencileri filtrele (öğretmenler hariç)
  const studentList = students.filter(
    (u) => u.role !== 'admin' && u.role !== 'teacher' && u.userType !== 'teacher'
  );

  // Öğrenci verilerini haftalık simülasyon/gerçek duruma göre eşleştir
  const studentStats = studentList.map((st, idx) => {
    let stage = 0;
    if (isActiveWeek) {
      stage = st.currentWeekStage || 0;
    } else if (isFuture || isHoliday) {
      stage = 0;
    } else {
      // Geçmiş hafta simülasyonu (öğrencinin id'sine veya indeksine göre deterministik geçmiş)
      const pseudoHash = (st.uid.charCodeAt(0) + idx * 7 + weekConfig.weekNum * 3) % 15;
      stage = Math.min(14, Math.max(0, pseudoHash));
    }

    const minutes = stage * 30;
    const category = getStageCategory(stage);

    return {
      uid: st.uid,
      studentName: st.studentName || st.displayName || `Öğrenci #${idx + 1}`,
      parentName: st.parentName || (st.displayName !== st.studentName ? st.displayName : 'Veli'),
      className: st.className,
      stage,
      minutes,
      category,
      formattedTime: formatMinutes(minutes),
    };
  });

  const totalStudents = studentStats.length;
  const criticalCount = studentStats.filter((s) => s.stage >= 14).length;
  const warningCount = studentStats.filter((s) => s.stage >= 11 && s.stage <= 13).length;
  const moderateCount = studentStats.filter((s) => s.stage >= 8 && s.stage <= 10).length;
  const safeCount = studentStats.filter((s) => s.stage <= 7).length;

  const totalMinutes = studentStats.reduce((acc, s) => acc + s.minutes, 0);
  const avgMinutes = totalStudents > 0 ? Math.round(totalMinutes / totalStudents) : 0;
  const avgStage = Math.min(14, Math.max(0, Math.round(avgMinutes / 30)));

  // Filtreleme
  const filteredStudents = studentStats.filter((s) => {
    const matchName =
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parentName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchName) return false;

    if (filterCategory === 'critical') return s.stage >= 14;
    if (filterCategory === 'warning') return s.stage >= 11 && s.stage <= 13;
    if (filterCategory === 'moderate') return s.stage >= 8 && s.stage <= 10;
    if (filterCategory === 'safe') return s.stage <= 7;
    return true;
  });

  // Süreye göre sırala (en çok kullanan en üstte)
  filteredStudents.sort((a, b) => b.minutes - a.minutes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Modal Başlık Çubuğu */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-black text-base shadow-xs">
              {weekConfig.weekNum}.H
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {weekConfig.weekNum}. Hafta Öğrenci İstatistikleri
                </h3>
                {isActiveWeek ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                    Aktif Hafta
                  </span>
                ) : isHoliday ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                    <Palmtree className="w-3 h-3" />
                    Tatil
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    Geçmiş Kayıt
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {classNameTitle} • {weekConfig.label} ({weekConfig.startDate} - {weekConfig.endDate})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tatil Haftası Bildirimi */}
        {isHoliday && (
          <div className="p-4 bg-purple-50 border-b border-purple-200 text-purple-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-200 text-purple-700 flex items-center justify-center flex-shrink-0">
              <Palmtree className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-purple-950">
                {weekConfig.holidayName || 'Tatil Haftası'}
              </h4>
              <p className="text-xs text-purple-700 mt-0.5">
                Okullar tatilde olduğu için bu haftada sınıf ekran kısıtlaması uygulanmamaktadır.
              </p>
            </div>
          </div>
        )}

        {/* Özet İstatistik Çubuğu (4 Renk Dağılımı ve Sınıf Ortalaması) */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-400">Sınıf Ortalaması</div>
            <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
              {avgMinutes} dk
            </div>
            <div className="text-[9px] font-bold text-indigo-600">{avgStage}. Kademe</div>
          </div>

          <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-emerald-200 shadow-2xs">
            <div className="text-[10px] font-bold text-emerald-600">Yeşil Bölge (1-7)</div>
            <div className="text-sm sm:text-base font-black text-emerald-700 mt-0.5">
              {safeCount} Öğrenci
            </div>
            <div className="text-[9px] font-bold text-slate-400">Güvenli Düzey</div>
          </div>

          <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-yellow-200 shadow-2xs">
            <div className="text-[10px] font-bold text-amber-600">Sarı & Turuncu</div>
            <div className="text-sm sm:text-base font-black text-amber-700 mt-0.5">
              {moderateCount + warningCount} Öğrenci
            </div>
            <div className="text-[9px] font-bold text-slate-400">Dengeli / Dikkat</div>
          </div>

          <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-rose-200 shadow-2xs">
            <div className="text-[10px] font-bold text-rose-600">Kırmızı Sınır (14)</div>
            <div className="text-sm sm:text-base font-black text-rose-700 mt-0.5">
              {criticalCount} Öğrenci
            </div>
            <div className="text-[9px] font-bold text-rose-500">Maksimum Sınır</div>
          </div>
        </div>

        {/* Arama ve Kategori Filtresi */}
        <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Öğrenci veya veli adına göre ara..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-black cursor-pointer transition-all active:scale-95 border ${
                filterCategory === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              Tümü ({studentStats.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('safe')}
              className={`px-2.5 py-1 rounded-full text-xs font-black cursor-pointer transition-all active:scale-95 border ${
                filterCategory === 'safe'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              Yeşil ({safeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('critical')}
              className={`px-2.5 py-1 rounded-full text-xs font-black cursor-pointer transition-all active:scale-95 border ${
                filterCategory === 'critical'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              Kırmızı ({criticalCount})
            </button>
          </div>
        </div>

        {/* Öğrenci Listesi */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">
                {searchQuery ? 'Aramanıza uygun öğrenci kaydı bulunamadı.' : 'Bu hafta için kayıtlı veri yok.'}
              </p>
            </div>
          ) : (
            filteredStudents.map((item, i) => {
              const isRed = item.stage >= 14;
              const isOrange = item.stage >= 11 && item.stage <= 13;
              const isYellow = item.stage >= 8 && item.stage <= 10;

              let badgeClass = 'bg-emerald-500 text-white';
              if (isRed) badgeClass = 'bg-rose-600 text-white';
              else if (isOrange) badgeClass = 'bg-orange-500 text-white';
              else if (isYellow) badgeClass = 'bg-amber-500 text-slate-950 font-black';

              return (
                <div
                  key={item.uid}
                  className="bg-slate-50 hover:bg-slate-100/80 transition-colors rounded-2xl p-2.5 sm:p-3 border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                          {item.studentName}
                        </span>
                        {item.className && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 leading-none">
                            {item.className}
                          </span>
                        )}
                        <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-md leading-none ${badgeClass}`}>
                          {item.category.name}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 truncate mt-0.5">
                        Veli: <span className="text-slate-600">{item.parentName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs sm:text-sm font-black text-slate-900">
                      {item.minutes} dk
                    </div>
                    <div className="text-[9.5px] font-bold text-slate-500">
                      {item.stage}. Kademe
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Alt Kapatma Çubuğu */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Toplam {filteredStudents.length} öğrenci listelendi
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-3d-cyan px-5 py-2 rounded-2xl text-xs font-black cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
