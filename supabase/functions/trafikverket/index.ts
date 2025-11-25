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
    const { bounds } = await req.json();
    
    // Trafikverket API (helt gratis!)
    const query = `
      <REQUEST>
        <LOGIN authenticationkey="4d1e6e17bd1e44098974e19c2e4e7fe1" />
        <QUERY objecttype="Situation" schemaversion="1.5">
          <FILTER>
            <EQ name="Deviation.MessageType" value="Olycka" />
            <OR>
              <EQ name="Deviation.MessageType" value="Vägarbete" />
              <EQ name="Deviation.MessageType" value="Kövarning" />
            </OR>
          </FILTER>
        </QUERY>
      </REQUEST>
    `;

    const response = await fetch('https://api.trafikinfo.trafikverket.se/v2/data.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
      },
      body: query,
    });

    const data = await response.json();
    
    // Omvandla till enklare format
    const situations = data.RESPONSE?.RESULT?.[0]?.Situation || [];
    
    const incidents = situations.map((situation: any) => {
      const deviation = situation.Deviation?.[0];
      return {
        id: situation.Id,
        message: deviation?.Message || 'Okänd händelse',
        type: deviation?.MessageType || 'Okänd',
        severity: deviation?.SeverityText || 'Normal',
        location: deviation?.LocationDescriptor || 'Okänd plats',
        startTime: deviation?.StartTime,
        endTime: deviation?.EndTime,
        geometry: deviation?.Geometry,
      };
    }).filter((incident: any) => {
      // Filtrera baserat på bounds om det finns
      if (bounds && incident.geometry) {
        // Här kan vi lägga till geografisk filtrering
        return true;
      }
      return true;
    });

    return new Response(JSON.stringify({ incidents }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Trafikverket API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});