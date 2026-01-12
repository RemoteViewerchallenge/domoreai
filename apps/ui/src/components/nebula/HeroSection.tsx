
export const HeroSection = ({ title, subtitle }: { title?: string, subtitle?: string }) => {
  return (
    <div className="py-12 px-4 text-center bg-zinc-900 rounded-xl my-4">
      <h1 className="text-4xl font-bold text-white mb-4">{title || "Hero Title"}</h1>
      <p className="text-xl text-zinc-400">{subtitle || "Subtitle goes here"}</p>
    </div>
  );
};
