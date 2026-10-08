/* StoryCV buddies: shared by the landing page and the app. */
(function(){
const BUDDIES = {
  kira: { name:"Kira", animal:"the Cat", role:"The Cheerleader", themeName:"Sunny Day",
          traits:["Bubbly","Encouraging","Celebrates wins"],
          say:"“Let's show the world how awesome you are!”",
          hello:(n) => `Hiii! I'm Kira. Just a few basics first, then we chat!`,
          theme:{ accent:"#3F5EF0", dark:"#2C46C4", soft:"#EEF2FF", bg:"#EAF2FF", pop:"#FFC93C", popInk:"#1F2340",
                  head:"'Nunito', sans-serif", bub:"22px 22px 22px 8px", me:"22px 22px 8px 22px",
                  bd:"0 solid transparent", sh:"0 2px 6px rgba(31,35,64,.06)", chip:"999px", btn:"28px", btnBd:"0 solid transparent", btnSh:"none" } },
  kopi: { name:"Kopi", animal:"the Owl", role:"The Wise Mentor", themeName:"Cozy Café",
          traits:["Calm","Thoughtful","Polite"],
          say:"“Grab a drink. Let's take this slowly, together.”",
          hello:(n) => `Good to meet you. I'm Kopi. A few details first, then we'll talk.`,
          theme:{ accent:"#6B4226", dark:"#4E2F1A", soft:"#F3E8DA", bg:"#F6EFE4", pop:"#F0D3A8", popInk:"#2B1D14",
                  head:"'Fraunces', Georgia, serif", bub:"14px 14px 14px 4px", me:"14px 14px 4px 14px",
                  bd:"1px solid #E4D6C1", sh:"none", chip:"10px", btn:"14px", btnBd:"0 solid transparent", btnSh:"none" } },
  tobi: { name:"Tobi", animal:"the Dino", role:"The Game Master", themeName:"Playground",
          traits:["Playful","Punchy","Quick jokes"],
          say:"“Let's speedrun your CV. Ready? Level 1!”",
          hello:(n) => `YO! Tobi here. Quick setup, then the game starts!`,
          theme:{ accent:"#1D7F45", dark:"#15633A", soft:"#E2F5D8", bg:"#EEF9E6", pop:"#FF8A3D", popInk:"#14231A",
                  head:"'Bricolage Grotesque', sans-serif", bub:"16px 16px 16px 4px", me:"16px 16px 4px 16px",
                  bd:"2px solid #14231A", sh:"3px 3px 0 #14231A", chip:"12px", btn:"16px", btnBd:"2.5px solid #14231A", btnSh:"4px 4px 0 #14231A" } },
};

/* ================= Character drawings (moods: happy, think, wink, yay) ================= */
const INK = "#1F2340";
function eyes(lx, rx, y, mood, r=6.5){
  const arc = (x) => `<path d="M${x-7} ${y+3} Q${x} ${y-7} ${x+7} ${y+3}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  const dot = (x, dx=0, dy=0) => `<circle cx="${x+dx}" cy="${y+dy}" r="${r}" fill="${INK}"/><circle cx="${x+dx+2.5}" cy="${y+dy-2.5}" r="2.2" fill="#fff"/>`;
  if (mood === "yay") return arc(lx) + arc(rx);
  if (mood === "wink") return dot(lx) + `<path d="M${rx-7} ${y} Q${rx} ${y+5} ${rx+7} ${y}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  if (mood === "think") return dot(lx,2,-3) + dot(rx,2,-3);
  return dot(lx) + dot(rx);
}
const DRAW = {
  kira(m){
    const fur="#FFC93C", pink="#FF9FB0";
    let s = `<path d="M22 54 L28 12 L56 34 Z" fill="${fur}"/><path d="M98 54 L92 12 L64 34 Z" fill="${fur}"/><path d="M30 42 L32 22 L47 34 Z" fill="${pink}"/><path d="M90 42 L88 22 L73 34 Z" fill="${pink}"/><ellipse cx="60" cy="70" rx="47" ry="40" fill="${fur}"/><path d="M60 32 V41 M50 34 L52 42 M70 34 L68 42" stroke="#E8A100" stroke-width="4" stroke-linecap="round"/>`;
    s += eyes(43,77,64,m) + `<circle cx="34" cy="80" r="6" fill="${pink}" opacity=".75"/><circle cx="86" cy="80" r="6" fill="${pink}" opacity=".75"/><path d="M55 74 H65 L60 80 Z" fill="#F07A8E"/>`;
    s += m==="think" ? `<circle cx="60" cy="88" r="3.5" fill="${INK}"/>` : m==="yay" ? `<path d="M50 82 Q60 98 70 82 Z" fill="${INK}"/>` : `<path d="M60 80 Q56 87 50 83 M60 80 Q64 87 70 83" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    return s + `<path d="M12 70 L28 73 M12 80 L28 79 M108 70 L92 73 M108 80 L92 79" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>`;
  },
  kopi(m){
    const body="#8A5A3B", gl="#3B2A1E";
    let s = `<path d="M24 42 L18 8 L46 28 Z" fill="${body}"/><path d="M96 42 L102 8 L74 28 Z" fill="${body}"/><path d="M60 18 C92 18 106 44 106 70 C106 98 86 112 60 112 C34 112 14 98 14 70 C14 44 28 18 60 18 Z" fill="${body}"/><path d="M16 62 Q4 84 24 100 Q20 80 16 62 Z" fill="#6E4529"/><path d="M104 62 Q116 84 96 100 Q100 80 104 62 Z" fill="#6E4529"/><ellipse cx="60" cy="94" rx="27" ry="16" fill="#EBD6B8"/><path d="M45 87 L48 90 L51 87 M57 87 L60 90 L63 87 M69 87 L72 90 L75 87 M51 97 L54 100 L57 97 M63 97 L66 100 L69 97" fill="none" stroke="#B88B63" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="43" cy="56" r="18" fill="#F7EBD8"/><circle cx="77" cy="56" r="18" fill="#F7EBD8"/>`;
    s += eyes(43,77,56,m,6) + `<circle cx="43" cy="56" r="14.5" fill="none" stroke="${gl}" stroke-width="3.5"/><circle cx="77" cy="56" r="14.5" fill="none" stroke="${gl}" stroke-width="3.5"/><path d="M57.5 55 Q60 51 62.5 55" fill="none" stroke="${gl}" stroke-width="3.5" stroke-linecap="round"/>`;
    return s + `<path d="M54 70 L66 70 L60 ${m==="yay" ? 82 : 79} Z" fill="#F2A03A"/>`;
  },
  tobi(m){
    let s = `<path d="M36 40 L44 14 L54 36 Z M52 34 L60 4 L68 34 Z M66 36 L76 14 L84 40 Z" fill="#FF8A3D"/><rect x="14" y="30" width="92" height="82" rx="40" fill="#5CC27A"/><ellipse cx="60" cy="94" rx="34" ry="15" fill="#D3F0C4"/><circle cx="26" cy="58" r="4.5" fill="#43A562"/><circle cx="95" cy="62" r="5.5" fill="#43A562"/><circle cx="88" cy="48" r="3.5" fill="#43A562"/>`;
    s += eyes(42,78,62,m,8) + `<circle cx="54" cy="76" r="2.5" fill="${INK}" opacity=".45"/><circle cx="66" cy="76" r="2.5" fill="${INK}" opacity=".45"/>`;
    if (m === "think") return s + `<path d="M52 92 H68" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
    if (m === "yay") return s + `<path d="M42 86 Q60 108 78 86 Z" fill="${INK}"/><path d="M64 87 L70 87 L67 93 Z" fill="#fff"/>`;
    return s + `<path d="M42 86 Q60 100 78 86" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/><path d="M64 91.5 L70 90 L67.5 96 Z" fill="#fff"/>`;
  },
};
function mascot(id, mood="happy", size=48){
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="${BUDDIES[id].name}" style="flex:none">${DRAW[id](mood)}</svg>`;
}


window.StoryBuddies = { BUDDIES, DRAW, mascot };
})();
