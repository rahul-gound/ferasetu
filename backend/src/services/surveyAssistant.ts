export interface SurveyQuestion {
  id: string;
  question: string;
}

export interface SurveyAnswer {
  questionId: string;
  answer: string;
}

export interface SurveySummary {
  pain_points: string[];
  feature_requests: string[];
  urgency: 'high' | 'medium' | 'low';
  willingness_to_pay: 'yes' | 'maybe' | 'no';
  suggested_improvements: string[];
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  { id: 'usage_frequency', question: 'How often do you use FeraSetu in a typical week?' },
  { id: 'main_goal', question: 'What is your main goal with FeraSetu right now?' },
  { id: 'biggest_pain', question: 'What is the biggest pain point you face while using the product?' },
  { id: 'missing_feature', question: 'Which feature do you feel is missing today?' },
  { id: 'upgrade_reason', question: 'What would make you upgrade to a paid plan later?' },
  { id: 'urgency', question: 'How urgent are these improvements for your business? (high/medium/low)' },
  { id: 'willingness_to_pay', question: 'After beta, would you pay for this plan if your key needs are solved? (yes/maybe/no)' }
];

export function buildSurveySummary(answers: SurveyAnswer[], feedback: string): SurveySummary {
  const answerMap = new Map(answers.map((item) => [item.questionId, item.answer]));
  const pain = (answerMap.get('biggest_pain') || feedback || '').trim();
  const feature = (answerMap.get('missing_feature') || '').trim();
  const urgencyRaw = (answerMap.get('urgency') || '').toLowerCase();
  const willingnessRaw = (answerMap.get('willingness_to_pay') || '').toLowerCase();
  const upgrades = (answerMap.get('upgrade_reason') || '').trim();

  const urgency: SurveySummary['urgency'] = urgencyRaw.includes('high')
    ? 'high'
    : urgencyRaw.includes('low')
      ? 'low'
      : 'medium';

  const willingness_to_pay: SurveySummary['willingness_to_pay'] = willingnessRaw.includes('yes')
    ? 'yes'
    : willingnessRaw.includes('no')
      ? 'no'
      : 'maybe';

  const suggested_improvements = [feature, upgrades, feedback]
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 3);

  return {
    pain_points: pain ? [pain] : ['No explicit pain point shared'],
    feature_requests: feature ? [feature] : ['No feature request shared'],
    urgency,
    willingness_to_pay,
    suggested_improvements
  };
}

export function buildLocalAssistantResponse(answers: SurveyAnswer[], latestMessage: string) {
  const answeredIds = new Set(answers.map((item) => item.questionId));
  const nextQuestion = SURVEY_QUESTIONS.find((q) => !answeredIds.has(q.id));

  if (!nextQuestion) {
    return {
      mode: 'local' as const,
      done: true,
      reply: `Thanks for sharing. ${latestMessage ? 'I captured your last response as well.' : ''} I have enough details to summarize your feedback.`,
    };
  }

  const prefix = latestMessage ? 'Thanks, noted. ' : 'Hi! ';
  return {
    mode: 'local' as const,
    done: false,
    nextQuestion,
    reply: `${prefix}${nextQuestion.question}`
  };
}
