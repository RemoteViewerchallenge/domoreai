declare const Icon: ({ name, ...props }: {
    name: string;
    [key: string]: any;
}) => import("react/jsx-runtime").JSX.Element | null;
export default Icon;
