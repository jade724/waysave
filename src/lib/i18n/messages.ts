// Shared UI strings — English + Irish (Gaeilge). Extend keys in both locales together.

export type AppLocale = "en" | "ga";

const en = {
  nav_home: "Home",
  nav_map: "Map",
  nav_filters: "Filters",
  nav_profile: "Profile",

  brand_waysave: "WaySave",
  home_subtitle:
    "Compare fuel and EV stops near you—then open the map to navigate.",
  greeting_morning: "Good morning",
  greeting_afternoon: "Good afternoon",
  greeting_evening: "Good evening",
  home_guest_name: "there",

  open_map: "Open map",
  open_map_sub: "Stations, routes, and live traffic",

  filters_card_title: "Filters",
  filters_card_sub: "Distance, fuel type, EV plugs",

  favourites_card_title: "Favourites",
  favourites_card_sub: "Saved stations",

  highlights_title: "What you can do",
  highlight_live_map_title: "Live map",
  highlight_live_map_sub: "Pins for fuel and chargers near you",
  highlight_ranking_title: "Smarter ranking",
  highlight_ranking_sub: "Balance price, distance, and route time",
  highlight_ev_title: "EV charging",
  highlight_ev_sub: "Filter by connector types you need",

  tip_title: "Tip",
  tip_body:
    "Allow location access for accurate distances. Use Filters to set max distance and sort order before you drive.",

  prefs_tab_fuel: "Fuel",
  prefs_tab_ev: "EV",
  prefs_dist_any: "Any distance",
  prefs_dist_km: "{n} km radius",
  prefs_sort_nearest: "Nearest",
  prefs_sort_cheapest: "Best value",
  prefs_sort_fastest: "Fastest route",

  settings_title: "Settings",
  settings_back_aria: "Go back",

  settings_section_notifications: "Notifications",
  settings_section_language: "Language",

  price_alerts_title: "Price alerts",
  price_alerts_sub_on:
    "Notify when a community price changes for a station in your favourites (while the app is open).",
  price_alerts_sub_off:
    "Turn on to hear when prices update for stations you’ve saved.",
  price_alerts_favourites_hint:
    "Add favourites on the map to see alerts for those stations.",
  price_alerts_grade_petrol: "Petrol",
  price_alerts_grade_diesel: "Diesel",
  price_alerts_grade_legacy: "Fuel",
  price_alerts_toast: "Price update: {name} · {grade} — €{price}/L",
  price_alerts_notification_title: "WaySave price update",
  price_alerts_notification_body: "{name} · {grade}: €{price}/L",
  price_alerts_permission_denied:
    "Notifications are blocked — enable them in the browser if you want alerts outside the app.",

  language_app: "App language",
  language_en: "English",
  language_ga: "Gaeilge",

  about_title: "WaySave v1.0.0",
  about_body: "Settings are saved to this device.",

  price_submit_success_title: "Update submitted!",
  price_submit_success_body:
    "Thanks for helping keep station information accurate for the community.",
  price_submit_success_back_station: "Back to station",
  price_submit_success_back_station_sub:
    "Add another price (e.g. diesel) or review details",
  price_submit_success_back_map: "Back to map",
} as const;

export type MessageKey = keyof typeof en;

const ga: Record<MessageKey, string> = {
  nav_home: "Baile",
  nav_map: "Léarscáil",
  nav_filters: "Scagairí",
  nav_profile: "Próifíl",

  brand_waysave: "WaySave",
  home_subtitle:
    "Cuir stáisiúin breosla agus EV i do thimpeall i gcomparáid—ansin oscail an léarscáil.",
  greeting_morning: "Maidin mhaith",
  greeting_afternoon: "Tráthnóna maith",
  greeting_evening: "Feasgar math",
  home_guest_name: "a chara",

  open_map: "Oscail léarscáil",
  open_map_sub: "Stáisiúin, bealaí, agus tráchta beo",

  filters_card_title: "Scagairí",
  filters_card_sub: "Fad, cineál breosla, agus plocóid EV",

  favourites_card_title: "Ceanáin",
  favourites_card_sub: "Stáisiúin shábháilte",

  highlights_title: "Cad is féidir leat a dhéanamh",
  highlight_live_map_title: "Léarscáil bheo",
  highlight_live_map_sub: "Uaireanta do bhreosla agus do luchtóirí in aice leat",
  highlight_ranking_title: "Rangú níos cliste",
  highlight_ranking_sub: "Cothromaigh praghas, fad, agus am an bhealaigh",
  highlight_ev_title: "Luchtú EV",
  highlight_ev_sub: "Scag de réir na gconaitheoirí a theastaíonn uait",

  tip_title: "Leid",
  tip_body:
    "Ceadaigh rochtain ar shuíomh le haghaidh fad cruinn. Úsáid Scagairí chun an t-ullmhú is fearr a dhéanamh sula dtéann tú ag tiomáint.",

  prefs_tab_fuel: "Breosla",
  prefs_tab_ev: "EV",
  prefs_dist_any: "Aon fad",
  prefs_dist_km: "Ga {n} km",
  prefs_sort_nearest: "An gar is gaire",
  prefs_sort_cheapest: "An luach is fearr",
  prefs_sort_fastest: "An bealach is tapa",

  settings_title: "Socruithe",
  settings_back_aria: "Siar",

  settings_section_notifications: "Fógraí",
  settings_section_language: "Teanga",

  price_alerts_title: "Foláirimh praghais",
  price_alerts_sub_on:
    "Cuir in iúl nuair a athraíonn praghas pobail do stáisiún i do cheanáin (agus an aip ar oscailte).",
  price_alerts_sub_off:
    "Cas air chun éisteacht le nuashonruithe praghais do stáisiúin atá sábháilte agat.",
  price_alerts_favourites_hint:
    "Cuir ceanáin leis ar an léarscáil chun foláirimh a fheiceáil dóibh sin.",
  price_alerts_grade_petrol: "Peatról",
  price_alerts_grade_diesel: "Díosal",
  price_alerts_grade_legacy: "Breosla",
  price_alerts_toast: "Nuashonrú praghais: {name} · {grade} — €{price}/L",
  price_alerts_notification_title: "Nuashonrú praghais WaySave",
  price_alerts_notification_body: "{name} · {grade}: €{price}/L",
  price_alerts_permission_denied:
    "Tá fógraí blocáilte — cumasaigh i mbrabhsálaí más mian leat foláirimh lasmuigh den aip.",

  language_app: "Teanga na haipe",
  language_en: "Béarla",
  language_ga: "Gaeilge",

  about_title: "WaySave v1.0.0",
  about_body: "Tá socruithe sábháilte ar an ghléas seo.",

  price_submit_success_title: "Nuashonrú curtha isteach!",
  price_submit_success_body:
    "Go raibh maith agat as cabhrú le sonraí stáisiúin a choinneáil cruinn don phobal.",
  price_submit_success_back_station: "Ar ais go dtí an stáisiún",
  price_submit_success_back_station_sub:
    "Cuir praghas eile leis (m.sh. díosal) nó féach ar shonraí",
  price_submit_success_back_map: "Ar ais go dtí an léarscáil",
};

export const MESSAGES: Record<AppLocale, Record<MessageKey, string>> = {
  en: en as Record<MessageKey, string>,
  ga,
};
