# Metricool Integration Status

## ✅ What's Implemented

1. **MetricoolService Class** (`/srv/storyclip/services/metricool.service.js`)
   - Configured with correct API base URL: `https://app.metricool.com/api`
   - Proper authentication via `X-Mc-Auth` header
   - Confirmation-based publishing (waits for Facebook/Instagram confirmation before sending next story)
   - Batch publishing with progress callbacks
   - SSE support for real-time updates

2. **Backend Routes** (`/srv/storyclip/routes/metricool.js`)
   - `POST /api/metricool/publish/stories` - Initiate batch publishing
   - `GET /api/metricool/stream?batchId=X` - SSE stream for real-time progress
   - `GET /api/metricool/status?batchId=X` - Get batch status

3. **Environment Configuration**
   - `METRICOOL_USER_TOKEN` configured in `.env`

## ⚠️ What's Required from User

To use the Metricool integration, you need to provide:

1. **User Token** (✅ Already configured)
   - Location: Settings > API in Metricool dashboard
   - Environment variable: `METRICOOL_USER_TOKEN`

2. **User ID** (❌ Not configured yet)
   - Required for all API calls
   - Can be found in Metricool dashboard or API response
   - Needs to be added to `.env` as `METRICOOL_USER_ID`

3. **Blog ID** (❌ Not configured yet)
   - Represents your brand/workspace in Metricool
   - Required for all API calls
   - Can be found in Metricool dashboard or API response
   - Needs to be added to `.env` as `METRICOOL_BLOG_ID`

4. **Connected Social Accounts**
   - You must have Facebook/Instagram accounts connected in Metricool
   - These accounts must have permission to post Stories

## 📝 Next Steps

### 1. Get userId and blogId

Run this command to get your user info:

```bash
cd /srv/storyclip
node test-metricool-user-info.js
```

This will output your `userId` and `blogId`.

### 2. Add to .env

Add the values to `/srv/storyclip/.env`:

```env
METRICOOL_USER_ID=your_user_id_here
METRICOOL_BLOG_ID=your_blog_id_here
```

### 3. Restart Backend

```bash
pm2 restart storyclip
```

### 4. Test Publishing

From the frontend:
1. Go to Process page after generating clips
2. Click "Publish to Stories"
3. Configure your Metricool account
4. Start publishing

## 🔍 API Endpoints We Know

Based on official documentation:

- `GET /admin/simpleProfiles` - Get user's brands/profiles
  - Params: `userId`, `blogId`
  - Returns: List of connected social accounts

**Note:** The exact endpoints for media upload and post creation are not publicly documented in the Swagger docs. They may require:
- Direct access to the full Swagger JSON (requires authentication)
- Or using Metricool's official SDKs if available
- Or contacting Metricool support for complete API documentation

## 🛠️ Troubleshooting

If publishing fails:

1. Verify all environment variables are set
2. Check Metricool dashboard to ensure accounts are connected
3. Check PM2 logs: `pm2 logs storyclip`
4. Test API connectivity: `node test-metricool-integration.js`

## 📚 Documentation Links

- API Docs: https://app.metricool.com/resources/apidocs/
- Help Center: https://help.metricool.com/en/article/basic-guide-for-api-integration-abukgf/
- PDF Guide: https://static.metricool.com/API+DOC/API+English.pdf
