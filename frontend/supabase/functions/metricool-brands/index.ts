const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const METRICOOL_BASE_URL = 'https://app.metricool.com/api';

interface MetricoolBrand {
  id: string;
  name: string;
  network: string;
  timezone?: string;
}

async function callMetricoolSimpleProfiles(
  token: string,
  userId: string
): Promise<{ status: number; data: any }> {
  const qs = new URLSearchParams({ userId });
  const url = `${METRICOOL_BASE_URL}/admin/simpleProfiles?${qs.toString()}`;
  
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Mc-Auth': token,
      'Accept': 'application/json',
    },
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function callMetricoolSimpleProfilesQuery(
  token: string,
  userId: string
): Promise<{ status: number; data: any }> {
  const qs = new URLSearchParams({ userId, userToken: token });
  const url = `${METRICOOL_BASE_URL}/admin/simpleProfiles?${qs.toString()}`;
  
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
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
      throw new Error('Service configuration error');
    }

    const defaultUserId = Deno.env.get('METRICOOL_USER_ID') || '4172139';

    let r = await callMetricoolSimpleProfiles(token, defaultUserId);
    
    if (r.status === 401 || r.status === 403 || r.status === 404) {
      r = await callMetricoolSimpleProfilesQuery(token, defaultUserId);
    }

    if (r.status !== 200) {
      throw new Error('Failed to fetch brands');
    }

    const brands: MetricoolBrand[] = Array.isArray(r.data) 
      ? r.data 
      : r.data?.brands || r.data?.items || [];

    return new Response(
      JSON.stringify({ 
        success: true, 
        brands,
        count: brands.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('[metricool-brands]', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to retrieve brands',
        code: 'BRANDS_ERROR',
        brands: [] 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
