import React, { useState } from 'react';
import { QuizQuestion } from '../../types';
import { Plus, Edit2, Trash2, RotateCcw, HelpCircle, CheckCircle2 } from 'lucide-react';
import { QuestionEditModal } from '../QuestionEditModal';
import { ConfirmModal } from './ConfirmModal';

interface QuestionsTabProps {
  questions: QuizQuestion[];
  onUpdateQuestions: (questions: QuizQuestion[]) => void;
  onResetQuestions: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const QuestionsTab: React.FC<QuestionsTabProps> = ({
  questions,
  onUpdateQuestions,
  onResetQuestions,
  onShowToast,
}) => {
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  const handleSaveQuestion = (saved: QuizQuestion) => {
    const exists = questions.some((q) => q.id === saved.id);
    let updated: QuizQuestion[];
    if (exists) {
      updated = questions.map((q) => (q.id === saved.id ? saved : q));
      onShowToast('Otázka byla úspěšně upravena.', 'success');
    } else {
      updated = [...questions, saved];
      onShowToast('Nová otázka byla přidána.', 'success');
    }
    onUpdateQuestions(updated);
    setIsModalOpen(false);
    setEditingQuestion(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteQuestionId) return;
    const updated = questions.filter((q) => q.id !== deleteQuestionId);
    onUpdateQuestions(updated);
    setDeleteQuestionId(null);
    onShowToast('Otázka byla odstraněna.', 'info');
  };

  const handleConfirmReset = () => {
    onResetQuestions();
    setResetConfirmOpen(false);
    onShowToast('Otázky byly obnoveny do výchozího stavu.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
        <div>
          <h3 className="text-lg font-bold text-white">Otázky kvízu</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Otázky a možnosti odpovědí pro účastníky soutěže. Celkem {questions.length} otázek.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Výchozí otázky
          </button>
          <button
            onClick={() => {
              setEditingQuestion(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#e5a995] to-[#d68c74] text-slate-950 shadow-md shadow-orange-950/20 hover:opacity-95 transition-opacity cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Přidat otázku
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <span className="w-7 h-7 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-xs font-bold text-[#e5a995] shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="space-y-2 min-w-0">
                <p className="font-semibold text-white text-sm leading-snug">{q.question}</p>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <span
                      key={opt.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${
                        opt.isCorrect
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold'
                          : 'bg-white/5 border border-white/10 text-slate-400'
                      }`}
                    >
                      {opt.isCorrect && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {opt.text}
                    </span>
                  ))}
                </div>
                {q.explanation && (
                  <p className="text-xs text-slate-400 italic">Vysvětlení: {q.explanation}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 self-end md:self-center">
              <button
                onClick={() => {
                  setEditingQuestion(q);
                  setIsModalOpen(true);
                }}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Upravit otázku"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteQuestionId(q.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Smazat otázku"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Question Modal */}
      <QuestionEditModal
        isOpen={isModalOpen}
        question={editingQuestion}
        onSave={handleSaveQuestion}
        onClose={() => {
          setIsModalOpen(false);
          setEditingQuestion(null);
        }}
      />

      {/* Reset Confirmation */}
      <ConfirmModal
        isOpen={resetConfirmOpen}
        title="Obnovit výchozí otázky?"
        message="Všechny otázky kvízu budou vráceny na původní sadu otázek o Google Pixel."
        confirmLabel="Obnovit sadu"
        variant="warning"
        onConfirm={handleConfirmReset}
        onCancel={() => setResetConfirmOpen(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteQuestionId)}
        title="Smazat tuto otázku?"
        message="Opravdu si přejete tuto otázku odstranit z kvízu?"
        confirmLabel="Smazat"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteQuestionId(null)}
      />
    </div>
  );
};
