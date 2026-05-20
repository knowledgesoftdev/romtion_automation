require('dotenv').config();

async function getAccessToken() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }).toString()
  });

  const data = await response.json();
  return data.access_token;
}

async function debugAnalytics() {
  const videoId = 'owUMBM8OS00';
  console.log('🔑 Fetching access token...');
  const token = await getAccessToken();
  console.log('✅ Access token acquired.');

  const today = new Date().toISOString().split('T')[0];
  const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
  url.searchParams.set('ids', 'channel==MINE');
  url.searchParams.set('startDate', '2020-01-01');
  url.searchParams.set('endDate', today);
  url.searchParams.set('metrics', 'averageViewDuration,annotationClickThroughRate');
  url.searchParams.set('filters', `video==${videoId}`);

  console.log(`📡 Querying YouTube Analytics for video: ${videoId}`);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log(`📊 Status Code: ${res.status}`);
  const data = await res.json();
  console.log('📦 Raw JSON Response from Google:');
  console.log(JSON.stringify(data, null, 2));
}

debugAnalytics().catch(console.error);
