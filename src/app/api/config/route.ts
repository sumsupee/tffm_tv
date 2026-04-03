import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'config.json');

const DEFAULT_CONFIG = {
  dateOverride: "",
  movies: {}, // Keyed by FilmId
  badges: {}, // Keyed by badge string Name
  sessionBadges: {} // Keyed by Session Id
};

export async function GET() {
  try {
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error: any) {
    // Return default if file doesn't exist
    if (error.code === 'ENOENT') {
      return NextResponse.json(DEFAULT_CONFIG);
    }
    return NextResponse.json({ error: 'Failed to read config' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Read existing to merge, or use default
    let currentConfig = DEFAULT_CONFIG;
    try {
      const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
      currentConfig = JSON.parse(data);
    } catch (e) {
      // ignore
    }

    const newConfig = { ...currentConfig, ...body };
    
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
    return NextResponse.json({ success: true, config: newConfig });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
