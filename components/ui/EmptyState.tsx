import type {ReactNode} from 'react';
export function EmptyState({title,description,action}:{title:string;description?:string;action?:ReactNode}){return <div className="space-y-3 py-8 text-center"><h3 className="text-base font-semibold text-gold-soft">{title}</h3>{description&&<p className="mx-auto max-w-prose text-sm text-text-muted">{description}</p>}{action}</div>;}
export function LoadingState({label='Cargando…'}:{label?:string}){return <div role="status" className="space-y-3 p-4"><p className="text-sm text-text-muted">{label}</p><div aria-hidden="true" className="h-16 animate-pulse rounded-xl bg-raised"/></div>;}
export function ErrorState({message,onRetry}:{message:string;onRetry:()=>void}){return <div role="alert" className="space-y-3 rounded-xl border border-red-400/30 p-4"><p className="text-danger-text">{message}</p><Button type="button" variant="secondary" onClick={onRetry}>Reintentar</Button></div>;}
import {Button} from './Button';
