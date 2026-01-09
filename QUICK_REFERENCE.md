# E-Videos URL Quick Reference

## URL Patterns

```
/e-videos
├── /e-videos                                      → All videos
├── /e-videos/[category-slug]                      → Videos in category
├── /e-videos/[category-slug]/[subcategory-slug]   → Videos in subcategory
├── /e-videos/[cat]/[subcat]/[video-slug]          → View video details
└── /e-videos/[cat]/[subcat]/[video-slug]/request  → Request to customize video
```

## Examples

```
http://localhost:3000/e-videos
→ Shows all videos, category sidebar available

http://localhost:3000/e-videos/wedding
→ Shows only videos in 'wedding' category
→ API call: /api/e-video/templates?category_slug=wedding

http://localhost:3000/e-videos/wedding/invitation
→ Shows only videos in 'invitation' subcategory under 'wedding'
→ API call: /api/e-video/templates?category_slug=wedding&subcategory_slug=invitation

http://localhost:3000/e-videos/wedding/invitation/dream-wedding-video
→ Shows video detail page with preview and "Request to Make" button
→ API call: /api/e-video/templates/dream-wedding-video

http://localhost:3000/e-videos/wedding/invitation/dream-wedding-video/request
→ Shows customization form for the video
→ Requires authentication (redirects to login if not authenticated)
```

## Components & Routes

| Component | Path | Route |
|-----------|------|-------|
| VideoCatalog | `/e-videos/[[...slug]]/` | Displays video grid with sidebar |
| VideoDetail | `/e-videos/[[...slug]]/` | Shows video preview |
| VideoRequestWizard | `/e-videos/[[...slug]]/` | Customization form |
| EVideosPage | `/e-videos/[[...slug]]/page.tsx` | Route handler |

## API Endpoints

### Browse Videos
```
GET /api/e-video/templates
GET /api/e-video/templates?category_slug=wedding
GET /api/e-video/templates?category_slug=wedding&subcategory_slug=invitation
GET /api/e-video/templates?category_id=1
GET /api/e-video/templates?category_id=1&subcategory_id=2
```

### Get Single Video
```
GET /api/e-video/templates/[video-slug]
```

### Create Video Request
```
POST /api/e-video/requests
Body: {
  "template_slug": "video-slug",
  "customizations": {...},
  "user_id": "uid"
}
```

## Database Relationships

```
content_items (id, slug, title, type='video')
    ↓ (INNER JOIN video_templates.content_id = id)
video_templates (content_id, preview_video_url, preview_thumbnail_url)

content_items (id)
    ↓ (LEFT JOIN category_links.target_id = id AND target_type = 'content')
category_links (category_id, target_id, target_type)
    ↓ (LEFT JOIN categories.id = category_id)
categories (id, name, slug, parent_id)
    - parent_id IS NULL → Main category
    - parent_id IS NOT NULL → Subcategory
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| URLs show 404 | Verify video slug exists in database |
| Category filtering not working | Check category_links table has correct target_type='content' |
| Subcategory not showing | Verify subcategory has parent_id set to main category |
| Empty results | Check if videos are marked is_active=TRUE |
| Wrong slugs in response | Verify category and subcategory slugs in database match |

## Key Files

- **Route handler:** `/app/e-videos/[[...slug]]/page.tsx`
- **Catalog view:** `/app/e-videos/[[...slug]]/_components/VideoCatalog.tsx`
- **Detail view:** `/app/e-videos/[[...slug]]/_components/VideoDetail.tsx`
- **API - List videos:** `/app/api/e-video/templates/route.ts` (GET)
- **API - Get video:** `/app/api/e-video/templates/[slug]/route.ts` (GET)
- **API - Request video:** `/app/api/e-video/requests/route.ts` (POST)

## Navigation Flow

```
Home
  ↓
/e-videos (VideoCatalog)
  ↓
[Select Category] → /e-videos/[cat] (VideoCatalog filtered)
  ↓
[Select Subcategory] → /e-videos/[cat]/[subcat] (VideoCatalog filtered)
  ↓
[View Video] → /e-videos/[cat]/[subcat]/[video] (VideoDetail)
  ↓
[Request to Make] → /e-videos/[cat]/[subcat]/[video]/request (VideoRequestWizard)
  ↓
[Submit] → Create video request
```
