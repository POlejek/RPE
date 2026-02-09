# Monitoring RPE - Piłka Nożna ⚽

Aplikacja do monitorowania obciążenia treningowego zawodników piłki nożnej na podstawie RPE (Rate of Perceived Exertion).

## 🎯 Funkcje

- 📊 **Integracja z Google Sheets** - Automatyczne pobieranie danych z formularza Google Forms
- 👥 **Analiza zawodników** - Przeglądanie statystyk wszystkich zawodników lub indywidualnie
- 📈 **Wykresy i trendy** - Wizualizacja obciążenia treningowego w czasie
- ⚡ **Automatyczne odświeżanie** - Dane aktualizują się co 30 sekund
- 📱 **Responsywny design** - Działa na komputerze i telefonie

## 🚀 Uruchomienie

### Wymagania
- Node.js (wersja 16+)
- npm lub yarn

### Instalacja

1. Zainstaluj zależności:
```bash
npm install
```

2. Uruchom serwer deweloperski:
```bash
npm run dev
```

3. Otwórz przeglądarkę na: `http://localhost:5173`

### Build produkcyjny

```bash
npm run build
```

## ⚙️ Konfiguracja

### Google Sheets

1. Stwórz formularz Google Forms z polami:
   - Imię i nazwisko
   - Data treningu
   - RPE (skala 1-10)

2. Połącz formularz z Google Sheets

3. Trener uzupełnia kolumny:
   - Minuty
   - Obciążenie (automatycznie: RPE × Minuty)

4. Udostępnij arkusz:
   - Kliknij "Udostępnij"
   - Ustaw "Każdy, kto ma link"
   - Uprawnienia: "Czytelnik"

5. Skopiuj ID arkusza z URL i wklej do `src/components/MonitoringObciazen.jsx`:
```javascript
const SHEET_ID = 'TWOJE_ID_ARKUSZA';
```

### Google Apps Script (dla funkcji "Uzupełnij Minuty")

Aby umożliwić zapisywanie uzupełnionych minut z powrotem do arkuszy źródłowych:

**Jak to działa**:
- Aplikacja pobiera dane **bezpośrednio z Response 2013 i Response 2011** (nie z arkusza zbiorczego!)
- W tabeli widoczna jest kolumna **"Sygnatura czasowa"** - pozwala identyfikować i usuwać duplikaty
- Po uzupełnieniu minut, Apps Script zapisuje je do tego samego arkusza, z którego zostały pobrane
- Dopasowanie następuje po: **Nazwisko + Data treningu + Timestamp (do minuty)**
- Możliwość usuwania duplikatów przez wyświetlenie timestampu

**Konfiguracja**:

1. Otwórz arkusz Google Sheets
2. Kliknij **Rozszerzenia** → **Apps Script**
3. Skopiuj kod z pliku **[AppsScript.gs](AppsScript.gs)**
4. Kliknij **Zapisz** (Ctrl+S)
5. Kliknij **Wdróż** → **Zarządzaj wdrożeniami**
6. Jeśli masz już wdrożenie:
   - Kliknij ikonę **ołówka** → **Nowa wersja** → **Wdróż**
7. Jeśli nie masz wdrożenia:
   - **Nowe wdrożenie** → **Aplikacja internetowa**
   - **Wykonaj jako**: Ja
   - **Kto ma dostęp**: Wszyscy
   - Kliknij **Wdróż** i **skopiuj URL**

📖 Szczegółowa instrukcja: [GOOGLE_APPS_SCRIPT_SETUP.md](GOOGLE_APPS_SCRIPT_SETUP.md)

**Aktualny URL Apps Script:**
```
https://script.google.com/macros/s/AKfycbx2_dksu9TLbjIlWmSEOKgkxEc8xN4Z81lUnc4FKfXNtT2ELhAU_QJF6U96i0J7y3FX/exec
```

## 📊 Skala RPE

- **1-3**: Trening lekki
- **4-6**: Trening umiarkowany
- **7-8**: Trening ciężki
- **9-10**: Trening maksymalny

**Obciążenie** = RPE × Czas treningu (minuty)

## 🛠️ Technologie

- React 18
- Vite
- Tailwind CSS
- Recharts (wykresy)
- Lucide React (ikony)

## 📝 Struktura danych

Arkusz Google Sheets powinien mieć następujące kolumny:
```
Sygnatura czasowa | Imię i nazwisko | Data treningu | RPE | Minuty | Obciążenie | Drużyna
```

**Kolumny w arkuszach źródłowych (Response 2013, Response 2011):**
- **A**: Sygnatura czasowa (timestamp) - unikalne ID dla każdego rekordu
- **B**: Imię i nazwisko
- **C**: Data treningu (format YYYY-MM-DD)
- **D**: RPE (1-10)
- **E**: Minuty (uzupełniane przez trenera lub aplikację)
- **F**: Obciążenie (RPE × Minuty, obliczane automatycznie)
- **G**: Drużyna

## 🤝 Wsparcie

W przypadku problemów z połączeniem z Google Sheets, aplikacja wyświetli szczegółowe instrukcje naprawy.

## 📄 Licencja

MIT
