const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const METRICOOL_BASE_URL = 'https://app.metricool.com/api/v2';

async function callMetricoolBlogs(
  token: string,
  userId: string
): Promise<{ status: number; data: any }> {
  const qs = new URLSearchParams({ userId });
  const url = `${METRICOOL_BASE_URL}/blogs?${qs.toString()}`;
  
  console.log('Fetching blogs from:', url);
  
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Mc-Auth': token,
    },
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function callMetricoolBlogsQuery(
  token: string,
  userId: string
): Promise<{ status: number; data: any }> {
  // Fallback with token in query
  const qs = new URLSearchParams({ userId, token });
  const url = `${METRICOOL_BASE_URL}/blogs?${qs.toString()}`;
  
  console.log('Fetching blogs (query auth) from:', url);
  
  const res = await fetch(url, {
    method: 'GET',
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('METRICOOL_API_TOKEN');
    if (!token) {
      throw new Error('METRICOOL_API_TOKEN not configured');
    }

    const defaultUserId = Deno.env.get('METRICOOL_USER_ID') || '4172139';

    // Try Bearer auth first
    let r = await callMetricoolBlogs(token, defaultUserId);
    
    // Fallback to query param auth if Bearer fails
    if (r.status === 401) {
      console.log('Bearer auth failed, trying query param auth');
      r = await callMetricoolBlogsQuery(token, defaultUserId);
    }

    if (r.status !== 200) {
      throw new Error(`Metricool API error: ${r.status}`);
    }

    return new Response(
      JSON.stringify(r.data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('Error in metricool-blogs:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
