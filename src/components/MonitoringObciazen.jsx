import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Calendar, TrendingUp, Users, Activity, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export default function MonitoringObciazen() {
  const SHEET_ID = '1w0gwkeDLWh1rSkz-PWxnA9uB_43Fn7z52wmtQh70z34';
  // GID arkusza Response - główny arkusz łączący wszystkie dane
  const SHEET_GID = '243539768'; // Response - główny arkusz
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState(['wszyscy']);
  const [selectedTeam, setSelectedTeam] = useState('wszystkie'); // Nowy state dla wybranej drużyny
  const [lastUpdate, setLastUpdate] = useState(null);
  const [accessMethod, setAccessMethod] = useState('');
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [timePreset, setTimePreset] = useState('currentWeek'); // Nowy state dla predefiniowanych filtrów

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    // Tablica metod dostępu do wypróbowania
    const methods = [
      // Metoda 1: Export z arkusza Response (GID główny)
      {
        name: `Export CSV (arkusz Response - GID=${SHEET_GID})`,
        url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`
      },
      // Metoda 2: CORS Proxy z GID
      {
        name: `CORS Proxy (GID=${SHEET_GID})`,
        url: `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`)}`
      },
      // Metoda 3: Export CSV bez GID (fallback)
      {
        name: `Export CSV (domyślny)`,
        url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
      },
      // Metoda 4: CORS Proxy bez GID
      {
        name: 'CORS Proxy (domyślny)',
        url: `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`)}`
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
        
        // Sprawdź czy to HTML z błędem (brak uprawnień)
        if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<html')) {
          console.log(`${method.name} - zwrócono HTML (brak uprawnień)`);
          continue;
        }
        
        // Parsuj CSV
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          console.log(`${method.name} - za mało linii: ${lines.length}`);
          continue;
        }
        
        console.log(`${method.name} - SUKCES! Liczba linii: ${lines.length}`);
        
        // Parsuj dane
        const parsedData = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Parsuj CSV z obsługą cudzysłowów
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
          
          // Usuń cudzysłowy z kolumn
          const cleanColumns = columns.map(col => col.replace(/^"|"$/g, ''));
          
          console.log(`Linia ${i}: Kolumny =`, cleanColumns);
          
          // Struktura: Sygnatura czasowa | Imię i Nazwisko | Data treningu | RPE | Minuty | Obciążenie | Drużyna
          if (cleanColumns.length < 7) {
            console.log(`Pominięto linię ${i} - za mało kolumn (${cleanColumns.length})`);
            continue;
          }
          
          const nazwisko = cleanColumns[1]; // Kolumna B (indeks 1)
          const dataTreningu = cleanColumns[2]; // Kolumna C (indeks 2)
          const rpe = parseFloat(cleanColumns[3]) || 0; // Kolumna D (indeks 3)
          const minuty = parseFloat(cleanColumns[4]) || 0; // Kolumna E (indeks 4)
          const druzyna = (cleanColumns.length > 6 ? cleanColumns[6] : 'Brak') || 'Brak'; // Kolumna G (indeks 6)
          
          // Pomiń nagłówek i puste wiersze
          if (!nazwisko || nazwisko.toLowerCase().includes('nazwisko') || nazwisko.toLowerCase().includes('imię') || nazwisko === '') {
            console.log(`Pominięto linię ${i} - nagłówek lub puste nazwisko`);
            continue;
          }
          
          // Normalizacja nazwiska (małe litery, bez znaków specjalnych)
          const normalizeText = (text) => {
            return text
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/ł/g, 'l')
              .trim();
          };
          
          const nazwiskoNormalized = normalizeText(nazwisko);
          
          console.log(`Dodano: ${nazwisko} (norm: ${nazwiskoNormalized}), RPE: ${rpe}, Minuty: ${minuty}, Drużyna: ${druzyna}`);
          
          parsedData.push({
            nazwisko: nazwisko,
            nazwiskoNormalized: nazwiskoNormalized,
            data: dataTreningu,
            rpe: rpe,
            minuty: minuty,
            obciazenie: rpe * minuty,
            druzyna: druzyna
          });
        }
        
        if (parsedData.length === 0) {
          console.log(`${method.name} - brak danych po parsowaniu`);
          continue;
        }
        
        // SUKCES!
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
      setError('Nie można pobrać danych. Sprawdź uprawnienia arkusza.');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reset wybranych zawodników gdy zmienia się drużyna
  useEffect(() => {
    setSelectedPlayers(['wszyscy']);
  }, [selectedTeam]);

  // Funkcja normalizacji tekstu (usuwa znaki diakrytyczne i konwertuje na małe litery)
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Usuń znaki diakrytyczne
      .replace(/ł/g, 'l')
      .replace(/Ł/g, 'l')
      .trim();
  };
  
  // Funkcja parsowania daty (musi być przed filtrowaniem okresu)
  const parseDate = (dateValue) => {
    try {
      const cleanDate = String(dateValue).replace(/^"|"$/g, '');
      const date = new Date(cleanDate);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('Błąd parsowania daty:', dateValue);
    }
    return null;
  };

  const formatDateKey = (date) => {
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    return utc.toISOString().split('T')[0];
  };
  
  // Kolory dla zawodników (dla wykresów)
  const playerColors = [
    '#8b5cf6', // fioletowy
    '#10b981', // zielony
    '#f59e0b', // pomarańczowy
    '#ef4444', // czerwony
    '#3b82f6', // niebieski
    '#ec4899', // różowy
    '#14b8a6', // turkusowy
    '#f97316', // pomarańczowy ciemny
  ];
  
  const getPlayerColor = (playerName, index) => {
    return playerColors[index % playerColors.length];
  };
  
  // Funkcje pomocnicze dla dat i mikrocykli
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    // Sobota = 6, więc jeśli dzień < 6, cofamy się do poprzedniej soboty
    const daysToSaturday = (day + 1) % 7; // 0=Niedziela to 1 dzień po Sobocie
    d.setDate(d.getDate() - daysToSaturday);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  
  const getMicrocycleStart = (date) => {
    return getWeekStart(date);
  };

  const getCalendarWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun,1=Mon,...
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getDayName = (dateStr) => {
    const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    const date = new Date(dateStr);
    return days[date.getDay()];
  };

  const filterDataByPeriod = (dataToFilter) => {
    if (selectedWeeks.length === 0 && selectedMonths.length === 0) return dataToFilter;

    return dataToFilter.filter(item => {
      const itemDate = new Date(parseDate(item.data));
      if (!itemDate || isNaN(itemDate)) return false;

      const calWeekStart = getCalendarWeekStart(itemDate);
      const weekKey = formatDateKey(calWeekStart);

      const monthStart = new Date(itemDate.getFullYear(), itemDate.getMonth(), 1);
      const monthKey = formatDateKey(monthStart);

      const matchesWeek = selectedWeeks.includes(weekKey);
      const matchesMonth = selectedMonths.includes(monthKey);

      return (selectedWeeks.length > 0 && matchesWeek) || (selectedMonths.length > 0 && matchesMonth);
    });
  };

  const getRpeColor = (value) => {
    if (value >= 9) return '#dc2626'; // czerwony
    if (value >= 7) return '#f97316'; // pomarańczowy
    if (value >= 5) return '#facc15'; // żółty
    if (value >= 3) return '#22c55e'; // zielony
    return '#16a34a'; // ciemny zielony
  };

  // Najpierw filtrujemy po zawodnikach (jeden lub więcej), potem po drużynie, potem po czasie
  const filteredByPlayer = selectedPlayers.includes('wszyscy') 
    ? data 
    : data.filter(d => {
        const normalized = d.nazwiskoNormalized || normalizeText(d.nazwisko);
        return selectedPlayers.some(selectedPlayer => {
          const selectedNormalized = normalizeText(selectedPlayer);
          return normalized === selectedNormalized;
        });
      });

  // Następnie filtrujemy po drużynie
  const filteredByTeam = selectedTeam === 'wszystkie'
    ? filteredByPlayer
    : filteredByPlayer.filter(d => d.druzyna === selectedTeam);
  
  const filteredData = filterDataByPeriod(filteredByTeam);
  
  // Grupuj zawodników po znormalizowanych nazwiskach (bez duplikatów TEST, Test, test)
  // Filtruj zawodników po wybranej drużynie
  const dataForPlayers = selectedTeam === 'wszystkie' ? data : data.filter(d => d.druzyna === selectedTeam);
  
  const uniquePlayersMap = new Map();
  dataForPlayers.forEach(d => {
    const normalized = d.nazwiskoNormalized || normalizeText(d.nazwisko);
    if (!uniquePlayersMap.has(normalized)) {
      uniquePlayersMap.set(normalized, d.nazwisko);
    }
  });
  const players = ['wszyscy', ...uniquePlayersMap.values()];

  // Oblicz dostępne drużyny
  const uniqueTeamsSet = new Set();
  data.forEach(d => {
    if (d.druzyna && d.druzyna.trim()) {
      uniqueTeamsSet.add(d.druzyna);
    }
  });
  const teams = ['wszystkie', ...Array.from(uniqueTeamsSet).sort()];

  const dataByDate = filteredData.reduce((acc, item) => {
    const dateStr = parseDate(item.data);
    if (!dateStr) return acc;
    
    if (!acc[dateStr]) {
      acc[dateStr] = { data: dateStr, obciazenie: 0, sesje: 0, sumaRPE: 0, sumaMinuty: 0 };
    }
    acc[dateStr].obciazenie += item.obciazenie;
    acc[dateStr].sesje += 1;
    acc[dateStr].sumaRPE += item.rpe;
    acc[dateStr].sumaMinuty += item.minuty;
    return acc;
  }, {});

  const chartData = (() => {
    const dates = Object.keys(dataByDate).sort((a, b) => new Date(a) - new Date(b));
    if (dates.length === 0) return [];

    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);
    const range = [];
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    while (cursor <= endDate) {
      const key = formatDateKey(cursor);
      const existing = dataByDate[key];
      if (existing) {
        range.push({
          ...existing,
          srednieObciazenie: existing.sesje > 0 ? Math.round(existing.obciazenie / existing.sesje) : null,
          sredniaRPE: existing.sesje > 0 ? parseFloat((existing.sumaRPE / existing.sesje).toFixed(1)) : null,
          dzienTygodnia: getDayName(existing.data),
          dataFormatted: new Date(existing.data).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
          hasData: true
        });
      } else {
        range.push({
          data: key,
          obciazenie: null,
          sesje: 0,
          sumaRPE: 0,
          sumaMinuty: 0,
          srednieObciazenie: null,
          sredniaRPE: null,
          dzienTygodnia: getDayName(key),
          dataFormatted: new Date(key).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
          hasData: false
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return range;
  })();

  const allDataByDate = data.reduce((acc, item) => {
    const dateStr = parseDate(item.data);
    if (!dateStr) return acc;

    if (!acc[dateStr]) {
      acc[dateStr] = { data: dateStr, obciazenie: 0, sesje: 0, sumaRPE: 0, sumaMinuty: 0 };
    }
    acc[dateStr].obciazenie += item.obciazenie;
    acc[dateStr].sesje += 1;
    acc[dateStr].sumaRPE += item.rpe;
    acc[dateStr].sumaMinuty += item.minuty;
    return acc;
  }, {});

  const weekSeparators = chartData.filter((item, index) => {
    if (index === 0) return false;
    const date = new Date(item.data);
    return date.getDay() === 1; // poniedziałek
  });

  const stats = {
    totalSessions: filteredData.length,
    avgRPE: filteredData.length > 0 ? (filteredData.reduce((sum, d) => sum + d.rpe, 0) / filteredData.length).toFixed(1) : 0,
    totalLoad: Math.round(filteredData.reduce((sum, d) => sum + d.obciazenie, 0)),
    avgMinutes: filteredData.length > 0 ? Math.round(filteredData.reduce((sum, d) => sum + d.minuty, 0) / filteredData.length) : 0
  };

  const playerComparison = players.filter(p => p !== 'wszyscy').map(player => {
    const playerNormalized = normalizeText(player);
    // Używamy filteredData zamiast data, aby uwzględnić filtr czasowy
    const playerData = filteredData.filter(d => {
      const normalized = d.nazwiskoNormalized || normalizeText(d.nazwisko);
      return normalized === playerNormalized;
    });
    const totalLoad = playerData.reduce((sum, d) => sum + d.obciazenie, 0);
    return {
      nazwisko: player,
      srednieObciazenie: Math.round(playerData.length > 0 ? totalLoad / playerData.length : 0),
      sredniaRPE: parseFloat((playerData.reduce((sum, d) => sum + d.rpe, 0) / playerData.length || 0).toFixed(1)),
      calkowiteObciazenie: Math.round(totalLoad),
      liczbaSesji: playerData.length
    };
  }).sort((a, b) => b.calkowiteObciazenie - a.calkowiteObciazenie);

  const playerLoadOverTime = (() => {
    // Przygotuj wszystkie dostępne daty z wszystkich danych
    const allDataByDate = data.reduce((acc, item) => {
      const dateStr = parseDate(item.data);
      if (!dateStr) return acc;
      if (!acc[dateStr]) {
        acc[dateStr] = { data: dateStr, dzienTygodnia: getDayName(dateStr) };
      }
      return acc;
    }, {});

    const dates = Object.keys(allDataByDate).sort((a, b) => new Date(a) - new Date(b));
    
    // Dla każdej daty, oblicz obciążenie dla każdego zawodnika
    return dates.map(dateStr => {
      const dayObj = { data: dateStr, dzienTygodnia: getDayName(dateStr) };
      
      players.filter(p => p !== 'wszyscy').forEach(player => {
        const playerNormalized = normalizeText(player);
        const dayData = data.filter(d => {
          const dStr = parseDate(d.data);
          if (dStr !== dateStr) return false;
          const normalized = d.nazwiskoNormalized || normalizeText(d.nazwisko);
          return normalized === playerNormalized;
        });
        
        const dayLoad = dayData.reduce((sum, d) => sum + d.obciazenie, 0);
        dayObj[player] = dayLoad > 0 ? dayLoad : null;
      });
      
      return dayObj;
    });
  })();

  const currentWeekData = (() => {
    const now = new Date();
    const weekStart = getCalendarWeekStart(now);
    const extendedStart = new Date(weekStart);
    extendedStart.setDate(extendedStart.getDate() - 2);
    const weekDates = Array.from({ length: 9 }, (_, idx) => {
      const d = new Date(extendedStart);
      d.setDate(d.getDate() + idx);
      return d;
    });

    // Dane filtrowane (z filtrem zawodnika/zawodników i drużyny)
    const filteredDataByDate = filteredByTeam.reduce((acc, item) => {
      const dateStr = parseDate(item.data);
      if (!dateStr) return acc;
      
      if (!acc[dateStr]) {
        acc[dateStr] = { data: dateStr, sumaRPE: 0, sesje: 0 };
      }
      acc[dateStr].sumaRPE += item.rpe;
      acc[dateStr].sesje += 1;
      return acc;
    }, {});

    // Dane całej drużyny (tylko z filtrem drużyny, bez filtra zawodnika)
    const teamDataByDate = (selectedTeam === 'wszystkie' ? data : data.filter(d => d.druzyna === selectedTeam)).reduce((acc, item) => {
      const dateStr = parseDate(item.data);
      if (!dateStr) return acc;
      
      if (!acc[dateStr]) {
        acc[dateStr] = { data: dateStr, sumaRPE: 0, sesje: 0 };
      }
      acc[dateStr].sumaRPE += item.rpe;
      acc[dateStr].sesje += 1;
      return acc;
    }, {});

    const filteredMap = new Map(Object.values(filteredDataByDate).map(item => [item.data, item]));
    const teamMap = new Map(Object.values(teamDataByDate).map(item => [item.data, item]));

    return weekDates.map(date => {
      const key = formatDateKey(date);
      const filtered = filteredMap.get(key);
      const team = teamMap.get(key);
      
      return {
        data: key,
        dzienTygodnia: getDayName(key),
        dataFormatted: date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
        sredniaRPE: filtered && filtered.sesje > 0 ? parseFloat((filtered.sumaRPE / filtered.sesje).toFixed(1)) : null,
        sredniaRPEDruzyna: team && team.sesje > 0 ? parseFloat((team.sumaRPE / team.sesje).toFixed(1)) : null,
        hasData: filtered && filtered.sesje > 0,
        hasTeamData: team && team.sesje > 0
      };
    });
  })();

  const availableWeeks = (() => {
    const map = new Map();
    filteredByTeam.forEach(item => {
      const dateStr = parseDate(item.data);
      if (!dateStr) return;
      const calWeekStart = getCalendarWeekStart(new Date(dateStr));
      const weekKey = formatDateKey(calWeekStart);
      if (!map.has(weekKey)) {
        const weekEnd = new Date(calWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        map.set(weekKey, {
          key: weekKey,
          label: `${calWeekStart.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })} – ${weekEnd.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })}`
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.key) - new Date(a.key));
  })();

  const availableMonths = (() => {
    const map = new Map();
    filteredByTeam.forEach(item => {
      const dateStr = parseDate(item.data);
      if (!dateStr) return;
      const date = new Date(dateStr);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthKey = monthStart.toISOString().split('T')[0];
      if (!map.has(monthKey)) {
        map.set(monthKey, {
          key: monthKey,
          label: monthStart.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.key) - new Date(a.key));
  })();

  const togglePlayer = (player) => {
    if (player === 'wszyscy') {
      setSelectedPlayers(['wszyscy']);
      return;
    }
    setSelectedPlayers(prev => {
      const withoutAll = prev.filter(p => p !== 'wszyscy');
      const exists = withoutAll.includes(player);
      const next = exists ? withoutAll.filter(p => p !== player) : [...withoutAll, player];
      return next.length === 0 ? ['wszyscy'] : next;
    });
  };

  const toggleTeam = (team) => {
    if (team === 'wszystkie') {
      setSelectedTeam('wszystkie');
      return;
    }
    setSelectedTeam(team);
  };

  const toggleWeek = (weekKey) => {
    setSelectedWeeks(prev => prev.includes(weekKey) ? prev.filter(k => k !== weekKey) : [...prev, weekKey]);
  };

  const toggleMonth = (monthKey) => {
    setSelectedMonths(prev => prev.includes(monthKey) ? prev.filter(k => k !== monthKey) : [...prev, monthKey]);
  };

  const clearPeriodSelection = () => {
    setSelectedWeeks([]);
    setSelectedMonths([]);
  };

  // Dane do wykresu średniego obciążenia per tydzień (do porównywania tygodni)
  const weeklyAverageChartData = (() => {
    const weekMap = new Map();
    
    filteredByTeam.forEach(item => {
      const dateStr = parseDate(item.data);
      if (!dateStr) return;
      
      const date = new Date(dateStr);
      const weekStart = getCalendarWeekStart(date);
      const weekKey = formatDateKey(weekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          weekKey: weekKey,
          weekLabel: `${weekStart.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })} – ${weekEnd.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })}`,
          totalObciazenie: 0,
          sesje: 0,
          sumaRPE: 0
        });
      }
      
      const week = weekMap.get(weekKey);
      week.totalObciazenie += item.obciazenie;
      week.sesje += 1;
      week.sumaRPE += item.rpe;
    });
    
    return Array.from(weekMap.values())
      .map(week => ({
        ...week,
        srednieObciazenie: week.sesje > 0 ? Math.round(week.totalObciazenie / week.sesje) : 0,
        sredniaRPE: week.sesje > 0 ? parseFloat((week.sumaRPE / week.sesje).toFixed(1)) : 0
      }))
      .sort((a, b) => new Date(a.weekKey) - new Date(b.weekKey));
  })();
  
  // Dane do porównania zawodników w czasie (dla wykresu multi-player)
  const multiPlayerChartData = (() => {
    if (selectedPlayers.includes('wszyscy')) return [];
    
    // Grupuj dane po datach
    const dateMap = new Map();
    
    filteredData.forEach(item => {
      const dateStr = parseDate(item.data);
      if (!dateStr) return;
      
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { 
          data: dateStr,
          dzienTygodnia: getDayName(dateStr),
          dataFormatted: new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
        });
      }
      
      const dayData = dateMap.get(dateStr);
      const playerName = item.nazwisko;
      
      if (!dayData[playerName]) {
        dayData[playerName] = { obciazenie: 0, sesje: 0 };
      }
      
      dayData[playerName].obciazenie += item.obciazenie;
      dayData[playerName].sesje += 1;
    });
    
    return Array.from(dateMap.values())
      .sort((a, b) => new Date(a.data) - new Date(b.data));
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Activity className="text-indigo-600" />
              Monitoring Obciążenia Treningowego
            </h1>
            
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
              {lastUpdate && (
                <div className="text-sm text-gray-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {lastUpdate.toLocaleTimeString('pl-PL')}
                </div>
              )}
              {accessMethod && (
                <div className="text-xs text-gray-500">
                  Metoda: {accessMethod}
                </div>
              )}
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Ładowanie...' : 'Odśwież'}
              </button>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600 bg-indigo-50 p-3 rounded-lg">
            📊 Połączono z Google Sheets • Automatyczne odświeżanie co 30s
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold mb-2">Błąd pobierania danych</h3>
                <p className="text-red-700 text-sm mb-3">{error}</p>
                
                <div className="bg-white p-4 rounded border border-red-200">
                  <p className="text-sm font-semibold text-gray-800 mb-3">🔧 Jak naprawić:</p>
                  <ol className="text-sm text-gray-700 space-y-2 list-decimal ml-4">
                    <li>Otwórz arkusz: <a href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Kliknij tutaj</a></li>
                    <li>Kliknij przycisk <strong>"Udostępnij"</strong> (prawy górny róg)</li>
                    <li>W sekcji "Dostęp ogólny" wybierz: <strong>"Każdy, kto ma link"</strong></li>
                    <li>Uprawnienia: <strong>"Czytelnik"</strong></li>
                    <li>Kliknij <strong>"Gotowe"</strong></li>
                    <li>Wróć tutaj i kliknij <strong>"Odśwież"</strong></li>
                  </ol>
                  
                  <div className="mt-3 pt-3 border-t border-red-100">
                    <p className="text-xs text-gray-600">
                      ✅ To bezpieczne - tylko odczyt danych<br/>
                      ✅ Nikt nie będzie mógł edytować arkusza<br/>
                      ✅ Dane widoczne tylko dla osób z linkiem
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && data.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Próbuję pobrać dane różnymi metodami...
          </div>
        )}

        {!loading && data.length === 0 && !error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            <div className="font-semibold mb-2">📝 Oczekiwanie na dane</div>
            <p className="text-sm">Kliknij "Odśwież" aby spróbować ponownie pobrać dane z arkusza.</p>
          </div>
        )}

        {data.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="inline w-4 h-4 mr-1" />
                    Wybierz zawodników:
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {players.map(player => (
                      <label key={player} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={selectedPlayers.includes(player)}
                          onChange={() => togglePlayer(player)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{player === 'wszyscy' ? '🌐 Wszyscy zawodnicy' : `👤 ${player}`}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🏟️ Wybierz drużynę:
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {teams.map(team => (
                      <label key={team} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          name="team"
                          checked={selectedTeam === team}
                          onChange={() => toggleTeam(team)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{team === 'wszystkie' ? '🌐 Wszystkie drużyny' : `🏆 ${team}`}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    Szybkie filtry okresu:
                  </label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const now = new Date();
                          const weekStart = getCalendarWeekStart(now);
                          setSelectedWeeks([formatDateKey(weekStart)]);
                          setSelectedMonths([]);
                          setTimePreset('currentWeek');
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          timePreset === 'currentWeek'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        📅 Obecny tydzień
                      </button>
                      <button
                        onClick={() => {
                          const now = new Date();
                          const weekStart = getCalendarWeekStart(now);
                          weekStart.setDate(weekStart.getDate() - 7);
                          setSelectedWeeks([formatDateKey(weekStart)]);
                          setSelectedMonths([]);
                          setTimePreset('previousWeek');
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          timePreset === 'previousWeek'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        ⬅️ Poprzedni tydzień
                      </button>
                      <button
                        onClick={() => {
                          const now = new Date();
                          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                          setSelectedMonths([formatDateKey(monthStart)]);
                          setSelectedWeeks([]);
                          setTimePreset('currentMonth');
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          timePreset === 'currentMonth'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        📆 Obecny miesiąc
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const now = new Date();
                          const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                          setSelectedMonths([formatDateKey(prevMonthStart)]);
                          setSelectedWeeks([]);
                          setTimePreset('previousMonth');
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          timePreset === 'previousMonth'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        📊 Poprzedni miesiąc
                      </button>
                      <button
                        onClick={() => {
                          const now = new Date();
                          const months = [];
                          for (let i = 0; i < 3; i++) {
                            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
                            months.push(formatDateKey(monthStart));
                          }
                          setSelectedMonths(months);
                          setSelectedWeeks([]);
                          setTimePreset('last3Months');
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          timePreset === 'last3Months'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        📈 Ostatnie 3 miesiące
                      </button>
                      <button
                        onClick={() => {
                          setSelectedWeeks([]);
                          setSelectedMonths([]);
                          setTimePreset('');
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition"
                      >
                        ✕ Wyczyść
                      </button>
                    </div>

                    {/* Szczegółowe filtry tygodni i miesięcy */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Filtry tygodni */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            📅 Tygodnie:
                          </label>
                          <div className="border border-gray-300 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                            {availableWeeks.length > 0 ? (
                              availableWeeks.map(week => (
                                <label key={week.key} className="flex items-center gap-2 text-sm text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={selectedWeeks.includes(week.key)}
                                    onChange={() => toggleWeek(week.key)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>{week.label}</span>
                                </label>
                              ))
                            ) : (
                              <p className="text-gray-500 text-sm">Brak dostępnych tygodni</p>
                            )}
                          </div>
                        </div>

                        {/* Filtry miesięcy */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            📆 Miesiące:
                          </label>
                          <div className="border border-gray-300 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                            {availableMonths.length > 0 ? (
                              availableMonths.map(month => (
                                <label key={month.key} className="flex items-center gap-2 text-sm text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={selectedMonths.includes(month.key)}
                                    onChange={() => toggleMonth(month.key)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>{month.label}</span>
                                </label>
                              ))
                            ) : (
                              <p className="text-gray-500 text-sm">Brak dostępnych miesięcy</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Jednostki</p>
                    <p className="text-xl md:text-2xl font-bold text-indigo-600">{stats.totalSessions}</p>
                  </div>
                  <Calendar className="text-indigo-400 w-6 h-6 md:w-8 md:h-8" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Średnia RPE</p>
                    <p className="text-xl md:text-2xl font-bold text-green-600">{stats.avgRPE}</p>
                  </div>
                  <TrendingUp className="text-green-400 w-6 h-6 md:w-8 md:h-8" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Całk. obciąż.</p>
                    <p className="text-xl md:text-2xl font-bold text-purple-600">{stats.totalLoad}</p>
                  </div>
                  <Activity className="text-purple-400 w-6 h-6 md:w-8 md:h-8" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Śr. czas (min)</p>
                    <p className="text-xl md:text-2xl font-bold text-orange-600">{stats.avgMinutes}</p>
                  </div>
                  <Calendar className="text-orange-400 w-6 h-6 md:w-8 md:h-8" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">
                📈 Obciążenie treningowe w czasie
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="data"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    style={{ fontSize: '11px' }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                  />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip 
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        const item = payload[0].payload;
                        return `${item.dzienTygodnia}, ${new Date(item.data).toLocaleDateString('pl-PL')}`;
                      }
                      return label;
                    }}
                    formatter={(value, name) => [value, name === 'srednieObciazenie' ? 'Średnie obciążenie' : name]}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '14px' }} />
                  {weekSeparators.map(separator => (
                    <ReferenceLine
                      key={`week-${separator.data}`}
                      x={separator.data}
                      stroke="#e5e7eb"
                      strokeDasharray="3 3"
                    />
                  ))}
                  <Bar 
                    dataKey="srednieObciazenie" 
                    name="Średnie obciążenie"
                    radius={[6, 6, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`load-${index}`} fill={entry.hasData ? '#6366f1' : 'transparent'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {currentWeekData.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">
                  📅 Obecny tydzień (kalendarzowy) - Średnia RPE
                </h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={currentWeekData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="data" 
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return d.toLocaleDateString('pl-PL', { weekday: 'short' });
                      }}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis domain={[0, 10]} style={{ fontSize: '12px' }} />
                    <Tooltip 
                      labelFormatter={(date, payload) => {
                        if (payload && payload[0]) {
                          const item = payload[0].payload;
                          return `${item.dzienTygodnia}, ${new Date(date).toLocaleDateString('pl-PL')}`;
                        }
                        return new Date(date).toLocaleDateString('pl-PL');
                      }}
                      formatter={(value, name) => {
                        if (name === 'sredniaRPE') return [parseFloat(value).toFixed(1), 'Średnia RPE (filtr)'];
                        if (name === 'sredniaRPEDruzyna') return [parseFloat(value).toFixed(1), 'Średnia RPE (drużyna)'];
                        return [value, name];
                      }}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar 
                      dataKey="sredniaRPE" 
                      name="Średnia RPE (filtr)"
                      radius={[8, 8, 0, 0]}
                    >
                      {currentWeekData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.hasData ? getRpeColor(entry.sredniaRPE) : 'transparent'} />
                      ))}
                    </Bar>
                    {!selectedPlayers.includes('wszyscy') && (
                      <Bar 
                        dataKey="sredniaRPEDruzyna" 
                        name="Średnia RPE (drużyna)"
                        fill="#9ca3af"
                        fillOpacity={0.3}
                        radius={[8, 8, 0, 0]}
                      >
                        {currentWeekData.map((entry, index) => (
                          <Cell key={`team-${index}`} fill={entry.hasTeamData ? '#9ca3af' : 'transparent'} fillOpacity={0.3} />
                        ))}
                      </Bar>
                    )}
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: getRpeColor(2) }}></span>1-2 lekki</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: getRpeColor(4) }}></span>3-4 umiarkowany</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: getRpeColor(6) }}></span>5-6 średni</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: getRpeColor(8) }}></span>7-8 ciężki</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: getRpeColor(10) }}></span>9-10 maksymalny</div>
                </div>
              </div>
            )}

            {selectedPlayers.includes('wszyscy') && playerComparison.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">
                  👥 Porównanie zawodników
                </h2>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Zawodnik</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Sesje</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Śr. RPE</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Śr. obciąż.</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Całk. obciąż.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerComparison.map((player, idx) => (
                        <tr 
                          key={player.nazwisko} 
                          className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors`}
                        >
                          <td className="px-4 py-3 font-semibold text-gray-800">{player.nazwisko}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{player.liczbaSesji}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${
                              player.sredniaRPE >= 7 ? 'text-red-600' : 
                              player.sredniaRPE >= 5 ? 'text-orange-600' : 
                              'text-green-600'
                            }`}>
                              {player.sredniaRPE}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-purple-700">{player.srednieObciazenie}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-indigo-600 text-base">{player.calkowiteObciazenie}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={playerComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="nazwisko" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      style={{ fontSize: '12px', fontWeight: '500' }}
                    />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip 
                      formatter={(value, name) => [value, name === 'calkowiteObciazenie' ? 'Całkowite obciążenie' : name]}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                    <Bar 
                      dataKey="calkowiteObciazenie" 
                      name="Całkowite obciążenie"
                      radius={[8, 8, 0, 0]}
                    >
                      {(() => {
                        const avgLoad = playerComparison.length > 0 
                          ? playerComparison.reduce((sum, p) => sum + p.calkowiteObciazenie, 0) / playerComparison.length
                          : 0;
                        
                        return playerComparison.map((entry, index) => {
                          const diff = entry.calkowiteObciazenie - avgLoad;
                          const percentDiff = (diff / avgLoad) * 100;
                          
                          let color = '#22c55e'; // zielony - poniżej średniej
                          if (percentDiff > 20) {
                            color = '#dc2626'; // czerwony - dużo powyżej średniej
                          } else if (percentDiff > 5) {
                            color = '#f97316'; // pomarańczowy - powyżej średniej
                          } else if (percentDiff >= -5) {
                            color = '#facc15'; // żółty - w okolicy średniej
                          }
                          
                          return <Cell key={`player-${index}`} fill={color} />;
                        });
                      })()}
                    </Bar>
                    {(() => {
                      const avgLoad = playerComparison.length > 0 
                        ? Math.round(playerComparison.reduce((sum, p) => sum + p.calkowiteObciazenie, 0) / playerComparison.length)
                        : 0;
                      return <ReferenceLine y={avgLoad} stroke="#dc2626" strokeDasharray="5 5" strokeWidth={2} label={{ value: `Średnia: ${avgLoad}`, position: 'top', fill: '#dc2626', fontSize: 12 }} />;
                    })()}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {playerLoadOverTime.length > 0 && players.filter(p => p !== 'wszyscy').length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">
                  📊 Porównanie obciążenia zawodników w czasie
                </h2>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={playerLoadOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="data"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      style={{ fontSize: '11px' }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                    />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip 
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          const item = payload[0].payload;
                          return `${item.dzienTygodnia}, ${new Date(item.data).toLocaleDateString('pl-PL')}`;
                        }
                        return label;
                      }}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {(() => {
                      const allPlayers = players.filter(p => p !== 'wszyscy');
                      
                      // Najpierw renderuj niezaznaczone (szare)
                      const grayLines = allPlayers.map((player, idx) => {
                        const isSelected = selectedPlayers.includes(player);
                        const isSingleSelection = selectedPlayers.length === 1 && !selectedPlayers.includes('wszyscy');
                        
                        const shouldBeGray = (isSingleSelection && !isSelected) || 
                                            (!isSingleSelection && !selectedPlayers.includes('wszyscy') && !isSelected);
                        
                        if (!shouldBeGray) return null;
                        
                        return (
                          <Line 
                            key={`gray-${player}`}
                            type="monotone" 
                            dataKey={player} 
                            stroke="#d1d5db" 
                            strokeWidth={1}
                            strokeOpacity={0.4}
                            dot={{ fill: '#d1d5db', r: 3, opacity: 0.4 }}
                            isAnimationActive={false}
                          />
                        );
                      });
                      
                      // Następnie renderuj zaznaczone (kolorowe, pogrubione)
                      const coloredLines = allPlayers.map((player, idx) => {
                        const isSelected = selectedPlayers.includes(player);
                        const isSingleSelection = selectedPlayers.length === 1 && !selectedPlayers.includes('wszyscy');
                        
                        const shouldBeColored = selectedPlayers.includes('wszyscy') || isSelected;
                        
                        if (!shouldBeColored) return null;
                        
                        let lineColor = playerColors[idx % playerColors.length];
                        
                        return (
                          <Line 
                            key={`color-${player}`}
                            type="monotone" 
                            dataKey={player} 
                            stroke={lineColor} 
                            strokeWidth={isSingleSelection && isSelected ? 3 : 2}
                            strokeOpacity={1}
                            dot={{ fill: lineColor, r: isSingleSelection && isSelected ? 5 : 4, opacity: 1 }}
                            activeDot={{ r: 6 }}
                            isAnimationActive={true}
                          />
                        );
                      });
                      
                      return [...grayLines, ...coloredLines];
                    })()}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {weeklyAverageChartData.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">
                  📊 Porównanie tygodni - Średnie obciążenie
                </h2>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={weeklyAverageChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="weekLabel"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'srednieObciazenie') return [value, 'Średnie obciążenie'];
                        if (name === 'sredniaRPE') return [parseFloat(value).toFixed(1), 'Średnia RPE'];
                        if (name === 'sesje') return [value, 'Liczba sesji'];
                        return [value, name];
                      }}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                    <Bar 
                      dataKey="srednieObciazenie" 
                      name="Średnie obciążenie"
                      radius={[8, 8, 0, 0]}
                      fill="#8b5cf6"
                    />
                    {(() => {
                      const avgLoad = weeklyAverageChartData.length > 0 
                        ? Math.round(weeklyAverageChartData.reduce((sum, w) => sum + w.srednieObciazenie, 0) / weeklyAverageChartData.length)
                        : 0;
                      return <ReferenceLine y={avgLoad} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: `Średnia: ${avgLoad}`, position: 'top', fill: '#10b981', fontSize: 12 }} />;
                    })()}
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>💡 Porównanie tygodni:</strong> Histogram pokazuje średnie obciążenie treningowe dla każdego tygodnia, co ułatwia identyfikację okresów o wyższym lub niższym obciążeniu. Zielona linia odniesienia pokazuje średnie obciążenie całego okresu.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">📊 Skala RPE</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="bg-green-100 p-3 rounded-lg text-center">
                  <div className="font-bold text-green-800">1-3</div>
                  <div className="text-xs text-green-700">Lekki</div>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg text-center">
                  <div className="font-bold text-yellow-800">4-6</div>
                  <div className="text-xs text-yellow-700">Umiarkowany</div>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg text-center">
                  <div className="font-bold text-orange-800">7-8</div>
                  <div className="text-xs text-orange-700">Ciężki</div>
                </div>
                <div className="bg-red-100 p-3 rounded-lg text-center">
                  <div className="font-bold text-red-800">9-10</div>
                  <div className="text-xs text-red-700">Maksymalny</div>
                </div>
                <div className="bg-indigo-100 p-3 rounded-lg text-center col-span-2 md:col-span-1">
                  <div className="font-bold text-indigo-800">Obciążenie</div>
                  <div className="text-xs text-indigo-700">RPE × Minuty</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
