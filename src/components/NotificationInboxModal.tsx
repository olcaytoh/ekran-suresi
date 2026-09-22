import React, { useState } from 'react';
import { Bell, X, Check, Trash2, Calendar, MessageSquare, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { InAppMessage } from '../types';
import { markInAppMessageRead, deleteInAppMessage } from '../lib/firebase';
import { formatTimeAgo } from '../lib/weekUtils';

interface NotificationInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: InAppMessage[];
  currentUserId?: string;
  isStaffOrAdmin?: boolean;
}

export const NotificationInboxModal: React.FC<NotificationInboxModalProps> = ({
  isOpen,
  onClose,
  messages,
  currentUserId,
  isStaffOrAdmin = false,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleExpand = async (msg: InAppMessage) => {
    const isExpanding = expandedId !== msg.id;
    setExpandedId(isExpanding ? msg.id : null);
    if (isExpanding && currentUserId) {
      await markInAppMessageRead(msg.id, currentUserId);
    }
  };

  const handleDelete = async (msgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteInAppMessage(msgId);
    } catch (err) {
      console.error('Delete message error:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col my-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Gelen Kutusu &amp; Mesajlar
              </h3>
              <p className="text-[11px] text-slate-500">
                Okul yönetimi ve öğretmeniniz tarafından gönderilen bilgilendirmeler.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {messages.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-sm font-bold text-slate-700">Henüz bir mesaj bulunmuyor</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Okulunuz veya öğretmeniniz bilgilendirme yaptığında burada görebilirsiniz.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isRead = currentUserId && msg.readBy?.includes(currentUserId);
              const isExpanded = expandedId === msg.id;

              return (
                <div
                  key={msg.id}
                  onClick={() => handleToggleExpand(msg)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    !isRead
                      ? 'bg-indigo-50/70 border-indigo-200 shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" />
                        )}
                        <span className="text-xs font-black text-slate-900 leading-snug">
                          {msg.title}
                        </span>
                        {msg.weekNum && (
                          <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            {msg.weekNum}. Hafta
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                        <span>Gönderen: <strong className="text-slate-700">{msg.senderName}</strong></span>
                        {msg.createdAt && <span>• {formatTimeAgo(msg.createdAt)}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isStaffOrAdmin && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(msg.id, e)}
                          title="Mesajı Sil"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="p-1 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Mesaj İçeriği */}
                  {isExpanded ? (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                      {msg.content}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-600 line-clamp-1 font-medium">
                      {msg.content}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Toplam {messages.length} mesaj</span>
          <button
            type="button"
            onClick={onClose}
            className="btn-3d-white py-1.5 px-4 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
