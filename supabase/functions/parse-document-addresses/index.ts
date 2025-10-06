import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Förbättrad adressparser för svenska adresser
function parseSwedishAddresses(text: string): string[] {
  const addresses: string[] = [];
  const lines = text.split('\n');

  // Regex-mönster för svenska adresser
  const patterns = [
    // Fullständig med gatunamn, nummer och stad: "Lingonvägen 35, Floda"
    /([A-ZÅÄÖ][a-zåäöA-ZÅÄÖ\s]+(?:vägen|gatan|gränd|plan|torg|väg|gata|allén|stigen))\s+(\d+[A-Za-z]?),?\s+([A-ZÅÄÖ][a-zåäö\s]+)/g,
    // Med gatutyp och nummer: "Importgatan 15"
    /([A-ZÅÄÖ][a-zåäö]+(?:vägen|gatan|gränd|plan|torg|väg|gata|allén|stigen))\s*(\d+[A-Za-z]?)/g,
    // Generisk med stort ord följt av nummer
    /([A-ZÅÄÖ][a-zåäö]{3,})\s+(\d+[A-Za-z]?)/g,
  ];

  for (const line of lines) {
    let trimmed = line.trim();
    if (trimmed.length < 5) continue;

    // Ta bort företagsnamn i början (vanligt mönster: "Företag Adress Nummer, Stad")
    // Om raden börjar med ord utan gatutyp, skippa första ordet
    const companyPattern = /^([A-ZÅÄÖ][a-zåäö]+)\s+([A-ZÅÄÖ])/;
    const companyMatch = trimmed.match(companyPattern);
    if (companyMatch && !companyMatch[1].match(/vägen|gatan|gränd|plan|torg|väg|gata|allén|stigen/)) {
      trimmed = trimmed.substring(companyMatch[1].length).trim();
    }

    for (const pattern of patterns) {
      pattern.lastIndex = 0; // Reset regex state
      const matches = [...trimmed.matchAll(pattern)];
      
      for (const match of matches) {
        let address = '';
        
        if (match[3]) {
          // Fullständig med stad
          address = `${match[1].trim()} ${match[2]}, ${match[3].trim()}`;
        } else {
          // Bara gata + nummer
          address = `${match[1].trim()} ${match[2]}`;
        }
        
        // Filtrera bort uppenbart skräp
        if (address.length > 8 && 
            /\d/.test(address) && 
            /[A-ZÅÄÖa-zåäö]{3,}/.test(address) &&
            !addresses.includes(address)) {
          addresses.push(address);
        }
      }
    }
  }

  return [...new Set(addresses)]; // Remove duplicates
}

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

    console.log('Processing file:', file.name, 'Type:', file.type);

    // Extrahera text från filen
    const text = await file.text();
    console.log('Extracted text length:', text.length);
    console.log('First 200 chars:', text.substring(0, 200));

    // Parsa adresser från texten
    const addresses = parseSwedishAddresses(text);
    
    console.log('Found addresses:', addresses.length);

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