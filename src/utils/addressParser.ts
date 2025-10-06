/**
 * Rensar en adress från företagsnamn och annan extra text före gatuadressen
 */
export function cleanAddress(raw: string): string {
  let cleaned = raw.trim();
  
  // Ta bort kommatecken i början
  cleaned = cleaned.replace(/^,+/, '').trim();
  
  // Hitta första förekomsten av ett svenskt gatunamn-mönster
  // Svenska gatunamn slutar ofta på: vägen, gatan, gränden, stigen, torget, platsen, etc.
  const streetPattern = /([A-Za-zåäöÅÄÖ]+(?:vägen|gatan|gränden|stigen|torget|platsen|plan|allén|backen|gård|parken|ängen|berget))\s*\d+/i;
  const match = cleaned.match(streetPattern);
  
  if (match && match.index !== undefined) {
    // Ta allt från gatunamnet och framåt
    cleaned = cleaned.substring(match.index);
  } else {
    // Försök hitta mönster med gatunamn utan nummer (för ställen som "Nordstan")
    const nameOnlyPattern = /([A-Za-zåäöÅÄÖ]+(?:vägen|gatan|gränden|stigen|torget|platsen|plan|allén|backen|gård|parken|ängen|berget|stan))/i;
    const nameMatch = cleaned.match(nameOnlyPattern);
    
    if (nameMatch && nameMatch.index !== undefined) {
      cleaned = cleaned.substring(nameMatch.index);
    } else {
      // Sista försöket: hitta ord följt av nummer (typ "Dalhemsvägen 2")
      const numberPattern = /([A-Za-zåäöÅÄÖ]+\s*\d+)/i;
      const numMatch = cleaned.match(numberPattern);
      
      if (numMatch && numMatch.index !== undefined) {
        cleaned = cleaned.substring(numMatch.index);
      }
    }
  }
  
  // Lägg till mellanslag mellan ord och nummer om det saknas
  cleaned = cleaned.replace(/([A-Za-zåäöÅÄÖ])(\d)/, '$1 $2');
  
  // Ta bort extra mellanslag
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Parsar flera adresser från en textsträng (en per rad)
 */
export function parseAddresses(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => cleanAddress(line));
}
