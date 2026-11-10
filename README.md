# Systema · Meta Ads Performance

A server-rendered dashboard for Systema's Meta (Facebook/Instagram) ads in Bangladesh. It shows headline metrics, ad creatives with inline video playback, and campaign-type breakdowns. Data is read live from the Meta Graph API.

Stack: Next.js 16 (App Router, Cache Components), React 19, JavaScript, Tailwind CSS v4, Radix UI, lucide-react, date-fns, react-day-picker. Deploys to Netlify.

## 1. Environment setup

Create `.env.local`. All variables are **server-only**: never prefix them with `NEXT_PUBLIC_`.

| Variable | Example | Notes |
| --- | --- | --- |
| `META_ACCESS_TOKEN` | `EAA…` | System User token (see below) |
| `META_AD_ACCOUNT_ID` | `act_1285282003644678` | `act_` prefix optional |
| `META_API_VERSION` | `v26.0` | Graph API version |

`.env.example` lists the names. `.gitignore` ignores `.env*` except `.env.example`. If a variable is missing, the page and API routes name it (never its value).

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # metric, date and ad-name parsing tests (node:test)
npm run lint
npm run build && npm start
```

Brand logo: put it at `public/logo.png`. Until it exists, the header shows an "S" monogram. A load failure is detected even if it happens before hydration.

## 2. Generating a System User token

A System User token doesn't expire with a person's login, so use one.

1. **Business Settings → Users → System users → Add.** Create an *Admin* or *Employee* system user.
2. **Assign assets** to the system user:
   - the **ad account** (`USD_RBD_Madmen_Systema Bangladesh`) with at least *View performance*;
   - the brand's **Facebook Page**, with a role that allows content access. This is required for video playback (see below).
3. **Generate new token** → pick your Meta app → set expiry to *Never* → grant these scopes:
   - `ads_read`
   - `pages_show_list`
   - `pages_read_engagement`
4. Paste the token into `META_ACCESS_TOKEN`. Check its scopes with `GET /me/permissions`.

### Why the Page matters for video

Meta only returns a video's playable `source` (a direct MP4 URL) to the token of the **Page that owns the video**. The dashboard:

1. reads `creative.video_id` (or `object_story_spec.video_data.video_id`);
2. batch-fetches `picture, from, permalink_url` for each video. `from.id` is the owning Page;
3. exchanges the System User token for that Page's token (`GET /{page_id}?fields=access_token`). This token lives only in server memory and is never logged, cached or sent to the browser;
4. fetches `source` with the Page token.

Without Page access, cards show the poster, a play icon and a **View on Facebook** link instead.

## 3. How the data works

All Graph calls go through [lib/meta.js](lib/meta.js) (`import "server-only"`):

- **Auth**: the token is sent only in the `Authorization: Bearer` header, never in URLs, so it can't leak into logs, errors or cache keys.
- **Caching**: GETs are cached for 5 minutes with `"use cache"`, `cacheLife({ stale: 300, revalidate: 300, expire: 3600 })` and `cacheTag("meta")`. **Refresh** runs a server action that calls `updateTag("meta")` and `revalidatePath("/")`.
- **Rate limits**: error codes 4, 17, 32 and 613 are retried with backoff (1s, 2s, 4s, 8s). If that doesn't clear them, the UI says so (HTTP 429 from the API routes).
- **Paging**: follows `paging.next` using the `after` cursor, at `limit=500`, up to 20 pages. If the cap is hit, a warning is logged.
- **Ad details**: fetched with `POST /batch` (50 GETs per batch, 4 batches at a time), and only for ad IDs that appear in the date-ranged insights.
- **Thumbnails**: refetched on the creative with `thumbnail_width=1200&thumbnail_height=1200`, because the nested `thumbnail_url` is 64×64.
- **Dates**: computed in the ad account's timezone (Asia/Dhaka). "Last N days" ends yesterday, matching Ads Manager. A range starting in the future returns empty results with a notice. An end date in the future is clamped to today.
- **Read-only**: GET, plus `POST /batch` whose items are all GETs.

### Metrics

Raw counts are summed first and then divided. Per-row rates are never averaged, and every division is guarded against zero.

| Metric | Formula |
| --- | --- |
| Engagements | action `post_engagement` |
| Post interactions | `post_reaction + comment + post + onsite_conversion.post_save` |
| Engagement rate | engagements ÷ impressions × 100 |
| Interaction rate | interactions ÷ reach × 100 |
| CTR | clicks (all) ÷ impressions × 100 |
| CPM | spend ÷ impressions × 1000 |
| CPC | spend ÷ clicks (all) |
| Frequency | impressions ÷ reach |
| Cost / engagement | spend ÷ engagements (2 significant figures below $0.01) |
| 3s views | action `video_view` (video ads only) |
| Link clicks / Page likes | actions `link_click` / `like` |

**Reach is never summed.** The summary uses Meta's account-level, de-duplicated reach. A Reach group's total makes one account-level call filtered with `campaign.id IN [ids]`.

**Campaign type** is the earliest keyword in the campaign name (Reach, Engagement, Traffic, Page Visit, Page Like). Otherwise it comes from the objective (Awareness → Reach, Engagement → Engagement, Traffic → Traffic), otherwise Other. **Top Content** shows the 3 Engagement ads with the lowest cost per engagement.

**Ad names** like `iPhone | Static | …` or `Static - iPhone …` have their format tag (Static, Dynamic, Carousel, Reel, Influencer Reel, Influencer Video) shown as a badge and removed from the title. A tag only counts when it is a whole segment. The cases are covered in [lib/adName.test.js](lib/adName.test.js).

### API routes

`GET /api/insights` and `GET /api/creatives` take the same `range`, `start` and `end` params as the page and return the same JSON. Responses:

- missing env → `500 {error, missing}`;
- Meta error → `502`;
- rate limit not cleared → `429`.

Range values: `today`, `yesterday`, `last_7`, `last_14` (default), `last_30`, `last_90`, `this_month`, `last_month`, `lifetime`, `custom&start=YYYY-MM-DD&end=YYYY-MM-DD`.

## 4. Deploying to Netlify

`netlify.toml` already configures `@netlify/plugin-nextjs`.

1. Push the repo to GitHub, then in Netlify choose **Add new site → Import from Git**.
2. Build command `npm run build`, publish directory `.next`. Both are set in `netlify.toml`.
3. **Site configuration → Environment variables**: add `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` and `META_API_VERSION`, scoped to *Functions/Runtime*. Mark the token as a secret.
4. Deploy.

On serverless hosts the `"use cache"` in-memory cache may not persist between function instances, so the 5-minute cache is best-effort there.
