/**
 * ZJEDNODUŠENÝ ZÁLOŽNÍ GOOGLE APPS SCRIPT PRO SOUTĚŽ VODAFONE PIXEL 11
 * 
 * Primární databáze: Supabase (PostgreSQL)
 * Tento skript slouží jako ŽIVÁ ZÁLOHA pro přímé zobrazení a export do Google Tabulky:
 *  1. List "Soutěžící (Slosování)" - Účastníci postupující do slosování o hlavní cenu
 *  2. List "Roztočení kola" - Kompletní historie vytočených výher z kola štěstí
 * 
 * NÁVOD K NASAZENÍ:
 * 1. Otevřete novou Google Tabulku (sheets.google.com).
 * 2. V horním menu klikněte na: Rozšíření -> Apps Script.
 * 3. Smažte veškerý výchozí kód a vložte tento kompletní skript.
 * 4. Uložte kliknutím na ikonu diskety (Ctrl+S / Cmd+S).
 * 5. Vpravo nahoře klikněte na modré tlačítko: Nasadit -> Nové nasazení.
 * 6. V okně zvolte:
 *    - Ozubené kolečko (Vybrat typ): Webová aplikace
 *    - Popis: Kolo štěstí záloha
 *    - Spustit jako: Já (Váš e-mail)
 *    - Kdo má přístup: Kdokoli (Anyone)  <-- DŮLEŽITÉ!
 * 7. Klikněte na "Nasadit", schvalte přístup ke své Google Tabulce.
 * 8. Zkopírujte výslednou "URL adresu webové aplikace" (končí na /exec) a vložte ji:
 *    - na Vercelu do proměnné VITE_GOOGLE_SHEET_WEBHOOK_URL
 *    - nebo přímo v administraci webu v záložce Nastavení.
 */

const SHEET_CONTESTANTS = 'Soutěžící (Slosování)';
const SHEET_SPINS = 'Roztočení kola';

function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action;
    const email = e && e.parameter && e.parameter.email;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. RYCHLÝ TEST FUNKČNOSTI: otevřením v prohlížeči (.../exec?action=test)
    if (action === 'test') {
      const spinsSheet = getOrCreateSheet(ss, SHEET_SPINS, [
        'Datum a čas',
        'Vyhraná cena',
        'E-mail soutěžícího',
        'Stanoviště / Zařízení'
      ]);
      spinsSheet.appendRow([getPragueTimeString(), 'TEST Z PROHLÍŽEČE', 'test@vodafone.cz', 'Webový prohlížeč']);
      return createResponse({
        status: 'success',
        message: 'TEST ÚSPĚŠNÝ! Řádek byl zapsán do listu "Roztočení kola" ve vaší Google Tabulce.',
        spreadsheet: ss.getName()
      });
    }

    // 2. Volitelná kontrola, zda již e-mail soutěžil
    if (action === 'check_email' && email) {
      const cleanEmail = String(email).trim().toLowerCase();
      let exists = false;

      const sheet = ss.getSheetByName(SHEET_CONTESTANTS);
      if (sheet && sheet.getLastRow() > 1) {
        const data = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
        exists = data.some(row => String(row[0]).trim().toLowerCase() === cleanEmail);
      }

      return createResponse({ exists: exists });
    }

    return createResponse({
      status: 'ok',
      message: 'Záložní zrcadlení Google Sheets pro Vodafone Pixel 11 je aktivní.',
      spreadsheet: ss.getName()
    });
  } catch (err) {
    return createResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    let payload = null;
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (errJson) {
        // Fallback for form-encoded or raw string
      }
    }
    if (!payload && e && e.parameter && Object.keys(e.parameter).length > 0) {
      payload = e.parameter;
    }

    if (!payload) {
      return createResponse({ status: 'error', message: 'Chybí data v požadavku' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. ZÁLOHA: FINALISTA KVÍZU DO SLOSOVÁNÍ
    if (payload.type === 'entry') {
      const sheet = getOrCreateSheet(ss, SHEET_CONTESTANTS, [
        'Datum a čas',
        'E-mail soutěžícího',
        'Skóre kvízu',
        'Výhra z kola',
        'Stanoviště / Zařízení'
      ]);

      const email = (payload.email || '').trim().toLowerCase();
      const timestamp = payload.timestamp || getPragueTimeString();
      const score = payload.score || '10/10';
      const prizeWon = payload.prizeWon || 'Čeká na točení...';
      const station = payload.station || 'Mobilní web';

      sheet.appendRow([timestamp, email, score, prizeWon, station]);
      return createResponse({ status: 'success', type: 'entry' });
    }

    // 2. ZÁLOHA: ROZTOČENÍ KOLA ŠTĚSTÍ
    if (payload.type === 'spin') {
      const spinsSheet = getOrCreateSheet(ss, SHEET_SPINS, [
        'Datum a čas',
        'Vyhraná cena',
        'E-mail soutěžícího',
        'Stanoviště / Zařízení'
      ]);

      const timestamp = payload.timestamp || getPragueTimeString();
      const prizeName = payload.prizeName || 'Neznámá výhra';
      const email = (payload.email || payload.userEmail || '').trim().toLowerCase();
      const station = payload.station || 'Mobilní web';

      spinsSheet.appendRow([timestamp, prizeName, email, station]);

      // Pokud soutěžící dokončil kvíz, doplníme vytočenou výhru i do listu finalistů
      if (email) {
        updateContestantPrize(ss, email, prizeName);
      }

      return createResponse({ status: 'success', type: 'spin' });
    }

    return createResponse({ status: 'ignored', message: 'Neznámý typ záznamu' });
  } catch (err) {
    return createResponse({ status: 'error', message: err.toString() });
  }
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0 && headers && headers.length > 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#f3f4f6');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function updateContestantPrize(ss, email, prizeName) {
  const sheet = ss.getSheetByName(SHEET_CONTESTANTS);
  if (!sheet || sheet.getLastRow() <= 1) return;

  const data = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (String(data[i][0]).trim().toLowerCase() === email) {
      sheet.getRange(i + 2, 4).setValue(prizeName);
      break;
    }
  }
}

function getPragueTimeString() {
  return new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' });
}

function createResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
