import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SettingsContextType {
  language: string;
  setLanguage: (language: string) => void;
  oddsFormat: string;
  setOddsFormat: (format: string) => void;
  showFiatAmount: boolean; 
  setShowFiatAmount: (show: boolean) => void;
  onSiteNotifications: boolean;
  setOnSiteNotifications: (enabled: boolean) => void;
  receiveNewsletter: boolean;
  setReceiveNewsletter: (receive: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  gasSettings: 'low' | 'medium' | 'high';
  setGasSettings: (setting: 'low' | 'medium' | 'high') => void;
  saveSettings: () => void;
  applyTheme: () => void;
}

const defaultSettings = {
  language: "english",
  oddsFormat: "decimal",
  showFiatAmount: true,
  onSiteNotifications: true,
  receiveNewsletter: false,
  darkMode: true,
  accentColor: "#00FFFF", // Default cyan/teal accent color
  gasSettings: 'medium' as 'low' | 'medium' | 'high',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Load settings from localStorage on initial mount
  const [language, setLanguage] = useState(defaultSettings.language);
  const [oddsFormat, setOddsFormat] = useState(defaultSettings.oddsFormat);
  const [showFiatAmount, setShowFiatAmount] = useState(defaultSettings.showFiatAmount);
  const [onSiteNotifications, setOnSiteNotifications] = useState(defaultSettings.onSiteNotifications);
  const [receiveNewsletter, setReceiveNewsletter] = useState(defaultSettings.receiveNewsletter);
  const [darkMode, setDarkMode] = useState(defaultSettings.darkMode);
  const [accentColor, setAccentColor] = useState(defaultSettings.accentColor);
  const [gasSettings, setGasSettings] = useState<'low' | 'medium' | 'high'>(defaultSettings.gasSettings);

  // Translation mapping for different languages
  const translations: Record<string, Record<string, string>> = {
    english: {
      "home": "Home",
      "sports": "Sports",
      "live": "Live",
      "promotions": "Promotions",
      "settings": "Settings",
      "betslip": "Bet Slip",
      "place_bet": "Place Bet",
      "stake": "Stake",
      "odds": "Odds",
      "potential_return": "Potential Return",
      "connect_wallet": "Connect Wallet",
      "login": "Login",
      "logout": "Logout",
      "welcome": "Welcome",
      "featured_events": "Featured Events",
      "live_events": "Live Events",
      "upcoming_events": "Upcoming Events",
      "staking": "Staking",
      "yield_farming": "Yield Farming",
      "bet_history": "Bet History",
      "leaderboard": "Leaderboard"
    },
    spanish: {
      "home": "Inicio",
      "sports": "Deportes",
      "live": "En Vivo",
      "promotions": "Promociones",
      "settings": "Configuración",
      "betslip": "Boleto de Apuestas",
      "place_bet": "Realizar Apuesta",
      "stake": "Monto",
      "odds": "Cuotas",
      "potential_return": "Retorno Potencial",
      "connect_wallet": "Conectar Billetera",
      "login": "Iniciar Sesión",
      "logout": "Cerrar Sesión",
      "welcome": "Bienvenido",
      "featured_events": "Eventos Destacados",
      "live_events": "Eventos en Vivo",
      "upcoming_events": "Próximos Eventos",
      "staking": "Staking",
      "yield_farming": "Farming de Rendimiento",
      "bet_history": "Historial de Apuestas",
      "leaderboard": "Clasificación"
    },
    french: {
      "home": "Accueil",
      "sports": "Sports",
      "live": "En Direct",
      "promotions": "Promotions",
      "settings": "Paramètres",
      "betslip": "Ticket de Paris",
      "place_bet": "Placer un Pari",
      "stake": "Mise",
      "odds": "Cotes",
      "potential_return": "Gain Potentiel",
      "connect_wallet": "Connecter Portefeuille",
      "login": "Se Connecter",
      "logout": "Se Déconnecter",
      "welcome": "Bienvenue",
      "featured_events": "Événements à la Une",
      "live_events": "Événements en Direct",
      "upcoming_events": "Événements à Venir",
      "staking": "Staking",
      "yield_farming": "Farming de Rendement",
      "bet_history": "Historique des Paris",
      "leaderboard": "Classement"
    },
    // Add translations for other languages here
  };

  // Get translation for a specific key based on current language
  const getTranslation = (key: string): string => {
    // Default to English if translation not found
    if (!translations[language] || !translations[language][key]) {
      return translations.english[key] || key;
    }
    return translations[language][key];
  };

  // Convert odds based on selected format
  const convertOdds = (decimal: number): string => {
    switch (oddsFormat) {
      case 'decimal':
        return decimal.toFixed(2);
      case 'fractional':
        // Simple conversion for common decimal odds to fractional
        const numerator = Math.round((decimal - 1) * 100);
        const denominator = 100;
        // Find greatest common divisor to simplify fraction
        const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
        const divisor = gcd(numerator, denominator);
        return `${numerator/divisor}/${denominator/divisor}`;
      case 'american':
        // Convert to American odds
        if (decimal >= 2) {
          // Positive odds (underdog)
          return `+${Math.round((decimal - 1) * 100)}`;
        } else {
          // Negative odds (favorite)
          return `${Math.round(-100 / (decimal - 1))}`;
        }
      case 'hongkong':
        // Hong Kong odds are decimal odds minus 1
        return (decimal - 1).toFixed(2);
      default:
        return decimal.toFixed(2);
    }
  };

  // Apply theme and settings to DOM based on current settings
  const applyTheme = () => {
    // Apply theme variables to document root
    const root = document.documentElement;
    root.style.setProperty('--accent-color', '#00FFFF'); // Force default cyan color
    
    // Always apply dark mode for this dApp as requested
    document.body.classList.add('dark-mode');
    root.style.setProperty('--background-color', '#112225');
    root.style.setProperty('--card-background', '#1e3a3f');
    root.style.setProperty('--border-color', '#2a4a54');
    root.style.setProperty('--text-color', '#ffffff');
    
    // Apply language translations to text elements with data-i18n attributes
    const i18nElements = document.querySelectorAll('[data-i18n]');
    i18nElements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (key) {
        element.textContent = getTranslation(key);
      }
    });
    
    // Apply odds format to elements with data-odds attributes
    const oddsElements = document.querySelectorAll('[data-odds]');
    oddsElements.forEach(element => {
      const oddsValue = element.getAttribute('data-odds');
      if (oddsValue && !isNaN(parseFloat(oddsValue))) {
        element.textContent = convertOdds(parseFloat(oddsValue));
      }
    });
  };

  // Apply theme and settings when they change
  useEffect(() => {
    applyTheme();
  }, [language, oddsFormat, darkMode, accentColor]);

  // Load settings from localStorage on initial render
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('suibets-settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setLanguage(parsedSettings.language || defaultSettings.language);
        setOddsFormat(parsedSettings.oddsFormat || defaultSettings.oddsFormat);
        setShowFiatAmount(parsedSettings.showFiatAmount !== undefined ? parsedSettings.showFiatAmount : defaultSettings.showFiatAmount);
        setOnSiteNotifications(parsedSettings.onSiteNotifications !== undefined ? parsedSettings.onSiteNotifications : defaultSettings.onSiteNotifications);
        setReceiveNewsletter(parsedSettings.receiveNewsletter !== undefined ? parsedSettings.receiveNewsletter : defaultSettings.receiveNewsletter);
        setDarkMode(parsedSettings.darkMode !== undefined ? parsedSettings.darkMode : defaultSettings.darkMode);
        setAccentColor(parsedSettings.accentColor || defaultSettings.accentColor);
        setGasSettings(parsedSettings.gasSettings || defaultSettings.gasSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  // Function to save settings to localStorage
  const saveSettings = () => {
    try {
      const settingsToSave = {
        language,
        oddsFormat,
        showFiatAmount,
        onSiteNotifications,
        receiveNewsletter,
        darkMode,
        accentColor,
        gasSettings
      };
      localStorage.setItem('suibets-settings', JSON.stringify(settingsToSave));
      console.log('Settings saved successfully!');
      
      // Apply theme when settings are saved
      applyTheme();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        language,
        setLanguage,
        oddsFormat,
        setOddsFormat,
        showFiatAmount,
        setShowFiatAmount,
        onSiteNotifications,
        setOnSiteNotifications,
        receiveNewsletter,
        setReceiveNewsletter,
        darkMode,
        setDarkMode,
        accentColor,
        setAccentColor,
        gasSettings,
        setGasSettings,
        saveSettings,
        applyTheme
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}