// Load localized text
const languageStorageVariable = "lang";
const languages = {
    he: 'he',
    en: 'en'
};
var currentLang;

function setCurrentLanguage() {
    currentLang = window.location.hash;
    if (currentLang) {
        currentLang = window.location.hash.substring(1);
        if (!languages[currentLang]) {
            currentLang = languages.he;
            window.location.hash = '#' + currentLang;
        }
        localStorage.setItem(languageStorageVariable, currentLang);
    } else {
        currentLang = localStorage.getItem(languageStorageVariable);
        if (!(currentLang && languages[currentLang])) {
            currentLang = languages.he;
            localStorage.setItem(languageStorageVariable, currentLang);
        }
        window.location.hash = '#' + currentLang;
    }
}

setCurrentLanguage();

LANG = {
    "en": {
		props: {
			direction: "ltr",
			alignment: "left"
		},
        Morning: "Morning",
        Afternoon: "Afternoon",
        Noon: "Noon",
        All_day: "All day",
        Night: "Night",
        Evening: "Evening",
        Pelephone: "Pelephone",
        Cellular: "Cellular",
        Cellcom: "Cellcom",
        Marked_traffic_areas: "Marked traffic areas",
        Are: "are",
        Origin: "Origin",
        Destination: "Destination",
        Agg_origin: "Origin",
        Agg_destination: "Destination",
        Aggregation_level: "Aggregation level",
        Show_radius: "Show radius",
        Traffic_area_number: "Traffic area number",
        Traffic_area_name: "Traffic area name",
        Aerial_Distance: "Aerial distance (m)",
        Amount_of_travel: "Amount of travel",
        Traffic_area: "Traffic area",
        Travel: "Travel",
        Travels: "Travels",
		Traveled_km: "",
        Km_traveled: "km traveled, ",
		Average_of: "Average of",
		Per_travel: "per travel",
        Km: "km",
        Citizens_over_the_age: "Citizens over the age of",
		Citizens_over_the_age_of: "Citizens over the age of",
		Of_whom: "of whom",
        Remain_in_the_traffic_area: "remains in the traffic zone",
        Remain_within_10: "remains within 10km radius",
        Remain_within_20: "remains within 20km radius",
        Remain_within_50: "remains within 50km radius",
        Reset: "Reset",
        Multiselect: "Multiselect",
        Show_dist_graph: "Show distribution",
        Disable_multiselect: "Disable multiselect or dist graph to allow aggregation levels",
        Toggle_graph_view: "Toggle graph view"
    },
    "he": {
		props: {
			direction: "rtl",
			alignment: "right"
		},
        Morning: "בוקר",
        Afternoon: "אחה\"צ",
        Noon: "צהריים",
        All_day: "יממה",
        Night: "לילה",
        Evening: "ערב",
        Pelephone: "פלאפון",
        Cellular: "סלולרי",
        Cellcom: "סלקום",
        Marked_traffic_areas: "אזורי התנועה שסומנו",
        Are: "הם",
        Origin: "מוצאים",
        Destination: "יעדים",
        Agg_origin: "מוצא",
        Agg_destination: "יעד",
        Aggregation_level: "רמת הצטברות",
        Show_radius: "הצג רדיוסים",
        Traffic_area_number: "מס' אזור התנועה",
        Traffic_area_name: "שם אזור התנועה",
        Aerial_Distance: "מרחק אווירי (מ')",
        Amount_of_travel: "כמות נסיעות",
        Traffic_area: "אזור תנועה",
        Travel: "נסיעות",
        Travels: "נסיעות",
		Traveled_km: "נסועה של",
        Km_traveled: "",
		Average_of: "ק\"מ, בממוצע",
		Per_travel: "",
        Km: "ק\"מ",
        Citizens_over_the_age: "מבין התושבים מעל גיל",
		Citizens_over_the_age_of: "תושבים מעל גיל",
		Of_whom: "מתוכם",
        Remain_in_the_traffic_area: "נשארים באזור התנועה",
        Remain_within_10: "נשארים ברדיוס של 10 ק\"מ",
        Remain_within_20: "נשארים ברדיוס של 20 ק\"מ",
        Remain_within_50: "נשארים ברדיוס של 50 ק\"מ",
        Reset: "לאפס",
        Multiselect: "Multiselect",
        Show_dist_graph: "Show distribution",
        Disable_multiselect: "Disable multiselect or dist graph to allow aggregation levels",
        Toggle_graph_view: "Toggle graph view"
    }
};