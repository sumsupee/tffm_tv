"use client";

import { AuxNode } from "@/types/signage";

function getYoutubeEmbedUrl(url: string, autoplay: boolean, loop: boolean): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) {
      const id = m[1];
      const params = new URLSearchParams({
        autoplay: autoplay ? '1' : '0',
        loop: loop ? '1' : '0',
        playlist: loop ? id : '',
        mute: autoplay ? '1' : '0',
        controls: '0',
        rel: '0',
        modestbranding: '1',
      });
      return `https://www.youtube.com/embed/${id}?${params.toString()}`;
    }
  }
  return null;
}

function nodeStyle(node: AuxNode) {
  return {
    flex: node.flex !== undefined ? node.flex : 1,
    padding: node.padding || undefined,
    margin: node.margin || undefined,
    gap: node.gap !== undefined ? `${node.gap}px` : undefined,
  };
}

export default function AuxRenderer({ node, scale }: { node?: AuxNode; scale?: string }) {
  if (!node) return null;

  if (node.type === 'col') {
    return (
      <div
        className="flex flex-col w-full h-full"
        style={nodeStyle(node)}
      >
        {(node.children || []).map(function(child) { return <AuxRenderer key={child.id} node={child} />; })}
      </div>
    );
  }

  if (node.type === 'row') {
    const stacked = node.stack;
    return (
      <div
        className={`flex w-full min-h-0 ${stacked ? 'flex-col' : 'flex-row'}`}
        style={nodeStyle(node)}
      >
        {(node.children || []).map(function(child) { return <AuxRenderer key={child.id} node={child} />; })}
      </div>
    );
  }

  if (node.type === 'text') {
    return (
      <div
        className="w-full text-white prose prose-invert prose-lg max-w-none break-words"
        style={{ flex: node.flex !== undefined ? node.flex : 'none', padding: node.padding, margin: node.margin }}
        dangerouslySetInnerHTML={{ __html: node.content || '' }}
      />
    );
  }

  if (node.type === 'image') {
    return (
      <div
        style={{
          flex: node.flex !== undefined ? node.flex : 1,
          padding: node.padding,
          margin: node.margin,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {node.content ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={node.content}
            alt=""
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              objectFit: node.objectFit || 'contain',
              objectPosition: 'center',
            }}
          />
        ) : (
          <div className="w-full h-24 border-2 border-dashed border-white/20 rounded-lg bg-white/5 flex items-center justify-center text-white/30 text-xs tracking-widest uppercase font-bold">
            Image Placeholder
          </div>
        )}
      </div>
    );
  }

  if (node.type === 'video') {
    const embedUrl = node.content ? getYoutubeEmbedUrl(node.content, !!node.autoplay, !!node.loop) : null;
    return (
      <div
        className="w-full overflow-hidden"
        style={{ flex: node.flex !== undefined ? node.flex : 1, padding: node.padding, margin: node.margin, aspectRatio: '16/9' }}
      >
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            frameBorder="0"
          />
        ) : (
          <div className="w-full h-full border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center text-white/30 text-xs tracking-widest uppercase font-bold rounded-lg">
            Paste YouTube URL
          </div>
        )}
      </div>
    );
  }

  if (node.type === 'divider') {
    return (
      <div
        className="w-full border-t border-white/20 my-2"
        style={{ flex: 'none', padding: node.padding, margin: node.margin }}
      />
    );
  }

  if (node.type === 'button') {
    return (
      <div className="w-full flex justify-center py-2" style={{ flex: node.flex !== undefined ? node.flex : 'none', padding: node.padding, margin: node.margin }}>
        <button className="bg-brand-accent text-black font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform">
          {node.content || 'Click Here'}
        </button>
      </div>
    );
  }

  return null;
}
