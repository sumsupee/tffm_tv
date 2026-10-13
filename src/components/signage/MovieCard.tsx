import { MovieGroup, AppConfig } from "@/types/signage";
import MovieShowing from "./MovieShowing";

export default function MovieCard({ group, config, rowArrayLength }: { group: MovieGroup, config: AppConfig | null, rowArrayLength: number }) {
  return (
    <div 
      className="flex flex-col flex-[1_1_0px] h-full shrink-0 px-2 lg:px-4 items-center justify-start transition-all"
      style={{ 
        backgroundColor: 'transparent',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '0 10px',
        flex: '1 1 0%',
        minWidth: 0
      }}
    >
      <div 
        className="w-full flex flex-col"
        style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}
      >
        <div 
          className="relative shadow-lg bg-[#050505] mb-4 border border-white/10 shrink-0 overflow-hidden rounded shadow-black/50"
          style={{ 
            position: 'relative', 
            display: 'inline-flex',
            flexDirection: 'column',
            backgroundColor: '#050505', 
            marginBottom: '16px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={group.posterUrl}
            alt={group.Title}
            className="object-contain"
            style={{
              maxHeight: "calc(((100vh - 120px) / " + rowArrayLength + ") - 120px)",
              maxWidth: '100%',
              height: 'auto',
              width: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              (e.target as HTMLImageElement).src =
                "/poster-placeholder.svg";
            }}
          />

          <div 
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)'
            }}
          ></div>

          <div 
            className="absolute bottom-4 left-4 right-4 flex flex-col gap-2"
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              right: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div>
              <h2 
                className="text-white font-bold leading-[1.1] text-shadow drop-shadow-xl"
                style={{ 
                  fontSize: "calc(16px + 1vw)", 
                  color: 'white', 
                  fontWeight: 'bold', 
                  textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 4px 10px rgba(0,0,0,0.5)',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'normal'
                }}
              >
                {group.Title}
              </h2>
              {group.metaInfo && (
                <p 
                  className="font-semibold tracking-wider text-white/90 drop-shadow-md mt-1"
                  style={{ fontSize: "calc(12px + 0.5vw)" }}
                >
                  {group.metaInfo}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               {group.Rating && (
                <span 
                  className="bg-[#cc0000] text-white font-bold px-[6px] py-[2px] leading-none tracking-wider rounded-sm shadow-md"
                  style={{ 
                    fontSize: "calc(12px + 0.5vw)", 
                    backgroundColor: '#cc0000', 
                    color: 'white', 
                    fontWeight: 'bold', 
                    padding: '4px 8px', 
                    borderRadius: '2px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    display: 'inline-block'
                  }}
                >
                  {group.Rating}
                </span>
               )}
            </div>
          </div>
        </div>

        <div 
          className="w-full h-[3px] bg-[#d35400] mb-2 shrink-0 rounded-sm"
          style={{ width: '100%', height: '3px', backgroundColor: '#d35400', marginBottom: '8px', borderRadius: '2px' }}
        ></div>

        <div 
          className="flex flex-col gap-[3px] text-white text-xl font-bold tracking-wide w-full flex-1 overflow-y-auto hide-scrollbar sm:pb-8"
          style={{ display: 'flex', flexDirection: 'column', width: '100%', color: 'white', flex: '1 1 0%', minHeight: 0 }}
        >
          {group.showings.map((showing) => (
            <MovieShowing key={showing.Id} showing={showing} config={config} />
          ))}
        </div>
      </div>
    </div>
  );
}
