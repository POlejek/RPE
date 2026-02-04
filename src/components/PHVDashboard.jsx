import React, { useState, useEffect } from 'react';
import { PieChart, Pie, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Users, TrendingUp, Activity, RefreshCw, AlertCircle, CheckCircle, Download } from 'lucide-react';

export default function PHVDashboard() {
  const SHEET_ID = '1w0gwkeDLWh1rSkz-PWxnA9uB_43Fn7z52wmtQh70z34';
  const SHEET_GID = '1571847888'; // GID dla zakładki "PHV zbiorcze"
  const SHEET_NAME = 'PHV zbiorcze'; // Nazwa zakładki
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [accessMethod, setAccessMethod] = useState('');
  
  // Filtry
  const [filterPhase, setFilterPhase] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterAgeMin, setFilterAgeMin] = useState('');
  const [filterAgeMax, setFilterAgeMax] = useState('');

  // Wzory obliczeniowe PHV (Mirwald et al.)
  const calculatePHV = (gender, age, height, weight, sittingHeight, legLength) => {
    let maturityOffset;
    
    if (gender === 'Chłopiec' || gender === 'M' || gender === 'Mężczyzna') {
      // Wzór dla chłopców
      maturityOffset = -9.236 + 
        (0.0002708 * legLength * sittingHeight) +
        (-0.001663 * age * legLength) +
        (0.007216 * age * sittingHeight) +
        (0.02292 * (weight / height) * 100);
    } else {
      // Wzór dla dziewcząt
      maturityOffset = -9.376 + 
        (0.0001882 * legLength * sittingHeight) +
        (0.0022 * age * legLength) +
        (0.005841 * age * sittingHeight) +
        (-0.002658 * age * weight) +
        (0.07693 * (weight / height) * 100);
    }
    
    const phvAge = age - maturityOffset;
    const biologicalAge = age + maturityOffset;
    
    // Określenie fazy
    let phase;
    if (maturityOffset < -1.0) {
      phase = 'PRE-PHV';
    } else if (maturityOffset >= -1.0 && maturityOffset <= 1.0) {
      phase = 'CIRCA-PHV';
    } else {
      phase = 'POST-PHV';
    }
    
    return {
      maturityOffset,
      phvAge,
      biologicalAge,
      phase
    };
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return isNaN(date) ? null : date;
    } catch {
      return null;
    }
  };

  const calculateAge = (birthDate, measurementDate) => {
    const birth = parseDate(birthDate);
    const measurement = parseDate(measurementDate) || new Date();
    
    if (!birth) return 0;
    
    const diffMs = measurement - birth;
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970) + (ageDate.getUTCMonth() / 12);
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    const methods = [
      {
        name: `Export CSV po nazwie (${SHEET_NAME})`,
        url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`
      },
      {
        name: `Export CSV (arkusz PHV - GID=${SHEET_GID})`,
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
        name: `Export CSV (domyślny)`,
        url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
      },
      {
        name: 'Google Sheets gviz (domyślny)',
        url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`
      }
    ];
    
    let success = false;
    
    for (const method of methods) {
      try {
        console.log(`Próbuję metodę: ${method.name}`);
        
        const response = await fetch(method.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (!response.ok) {
          console.log(`${method.name} - błąd HTTP: ${response.status}`);
          continue;
        }
        
        const csvText = await response.text();
        
        console.log(`${method.name} - Pierwsze 200 znaków odpowiedzi:`, csvText.substring(0, 200));
        
        if (!csvText || csvText.trim().length === 0) {
          console.log(`${method.name} - pusta odpowiedź`);
          continue;
        }
        
        if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<html')) {
          console.log(`${method.name} - zwrócono HTML (brak uprawnień)`);
          continue;
        }
        
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          console.log(`${method.name} - za mało linii: ${lines.length}`);
          continue;
        }
        
        console.log(`${method.name} - SUKCES! Liczba linii: ${lines.length}`);
        
        const parsedData = [];
        
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
          
          console.log(`Linia ${i}: Kolumny =`, cleanColumns);
          
          // Struktura: Sygnatura czasowa, Imię i Nazwisko, Wzrost (cm), Masa (kg), Wzrost siedzący (cm), Data urodzenia
          if (cleanColumns.length < 6) {
            console.log(`Pominięto linię ${i} - za mało kolumn (${cleanColumns.length})`);
            continue;
          }
          
          const measurementDate = cleanColumns[0]; // Sygnatura czasowa
          const name = cleanColumns[1]; // Imię i nazwisko
          if (!name || name.toLowerCase().includes('imię') || name === '') {
            console.log(`Pominięto linię ${i} - nagłówek lub puste nazwisko`);
            continue;
          }
          
          const height = parseFloat(cleanColumns[2]) || 0; // Wzrost całkowity
          const weight = parseFloat(cleanColumns[3]) || 0; // Masa ciała
          const sittingHeight = parseFloat(cleanColumns[4]) || 0; // Wzrost siedzący
          const birthDate = cleanColumns[5]; // Data urodzenia
          const gender = 'Chłopiec'; // Domyślna płeć
          
          console.log(`Zawodnik: ${name}, Płeć: ${gender} (domyślna), Wzrost: ${height}, Masa: ${weight}, Wys.siedz: ${sittingHeight}`);
          
          if (height === 0 || weight === 0 || sittingHeight === 0) {
            console.log(`Pominięto linię ${i} - brak pomiarów`);
            continue;
          }
          
          const legLength = height - sittingHeight;
          const age = calculateAge(birthDate, measurementDate);
          
          console.log(`Wiek: ${age}, Długość nóg: ${legLength}`);
          
          if (age === 0) {
            console.log(`Pominięto linię ${i} - brak wieku`);
            continue;
          }
          
          const phvResults = calculatePHV(gender, age, height, weight, sittingHeight, legLength);
          
          console.log(`PHV Results:`, phvResults);
          
          parsedData.push({
            name,
            gender,
            birthDate,
            measurementDate,
            height,
            weight,
            sittingHeight,
            legLength,
            chronologicalAge: age,
            ...phvResults
          });
        }
        
        console.log(`Łącznie sparsowanych zawodników: ${parsedData.length}`);
        
        if (parsedData.length === 0) {
          console.log(`${method.name} - brak danych po parsowaniu`);
          continue;
        }
        
        setData(parsedData);
        setLastUpdate(new Date());
        setAccessMethod(method.name);
        success = true;
        break;
        
      } catch (err) {
        console.error(`${method.name} - błąd:`, err);
        continue;
      }
    }
    
    if (!success) {
      setError('Nie można pobrać danych z arkusza PHV. Sprawdź uprawnienia.');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredData = data.filter(player => {
    if (filterPhase && player.phase !== filterPhase) return false;
    if (filterGender && player.gender !== filterGender) return false;
    if (filterAgeMin && player.chronologicalAge < parseFloat(filterAgeMin)) return false;
    if (filterAgeMax && player.chronologicalAge > parseFloat(filterAgeMax)) return false;
    return true;
  });

  const stats = {
    total: filteredData.length,
    prePHV: filteredData.filter(p => p.phase === 'PRE-PHV').length,
    circaPHV: filteredData.filter(p => p.phase === 'CIRCA-PHV').length,
    postPHV: filteredData.filter(p => p.phase === 'POST-PHV').length,
    avgAge: filteredData.length > 0 ? (filteredData.reduce((sum, p) => sum + p.chronologicalAge, 0) / filteredData.length).toFixed(1) : 0,
    avgOffset: filteredData.length > 0 ? (filteredData.reduce((sum, p) => sum + p.maturityOffset, 0) / filteredData.length).toFixed(2) : 0
  };

  const phaseChartData = [
    { name: 'PRE-PHV', value: stats.prePHV, color: '#4CAF50' },
    { name: 'CIRCA-PHV', value: stats.circaPHV, color: '#FF9800' },
    { name: 'POST-PHV', value: stats.postPHV, color: '#2196F3' }
  ];

  const scatterData = filteredData.map(p => ({
    x: p.chronologicalAge,
    y: p.biologicalAge,
    name: p.name
  }));

  const exportToCSV = () => {
    let csv = 'Imię i nazwisko,Płeć,Wiek kalendarzowy,Wzrost,Masa,Offset PHV,Faza,Wiek PHV,Wiek biologiczny\n';
    
    filteredData.forEach(player => {
      csv += `"${player.name}","${player.gender}",${player.chronologicalAge.toFixed(1)},${player.height.toFixed(1)},${player.weight.toFixed(1)},${player.maturityOffset.toFixed(2)},"${player.phase}",${player.phvAge.toFixed(1)},${player.biologicalAge.toFixed(1)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `raport_phv_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const clearFilters = () => {
    setFilterPhase('');
    setFilterGender('');
    setFilterAgeMin('');
    setFilterAgeMax('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-purple-600" />
                Dashboard PHV - Analiza Dojrzewania
              </h1>
              <p className="text-gray-600 mt-2">Panel zarządzania i monitorowania rozwoju zawodników</p>
            </div>
            
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
              {lastUpdate && (
                <div className="text-sm text-gray-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {lastUpdate.toLocaleTimeString('pl-PL')}
                </div>
              )}
              {accessMethod && (
                <div className="text-xs text-gray-500">
                  {accessMethod}
                </div>
              )}
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Ładowanie...' : 'Odśwież'}
              </button>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600 bg-purple-50 p-3 rounded-lg">
            📊 Dane z Google Sheets • Automatyczne obliczenia PHV (wzór Mirwalda) • Odświeżanie co 30s
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-red-800 font-semibold">Błąd pobierania danych</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading && data.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Ładowanie danych PHV...
          </div>
        )}

        {data.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Filtry</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Faza PHV</label>
                  <select
                    value={filterPhase}
                    onChange={(e) => setFilterPhase(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Wszystkie fazy</option>
                    <option value="PRE-PHV">PRE-PHV</option>
                    <option value="CIRCA-PHV">CIRCA-PHV</option>
                    <option value="POST-PHV">POST-PHV</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Płeć</label>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Wszyscy</option>
                    <option value="Chłopiec">Chłopcy</option>
                    <option value="Dziewczynka">Dziewczynki</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Wiek od</label>
                  <input
                    type="number"
                    value={filterAgeMin}
                    onChange={(e) => setFilterAgeMin(e.target.value)}
                    placeholder="np. 10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Wiek do</label>
                  <input
                    type="number"
                    value={filterAgeMax}
                    onChange={(e) => setFilterAgeMax(e.target.value)}
                    placeholder="np. 18"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              
              {(filterPhase || filterGender || filterAgeMin || filterAgeMax) && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                >
                  ✕ Wyczyść filtry
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="text-xs md:text-sm text-gray-600">Łącznie</div>
                <div className="text-xl md:text-2xl font-bold text-purple-600">{stats.total}</div>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="text-xs md:text-sm text-gray-600">PRE-PHV</div>
                <div className="text-xl md:text-2xl font-bold text-green-600">{stats.prePHV}</div>
                <div className="text-xs text-gray-500">{stats.total > 0 ? ((stats.prePHV/stats.total)*100).toFixed(0) : 0}%</div>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="text-xs md:text-sm text-gray-600">CIRCA-PHV</div>
                <div className="text-xl md:text-2xl font-bold text-orange-600">{stats.circaPHV}</div>
                <div className="text-xs text-gray-500">{stats.total > 0 ? ((stats.circaPHV/stats.total)*100).toFixed(0) : 0}%</div>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="text-xs md:text-sm text-gray-600">POST-PHV</div>
                <div className="text-xl md:text-2xl font-bold text-blue-600">{stats.postPHV}</div>
                <div className="text-xs text-gray-500">{stats.total > 0 ? ((stats.postPHV/stats.total)*100).toFixed(0) : 0}%</div>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="text-xs md:text-sm text-gray-600">Średni wiek</div>
                <div className="text-xl md:text-2xl font-bold text-indigo-600">{stats.avgAge}</div>
                <div className="text-xs text-gray-500">lat</div>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="text-xs md:text-sm text-gray-600">Śr. offset</div>
                <div className="text-xl md:text-2xl font-bold text-pink-600">{stats.avgOffset}</div>
                <div className="text-xs text-gray-500">lat</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">
                  Rozkład faz PHV
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={phaseChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {phaseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">
                  Wiek biologiczny vs kalendarzowy
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="Wiek kalendarzowy"
                      label={{ value: 'Wiek kalendarzowy (lata)', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="Wiek biologiczny"
                      label={{ value: 'Wiek biologiczny (lata)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ payload }) => {
                        if (payload && payload[0]) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-2 border border-gray-300 rounded shadow">
                              <p className="font-semibold">{data.name}</p>
                              <p>Kalendarzowy: {data.x.toFixed(1)} lat</p>
                              <p>Biologiczny: {data.y.toFixed(1)} lat</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter data={scatterData} fill="#8b5cf6" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <h2 className="text-lg md:text-xl font-bold text-gray-800">
                  Lista zawodników ({filteredData.length})
                </h2>
                <button
                  onClick={exportToCSV}
                  className="mt-2 md:mt-0 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Download className="w-4 h-4" />
                  Eksport CSV
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Zawodnik</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Płeć</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Wiek</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Wzrost</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Masa</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Offset PHV</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Faza</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Wiek PHV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((player, idx) => (
                      <tr 
                        key={idx} 
                        className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-purple-50 transition-colors`}
                      >
                        <td className="px-4 py-3 font-semibold text-gray-800">{player.name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={player.gender === 'Chłopiec' ? 'text-blue-600' : 'text-pink-600'}>
                            {player.gender === 'Chłopiec' ? '♂' : '♀'} {player.gender}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{player.chronologicalAge.toFixed(1)}</td>
                        <td className="px-4 py-3 text-center">{player.height.toFixed(1)} cm</td>
                        <td className="px-4 py-3 text-center">{player.weight.toFixed(1)} kg</td>
                        <td className="px-4 py-3 text-center">
                          <span className={player.maturityOffset > 0 ? 'text-green-600' : 'text-red-600'}>
                            {player.maturityOffset > 0 ? '+' : ''}{player.maturityOffset.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            player.phase === 'PRE-PHV' ? 'bg-green-100 text-green-800' :
                            player.phase === 'CIRCA-PHV' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {player.phase}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{player.phvAge.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mt-6">
              <h2 className="text-lg font-bold text-gray-800 mb-3">📊 O wskaźniku PHV</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="font-bold text-green-800 mb-2">PRE-PHV (przed szczytem)</div>
                  <div className="text-green-700">Offset &lt; -1.0 lat<br/>Okres przed gwałtownym wzrostem</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="font-bold text-orange-800 mb-2">CIRCA-PHV (w szczycie)</div>
                  <div className="text-orange-700">Offset -1.0 do +1.0 lat<br/>Okres maksymalnego tempa wzrostu</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="font-bold text-blue-800 mb-2">POST-PHV (po szczycie)</div>
                  <div className="text-blue-700">Offset &gt; +1.0 lat<br/>Okres po gwałtownym wzroście</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-purple-50 rounded-lg text-xs text-gray-600">
                <strong>Uwaga:</strong> Obliczenia oparte na wzorach Mirwalda et al. Offset PHV to różnica między aktualnym wiekiem a przewidywanym wiekiem szczytu wzrostu (PHV - Peak Height Velocity).
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
