# 🎯 ZMIANY - Zapis minut do arkuszy źródłowych

## Data: 6 lutego 2026

### 🆕 NAJNOWSZE ZMIANY (wieczór 6 lutego 2026)

#### ✅ Dodano kolumnę "Sygnatura czasowa" w UI
- Tabela "Uzupełnij Minuty" teraz wyświetla pełny timestamp dla każdego rekordu
- Timestamp pozwala użytkownikowi zidentyfikować duplikaty (np. dwa rekordy tego samego zawodnika z tej samej daty)
- Format: `YYYY-MM-DD HH:mm:ss` (np. "2026-02-05 21:28:51")

#### ✅ Naprawiono dopasowanie timestampów
**Problem**: Apps Script otrzymywał Date objects z `getValues()`, konwertował je przez `.toString()` do formatu JS Date ("Thu Feb 05..."), co nie pasowało do timestampów z CSV ("2026-02-05 21:28:51").

**Rozwiązanie**: 
- Apps Script teraz konwertuje Date objects do formatu `YYYY-MM-DD HH:mm:ss`
- Porównuje pierwsze 16 znaków (do minuty): `"YYYY-MM-DD HH:mm"`
- Dopasowanie jest precyzyjne i niezawodne

#### ✅ Możliwość usuwania duplikatów
- Dzięki wyświetlonemu timestampowi użytkownik może:
  - Zidentyfikować duplikaty (ten sam zawodnik, ta sama data, różne timestampy)
  - Usunąć wybrany duplikat przyciskiem "Usuń"
  - Uzupełnić minuty dla właściwego rekordu

#### 📝 Commit
- `60eb96e`: "feat: Dodano kolumnę Sygnatura czasowa w tabeli uzupełniania minut"
- Zaktualizowano Apps Script z poprawioną konwersją timestampów

---

## 📝 Problem
Minuty były zapisywane do arkusza zbiorczego **Response**, zamiast do oryginalnych arkuszy źródłowych (**Response 2013** i **Response 2011**).

**Przyczyna**: Aplikacja React pobierała dane z arkusza zbiorczego "Response", a następnie Apps Script próbował znaleźć odpowiedni wiersz w arkuszach źródłowych - co powodowało problemy z dopasowaniem.

## ✅ Rozwiązanie

### Zmiany w aplikacji React (`src/components/UzupelnijMinuty.jsx`)

**KLUCZOWA ZMIANA: Pobieranie danych bezpośrednio z arkuszy źródłowych!**

**PRZED:**
- Pobierał dane z arkusza zbiorczego "Response" (GID 243539768)
- Apps Script próbował znaleźć wiersz w Response 2013/2011
- Problemy z dopasowaniem (różne formaty, synchronizacja)

**TERAZ:**
- ✅ Pobiera dane **bezpośrednio** z arkuszy źródłowych: **Response 2013** i **Response 2011**
- ✅ Każdy rekord ma przypisany `sourceSheet` (z którego arkusza pochodzi)
- ✅ W tabeli widoczna jest kolumna "Arkusz" z oznaczeniem 2013/2011
- ✅ Apps Script zapisuje do tego samego arkusza, z którego pobrano dane
- ✅ Komunikat sukcesu pokazuje, do którego arkusza zapisano dane

## 🔧 Jak to działa teraz

1. **Użytkownik otwiera "Uzupełnij Minuty"**
2. **Aplikacja pobiera dane** bezpośrednio z Response 2013 i Response 2011
3. **Widzi listę** rekordów z brakującymi minutami, każdy ma etykietę arkusza (2013/2011)
4. **Uzupełnia minuty** i klika Zapisz
5. **Apps Script**:
   - Otrzymuje: nazwisko, data treningu, timestamp
   - Przeszukuje tylko Response 2013 i Response 2011
   - Znajduje pasujący wiersz (nazwisko + data + timestamp)
   - Zapisuje minuty w kolumnie E
   - Przelicza obciążenie (RPE × Minuty) w kolumnie F
   - **Zwraca informację, do którego arkusza zapisano**
6. **Komunikat sukcesu**: "Zapisano pomyślnie! (Response 2013)" ✅
7. **Rekord znika** z listy w aplikacji
8. **Dane są w właściwym arkuszu źródłowym** ✅✅✅

## 📂 Zmodyfikowane pliki

- ✅ `src/components/UzupelnijMinuty.jsx` - **GŁÓWNA ZMIANA**: pobieranie z arkuszy źródłowych
- ✅ `AppsScript.gs` - dodano szczegółowe logowanie
- ✅ `README.md` - zaktualizowano dokumentację
- ✅ `GOOGLE_APPS_SCRIPT_SETUP.md` - zaktualizowano instrukcję
- ✅ `DIAGNOZA.md` - dodano instrukcję debugowania

## 🚀 Co teraz zrobić

### 1. Odśwież przeglądarkę
Aplikacja powinna automatycznie przeładować się z nowymi zmianami.

### 2. Sprawdź interfejs
- W tabeli "Uzupełnij Minuty" powinna być kolumna **"Arkusz"**
- Każdy rekord ma etykietę **2013** (niebieski) lub **2011** (zielony)
- Komunikat u góry mówi: "pobrano bezpośrednio z arkuszy źródłowych"

### 3. Przetestuj zapis
1. Uzupełnij minuty dla jakiegoś rekordu (najlepiej z Response 2013)
2. Kliknij **Zapisz**
3. W konsoli (F12) zobaczysz:
   ```
   Wysyłanie danych do Apps Script: {sourceSheet: "Response 2013", ...}
   Wynik JSON: {status: "success", sheet: "Response 2013", row: 5}
   ```
4. **Sprawdź arkusz Response 2013** - minuty powinny być tam! ✅

### 4. Sprawdź logi Apps Script (opcjonalnie)
W Apps Script → Wykonania → kliknij ostatnie wykonanie
Zobaczysz ramkę:
```
╔════════════════════════════════════════════╗
║  ZAPISUJĘ DO ARKUSZA ŹRÓDŁOWEGO!          ║
║  Arkusz: Response 2013                     ║
╚════════════════════════════════════════════╝
```

## 🐛 Debugowanie

Jeśli coś nie działa:

1. **Otwórz konsolę przeglądarki** (F12)
2. **Kliknij "Zapisz"** przy jakimś rekordzie
3. **Zobacz logi**:
   ```
   Wysyłanie danych do Apps Script: {name: "...", trainingDate: "...", minutes: ...}
   Odpowiedź z Apps Script: {status: "success", sheet: "Response 2013", row: 5}
   ```
4. **Sprawdź arkusz źródłowy** wskazany w odpowiedzi

W Apps Script możesz też uruchomić funkcję `testScript()` aby zobaczyć dostępne arkusze.

## 📊 Przykład działania

**Rekord w aplikacji:**
- Nazwisko: Jan Kowalski
- Data: 2026-02-05
- RPE: 7
- Minuty: (puste)

**Po uzupełnieniu 60 minut:**
1. Aplikacja wysyła: `{name: "Jan Kowalski", trainingDate: "2026-02-05", minutes: 60}`
2. Apps Script przeszukuje Response 2013 i Response 2011
3. Znajdzie wiersz dla Jana Kowalskiego z datą 2026-02-05
4. Zapisze: E=60, F=420 (7×60)
5. Zwróci: `{status: "success", sheet: "Response 2013", row: 42}`
6. Rekord znika z listy w aplikacji

## ✨ Korzyści

- ✅ Dane są zapisywane bezpośrednio w źródle (nie ma duplikatów)
- ✅ Nie trzeba utrzymywać synchronizacji numerów wierszy
- ✅ Działa niezależnie od zmian w arkuszu zbiorczym
- ✅ Lepsze logowanie i debugowanie
- ✅ Elastyczne dopasowanie (ignoruje wielkość liter w nazwiskach)
