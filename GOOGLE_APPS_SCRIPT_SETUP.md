# Konfiguracja Google Apps Script dla zapisywania minut

## Problem
Po uzupełnieniu minut w aplikacji, dane nie są zapisywane z powrotem do Google Sheets.

## Jak to działa teraz

**WAŻNA ZMIANA**: Aplikacja teraz pobiera dane **bezpośrednio z Response 2013 i Response 2011**, nie z arkusza zbiorczego!

Aplikacja:
1. Pobiera dane bezpośrednio z arkuszy źródłowych: **Response 2013** i **Response 2011**
2. Każdy rekord w aplikacji ma przypisany arkusz źródłowy (widoczny w kolumnie "Arkusz")
3. Po uzupełnieniu minut, Apps Script **znajduje dokładny wiersz** w arkuszu źródłowym
4. Zapisuje minuty **bezpośrednio w tym samym arkuszu**, z którego pochodzą dane

**Korzyści**:
- ✅ Dane są zawsze aktualne (pobierane z źródła)
- ✅ Zapis trafia dokładnie tam, skąd pobrano dane
- ✅ Brak problemów z synchronizacją arkusza zbiorczego
- ✅ Widoczne jest, z którego arkusza pochodzi każdy rekord

## Rozwiązanie

### Krok 1: Utwórz/zaktualizuj Google Apps Script

1. Otwórz arkusz Google Sheets: 
   `https://docs.google.com/spreadsheets/d/1w0gwkeDLWh1rSkz-PWxnA9uB_43Fn7z52wmtQh70z34`

2. Kliknij **Rozszerzenia** → **Apps Script**

3. Usuń cały obecny kod i wklej kod z pliku: **[AppsScript.gs](AppsScript.gs)**

   Lub wklej poniższy kod bezpośrednio:

```javascript
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const params = e.parameter;
    const action = params.action || 'update';
    const rowIndex = parseInt(params.rowIndex);
    
    if (!rowIndex || rowIndex < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Nieprawidłowy numer wiersza'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Automatyczne wykrywanie arkusza - sprawdź najpierw "Response 2013", potem inne
    let sheet = ss.getSheetByName('Response 2013');
    
    if (!sheet) {
      sheet = ss.getSheetByName('Response');
    }
    
    if (!sheet) {
      const allSheets = ss.getSheets();
      for (let s of allSheets) {
        const name = s.getName();
        if (name.toLowerCase().includes('response')) {
          sheet = s;
          break;
        }
      }
    }
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Nie znaleziono arkusza Response'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'delete') {
      // Obsługa usuwania rekordu
      if (rowIndex > 1 && rowIndex <= sheet.getLastRow()) {
        sheet.deleteRow(rowIndex);
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success',
          message: 'Rekord usunięty',
          sheet: sheet.getName()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    } else {
      // Obsługa aktualizacji minut
      const minutes = parseFloat(params.minutes);
      
      if (isNaN(minutes)) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Nieprawidłowa wartość minut'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Sprawdź czy wiersz istnieje
      if (rowIndex > sheet.getLastRow()) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Wiersz nie istnieje'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Kolumna E (5) to "Minuty"
      sheet.getRange(rowIndex, 5).setValue(minutes);
      
      // Przelicz obciążenie (kolumna F = RPE * Minuty)
      const rpe = parseFloat(sheet.getRange(rowIndex, 4).getValue());
      if (rpe && !isNaN(rpe)) {
        const load = rpe * minutes;
        sheet.getRange(rowIndex, 6).setValue(load);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Minuty zaktualizowane',
        row: rowIndex,
        sheet: sheet.getName(),
        minutes: minutes
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    Logger.log('Błąd: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Błąd serwera: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Skrypt działa poprawnie',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// Funkcja testowa - możesz ją uruchomić w edytorze Apps Script
function testScript() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  Logger.log('Dostępne arkusze:');
  sheets.forEach(sheet => {
    Logger.log('- ' + sheet.getName() + ' (wierszy: ' + sheet.getLastRow() + ')');
  });
}
```

4. Kliknij **Zapisz** (ikona dyskietki lub Ctrl+S)

### Krok 2A: Jeśli masz już wdrożenie (aktualizacja)

1. Kliknij **Wdróż** → **Zarządzaj wdrożeniami**
2. Kliknij ikonę **ołówka** (edytuj) przy aktywnym wdrożeniu
3. W polu **Wersja** wybierz **Nowa wersja**
4. Kliknij **Wdróż**
5. Gotowe! URL wdrożenia się nie zmieni

### Krok 2B: Jeśli nie masz jeszcze wdrożenia (nowe)

1. Kliknij **Wdróż** → **Nowe wdrożenie**
2. Kliknij ikonę **koła zębatego** → wybierz **Aplikacja internetowa**
3. Ustaw:
   - **Opis**: `Monitoring RPE - zapisywanie minut`
   - **Wykonaj jako**: **Ja** (twoje konto)
   - **Kto ma dostęp**: **Wszyscy**
4. Kliknij **Wdróż**
5. **Autoryzuj dostęp** (przy pierwszym wdrożeniu):
   - Kliknij **Autoryzuj dostęp**
   - Wybierz swoje konto Google
   - Kliknij **Zaawansowane** 
   - Kliknij **Przejdź do [nazwa projektu] (niebezpieczne)**
   - Kliknij **Zezwól**
6. **SKOPIUJ URL** wdrożenia (będzie wyglądał jak: `https://script.google.com/macros/s/.../exec`)

### Krok 3: Zaktualizuj URL w aplikacji (jeśli trzeba)

Jeśli URL wdrożenia się zmienił:

1. Otwórz plik: `src/components/UzupelnijMinuty.jsx`
2. Znajdź linię (około 7):
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby...';
   ```
3. Zamień URL na nowy
4. Zapisz plik

## Testowanie

1. Otwórz aplikację w przeglądarce: http://localhost:5173/RPE/
2. Przejdź do zakładki **"Uzupełnij Minuty"**
3. **Sprawdź interfejs**:
   - Powinnaś widzieć kolumnę **"Arkusz"** z etykietami 2013/2011
   - Komunikat: "pobrano bezpośrednio z arkuszy źródłowych"
4. Otwórz konsolę deweloperską (F12)
5. Uzupełnij minuty dla jakiegoś rekordu i kliknij **"Zapisz"**
6. W konsoli zobaczysz szczegółowe logi:
   - Wysyłane dane (nazwisko, data treningu, sourceSheet)
   - Odpowiedź z serwera (status, sheet, row)
   - Ewentualne błędy
7. **Sprawdź arkusz źródłowy** (Response 2013 lub Response 2011):
   - Otwórz właściwy arkusz w Google Sheets
   - Znajdź wiersz z uzupełnionym nazwiskiem i datą
   - Sprawdź czy kolumna **Minuty** (E) jest wypełniona ✅
   - Sprawdź czy kolumna **Obciążenie** (F) została przeliczona ✅

**Komunikat sukcesu**: Po zapisie zobaczysz: "Zapisano pomyślnie! (Response 2013)" - to potwierdza, do którego arkusza zapisano dane.

## Struktura arkusza Google Sheets

Skrypt zakłada następującą strukturę kolumn w arkuszach źródłowych:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| Timestamp | Imię i Nazwisko | Data treningu | RPE | Minuty | Obciążenie | Drużyna |

- **Kolumna E** (5) - Minuty - tutaj zapisywane są wprowadzone minuty
- **Kolumna F** (6) - Obciążenie - automatycznie przeliczone (RPE × Minuty)

**Skrypt przeszukuje arkusze**: 
1. Response 2013
2. Response 2011

i znajduje wiersz pasujący po: **Nazwisko + Data treningu + Timestamp**

## Rozwiązywanie problemów

### Dane są zapisywane do złego arkusza

**Symptom**: Minuty zapisują się do "Response" zamiast "Response 2013" lub "Response 2011"

**Diagnostyka**:
1. W edytorze Apps Script uruchom funkcję `testScript` (▶️ Uruchom)
2. Sprawdź logi (Ctrl+Enter): czy arkusze Response 2013/2011 istnieją?
3. Zobacz plik **[DIAGNOZA.md](DIAGNOZA.md)** - szczegółowa instrukcja debugowania

**Po zapisie minut**:
1. W Apps Script → **Wykonania** (⏱️) → kliknij ostatnie wykonanie
2. W logach MUSISZ zobaczyć ramkę:
   ```
   ╔════════════════════════════════════════════╗
   ║  ZAPISUJĘ DO ARKUSZA ŹRÓDŁOWEGO!          ║
   ║  Arkusz: Response 2013                     ║
   ╚════════════════════════════════════════════╝
   ```
3. Jeśli widzisz nazwę właściwego arkusza - dane ZOSTAŁY ZAPISANE tam! ✅

### Błąd: "Nie znaleziono arkuszy źródłowych"
- Upewnij się, że masz arkusze: **Response 2013** i/lub **Response 2011**
- Nazwy muszą być dokładnie takie (spacja między "Response" a rokiem)
- Uruchom funkcję `testScript()` w Apps Script, aby zobaczyć listę dostępnych arkuszy

### Błąd: "Nie znaleziono rekordu dla: [nazwisko]"
- Sprawdź czy dane w arkuszu źródłowym pasują do danych w arkuszu zbiorczym
- Nazwy zawodników muszą być identyczne (wielkość liter jest ignorowana)
- Daty treningów muszą być w tym samym formacie
- Użyj funkcji `testFindRecord()` w Apps Script do testowania wyszukiwania

### Błąd: "Błąd połączenia"
- Sprawdź czy URL Apps Script jest prawidłowy
- Sprawdź czy skrypt jest wdrożony jako "Aplikacja internetowa"
- Sprawdź czy dostęp jest ustawiony na "Wszyscy"

### Dane nie pojawiają się w arkuszu
- Sprawdź czy autoryzowałeś dostęp do arkusza
- Sprawdź uprawnienia wdrożenia (powinno być "Wykonuj jako: Ja")
- Sprawdź logi w Apps Script: **Wykonanie** w menu bocznym
- Sprawdź w konsoli przeglądarki, do którego arkusza trafiły dane

## Dodatkowe informacje

- Skrypt automatycznie znajduje właściwy arkusz źródłowy (Response 2013 lub Response 2011)
- Skrypt automatycznie przelicza obciążenie (RPE × Minuty)
- Po zapisie minut rekord znika z listy w aplikacji
- Możesz również usuwać rekordy przyciskiem "Usuń"
- Dane są zapisywane **bezpośrednio w arkuszu źródłowym**, nie w arkuszu zbiorczym
