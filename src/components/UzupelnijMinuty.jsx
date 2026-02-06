import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Save, Trash2, Users } from 'lucide-react';

export default function UzupelnijMinuty() {
  const SHEET_ID = '1w0gwkeDLWh1rSkz-PWxnA9uB_43Fn7z52wmtQh70z34';
  
  // GID arkuszy źródłowych (WAŻNE: pobieramy z nich dane!)
  const RESPONSE_2013_SHEET_NAME = 'Response 2013';
  const RESPONSE_2011_SHEET_NAME = 'Response 2011';
  
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbygQIsgWF_uJaRsgnjV9uDWFAfh8cwNizw-NCUax7dA4avuVniOdl_z2m7dWU6j6R6V/exec';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accessMethod, setAccessMethod] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('wszystkie');
  const [minutesById, setMinutesById] = useState({});
  const [saveStatus, setSaveStatus] = useState({});

  const fetchMissingMinutes = async () => {
    setLoading(true);
    setError('');

    // Lista arkuszy źródłowych do pobrania
    const sourceSheets = [
      { name: RESPONSE_2013_SHEET_NAME, label: '2013' },
      { name: RESPONSE_2011_SHEET_NAME, label: '2011' }
    ];

    const allParsedRows = [];
    let successCount = 0;

    for (const sourceSheet of sourceSheets) {
      console.log(`Pobieranie danych z arkusza: ${sourceSheet.name}`);
      
      const methods = [
        {
          name: `Export CSV (${sourceSheet.name})`,
          url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sourceSheet.name)}`
        },
        {
          name: `AllOrigins API (${sourceSheet.name})`,
          url: `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sourceSheet.name)}`)}`
        }
      ];

      let sheetSuccess = false;

      for (const method of methods) {
        try {
          const response = await fetch(method.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (!response.ok) {
            continue;
          }

          const csvText = await response.text();
          if (!csvText || csvText.trim().length === 0) {
            continue;
          }

          if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<html')) {
            continue;
          }

          const lines = csvText.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            continue;
          }

          console.log(`✓ Pobrano ${lines.length} linii z ${sourceSheet.name}`);

          // Parsuj wiersze z tego arkusza
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const columns = [];
            let current = '';
            let inQuotes = false;

            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                columns.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            columns.push(current.trim());

            const cleanColumns = columns.map(col => col.replace(/^"|"$/g, ''));
            if (cleanColumns.length < 7) {
              continue;
            }

            const timestamp = cleanColumns[0];
            const name = cleanColumns[1];
            const trainingDate = cleanColumns[2];
            const rpeRaw = cleanColumns[3];
            const minutesRaw = cleanColumns[4];
            const team = (cleanColumns.length > 6 ? cleanColumns[6] : sourceSheet.label) || sourceSheet.label;

            if (!name || name.toLowerCase().includes('nazwisko') || name.toLowerCase().includes('imie')) {
              continue;
            }

            const isMissingMinutes = minutesRaw == null || String(minutesRaw).trim() === '';
            if (!isMissingMinutes) {
              continue;
            }

            const rowIndex = i + 1;
            const id = `${sourceSheet.name}__${rowIndex}__${name}__${trainingDate}__${timestamp}`;
            
            allParsedRows.push({
              id,
              rowIndex,
              name,
              team,
              trainingDate,
              timestamp,
              rpe: parseFloat(rpeRaw) || null,
              sourceSheet: sourceSheet.name // WAŻNE: zapisujemy źródło danych!
            });
          }

          sheetSuccess = true;
          successCount++;
          break;
        } catch (err) {
          console.error(`${method.name} - błąd:`, err);
          continue;
        }
      }

      if (!sheetSuccess) {
        console.warn(`Nie udało się pobrać danych z ${sourceSheet.name}`);
      }
    }

    if (successCount === 0) {
      setError('Nie można pobrać danych z żadnego arkusza źródłowego.');
    } else {
      console.log(`✓ Pobrano dane z ${successCount} arkuszy, łącznie ${allParsedRows.length} rekordów z brakującymi minutami`);
      setRows(allParsedRows);
      setAccessMethod(`Pobrano z ${successCount} arkuszy źródłowych`);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchMissingMinutes();
  }, []);

  const teams = useMemo(() => {
    const unique = new Set(rows.map(row => row.team));
    return ['wszystkie', ...Array.from(unique).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (selectedTeam === 'wszystkie') return rows;
    return rows.filter(row => row.team === selectedTeam);
  }, [rows, selectedTeam]);

  const updateMinutes = (id, value) => {
    setMinutesById(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const updateStatus = (id, next) => {
    setSaveStatus(prev => ({
      ...prev,
      [id]: next
    }));
  };

  const handleSave = async (row) => {
    const minutesValue = parseFloat(minutesById[row.id]);
    if (!Number.isFinite(minutesValue) || minutesValue <= 0) {
      updateStatus(row.id, { state: 'error', message: 'Podaj poprawna liczbe minut.' });
      return;
    }

    updateStatus(row.id, { state: 'saving', message: '' });

    try {
      const payload = new URLSearchParams({
        name: row.name,
        trainingDate: row.trainingDate,
        timestamp: row.timestamp,
        minutes: String(minutesValue),
        action: 'update'
      });

      console.log('Wysyłanie danych do Apps Script:', {
        url: APPS_SCRIPT_URL,
        name: row.name,
        trainingDate: row.trainingDate,
        minutes: minutesValue,
        sourceSheet: row.sourceSheet  // Dla informacji (Apps Script i tak wyszuka wiersz)
      });

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
        redirect: 'follow'
      });

      console.log('Odpowiedź z Apps Script:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      // Sprawdź odpowiedź
      const result = await response.json();
      console.log('Wynik JSON:', result);
      
      if (result.status === 'success') {
        setRows(prev => prev.filter(item => item.id !== row.id));
        setMinutesById(prev => {
          const updated = {...prev};
          delete updated[row.id];
          return updated;
        });
        
        // Pokaż do którego arkusza zapisano
        const sheetInfo = result.sheet ? ` (${result.sheet})` : '';
        updateStatus(row.id, { 
          state: 'success', 
          message: `Zapisano pomyslnie!${sheetInfo}` 
        });
        
        // Wyczyść status po 3 sekundach
        setTimeout(() => {
          updateStatus(row.id, { state: '', message: '' });
        }, 3000);
      } else {
        console.error('Błąd z Apps Script:', result);
        updateStatus(row.id, { state: 'error', message: result.message || 'Blad zapisu.' });
      }
    } catch (err) {
      console.error('Blad zapisu:', err);
      updateStatus(row.id, { state: 'error', message: 'Blad polaczenia. Sprawdz URL Apps Script.' });
    }
  };

  const handleDelete = async (row) => {
    if (!confirm(`Czy na pewno chcesz usunąć rekord dla ${row.name}?`)) {
      return;
    }

    updateStatus(row.id, { state: 'saving', message: '' });

    try {
      const payload = new URLSearchParams({
        action: 'delete',
        name: row.name,
        trainingDate: row.trainingDate,
        timestamp: row.timestamp
      });

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
        redirect: 'follow'
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        setRows(prev => prev.filter(item => item.id !== row.id));
        setMinutesById(prev => {
          const updated = {...prev};
          delete updated[row.id];
          return updated;
        });
        
        const sheetInfo = result.sheet ? ` (${result.sheet})` : '';
        updateStatus(row.id, { 
          state: 'success', 
          message: `Usunieto pomyslnie!${sheetInfo}` 
        });
        
        // Wyczyść status po 3 sekundach
        setTimeout(() => {
          updateStatus(row.id, { state: '', message: '' });
        }, 3000);
      } else {
        updateStatus(row.id, { state: 'error', message: result.message || 'Blad usuwania.' });
      }
    } catch (err) {
      console.error('Blad usuwania:', err);
      updateStatus(row.id, { state: 'error', message: 'Blad polaczenia. Sprawdz URL Apps Script.' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-orange-600" />
                Uzupelnij minuty - Monitoring Obciazen
              </h1>
              <p className="text-gray-600 mt-2">Lista rekordow bez uzupelnionych minut</p>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
              {accessMethod && (
                <div className="text-xs text-gray-500">{accessMethod}</div>
              )}
              <button
                onClick={fetchMissingMinutes}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Ladowanie...' : 'Odswiez'}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-sm text-gray-600 bg-orange-50 p-3 rounded-lg">
              <p className="font-semibold mb-1">📋 Brakujące minuty - pobrano bezpośrednio z arkuszy źródłowych</p>
              <p><strong>Response 2013</strong> i <strong>Response 2011</strong></p>
              <p className="text-xs mt-1">Po zapisie dane trafiają do tego samego arkusza, z którego zostały pobrane. ✅</p>
            </div>
            <details className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg cursor-pointer">
              <summary className="font-semibold cursor-pointer hover:text-blue-700">
                ⚙️ Konfiguracja Google Apps Script
              </summary>
              <div className="mt-2 space-y-1">
                <p className="font-mono bg-white p-2 rounded border">
                  URL: {APPS_SCRIPT_URL}
                </p>
                <p className="text-gray-600">
                  Jesli zapis nie dziala, sprawdz czy Google Apps Script jest poprawnie wdrozony.
                </p>
                <p className="text-gray-600">
                  Otwórz arkusz Google Sheets → Rozszerzenia → Apps Script
                </p>
              </div>
            </details>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-red-800 font-semibold">Blad pobierania danych</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-sm text-gray-600">Rekordy: {filteredRows.length}</div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Druzyna</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                {teams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading && rows.length === 0 && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Ladowanie brakujacych rekordow...
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-amber-50 to-orange-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Zawodnik</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Arkusz</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Data treningu</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">RPE</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Minuty</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50 transition-colors`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-800">{row.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        row.sourceSheet === 'Response 2013' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {row.sourceSheet === 'Response 2013' ? '2013' : '2011'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-800">{row.trainingDate}</td>
                    <td className="px-4 py-3 text-center text-gray-800">{row.rpe ?? '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={minutesById[row.id] || ''}
                        onChange={(e) => updateMinutes(row.id, e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                        placeholder="min"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleSave(row)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                          disabled={saveStatus[row.id]?.state === 'saving'}
                        >
                          {saveStatus[row.id]?.state === 'saving' ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Zapisz
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                          disabled={saveStatus[row.id]?.state === 'saving'}
                        >
                          <Trash2 className="w-4 h-4" />
                          Usun
                        </button>
                      </div>
                      {saveStatus[row.id]?.state === 'error' && (
                        <div className="text-xs text-red-600 mt-1">{saveStatus[row.id]?.message}</div>
                      )}
                      {saveStatus[row.id]?.state === 'success' && (
                        <div className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {saveStatus[row.id]?.message}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                      Brak rekordow z brakujacymi minutami.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
