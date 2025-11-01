import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const API = "https://app.metricool.com/api";
const TOKEN = Deno.env.get("METRICOOL_USER_TOKEN") || Deno.env.get("METRICOOL_API_TOKEN") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get("postId") || "";
    const userId = url.searchParams.get("userId") || Deno.env.get("METRICOOL_USER_ID") || "";
    const blogId = url.searchParams.get("blogId") || Deno.env.get("METRICOOL_BLOG_ID") || "";
    
    if (!postId || !userId || !blogId) {
      return new Response(
        JSON.stringify({ error: "MISSING_PARAMS", message: "postId, userId, and blogId are required" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!TOKEN) {
      return new Response(
        JSON.stringify({ error: "MISSING_TOKEN", message: "METRICOOL_USER_TOKEN not configured" }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`🔍 Checking status for post ${postId} (userId=${userId}, blogId=${blogId})`);

    const qs = new URLSearchParams({ userId, blogId });
    const res = await fetch(`${API}/v2/scheduler/posts/${postId}?${qs}`, {
      headers: { "X-Mc-Auth": TOKEN }
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ Status check failed: ${res.status}`, text);
      return new Response(
        JSON.stringify({ error: "STATUS_CHECK_FAILED", status: res.status, details: text }), 
        { 
          status: res.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const data = await res.json();
    const status = data?.data?.providers?.[0]?.status || "UNKNOWN";
    
    console.log(`✅ Status for post ${postId}: ${status}`);
    
    return new Response(
      JSON.stringify({ status, postId, data }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (e: any) {
    console.error(`❌ Internal error:`, e);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: e?.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
