// כל התוכן של האתר נמצא כאן. כדי להוסיף שיעור / כלי / תוצר / קישור — מוסיפים שורה לרשימה המתאימה.
// color: sun | coral | sky | leaf | ink      icon: אחד השמות בקובץ icons.js

window.SITE = {
  lessons: [
    {
      title: "שיעור: יוצרים שיר עם Suno",
      text: "מתחברים עם חשבון גוגל, כותבים מילים, בוחרים סגנון ומקבלים שיר שלם.",
      href: "lessons/suno.html",
      icon: "music", color: "coral",
      tags: ["חדש"]
    }
  ],

  tools: [
    {
      title: "Suno",
      text: "יוצרים שירים מהמילים שלנו. בוחרים סגנון מוזיקה והמחשב שר.",
      href: "https://suno.com",
      icon: "music", color: "coral",
      tags: []
    }
  ],

  // תוצרים של הילדים. audio = נתיב לקובץ שיר בתיקייה songs
  products: [
    {
      title: "השיר שיצרנו בשיעור",
      text: "שיר מגניב ומצחיק שהחוג יצר יחד ב-Suno.",
      audio: "songs/our-song.mp3",
      icon: "star", color: "sun",
      tags: []
    }
  ],

  links: []
};
