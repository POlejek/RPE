import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Save, Users } from 'lucide-react';

export default function UzupelnijMinuty() {
  const SHEET_ID = '1w0gwkeDLWh1rSkz-PWxnA9uB_43Fn7z52wmtQh70z34';
  const SHEET_GID = '243539768';
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

    const methods = [
      {
        name: `Export CSV (arkusz Response - GID=${SHEET_GID})`,
        url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`
      },
      {
        name: `Google Sheets gviz (GID=${SHEET_GID})`,
        url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`
      },
      {
        name: `AllOrigins API (GID=${SHEET_GID})`,
        url: `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`)}`
      },
      {
        name: `Export CSV (domyslny)`,
        url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
      },
      {
        name: 'Google Sheets gviz (domyslny)',
        url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`
      }
    ];

    let success = false;

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

        const parsedRows = [];

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
          const team = (cleanColumns.length > 6 ? cleanColumns[6] : 'Brak') || 'Brak';

          if (!name || name.toLowerCase().includes('nazwisko') || name.toLowerCase().includes('imie')) {
            continue;
          }

          const isMissingMinutes = minutesRaw == null || String(minutesRaw).trim() === '';
          if (!isMissingMinutes) {
            continue;
          }

          const id = `${name}__${trainingDate}__${timestamp}`;
          parsedRows.push({
            id,
            name,
            team,
            trainingDate,
            timestamp,
            rpe: parseFloat(rpeRaw) || null
          });
        }

        setRows(parsedRows);
        setAccessMethod(method.name);
        success = true;
        break;
      } catch (err) {
        console.error(`${method.name} - blad:`, err);
        continue;
      }
    }

    if (!success) {
      setError('Nie mozna pobrac danych. Sprawdz uprawnienia arkusza.');
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
        minutes: String(minutesValue)
      });

      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: payload
      });

      setRows(prev => prev.filter(item => item.id !== row.id));
      updateStatus(row.id, { state: 'success', message: 'Wyslano do zapisu.' });
    } catch (err) {
      updateStatus(row.id, { state: 'error', message: 'Blad polaczenia.' });
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

          <div className="mt-4 text-sm text-gray-600 bg-orange-50 p-3 rounded-lg">
            Brakujace minuty w arkuszu Response. Po zapisie rekord znika z listy.
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
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Druzyna</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Data treningu</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">RPE</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Minuty</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Akcja</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50 transition-colors`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-800">{row.name}</td>
                    <td className="px-4 py-3 text-center text-orange-700 font-semibold">{row.team}</td>
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
