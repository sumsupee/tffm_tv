import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // 10-second timeout on external calls \u2014 prevents the Pi's Next.js server from hanging
    // when the Indy API is slow/unreachable, which would freeze the client loading screen.
    const makeSignal = (ms: number) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    };

    // 1. Fetch the simple JSON array which has exact ShowBadges, ShowTimes, and ScreenNames
    const jsonRes = await fetch("https://api-us.indy.systems/sessions/upcoming_sessions.json?site_id=262", {
      next: { revalidate: 60 },
      signal: makeSignal(10_000),
    });
    let sessions = await jsonRes.json();
    sessions = Array.isArray(sessions) ? sessions : sessions.sessions || [];

    // 2. Fetch the rich GraphQL API which has the proprietary Imgix posterImage hashes
    const gqlQuery = `
      query GetShowings {
        site(id: "262") {
          todaysShowings {
            movie {
              id
              posterImage
            }
          }
        }
      }
    `;

    const gqlRes = await fetch("https://api-us.indy.systems/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: gqlQuery }),
      next: { revalidate: 60 },
      signal: makeSignal(10_000),
    });

    const gqlData = await gqlRes.json();

    // Create a dictionary mapping FilmId -> Imgix Hash
    const imgixMap: Record<string, string> = {};
    if (gqlData?.data?.site?.todaysShowings) {
      gqlData.data.site.todaysShowings.forEach((sh: any) => {
        if (sh.movie?.id && sh.movie?.posterImage) {
          imgixMap[sh.movie.id] = sh.movie.posterImage;
        }
      });
    }

    // 3. Merge the exact Imgix URL into the old JSON payloads
    const mergedSessions = sessions.map((s: any) => {
      const hash = imgixMap[s.FilmId];
      if (hash) {
        // Construct standard Imgix asset URL
        s.ExtractedImgixUrl = `https://indy-systems.imgix.net/${hash}?fit=crop&w=400&h=600&fm=jpeg&auto=format,compress`;
      }
      return s;
    });

    // 4. Mock layout testing multiplier
    let mockCount = 0;
    try {
       const configPath = path.join(process.cwd(), "config.json");
       const cfgStr = await fs.readFile(configPath, "utf8");
       mockCount = JSON.parse(cfgStr).mockMoviesCount || 0;
    } catch(e) {}

    // Grouping by FilmId first to clone whole movies instead of random sessions natively
    if (mockCount > 0) {
       const filmGroups: Record<string, any[]> = {};
       mergedSessions.forEach((s: any) => {
          if (!filmGroups[s.FilmId]) filmGroups[s.FilmId] = [];
          filmGroups[s.FilmId].push(s);
       });
       const bases = Object.values(filmGroups);
       let currentMovies = bases.length;
       let idCounter = 9000;
       
       while (currentMovies < mockCount && bases.length > 0) {
          const cloneIdx = currentMovies % bases.length;
          const cloneBase = bases[cloneIdx];
          const newFilmId = idCounter++;
          cloneBase.forEach((s: any) => {
              const cloneSession = JSON.parse(JSON.stringify(s));
              cloneSession.FilmId = newFilmId;
              cloneSession.Id = idCounter++;
              cloneSession.FilmTitle = cloneSession.FilmTitle + " (Test Clone)";
              cloneSession.Title = cloneSession.Title + " (Test Clone)";
              mergedSessions.push(cloneSession);
          });
          currentMovies++;
       }
    }

    return NextResponse.json(mergedSessions);
  } catch (error) {
    console.error("Merged API Error:", error);
    return NextResponse.json({ error: "Failed to dual-fetch from INDY" }, { status: 500 });
  }
}
