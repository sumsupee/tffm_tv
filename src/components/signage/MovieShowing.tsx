import * as LucideIcons from "lucide-react";
import { StairIcon } from "./StairIcon";
import { Showing, AppConfig } from "@/types/signage";

export const getDynamicIconComponent = (config: AppConfig | null, badgeName: string, idx: number) => {
   const cfgIcon = (config && config.badges && config.badges[badgeName]) ? config.badges[badgeName].iconName : null;
   if (cfgIcon && (LucideIcons as any)[cfgIcon]) {
       const Icon = (LucideIcons as any)[cfgIcon];
       return <Icon key={idx + "-" + badgeName} size="1em" className="text-brand-accent shrink-0" aria-label={badgeName} />;
   }
   
   if(badgeName.includes("Wheelchair")) return <LucideIcons.Accessibility key={`${idx}-${badgeName}`} size="1em" className="text-blue-400 shrink-0" aria-label={badgeName} />;
   if(badgeName.includes("Stairs")) return <StairIcon key={`${idx}-${badgeName}`} size="1em" className="text-red-400 shrink-0" />;
   if(badgeName.includes("Open Captions")) return <LucideIcons.Captions key={`${idx}-${badgeName}`} size="1em" className="text-green-400 shrink-0" aria-label={badgeName} />;
   
   return null;
};

export const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  let hours = date.getHours();
  const minsRaw = date.getMinutes();
  const minutes = minsRaw < 10 ? "0" + minsRaw : String(minsRaw);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return hours + ":" + minutes + " " + ampm;
};

export default function MovieShowing({ showing, config }: { showing: Showing, config: AppConfig | null }) {
  const match = showing.ScreenName.match(/\d+/);
  const hNum = match ? match[0] : "";
  
  const highlightedBadgesList = (showing.ShowingBadges || []).filter(badgeName => {
     // Hardcoded fallback override for compatibility with old configuration assumptions
     if (badgeName === "Open Captions" && config && config.badges && config.badges["Open Captions"] && config.badges["Open Captions"].isHighlighted !== false) return true;
     return config && config.badges && config.badges[badgeName] && config.badges[badgeName].isHighlighted;
  });
  
  const isHighlighted = highlightedBadgesList.length > 0;
  const otherBadges = (showing.ShowingBadges || []).filter(function(b) { return highlightedBadgesList.indexOf(b) === -1; });
  
  const showTime = new Date(showing.FeatureStartTime);
  const isStarted = (new Date().getTime() - showTime.getTime()) / 60000 >= 15;
  
  const generateAbbreviation = (str: string) => str.split(/[\s-]+/).map(w => w[0]).join('').substring(0, 3).toUpperCase();

  return (
    <div 
      className={"flex flex-col rounded border transition-all duration-1000 " + (isHighlighted ? 'bg-[#0055ff]/15 border-[#0055ff]/40 py-2 px-3 shadow-lg my-1' : 'border-transparent py-1 px-3 mb-0.5') + " " + (isStarted ? 'opacity-40 grayscale' : '')}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <div 
        className="flex items-center justify-between w-full"
        style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
      >
        <div 
          className={"flex items-center gap-2 " + (isHighlighted ? 'text-[#b3d4ff]' : '')}
          style={{ fontSize: "max(1.5rem, 6.5cqi)", display: 'flex', flexDirection: 'row', alignItems: 'center' }}
        >
           <span className={isStarted ? 'line-through decoration-red-500/80 decoration-[3px]' : ''}>
             {formatTime(showing.FeatureStartTime)}
           </span>
           
           {hNum && (
             <span 
               className={"flex items-center justify-center rounded-full border border-white/30 bg-white/10 shrink-0 " + (isHighlighted ? 'bg-[#0055ff]/30 text-[#b3d4ff] border-[#b3d4ff]/40' : '')}
               style={{ width: "max(24px, 5cqi)", height: "max(24px, 5cqi)", fontSize: "max(11px, 2.8cqi)", display: 'flex', alignItems: 'center', justifyContent: 'center' }}
             >
               {hNum}
             </span>
           )}
        </div>

        <div 
          className="flex items-center justify-end gap-[2px] opacity-90" 
          style={{ fontSize: "max(18px, 4cqi)", display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}
        >
           {(otherBadges || []).map((badgeName, idx) => {
               const iconComponent = getDynamicIconComponent(config, badgeName, idx);
               if (!iconComponent) return null;
               
               const displayText = (config && config.badges && config.badges[badgeName]) ? config.badges[badgeName].label : null;
               
               return (
                  <div 
                    key={showing.Id + "-" + badgeName + "-" + idx} 
                    className="flex items-center gap-1 opacity-80" 
                    aria-label={badgeName}
                    style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
                  >
                   {iconComponent}
                   {displayText && (
                     <span className="text-white shrink-0 ml-0.5 tracking-wide" style={{ fontSize: "max(10px, 2.5cqi)" }}>
                       {displayText}
                     </span>
                   )}
                 </div>
               );
           })}
        </div>
      </div>
      
      {isHighlighted && (
        <div 
          className="w-full flex items-center mt-1 gap-2 flex-wrap"
          style={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '4px' }}
        >
          {highlightedBadgesList.map((badgeName, idx) => (
            <div 
              key={idx} 
              className="bg-[#0055ff] border border-[#3377ff] shadow-md px-1.5 py-0.5 rounded-[3px] flex items-center gap-1.5 leading-none"
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '2px 6px', marginRight: '8px' }}
            >
              <span 
                className="bg-white text-[#0055ff] px-1 rounded-sm text-[10px] font-black h-[14px] leading-tight flex items-center justify-center shadow-inner tracking-tighter"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {generateAbbreviation(badgeName)}
              </span>
              <span className="text-[11px] font-bold text-white uppercase tracking-wider drop-shadow-sm pt-[1px]">
                {badgeName}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
