// Nowy kod dla sekcji filtrów czasowych
const TimePresetUI = ({ timePreset, setTimePreset, setSelectedWeeks, setSelectedMonths, formatDateKey, getCalendarWeekStart }) => {
  const handlePresetClick = (preset) => {
    setTimePreset(preset);
    const now = new Date();
    
    switch(preset) {
      case 'currentWeek':
        const currentWeekStart = getCalendarWeekStart(now);
        const currentWeekKey = formatDateKey(currentWeekStart);
        setSelectedWeeks([currentWeekKey]);
        setSelectedMonths([]);
        break;
      
      case 'previousWeek':
        const prevWeekStart = getCalendarWeekStart(now);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevWeekKey = formatDateKey(prevWeekStart);
        setSelectedWeeks([prevWeekKey]);
        setSelectedMonths([]);
        break;
      
      case 'currentMonth':
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthKey = formatDateKey(currentMonthStart);
        setSelectedMonths([currentMonthKey]);
        setSelectedWeeks([]);
        break;
      
      case 'previousMonth':
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthKey = formatDateKey(prevMonthStart);
        setSelectedMonths([prevMonthKey]);
        setSelectedWeeks([]);
        break;
      
      case 'last3Months':
        const months = [];
        for (let i = 0; i < 3; i++) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push(formatDateKey(monthStart));
        }
        setSelectedMonths(months);
        setSelectedWeeks([]);
        break;
      
      default:
        setSelectedWeeks([]);
        setSelectedMonths([]);
    }
  };

  const presets = [
    { id: 'currentWeek', label: 'Obecny tydzień', icon: '📅' },
    { id: 'previousWeek', label: 'Poprzedni tydzień', icon: '⬅️' },
    { id: 'currentMonth', label: 'Obecny miesiąc', icon: '📆' },
    { id: 'previousMonth', label: 'Poprzedni miesiąc', icon: '⬅️' },
    { id: 'last3Months', label: 'Ostatnie 3 miesiące', icon: '📊' }
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        <Calendar className="inline w-4 h-4 mr-1" />
        Szybkie filtry okresu:
      </label>
      <div className="flex flex-wrap gap-2">
        {presets.map(preset => (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              timePreset === preset.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {preset.icon} {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimePresetUI;
