import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Bot, Download, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

interface SurveyQuestion {
  id: string;
  question: string;
}

interface SurveyAnswer {
  questionId: string;
  answer: string;
}

interface SurveySummary {
  pain_points: string[];
  feature_requests: string[];
  urgency: 'high' | 'medium' | 'low';
  willingness_to_pay: 'yes' | 'maybe' | 'no';
  suggested_improvements: string[];
}

interface AssistantMessage {
  role: 'assistant' | 'user';
  text: string;
}

interface SurveySubmission {
  id: string;
  feedback: string;
  contact?: string;
  created_at: string;
}

export default function SurveyFeedbackPage() {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<SurveySubmission[]>([]);
  const [aiMessages, setAiMessages] = useState<AssistantMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [assistantSummary, setAssistantSummary] = useState<SurveySummary | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [questionRes, historyRes] = await Promise.all([
          api.get<{ questions: SurveyQuestion[] }>('/survey/questions'),
          api.get<{ submissions: SurveySubmission[] }>('/survey/submissions')
        ]);
        setQuestions(questionRes.data.questions || []);
        setHistory(historyRes.data.submissions || []);
        const firstQuestion = (questionRes.data.questions || [])[0];
        if (firstQuestion) {
          setAiMessages([{ role: 'assistant', text: firstQuestion.question }]);
          setActiveQuestionId(firstQuestion.id);
        }
      } catch {
        toast.error('Unable to load survey right now');
      }
    };
    load();
  }, []);

  const answerList = useMemo<SurveyAnswer[]>(
    () =>
      Object.entries(answers)
        .filter(([, value]) => value.trim())
        .map(([questionId, answer]) => ({ questionId, answer })),
    [answers]
  );

  const sendAssistantMessage = async (event: FormEvent) => {
    event.preventDefault();
    const text = aiInput.trim();
    if (!text || !activeQuestionId || aiLoading) return;

    const nextAnswers = { ...answers, [activeQuestionId]: text };
    setAnswers(nextAnswers);
    setAiMessages((prev) => [...prev, { role: 'user', text }]);
    setAiInput('');
    setAiLoading(true);

    try {
      const res = await api.post<{
        reply: string;
        done: boolean;
        nextQuestion?: SurveyQuestion;
        summary?: SurveySummary;
      }>('/survey/assistant', {
        answers: Object.entries(nextAnswers).map(([questionId, answer]) => ({ questionId, answer })),
        latestMessage: text
      });

      setAiMessages((prev) => [...prev, { role: 'assistant', text: res.data.reply }]);
      setActiveQuestionId(res.data.done ? null : res.data.nextQuestion?.id || null);
      if (res.data.summary) {
        setAssistantSummary(res.data.summary);
      }
    } catch {
      toast.error('Assistant is unavailable. You can still submit the form below.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (answerList.length < 5) {
      toast.error('Please answer at least 5 survey questions.');
      return;
    }
    if (feedback.trim().length < 5) {
      toast.error('Please share at least a short feedback note.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/survey/submissions', {
        answers: answerList,
        feedback: feedback.trim(),
        contact: contact.trim(),
        summary: assistantSummary
      });
      toast.success('Thanks! Your feedback has been submitted.');
      setFeedback('');
      setContact('');

      const updated = await api.get<{ submissions: SurveySubmission[] }>('/survey/submissions');
      setHistory(updated.data.submissions || []);
    } catch {
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const exportSubmissions = async () => {
    try {
      const res = await api.get<{ csv: string }>('/survey/submissions/export');
      const blob = new Blob([res.data.csv || ''], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'survey-feedback.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not export submissions right now.');
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 24 }}>
      <div style={{ padding: 24, borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h1 style={{ margin: 0, color: '#fff', fontSize: 28 }}>Survey & Feedback</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
          Help us improve FeraSetu while the ₹299 Starter plan is Free (Beta).
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        <form onSubmit={handleSubmit} style={{ padding: 20, borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0' }}>
          <h2 style={{ marginTop: 0 }}>Structured Survey</h2>
          {questions.map((question, index) => (
            <div key={question.id} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>
                {index + 1}. {question.question}
              </label>
              <input
                value={answers[question.id] || ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                placeholder="Type your answer"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
              />
            </div>
          ))}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>Free-text feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="What should we improve first?"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>Optional contact (email/phone)</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="example@shop.com or +91..."
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ border: 0, borderRadius: 10, background: '#0f172a', color: '#fff', padding: '11px 16px', fontWeight: 700, cursor: 'pointer' }}
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>

        <div style={{ padding: 20, borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={18} /> AI Assistant
          </h2>
          <div
            role="log"
            aria-label="AI Assistant conversation"
            style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc', marginBottom: 10 }}
          >
            {aiMessages.map((message, i) => (
              <div key={`${message.role}-${i}`} style={{ marginBottom: 8, textAlign: message.role === 'user' ? 'right' : 'left' }}>
                <span style={{ display: 'inline-block', padding: '8px 10px', borderRadius: 10, background: message.role === 'user' ? '#dbeafe' : '#e2e8f0' }}>
                  {message.text}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={sendAssistantMessage} style={{ display: 'flex', gap: 8 }}>
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              disabled={!activeQuestionId || aiLoading}
              placeholder={activeQuestionId ? 'Type your answer for current question' : 'Assistant completed'}
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
            />
            <button
              type="submit"
              disabled={!activeQuestionId || aiLoading}
              style={{ border: 0, borderRadius: 10, background: '#0f172a', color: '#fff', width: 40, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
            >
              <Send size={14} />
            </button>
          </form>
          {assistantSummary && (
            <div style={{ marginTop: 12, fontSize: 13, color: '#334155', background: '#f8fafc', borderRadius: 10, padding: 10 }}>
              <b>Assistant Summary:</b>
              <div>Pain points: {assistantSummary.pain_points.join(', ')}</div>
              <div>Feature requests: {assistantSummary.feature_requests.join(', ')}</div>
              <div>Urgency: {assistantSummary.urgency}</div>
              <div>Willingness to pay: {assistantSummary.willingness_to_pay}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: 20, borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Your recent submissions</h3>
          <button onClick={exportSubmissions} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', background: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
        {history.length === 0 ? (
          <p style={{ color: '#64748b' }}>No submissions yet.</p>
        ) : (
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {history.map((item) => (
              <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(item.created_at).toLocaleString('en-IN')}</div>
                <div style={{ marginTop: 4 }}>{item.feedback}</div>
                {item.contact ? <div style={{ marginTop: 4, color: '#334155' }}>Contact: {item.contact}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
