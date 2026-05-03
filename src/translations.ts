/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'jp' | 'ph';

export interface Translation {
  homeTitle: string;
  homeSubtitle: string;
  searchPlaceholder: string;
  nearMe: string;
  savedLocations: string;
  noSavedLocations: string;
  resultsNearYou: string;
  backHome: string;
  openNow: string;
  directions: string;
  call: string;
  back: string;
  login: string;
  signup: string;
  forgotPassword: string;
  welcomeBack: string;
  createAccount: string;
  resetPassword: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  fullNamePlaceholder: string;
  noResults: string;
  filterBy: string;
  categories: string;
  maxDistance: string;
  minRating: string;
  all: string;
  dorms: string;
  privateDorms: string;
  residences: string;
  coliving: string;
  studios: string;
  hostels: string;
  quickAccess: string;
  closed: string;
  listView: string;
  mapView: string;
  allServices: string;
  km: string;
}

export const translations: Record<LanguageCode, Translation> = {
  en: {
    homeTitle: "Find your space,",
    homeSubtitle: "where you study.",
    searchPlaceholder: "Search for dorms, apartments...",
    nearMe: "Near Me",
    savedLocations: "Saved Housing",
    noSavedLocations: "No saved places yet",
    resultsNearYou: "Housing Near You",
    backHome: "Back Home",
    openNow: "Available Now",
    directions: "Directions",
    call: "Contact",
    back: "Back",
    login: "Login",
    signup: "Sign Up",
    forgotPassword: "Forgot Password?",
    welcomeBack: "Welcome Back",
    createAccount: "Create Account",
    resetPassword: "Reset Password",
    emailPlaceholder: "Email Address",
    passwordPlaceholder: "Password",
    fullNamePlaceholder: "Full Name",
    noResults: "No housing found in this area.",
    filterBy: "Filter By",
    categories: "Categories",
    maxDistance: "Max Distance",
    minRating: "Min Rating",
    all: "All",
    dorms: "Uni Dorms",
    privateDorms: "Private Dorms",
    residences: "Student Residences",
    coliving: "Co-living",
    studios: "Studios",
    hostels: "Hostels",
    quickAccess: "Quick Housing Links",
    closed: "Full",
    listView: "List View",
    mapView: "Map View",
    allServices: "All Housing",
    km: "km",
  },
  es: {
    homeTitle: "Encuentra tu espacio,",
    homeSubtitle: "donde estudias.",
    searchPlaceholder: "Dormitorios, apartamentos...",
    nearMe: "Cerca de mí",
    savedLocations: "Alojamiento guardado",
    noSavedLocations: "Sin lugares guardados",
    resultsNearYou: "Alojamiento cerca",
    backHome: "Volver",
    openNow: "Disponible",
    directions: "Ruta",
    call: "Contacto",
    back: "Atrás",
    login: "Login",
    signup: "Registro",
    forgotPassword: "¿Olvidó contraseña?",
    welcomeBack: "Bienvenido",
    createAccount: "Crear cuenta",
    resetPassword: "Restablecer",
    emailPlaceholder: "Correo",
    passwordPlaceholder: "Contraseña",
    fullNamePlaceholder: "Nombre",
    noResults: "Sin resultados.",
    filterBy: "Filtrar",
    categories: "Categorías",
    maxDistance: "Distancia",
    minRating: "Calificación",
    all: "Todos",
    dorms: "Dorms Uni",
    privateDorms: "Dorms Privados",
    residences: "Residencias",
    coliving: "Co-living",
    studios: "Estudios",
    hostels: "Hostales",
    quickAccess: "Acceso rápido",
    closed: "Lleno",
    listView: "Lista",
    mapView: "Mapa",
    allServices: "Todo",
    km: "km",
  },
  fr: {
    homeTitle: "Trouvez votre espace,",
    homeSubtitle: "là où vous étudiez.",
    searchPlaceholder: "Dortoirs, appartements...",
    nearMe: "Près de moi",
    savedLocations: "Sauvegardés",
    noSavedLocations: "Aucun lieu",
    resultsNearYou: "À proximité",
    backHome: "Accueil",
    openNow: "Disponible",
    directions: "Itinéraire",
    call: "Contact",
    back: "Retour",
    login: "Connexion",
    signup: "Inscription",
    forgotPassword: "Oublié ?",
    welcomeBack: "Bienvenue",
    createAccount: "Créer compte",
    resetPassword: "Reset",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Mdp",
    fullNamePlaceholder: "Nom",
    noResults: "Aucun résultat.",
    filterBy: "Filtrer",
    categories: "Catégories",
    maxDistance: "Distance",
    minRating: "Note",
    all: "Tous",
    dorms: "U-Dortoirs",
    privateDorms: "P-Dortoirs",
    residences: "Résidences",
    coliving: "Co-living",
    studios: "Studios",
    hostels: "Auberges",
    quickAccess: "Accès rapide",
    closed: "Complet",
    listView: "Liste",
    mapView: "Carte",
    allServices: "Tout",
    km: "km",
  },
  de: {
    homeTitle: "Finde deinen Platz,",
    homeSubtitle: "wo du studierst.",
    searchPlaceholder: "Wohnheime, Apartments...",
    nearMe: "Nahbereich",
    savedLocations: "Gespeichert",
    noSavedLocations: "Keine Orte",
    resultsNearYou: "Unterkünfte",
    backHome: "Home",
    openNow: "Frei",
    directions: "Route",
    call: "Kontakt",
    back: "Zurück",
    login: "Login",
    signup: "Register",
    forgotPassword: "Vergessen?",
    welcomeBack: "Willkommen",
    createAccount: "Konto",
    resetPassword: "Reset",
    emailPlaceholder: "E-Mail",
    passwordPlaceholder: "Passwort",
    fullNamePlaceholder: "Name",
    noResults: "Keine Ergebnisse.",
    filterBy: "Filter",
    categories: "Kategorien",
    maxDistance: "Distanz",
    minRating: "Bewertung",
    all: "Alle",
    dorms: "Uni-Heime",
    privateDorms: "Privat-Heime",
    residences: "Residenzen",
    coliving: "Co-living",
    studios: "Studios",
    hostels: "Hostels",
    quickAccess: "Schnellwahl",
    closed: "Voll",
    listView: "Liste",
    mapView: "Karte",
    allServices: "Alle",
    km: "km",
  },
  jp: {
    homeTitle: "学びのそばに、",
    homeSubtitle: "あなたの居場所を。",
    searchPlaceholder: "寮、アパートを検索...",
    nearMe: "周辺検索",
    savedLocations: "保存済み",
    noSavedLocations: "ありません",
    resultsNearYou: "周辺の結果",
    backHome: "ホーム",
    openNow: "空室あり",
    directions: "ルート",
    call: "連絡",
    back: "戻る",
    login: "ログイン",
    signup: "登録",
    forgotPassword: "忘れた場合",
    welcomeBack: "おかえりなさい",
    createAccount: "作成",
    resetPassword: "リセット",
    emailPlaceholder: "メール",
    passwordPlaceholder: "パスワード",
    fullNamePlaceholder: "氏名",
    noResults: "見つかりません。",
    filterBy: "フィルター",
    categories: "カテゴリ",
    maxDistance: "距離",
    minRating: "評価",
    all: "すべて",
    dorms: "大学寮",
    privateDorms: "民間寮",
    residences: "レジデンス",
    coliving: "共生住宅",
    studios: "スタジオ",
    hostels: "ホステル",
    quickAccess: "クイック",
    closed: "満室",
    listView: "リスト",
    mapView: "地図",
    allServices: "すべて",
    km: "km",
  },
  ph: {
    homeTitle: "Hanap ng tirahan,",
    homeSubtitle: "malapit sa aralan.",
    searchPlaceholder: "Dorm, apartment...",
    nearMe: "Malapit sa akin",
    savedLocations: "Naka-save",
    noSavedLocations: "Wala pa",
    resultsNearYou: "Mga dorm dito",
    backHome: "Home",
    openNow: "Available",
    directions: "Direksyon",
    call: "I-contact",
    back: "Balik",
    login: "Login",
    signup: "Sali",
    forgotPassword: "Limot?",
    welcomeBack: "Tuloy po",
    createAccount: "Sali na",
    resetPassword: "I-reset",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Pass",
    fullNamePlaceholder: "Pangalan",
    noResults: "Walang nakita.",
    filterBy: "I-filter",
    categories: "Kategorya",
    maxDistance: "Layo",
    minRating: "Bida",
    all: "Lahat",
    dorms: "U-Dorm",
    privateDorms: "P-Dorm",
    residences: "Residences",
    coliving: "Co-living",
    studios: "Studios",
    hostels: "Hostels",
    quickAccess: "Mabilis",
    closed: "Puno",
    listView: "Listahan",
    mapView: "Mapa",
    allServices: "Lahat",
    km: "km",
  }
};

export const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'jp', name: '日本語', flag: '🇯🇵' },
  { code: 'ph', name: 'Filipino', flag: '🇵🇭' },
] as const;
