/*
  הגדרות האתר - הקובץ היחיד שצריך לערוך כדי לחבר שירותים.
  שום דבר כאן אינו סוד: הכול נראה בדפדפן, ולכן אין כאן טוקנים.
  ערך ריק = השירות כבוי והדף ממשיך לעבוד.
*/
window.SITE_CONFIG = {
  // כתובת ה-Web App של Apps Script (הרשמה ומעקב שלבים). ריק = לא שולחים כלום.
  APPS_URL: "https://script.google.com/macros/s/AKfycbz0J3peDQp1ChPemYGrJaraUdd365fRktCXATkAuzpkV-TTkTKKra0AzpZgu8aQWWM/exec",

  // מזהי וימאו (המספר מהכתובת vimeo.com/<מספר>) לכל סגנון. הסרטונים אנכיים 9:16.
  // ריק או לא תקין = במקום הנגן מוצג placeholder.
  VIMEO_IDS: {
    bohelet: "1177264226",
    shofetet: "1177264029",
    meratza: "1177264946",
    nihulit: "1177264590"
  },

  // דף התשלום בקארדקום
  CARDCOM_URL: "https://secure.cardcom.solutions/EA/EA5/wXHZUkGkSaKAJLrxO1kA/PaymentSP",

  // מזהה פיקסל של מטא (ספרות בלבד). ריק = לא נטען.
  PIXEL_ID: "",

  // מזהה גוגל אנליטיקס, למשל G-XXXXXXXXXX. ריק = לא נטען.
  GA_ID: "",

  // לבדיקות בלבד: מאפשר לפתוח את דף האבחון עם ?style=<שם> ולראות תוצאה בלי לענות.
  // ב-localhost זה פועל תמיד. באתר החי זה כבוי, אלא אם מעבירים ל-true בכוונה.
  // כשהפרמטר בשימוש לא נשלחים אירועים ולא נשמר כלום.
  ALLOW_STYLE_PARAM: false
};
