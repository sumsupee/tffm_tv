import { MovieGroup, AppConfig } from "@/types/signage";
import MovieShowing from "./MovieShowing";

export default function MovieCard({ group, config, rowArrayLength }: { group: MovieGroup, config: AppConfig | null, rowArrayLength: number }) {
  return (
    <div 
      className="flex flex-col flex-[1_1_0px] h-full shrink-0 px-2 lg:px-4 items-center justify-start transition-all"
      style={{ 
        maxWidth: `calc((((100vh - 120px - ${(rowArrayLength - 1) * 32}px) / ${rowArrayLength}) - ${80 + (group.showings.length * 55)}px) * 0.666)`
      }}
    >
      <div 
        className="w-full flex flex-col"
        style={{ containerType: 'inline-size' }}
      >
        <div className="relative w-full aspect-[2/3] shadow-lg bg-[#050505] mb-4 border border-white/10 shrink-0 overflow-hidden rounded shadow-black/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={group.posterUrl}
            alt={group.Title}
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://via.placeholder.com/300x450/1f2833/66fcf1?text=No+Poster";
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>

          <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
            <div>
              <h2 
                className="text-white font-bold leading-[1.1] text-shadow drop-shadow-xl"
                style={{ fontSize: "max(1.4rem, 6cqi)" }}
              >
                {group.Title}
              </h2>
              {group.metaInfo && (
                <p 
                  className="font-semibold tracking-wider text-white/90 drop-shadow-md mt-1"
                  style={{ fontSize: "max(12px, 3cqi)" }}
                >
                  {group.metaInfo}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
               {group.Rating && (
                <span 
                  className="bg-[#cc0000] text-white font-bold px-[6px] py-[2px] leading-none tracking-wider rounded-sm shadow-md"
                  style={{ fontSize: "max(14px, 3.5cqi)" }}
                >
                  {group.Rating}
                </span>
               )}
            </div>
          </div>
        </div>

        <div className="w-full h-[3px] bg-[#d35400] mb-2 shrink-0 rounded-sm"></div>

        <div className="flex flex-col gap-[3px] text-white text-xl font-bold tracking-wide w-full shrink-0 overflow-y-auto hide-scrollbar sm:pb-8">
          {group.showings.map((showing) => (
            <MovieShowing key={showing.Id} showing={showing} config={config} />
          ))}
        </div>
      </div>
    </div>
  );
}
