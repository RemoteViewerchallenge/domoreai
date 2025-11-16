import type { LucideProps } from 'lucide-react';
interface IconProps extends LucideProps {
    name: string;
}
declare const Icon: import("react").ForwardRefExoticComponent<Omit<IconProps, "ref"> & import("react").RefAttributes<SVGSVGElement>>;
export { Icon };
