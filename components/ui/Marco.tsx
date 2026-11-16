import type {HTMLAttributes} from 'react';
import {cn} from './cn';
/** Panel de pergamino: borde de oro fino con esquinas ornamentales. */
export function Marco({className,children,...props}:HTMLAttributes<HTMLElement>){
 return <section {...props} className={cn('yg-marco',className)}>{children}</section>;
}
