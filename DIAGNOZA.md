# 🔍 DIAGNOZA PROBLEMU - Zapis do właściwego arkusza

## Problem
Dane są zapisywane do arkusza "Response" zamiast do "Response 2013" lub "Response 2011".

## ✅ Kroki diagnostyczne

### 1. Wdróż zaktualizowany kod
1. Otwórz arkusz Google Sheets
2. **Rozszerzenia** → **Apps Script**
3. Skopiuj cały kod z pliku `AppsScript.gs`
4. **Zapisz** (Ctrl+S)
5. **Wdróż** → **Zarządzaj wdrożeniami** → **Edytuj** → **Nowa wersja** → **Wdróż**

### 2. Sprawdź strukturę arkuszy (WAŻNE!)

**Uruchom funkcję testową:**
1. W edytorze Apps Script wybierz funkcję: `testScript`
2. Kliknij ▶️ **Uruchom**
3. Zobacz **Logi** (Ctrl+Enter lub widok → Logi)

**Co sprawdzić:**
- ✅ Czy arkusze "Response 2013" i "Response 2011" istnieją?
- ✅ Jaka jest struktura kolumn? (powinny być: Timestamp | Nazwisko | Data | RPE | Minuty | Obciążenie | Drużyna)
- ✅ Czy są jakieś dane w tych arkuszach?

### 3. Przetestuj wyszukiwanie konkretnego rekordu

**Zmodyfikuj i uruchom `testFindRecord`:**
1. W kodzie Apps Script znajdź funkcję `testFindRecord`
2. Zmień te linie na rzeczywiste dane z arkusza:
   ```javascript
   const testName = 'Jan Kowalski';  // Wpisz nazwisko które widzisz w aplikacji
   const testDate = '2026-02-05';    // Wpisz datę w formacie YYYY-MM-DD
   ```
3. Zapisz i uruchom funkcję `testFindRecord`
4. Sprawdź logi - czy rekord został znaleziony?

### 4. Przetestuj zapis minut z aplikacji

**Z włączonymi logami:**
1. Odśwież aplikację w przeglądarce
2. Otwórz **konsolę deweloperską** (F12)
3. Przejdź do zakładki **"Uzupełnij Minuty"**
4. Uzupełnij minuty dla jakiegoś rekordu i kliknij **Zapisz**
5. Sprawdź konsol w przeglądarce - co wysyłane jest do Apps Script?

**W Google Apps Script:**
1. W edytorze Apps Script przejdź do: **Wykonania** (ikona ⏱️ w menu bocznym)
2. Znajdź ostatnie wykonanie funkcji `doPost`
3. Kliknij na nie i zobacz szczegółowe logi
4. Sprawdź:
   - ✅ Czy arkusze źródłowe zostały znalezione?
   - ✅ Który arkusz został przeszukany?
   - ✅ Czy wiersz został znaleziony?
   - ✅ DO KTÓREGO ARKUSZA zapisano dane? (powinna być ramka)

## 🔍 Możliwe przyczyny problemu

### Przyczyna 1: Różne formaty daty
**Problem**: Data w aplikacji ma inny format niż w arkuszu.

**Przykład:**
- Aplikacja wysyła: `2026-02-05`
- Arkusz ma: `05.02.2026` lub `2/5/2026`

**Rozwiązanie**: Sprawdź format daty w logach i dostosuj w Apps Script.

### Przyczyna 2: Różnica w nazwisku
**Problem**: Nazwisko w aplikacji jest zapisane inaczej niż w arkuszu.

**Przykład:**
- Aplikacja: `Jan Kowalski`
- Arkusz: `Kowalski Jan` lub `JAN KOWALSKI`

**Rozwiązanie**: Kod ignoruje wielkość liter, ale kolejność musi być identyczna.

### Przyczyna 3: Inna struktura kolumn
**Problem**: Kolumny w arkuszach Response 2013/2011 są w innej kolejności.

**Rozwiązanie**: Sprawdź funkcją `testScript` jakie są nagłówki i dostosuj numery kolumn.

### Przyczyna 4: Arkusz "Response" to formuły
**Problem**: Arkusz "Response" zbiera dane przez formuły i skrypt zapisuje faktycznie do niego.

**Rozwiązanie**: To trzeba sprawdzić - czy w arkuszu "Response" są formuły typu `=IMPORTRANGE` lub podobne?

## 📊 Co zobaczyć w logach Apps Script

Po zapisie minut powinnaś zobaczyć coś takiego:

```
====================================
Otrzymano żądanie: {name: "Jan Kowalski", trainingDate: "2026-02-05", minutes: "60", action: "update"}
Akcja: update
Nazwisko: Jan Kowalski
Data treningu: 2026-02-05
====================================

--- Sprawdzanie arkuszy źródłowych ---
Response 2013: ISTNIEJE ✓
Response 2011: ISTNIEJE ✓

Znaleziono 2 arkuszy źródłowych

--- Przeszukiwanie arkuszy ---
Przeszukuję arkusz: Response 2013, liczba wierszy: 150
Wiersz 2: Jan Kowalski | 2026-02-05 | nameMatch=true, dateMatch=true, timestampMatch=true
✓ ZNALEZIONO! Wiersz 2 - Jan Kowalski, 2026-02-05

✓✓✓ SUKCES! Znaleziono wiersz 2 w arkuszu: Response 2013 ✓✓✓

╔════════════════════════════════════════════╗
║  ZAPISUJĘ DO ARKUSZA ŹRÓDŁOWEGO!          ║
╠════════════════════════════════════════════╣
║  Arkusz: Response 2013                     ║
║  Wiersz: 2                                 ║
║  Minuty: 60                                ║
╚════════════════════════════════════════════╝

✓ Zapisano minuty: 60 w kolumnie E wiersza 2 arkusza "Response 2013"
```

**Jeśli widzisz taki log** - dane ZOSTAŁY ZAPISANE do Response 2013! ✅

## ❓ Dalsze kroki

Jeśli po wdrożeniu i sprawdzeniu logów:
1. Logi pokazują że dane zapisano do Response 2013/2011 ✓
2. Ale w arkuszu źródłowym nadal nie ma minut ✗

**Możliwe przyczyny:**
- Arkusz Response 2013/2011 jest chroniony
- Brak uprawnień do zapisu
- Problem z autoryzacją Apps Script

**Co zrobić:**
1. Sprawdź uprawnienia arkusza (czy nie jest chroniony?)
2. Sprawdź autoryzację Apps Script (Wdróż → powinno być "Wykonuj jako: Ja")
3. Spróbuj ręcznie edytować komórkę w Response 2013 - czy możesz?
