import type {HTMLAttributes} from 'react';
import {cn} from './cn';
const tones={active:'bg-gold/15 border-gold/30 text-gold-soft',success:'bg-emerald-400/15 border-emerald-400/30 text-success-text',pending:'bg-cyan-300/15 border-cyan-300/30 text-cyan-300',danger:'bg-red-400/15 border-red-400/30 text-danger-text'};
export function Badge({tone='active',className,...props}:HTMLAttributes<HTMLSpanElement>&{tone?:keyof typeof tones}){return <span {...props} className={cn('inline-flex rounded-full border px-2.5 py-1 text-[13px] font-semibold',tones[tone],className)}/>;}
