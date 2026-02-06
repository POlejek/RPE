/**
 * Google Apps Script dla zapisywania minut do arkusza Google Sheets
 * URL wdrożenia: https://script.google.com/macros/s/AKfycbygQIsgWF_uJaRsgnjV9uDWFAfh8cwNizw-NCUax7dA4avuVniOdl_z2m7dWU6j6R6V/exec
 * 
 * INSTRUKCJA WDROŻENIA:
 * 1. Otwórz arkusz Google Sheets
 * 2. Rozszerzenia → Apps Script
 * 3. Wklej ten kod (zastąp cały istniejący kod)
 * 4. Zapisz (Ctrl+S)
 * 5. Wdróż → Zarządzaj wdrożeniami → Edytuj → Nowa wersja → Wdróż
 */

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const params = e.parameter;
    const action = params.action || 'update';
    const name = params.name;
    const trainingDate = params.trainingDate;
    const timestamp = params.timestamp;
    
    // Logowanie parametrów dla debugowania
    Logger.log('====================================');
    Logger.log('Otrzymano żądanie: ' + JSON.stringify(params));
    Logger.log('Akcja: ' + action);
    Logger.log('Nazwisko: ' + name);
    Logger.log('Data treningu: ' + trainingDate);
    Logger.log('Timestamp: ' + timestamp);
    Logger.log('====================================');
    
    if (!name || !trainingDate) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Brak wymaganych parametrów (name, trainingDate)'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Funkcja pomocnicza do znalezienia wiersza w arkuszu
    function findRowInSheet(sheet, name, trainingDate, timestamp) {
      const lastRow = sheet.getLastRow();
      Logger.log('Przeszukuję arkusz: ' + sheet.getName() + ', liczba wierszy: ' + lastRow);
      
      if (lastRow < 2) {
        Logger.log('Arkusz pusty lub tylko nagłówek');
        return null;
      }
      
      // Pobierz wszystkie dane naraz (wydajniejsze)
      const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowTimestamp = row[0] ? row[0].toString() : '';
        const rowName = row[1] ? row[1].toString() : '';
        const rowDate = row[2] ? row[2].toString() : '';
        
        // Dopasowanie: nazwisko + data + timestamp (jeśli jest)
        const nameMatch = rowName.trim().toLowerCase() === name.trim().toLowerCase();
        const dateMatch = rowDate === trainingDate;
        const timestampMatch = !timestamp || rowTimestamp.includes(timestamp) || timestamp.includes(rowTimestamp.substring(0, 10));
        
        // Loguj pierwsze kilka porównań
        if (i < 3) {
          Logger.log('Wiersz ' + (i+2) + ': ' + rowName + ' | ' + rowDate + ' | nameMatch=' + nameMatch + ', dateMatch=' + dateMatch + ', timestampMatch=' + timestampMatch);
        }
        
        if (nameMatch && dateMatch && timestampMatch) {
          Logger.log('✓ ZNALEZIONO! Wiersz ' + (i + 2) + ' - ' + rowName + ', ' + rowDate);
          return i + 2; // +2 bo zaczynamy od wiersza 2 i indeks tablicy od 0
        }
      }
      
      Logger.log('✗ Nie znaleziono pasującego wiersza');
      return null;
    }
    
    // Przeszukaj arkusze źródłowe: Response 2013 i Response 2011
    const sheet2013 = ss.getSheetByName('Response 2013');
    const sheet2011 = ss.getSheetByName('Response 2011');
    
    Logger.log('');
    Logger.log('--- Sprawdzanie arkuszy źródłowych ---');
    Logger.log('Response 2013: ' + (sheet2013 ? 'ISTNIEJE ✓' : 'NIE ZNALEZIONO ✗'));
    Logger.log('Response 2011: ' + (sheet2011 ? 'ISTNIEJE ✓' : 'NIE ZNALEZIONO ✗'));
    Logger.log('');
    
    const sourceSheets = [sheet2013, sheet2011].filter(s => s !== null);
    
    if (sourceSheets.length === 0) {
      Logger.log('✗ BŁĄD: Nie znaleziono żadnych arkuszy źródłowych!');
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Nie znaleziono arkuszy źródłowych (Response 2013, Response 2011)'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    Logger.log('Znaleziono ' + sourceSheets.length + ' arkuszy źródłowych');
    Logger.log('');
    
    // Znajdź wiersz we właściwym arkuszu źródłowym
    let foundSheet = null;
    let foundRow = null;
    
    Logger.log('--- Przeszukiwanie arkuszy ---');
    for (let sheet of sourceSheets) {
      const rowIndex = findRowInSheet(sheet, name, trainingDate, timestamp);
      if (rowIndex) {
        foundSheet = sheet;
        foundRow = rowIndex;
        Logger.log('');
        Logger.log('✓✓✓ SUKCES! Znaleziono wiersz ' + rowIndex + ' w arkuszu: ' + sheet.getName() + ' ✓✓✓');
        Logger.log('');
        break;
      }
    }
    
    if (!foundSheet || !foundRow) {
      Logger.log('');
      Logger.log('✗✗✗ BŁĄD: Nie znaleziono pasującego wiersza ✗✗✗');
      Logger.log('Szukano: ' + name + ', data: ' + trainingDate);
      Logger.log('');
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Nie znaleziono rekordu dla: ' + name + ' (' + trainingDate + '). Sprawdź dokładną pisownię nazwiska i format daty.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheet = foundSheet;
    const rowIndex = foundRow;

    // AKCJA: Usuwanie rekordu
    if (action === 'delete') {
      sheet.deleteRow(rowIndex);
      Logger.log('Usunięto wiersz ' + rowIndex + ' z arkusza ' + sheet.getName());
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Rekord usunięty',
        sheet: sheet.getName(),
        row: rowIndex
      })).setMimeType(ContentService.MimeType.JSON);
    } 
    
    // AKCJA: Aktualizacja minut
    else {
      const minutes = parseFloat(params.minutes);
      
      if (isNaN(minutes) || minutes <= 0) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Nieprawidłowa wartość minut: ' + params.minutes
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Struktura arkusza:
      // A: Timestamp
      // B: Imię i Nazwisko
      // C: Data treningu
      // D: RPE
      // E: Minuty <-- TUTAJ ZAPISUJEMY
      // F: Obciążenie <-- TUTAJ PRZELICZAMY (RPE × Minuty)
      // G: Drużyna
      
      // Kolumna E (5) to "Minuty"
      Logger.log('');
      Logger.log('╔════════════════════════════════════════════╗');
      Logger.log('║  ZAPISUJĘ DO ARKUSZA ŹRÓDŁOWEGO!          ║');
      Logger.log('╠════════════════════════════════════════════╣');
      Logger.log('║  Arkusz: ' + sheet.getName().padEnd(32) + '║');
      Logger.log('║  Wiersz: ' + String(rowIndex).padEnd(32) + '║');
      Logger.log('║  Minuty: ' + String(minutes).padEnd(32) + '║');
      Logger.log('╚════════════════════════════════════════════╝');
      Logger.log('');
      
      sheet.getRange(rowIndex, 5).setValue(minutes);
      Logger.log('✓ Zapisano minuty: ' + minutes + ' w kolumnie E wiersza ' + rowIndex + ' arkusza "' + sheet.getName() + '"');
      
      // Pobierz RPE z kolumny D (4) i przelicz obciążenie
      const rpe = parseFloat(sheet.getRange(rowIndex, 4).getValue());
      if (rpe && !isNaN(rpe)) {
        const load = rpe * minutes;
        sheet.getRange(rowIndex, 6).setValue(load);
        Logger.log('Przeliczono obciążenie: ' + load + ' (RPE: ' + rpe + ' × Minuty: ' + minutes + ')');
      } else {
        Logger.log('Brak RPE w wierszu ' + rowIndex + ', nie przeliczono obciążenia');
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Minuty zaktualizowane',
        row: rowIndex,
        sheet: sheet.getName(),
        minutes: minutes,
        rpe: rpe || null,
        load: rpe ? (rpe * minutes) : null
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    Logger.log('Błąd: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Błąd serwera: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Google Apps Script działa poprawnie',
    timestamp: new Date().toISOString(),
    version: '2.0'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Funkcja testowa - uruchom w edytorze Apps Script aby sprawdzić dostępne arkusze
 */
function testScript() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  Logger.log('==== TEST SKRYPTU ====');
  Logger.log('ID arkusza: ' + ss.getId());
  Logger.log('Nazwa arkusza: ' + ss.getName());
  Logger.log('');
  Logger.log('Dostępne arkusze:');
  
  sheets.forEach(sheet => {
    Logger.log('  - ' + sheet.getName() + ' (wierszy: ' + sheet.getLastRow() + ')');
  });
  
  Logger.log('');
  Logger.log('Szukam arkuszy źródłowych...');
  
  const sheet2013 = ss.getSheetByName('Response 2013');
  const sheet2011 = ss.getSheetByName('Response 2011');
  
  if (sheet2013) {
    Logger.log('');
    Logger.log('✓ Znaleziono arkusz: Response 2013');
    Logger.log('  Liczba wierszy: ' + sheet2013.getLastRow());
    
    if (sheet2013.getLastRow() > 0) {
      const headers = sheet2013.getRange(1, 1, 1, 7).getValues()[0];
      Logger.log('  Nagłówki: ' + headers.join(' | '));
      
      // Pokaż przykładowe dane z pierwszych 3 wierszy
      if (sheet2013.getLastRow() >= 2) {
        Logger.log('  Przykładowe dane:');
        const sampleData = sheet2013.getRange(2, 1, Math.min(3, sheet2013.getLastRow() - 1), 7).getValues();
        sampleData.forEach((row, idx) => {
          Logger.log('    Wiersz ' + (idx + 2) + ': ' + row[1] + ' | ' + row[2] + ' | RPE:' + row[3] + ' | Min:' + row[4]);
        });
      }
    }
  } else {
    Logger.log('✗ Nie znaleziono arkusza Response 2013');
  }
  
  if (sheet2011) {
    Logger.log('');
    Logger.log('✓ Znaleziono arkusz: Response 2011');
    Logger.log('  Liczba wierszy: ' + sheet2011.getLastRow());
    
    if (sheet2011.getLastRow() > 0) {
      const headers = sheet2011.getRange(1, 1, 1, 7).getValues()[0];
      Logger.log('  Nagłówki: ' + headers.join(' | '));
      
      // Pokaż przykładowe dane z pierwszych 3 wierszy
      if (sheet2011.getLastRow() >= 2) {
        Logger.log('  Przykładowe dane:');
        const sampleData = sheet2011.getRange(2, 1, Math.min(3, sheet2011.getLastRow() - 1), 7).getValues();
        sampleData.forEach((row, idx) => {
          Logger.log('    Wiersz ' + (idx + 2) + ': ' + row[1] + ' | ' + row[2] + ' | RPE:' + row[3] + ' | Min:' + row[4]);
        });
      }
    }
  } else {
    Logger.log('✗ Nie znaleziono arkusza Response 2011');
  }
  
  Logger.log('');
  Logger.log('==== TEST ZAKOŃCZONY ====');
}

/**
 * Funkcja testowa symulująca zapis minut
 * UWAGA: To testuje faktyczny zapis do arkusza!
 */
function testSaveMinutes() {
  Logger.log('==== TEST ZAPISU MINUT ====');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheets = [
    ss.getSheetByName('Response 2013'),
    ss.getSheetByName('Response 2011')
  ].filter(s => s !== null);
  
  if (sourceSheets.length === 0) {
    Logger.log('✗ Nie znaleziono arkuszy źródłowych');
    return;
  }
  
  sourceSheets.forEach(sheet => {
    Logger.log('');
    Logger.log('Arkusz: ' + sheet.getName());
    
    // Znajdź pierwszy wiersz z pustymi minutami
    const lastRow = sheet.getLastRow();
    Logger.log('Sprawdzam wiersze od 2 do ' + lastRow);
    
    let foundEmpty = false;
    
    for (let i = 2; i <= Math.min(lastRow, 10); i++) { // Sprawdź max 10 wierszy
      const minutes = sheet.getRange(i, 5).getValue();
      
      if (!minutes || minutes === '') {
        const timestamp = sheet.getRange(i, 1).getValue();
        const name = sheet.getRange(i, 2).getValue();
        const date = sheet.getRange(i, 3).getValue();
        const rpe = sheet.getRange(i, 4).getValue();
        
        Logger.log('  Znaleziono pusty wiersz: ' + i);
        Logger.log('    Nazwisko: ' + name);
        Logger.log('    Data: ' + date);
        Logger.log('    RPE: ' + rpe);
        Logger.log('    Minuty: PUSTE');
        
        foundEmpty = true;
        break;
      }
    }
    
    if (!foundEmpty) {
      Logger.log('  Nie znaleziono wierszy z pustymi minutami w pierwszych 10 wierszach');
    }
  });
  
  Logger.log('');
  Logger.log('==== TEST ZAKOŃCZONY ====');
}

/**
 * Funkcja testowa - symuluje wyszukiwanie konkretnego rekordu
 * Zmień nazwisko i datę na rzeczywisty rekord z Twojego arkusza
 */
function testFindRecord() {
  Logger.log('==== TEST WYSZUKIWANIA REKORDU ====');
  
  // ZMIEŃ TE WARTOŚCI NA RZECZYWISTE Z ARKUSZA:
  const testName = 'Jan Kowalski';  // Wpisz nazwisko z arkusza
  const testDate = '2026-02-05';    // Wpisz datę w formacie YYYY-MM-DD
  
  Logger.log('Szukam rekordu: ' + testName + ', data: ' + testDate);
  Logger.log('');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheets = [
    ss.getSheetByName('Response 2013'),
    ss.getSheetByName('Response 2011')
  ].filter(s => s !== null);
  
  if (sourceSheets.length === 0) {
    Logger.log('✗ Nie znaleziono arkuszy źródłowych');
    return;
  }
  
  function findRowInSheet(sheet, name, date) {
    const lastRow = sheet.getLastRow();
    Logger.log('Przeszukuję: ' + sheet.getName() + ' (' + lastRow + ' wierszy)');
    
    if (lastRow < 2) return null;
    
    const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
    
    for (let i = 0; i < data.length; i++) {
      const rowName = data[i][1] ? data[i][1].toString() : '';
      const rowDate = data[i][2] ? data[i][2].toString() : '';
      
      const nameMatch = rowName.trim().toLowerCase() === name.trim().toLowerCase();
      const dateMatch = rowDate === date;
      
      if (i < 5) {
        Logger.log('  Wiersz ' + (i+2) + ': "' + rowName + '" | "' + rowDate + '" | match: ' + (nameMatch && dateMatch));
      }
      
      if (nameMatch && dateMatch) {
        Logger.log('');
        Logger.log('✓✓✓ ZNALEZIONO w wierszu ' + (i+2) + '! ✓✓✓');
        Logger.log('  Nazwisko: ' + rowName);
        Logger.log('  Data: ' + rowDate);
        Logger.log('  RPE: ' + data[i][3]);
        Logger.log('  Minuty: ' + data[i][4]);
        return i + 2;
      }
    }
    
    Logger.log('  ✗ Nie znaleziono');
    return null;
  }
  
  for (let sheet of sourceSheets) {
    const rowIndex = findRowInSheet(sheet, testName, testDate);
    if (rowIndex) {
      Logger.log('');
      Logger.log('Rekord znaleziony w arkuszu: ' + sheet.getName());
      break;
    }
  }
  
  Logger.log('');
  Logger.log('==== TEST ZAKOŃCZONY ====');
}
