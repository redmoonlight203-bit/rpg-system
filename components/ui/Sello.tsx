import type {HTMLAttributes} from 'react';
import {cn} from './cn';
/** Sello de oro: solo para aprobado, victoria o finalizado. */
export function Sello({className,children,...props}:HTMLAttributes<HTMLSpanElement>){
 return <span {...props} className={cn('yg-sello',className)}><span aria-hidden="true">印</span>{children}</span>;
}
