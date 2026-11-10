import type {HTMLAttributes,ReactNode} from 'react';
import {cn} from './cn';
export function Panel({title,actions,selected=false,interactive=false,className,children,...props}:Omit<HTMLAttributes<HTMLElement>,'title'>&{title?:ReactNode;actions?:ReactNode;selected?:boolean;interactive?:boolean}){
return <section {...props} data-interactive={interactive} className={cn('kr-panel p-4 md:p-6',selected&&'border-line-strong glow-gold',className)}>{(title||actions)&&<header className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-xl font-semibold text-gold-soft">{title}</h2>{actions}</header>}{children}</section>;}
