/**
 * ZJEDNODUŠENÝ ZÁLOŽNÍ GOOGLE APPS SCRIPT PRO SOUTĚŽ VODAFONE PIXEL 11
 * 
 * Primární databáze: Supabase (PostgreSQL)
 * Tento skript slouží pouze jako ŽIVÁ ZÁLOHA pro přímé zobrazení a losování:
 *  1. List "Soutěžící (8 z 8)" - E-maily do slosování o Google Pixel 11
 *  2. List "Roztočení kola" - Kompletní historie vytočených výher
 * 
 * NÁVOD K NASAZENÍ:
 * 1. Otevřete novou nebo stávající Google Tabulku.
 * 2. V horním menu zvolte: Rozšíření -> Apps Script.
 * 3. Vložte tento kód (nahraďte původní).
 * 4. Uložte (Ctrl+S / Cmd+S).
 * 5. Vpravo nahoře klikněte na: Nasadit -> Nové nasazení (nebo Spravovat nasazení -> Nová verze).
 * 6. Zvolte:
 *    - Typ: Webová aplikace
 *    - Spustit jako: Já (Váš účet)
 *    - Kdo má přístup: Kdokoli (Anyone)
 * 7. Zkopírujte URL adresu končící na "/exec" a vložte ji do administrace webu.
 */

const SHEET_CONTESTANTS = 'Soutěžící (8 z 8)';
const SHEET_SPINS = 'Roztočení kola';

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ status: 'ok', message: 'Záložní zrcadlení Google Sheets je aktivní.' })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ status: 'error', message: 'Chybí data v požadavku' });
    }

    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. ZÁLOHA: FINALISTA KVÍZU (8/8) DO SLOSOVÁNÍ
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
      const score = payload.score || '8/8';
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

      // Pokud soutěžící dokončil kvíz, doplníme vytočenou výhru i do listu soutěžících
      if (email) {
        updateContestantPrize(ss, email, prizeName);
      }

      return createResponse({ status: 'success', type: 'spin' });
    }

    return createResponse({ status: 'ignored', message: 'Neznámý typ zálohy' });
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
