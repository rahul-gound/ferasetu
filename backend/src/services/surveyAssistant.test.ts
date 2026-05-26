import { buildLocalAssistantResponse, buildSurveySummary } from './surveyAssistant';

describe('survey assistant fallback', () => {
  it('asks the next unanswered question', () => {
    const result = buildLocalAssistantResponse(
      [{ questionId: 'usage_frequency', answer: 'Daily' }],
      'Daily'
    );
    expect(result.done).toBe(false);
    expect(result.nextQuestion?.id).toBe('main_goal');
  });

  it('builds structured summary with urgency and willingness to pay', () => {
    const summary = buildSurveySummary(
      [
        { questionId: 'biggest_pain', answer: 'Too many manual steps' },
        { questionId: 'missing_feature', answer: 'Bulk product edit' },
        { questionId: 'urgency', answer: 'high' },
        { questionId: 'willingness_to_pay', answer: 'yes' }
      ],
      'Need faster order updates'
    );

    expect(summary.pain_points).toContain('Too many manual steps');
    expect(summary.feature_requests).toContain('Bulk product edit');
    expect(summary.urgency).toBe('high');
    expect(summary.willingness_to_pay).toBe('yes');
  });
});
