# TFFM TV

Eventive-powered TV signage for Tasveer Film Festival & Market 2026. Based on the TFC TV display, with its settings, badge editor, and auxiliary content panel retained.

## Local setup

Install dependencies with `npm ci`. Copy `.env.example` to `.env.local` if the local environment file is missing, then set `EVENTIVE_API_KEY` to your Eventive account key and `EVENTIVE_EVENT_BUCKET_ID` to the festival bucket ID. Keep `.env.local` out of version control and the key server-side; do not use a `NEXT_PUBLIC_` prefix.

Run `npm run dev` and open http://localhost:3000. Open http://localhost:3000/settings to configure the display. The settings page generates a TV URL containing its configuration in the URL fragment. Use the date override to preview October 13–18, 2026 before those dates arrive.

## Data behavior

The server fetches Eventive events; the browser receives only display fields. Hidden, virtual, undated, and invalid events are excluded. The TV display uses one card per Eventive program, with its films listed beneath the program title. It includes only Houses 1–3 and the Blue Room, including non-film sessions in those rooms. All four venues share a horizontal time axis; a red line marks the current Seattle time and the timeline moves left continuously. Completed programs leave the viewport naturally. The whole day's schedule is available with the timeline slider; "Follow now" resumes automatic movement. Overlapping bookings stack within their venue. Program artwork comes from the event image when available, then the first film's image. Badges apply to the whole screening. The clock and schedule use America/Los_Angeles and stay on the selected calendar day through midnight.

A date override previews that day's schedule. Use the preview-time control to see a particular point in the day; the preview clock advances from that time. `?previewTime=18:45` can be added before the URL fragment to link to a specific preview time.

The timeline shows a three-hour window, scaled to the available display width.

The header date dropdown lists only days with scheduled programs in the displayed rooms. If the requested day has no programs, it selects the next available day, or the last available day when the schedule has ended. "Show attendee count" beside Display settings toggles each program's booked ticket count and total ticket capacity as a fraction (for example, "80 / 100") at the bottom right of its card; these figures refresh with the schedule every minute. Attendance here means tickets booked, including reservations, rather than tickets scanned at the door. Unlimited capacity appears as ∞ and unavailable counts as —. The toggle is preserved in the display URL.

## Verification

Run `node --experimental-strip-types --test tests/eventive.test.mjs` for mapping and timezone tests. Run `npm run build` for the production build.

## Vercel and Raspberry Pi

This project is hosted in the separate `sumsupee/tffm_tv` GitHub repository. Import that repository into Vercel using the Next.js defaults. Set `EVENTIVE_API_KEY` and `EVENTIVE_EVENT_BUCKET_ID` in the Vercel project's environment variables before deploying. The account token must remain valid; update the environment variable and redeploy when it expires.

On the Pi, open the generated TV URL in Chromium kiosk mode:

```bash
chromium --kiosk --noerrdialogs --disable-session-crashed-bubble 'https://YOUR-VERCEL-URL/#YOUR-CONFIGURATION'
```

The app runs on Vercel; the Raspberry Pi only runs the display browser. The copied HTML schedule is saved in `references/eventive-schedule.html` for reference and is not the live data source.
