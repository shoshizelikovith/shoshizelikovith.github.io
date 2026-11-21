// הגדרות החיבור. כל עוד SUPABASE_URL ריק, האפליקציה רצה בגרסת הדגמה ושומרת רק במכשיר.
// המפתח הציבורי (anon) של Supabase מיועד להיות גלוי בדפדפן. ההגנה על הנתונים היא בהרשאות השורה במסד.
export const CONFIG = {
  SUPABASE_URL: 'https://fmaxensbiidsjbortqsj.supabase.co',  // פרויקט lesachek-et-hashinui, פרנקפורט (12.11)
  SUPABASE_ANON_KEY: 'sb_publishable_u5kIL-ERBoQONxOkYy6fQQ_aRZo7hE_',  // מפתח ציבורי, מותר שיהיה גלוי

  // קישורים שמשתנים מעת לעת
  ZOOM_LINK: '',          // קישור קבוע לשידור
  ZOOM_WHEN: 'יום ראשון · 10:15',   // שושי 12.11: השידור ביום ראשון ב-10:15 בבוקר. אם משתנה - לעדכן כאן וגם במצגת
  RECORDINGS_LINK: '',    // תיקיית ההקלטות
  TERMS_LINK: '',
  OFFER_DEADLINE: '2026-11-27',  // המחיר המיוחד עד שישי 27.11 בשעה 12:00 (שושי 12.11)
  OFFER_LINK: { graduate: 'https://shoshizelikovith.com/moadon/#offer', club: 'https://shoshizelikovith.com/moadon/haverot/#offer', other: 'https://shoshizelikovith.com/moadon/#offer' },  // 21.11: ישר לאזור ההצטרפות בדף
  // הדפים כקובץ, למי שהדף לא נפתח לה (שושי 21.11). נוצרו מהדפים החיים ב-21.11 - לעדכן אם הדף משתנה
  OFFER_PDF: { graduate: 'pdf/offer-graduates.pdf', club: 'pdf/offer-club.pdf', other: 'pdf/offer-graduates.pdf' },  // דפי ההצעה (צ׳אט ההשקה 12.11). כפתורי קארדקום בתוך הדפים

  // לוגו על פתק הבוקר והסטיקר. כשהלוגו של ״לשחק את השינוי״ יאושר, מחליפים כאן את שני הקבצים
  NOTE_LOGO: 'img/aro-wide.png',
  NOTE_LOGO_NEG: 'img/aro-wide-neg.png',
  NOTE_ART: 'img/note/art-book.png', // האיור הקבוע בפתק התובנה
  MORNING_ART: 'img/note/art-morning-window.png', // האיור הקבוע בפתק השראת הבוקר
  NOTE_SIGNATURE: 'שושי זליקוביץ׳',
  NOTE_APP_NAME: 'לשחק את השינוי',
  NOTE_CREDIT: '',        // שורת קרדיט קטנה מתחת ללוגו בפתק, למשל ״אימון מנטלי עם שושי זליקוביץ׳״

  // סרטון קצר לכל כרטיס הסבר (לפי המפתח, למשל key_action). ריק = בלי כפתור סרטון
  HELP_VIDEOS: {},

  // חוברות ושיעורים לכל חלק בבסיס (קישורים לסקולר או לדרייב)
  LESSON_LINKS: {
    future: { lesson: 'שיעור 2 ושיעור 4', video: '', workbook: '' },
    achievement: { lesson: 'שיעור 9', video: '', workbook: '' },
    plan: { lesson: 'שיעור 10', video: '', workbook: '' },
    channels: { lesson: 'שיעור 11', video: '', workbook: '' },
  },
};
