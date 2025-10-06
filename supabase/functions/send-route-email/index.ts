import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string;
  pdfData: string;
  routeInfo: {
    stops: number;
    distance: string;
    duration: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, pdfData, routeInfo }: SendEmailRequest = await req.json();

    console.log("Sending route email to:", to);

    // Decode base64 PDF
    const pdfBuffer = Uint8Array.from(atob(pdfData), c => c.charCodeAt(0));

    const emailResponse = await resend.emails.send({
      from: "Ruttoptimering <noreply@magido.se>",
      to: [to],
      subject: `Din optimerade rutt - ${routeInfo.stops} stopp`,
      html: `
        <h1>Din optimerade rutt är klar! 🚚</h1>
        <p>Här är en sammanfattning av din rutt:</p>
        <ul>
          <li><strong>Antal stopp:</strong> ${routeInfo.stops}</li>
          <li><strong>Total sträcka:</strong> ${routeInfo.distance}</li>
          <li><strong>Beräknad körtid:</strong> ${routeInfo.duration}</li>
        </ul>
        <p>Din detaljerade ruttplan finns bifogad som PDF.</p>
        <p>Lycka till med körningen!</p>
        <hr />
        <p style="color: #666; font-size: 12px;">Skickat från Ruttoptimering</p>
      `,
      attachments: [
        {
          filename: `rutt-${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-route-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
