import Image from "next/image";
export default function LogoYugen({size=88, className="", preload=false}:{size?:number;className?:string;preload?:boolean}) {
 return <Image src="/brand/yugen-kuroi.png" alt="YUGEN: Kuroi, gato demoníaco de ojos rojos con dados de rol" width={size} height={size} sizes={`${size}px`} preload={preload} className={`yugen-logo ${className}`}/>;
}
