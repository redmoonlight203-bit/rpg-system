import type {ButtonHTMLAttributes} from 'react';
import {LoaderCircle} from 'lucide-react';
import {cn} from './cn';
const variants={primary:'bg-gold text-ink border-gold enabled:hover:bg-amber-400',secondary:'bg-transparent border-gold text-gold-soft enabled:hover:bg-ember',ghost:'bg-transparent border-transparent text-text-muted enabled:hover:text-text',destructive:'bg-crimson border-crimson text-white enabled:hover:bg-red-600'};
export function Button({variant='primary',loading=false,loadingText='Guardando…',className,children,disabled,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:keyof typeof variants;loading?:boolean;loadingText?:string}){
 return <button {...props} disabled={disabled||loading} aria-busy={loading||undefined} className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors duration-200 disabled:opacity-45 disabled:cursor-not-allowed',variants[variant],className)}>{loading?<><LoaderCircle size={18} className="animate-spin" aria-hidden="true"/>{loadingText}</>:children}</button>;
}
