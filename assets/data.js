// כל התוכן של האתר נמצא כאן. כדי להוסיף שיעור / כלי / תוצר / קישור — מוסיפים שורה לרשימה המתאימה.
// color: sun | coral | sky | leaf | ink      icon: אחד השמות בקובץ icons.js

window.SITE = {
  lessons: [
    {
      title: "שיעור 3: מהקול שלי, ומנגינה בלי מילים",
      text: "זמזום הופך לשיר, מנגינה פשוטה לסרט, וקול קבוע משלי.",
      href: "lessons/suno3.html",
      icon: "music", color: "leaf",
      tags: ["חדש"]
    },
    {
      title: "שיעור 2: שיר מלחן, וקאבר",
      text: "מעלים לחן ויוצרים עליו שיר, ועושים קאבר לשיר שיצרנו.",
      href: "lessons/suno2.html",
      icon: "music", color: "sky",
      tags: ["חדש"]
    },
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

  // שיר אחד מכל זוג יצירות של הילדים. sunoId = מזהה הנגן הרשמי של Suno.
  products: [
    {
      title: "בננה בנוני — 0:38",
      sunoId: "831ac23e-e7fe-4f71-81f1-597a4ba50d98",
      audio: "assets/audio/banana-038.mp3",
      icon: "star", color: "sun",
      tags: []
    },
    {
      title: "בננה בנוני — 1:17",
      sunoId: "064f5312-4735-4dd7-921c-09b3f7775668",
      audio: "assets/audio/banana-117.mp3",
      icon: "star", color: "sun",
      tags: []
    },
    {
      title: "ילדה אחת בשם מיכל",
      sunoId: "3ff39b6a-c61f-44de-8689-fb996562cf06",
      audio: "assets/audio/michal.mp3",
      icon: "star", color: "sun",
      tags: []
    },
    {
      title: "ילד רצה לטיול",
      sunoId: "78bafdec-0a46-45ef-ac82-be39c7a12039",
      audio: "assets/audio/trip1.mp3",
      icon: "star", color: "sun",
      tags: []
    },
    {
      title: "ילד שרצה לטיול",
      sunoId: "7915ae77-4294-4962-91f5-63a76f55c694",
      audio: "assets/audio/trip2.mp3",
      icon: "star", color: "sun",
      tags: []
    },
    {
      title: "שיר ואלי",
      sunoId: "1b1f715a-dc71-421d-b1e3-801907527003",
      audio: "assets/audio/vali1.mp3",
      icon: "star", color: "sun",
      tags: []
    },
    {
      title: "שיר ואלי ואלי",
      sunoId: "fc4d7c46-ae32-4463-8e97-3c956617c6b9",
      audio: "assets/audio/vali2.mp3",
      icon: "star", color: "sun",
      tags: []
    }
  ],

  // לחנים להורדה: התלמידים מורידים ומעלים ל-Suno (Upload Audio)
  refs: [
    { title: "Happy Birthday", audio: "assets/downloads/happy-birthday-1.mp3" },
    { title: "אחד מי יודע", audio: "assets/downloads/echad-mi-yodea-3.mp3" },
    { title: "מעוז צור", audio: "assets/downloads/maoz-tzur.mp3" }
  ],

  links: []
};
