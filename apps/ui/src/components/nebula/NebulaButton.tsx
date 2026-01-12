
export interface NebulaButtonProps {
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  actionId?: string;
  onClick?: () => void;
}

export const NebulaButton = ({ label, variant = "primary", onClick }: NebulaButtonProps) => {
  const baseStyle = "px-4 py-2 rounded font-medium transition-colors";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500",
    secondary: "bg-zinc-700 text-white hover:bg-zinc-600",
    ghost: "bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]}`} onClick={onClick}>
      {label}
    </button>
  );
};
