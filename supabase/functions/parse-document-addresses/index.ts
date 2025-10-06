import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    // För PDF-filer, använd LlamaParse eller annan PDF-parser
    // För nu, returnera en enkel text-extraktion
    const text = await file.text();
    
    // Enkel regex för att hitta svenska adresser
    // Format: "Gatunamn Nummer, Ort" eller "Gatunamn Nummer Ort"
    const addressPattern = /([A-ZÅÄÖ][a-zåäö]+(?:vägen|gatan|gränd|plan|torg|väg)?)\s*(\d+[A-Za-z]?),?\s*([A-ZÅÄÖ][a-zåäö\s]+)/gi;
    
    const matches = text.matchAll(addressPattern);
    const addresses: string[] = [];
    
    for (const match of matches) {
      const address = `${match[1]} ${match[2]}, ${match[3]}`.trim();
      addresses.push(address);
    }

    return new Response(JSON.stringify({ addresses }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Parse error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});