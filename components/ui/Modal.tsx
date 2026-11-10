"use client";
import {useEffect,useId,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
import {Button} from './Button';
export function Modal({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null),id=useId();useEffect(()=>{const dialog=ref.current;if(open&&!dialog?.open)dialog?.showModal();else if(!open&&dialog?.open)dialog.close();},[open]);
 return <dialog ref={ref} className="kr-modal" aria-labelledby={id} onCancel={e=>{e.preventDefault();onClose();}} onClose={onClose}><header className="kr-modal-header"><h2 id={id}>{title}</h2><Button type="button" variant="ghost" aria-label="Cerrar ventana" onClick={onClose}><X size={20}/></Button></header>{children}</dialog>;
}
