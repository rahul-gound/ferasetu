import { ArrowRight, Sparkles } from 'lucide-react';
import { AI_WORKFLOWS } from '../../content/strategy';

export default function AIWorkflowStrip() {
  return (
    <div className='grid gap-4 md:grid-cols-3'>
      {AI_WORKFLOWS.map((workflow) => (
        <article
          key={workflow.title}
          className='rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/20'
        >
          <div className='mb-4 flex items-center justify-between gap-3'>
            <span className='flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300'>
              <Sparkles size={18} />
            </span>
            <ArrowRight size={16} className='text-slate-700' aria-hidden='true' />
          </div>
          <h3 className='mb-2 text-sm font-bold text-white'>{workflow.title}</h3>
          <p className='mb-3 text-xs font-semibold text-blue-300'>Ask: {workflow.prompt}</p>
          <p className='text-xs leading-relaxed text-slate-400'>{workflow.outcome}</p>
        </article>
      ))}
    </div>
  );
}
