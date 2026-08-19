<template>
  <svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two kids sitting together reading a book under a tree">
    <defs>
      <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FBF3E3" />
        <stop offset="55%" stop-color="#F4E4C8" />
        <stop offset="100%" stop-color="#E9DAB8" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="800" height="420" fill="url(#hero-sky)" />

    <circle cx="630" cy="85" r="72" fill="#E36656" opacity="0.12" />
    <circle cx="630" cy="85" r="40" fill="#F6DFAF" opacity="0.95" />

    <path d="M110 66 q8 -10 16 0 q8 -10 16 0" stroke="#1B3B5F" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.45" />
    <path d="M170 96 q6 -8 12 0 q6 -8 12 0" stroke="#1B3B5F" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.35" />

    <ellipse cx="150" cy="430" rx="270" ry="90" fill="#2F6F58" opacity="0.09" />
    <ellipse cx="640" cy="430" rx="330" ry="110" fill="#2F6F58" opacity="0.13" />

    <rect x="718" y="228" width="18" height="150" rx="8" fill="#8A6A45" opacity="0.55" />
    <circle cx="727" cy="215" r="56" fill="#2F6F58" opacity="0.55" />
    <circle cx="686" cy="242" r="42" fill="#2F6F58" opacity="0.5" />
    <circle cx="764" cy="242" r="42" fill="#2F6F58" opacity="0.5" />

    <ellipse cx="420" cy="446" rx="430" ry="66" fill="#E9DAB8" />

    <!-- Kid A: green hoodie, seated left -->
    <g transform="translate(350,340)">
      <path d="M-42,18 Q-50,55 -22,74 Q0,84 22,74 Q50,55 42,18 Q22,2 0,6 Q-22,2 -42,18 Z" fill="#3E5C76" />
      <ellipse cx="-20" cy="76" rx="15" ry="9" fill="#1B3B5F" />
      <ellipse cx="20" cy="76" rx="15" ry="9" fill="#1B3B5F" />

      <path d="M-46,-20 Q-62,0 -50,26 Q-44,30 -38,24 Q-46,4 -34,-16 Z" fill="#276050" />

      <path d="M-36,-36 Q-52,-34 -52,-8 L-52,14 Q-52,28 -30,32 L30,32 Q52,28 52,14 L52,-8 Q52,-34 36,-36 Q18,-54 0,-54 Q-18,-54 -36,-36 Z" fill="#2F6F58" />

      <path d="M30,-14 Q52,-6 56,20 Q58,34 46,36 Q40,30 40,18 Q36,0 22,-8 Z" fill="#2F6F58" />
      <circle cx="47" cy="35" r="8" fill="#F0C39A" />

      <rect x="-8" y="-46" width="16" height="14" rx="4" fill="#F0C39A" />
      <circle cx="0" cy="-66" r="27" fill="#F0C39A" />

      <path d="M-27,-70 Q-30,-97 0,-97 Q30,-97 27,-70 Q22,-85 0,-85 Q-16,-85 -20,-72 Q-24,-79 -27,-70 Z" fill="#241A12" />
      <path d="M-27,-68 Q-30,-56 -22,-45 Q-28,-58 -25,-70 Z" fill="#241A12" />

      <circle cx="-9" cy="-65" r="2.6" fill="#1B3B5F" />
      <circle cx="9" cy="-65" r="2.6" fill="#1B3B5F" />
      <path d="M-8,-55 Q0,-49 8,-55" stroke="#1B3B5F" stroke-width="2.4" fill="none" stroke-linecap="round" />
      <circle cx="-16" cy="-57" r="4" fill="#E36656" opacity="0.35" />
      <circle cx="16" cy="-57" r="4" fill="#E36656" opacity="0.35" />
    </g>

    <!-- Kid B: coral top, seated right -->
    <g transform="translate(490,340)">
      <path d="M42,18 Q50,55 22,74 Q0,84 -22,74 Q-50,55 -42,18 Q-22,2 0,6 Q22,2 42,18 Z" fill="#41607A" />
      <ellipse cx="20" cy="76" rx="15" ry="9" fill="#1B3B5F" />
      <ellipse cx="-20" cy="76" rx="15" ry="9" fill="#1B3B5F" />

      <path d="M46,-20 Q62,0 50,26 Q44,30 38,24 Q46,4 34,-16 Z" fill="#C6503F" />

      <path d="M36,-36 Q52,-34 52,-8 L52,14 Q52,28 30,32 L-30,32 Q-52,28 -52,14 L-52,-8 Q-52,-34 -36,-36 Q-18,-54 0,-54 Q18,-54 36,-36 Z" fill="#E36656" />

      <path d="M-30,-14 Q-52,-6 -56,20 Q-58,34 -46,36 Q-40,30 -40,18 Q-36,0 -22,-8 Z" fill="#E36656" />
      <circle cx="-47" cy="35" r="8" fill="#C98A5E" />

      <rect x="-8" y="-46" width="16" height="14" rx="4" fill="#C98A5E" />
      <circle cx="0" cy="-66" r="27" fill="#C98A5E" />

      <path d="M-27,-70 Q-31,-99 0,-99 Q31,-99 27,-70 Q23,-87 0,-89 Q-14,-89 -19,-75 Q-24,-81 -27,-70 Z" fill="#1B140E" />
      <circle cx="-24" cy="-73" r="6.5" fill="#1B140E" />
      <circle cx="24" cy="-73" r="6.5" fill="#1B140E" />
      <circle cx="-16" cy="-85" r="6" fill="#1B140E" />
      <circle cx="16" cy="-85" r="6" fill="#1B140E" />

      <circle cx="-9" cy="-65" r="2.6" fill="#1B3B5F" />
      <circle cx="9" cy="-65" r="2.6" fill="#1B3B5F" />
      <path d="M-8,-55 Q0,-49 8,-55" stroke="#1B3B5F" stroke-width="2.4" fill="none" stroke-linecap="round" />
      <circle cx="-16" cy="-57" r="4" fill="#8A4A32" opacity="0.35" />
      <circle cx="16" cy="-57" r="4" fill="#8A4A32" opacity="0.35" />
    </g>

    <!-- Shared open book -->
    <g transform="translate(420,364)">
      <rect x="-46" y="-17" width="92" height="34" rx="7" fill="#FBF3E3" stroke="#1B3B5F" stroke-width="2.5" />
      <line x1="0" y1="-15" x2="0" y2="15" stroke="#1B3B5F" stroke-width="2" />
      <line x1="-32" y1="-5" x2="-8" y2="-5" stroke="#5B5347" stroke-width="2" stroke-linecap="round" />
      <line x1="-32" y1="5" x2="-14" y2="5" stroke="#5B5347" stroke-width="2" stroke-linecap="round" />
      <line x1="8" y1="-5" x2="32" y2="-5" stroke="#5B5347" stroke-width="2" stroke-linecap="round" />
      <line x1="14" y1="5" x2="32" y2="5" stroke="#5B5347" stroke-width="2" stroke-linecap="round" />
    </g>

    <path d="M506 214 L512 228 L526 234 L512 240 L506 254 L500 240 L486 234 L500 228 Z" fill="#E36656" opacity="0.85" />
    <path d="M540 200 L543 208 L551 211 L543 214 L540 222 L537 214 L529 211 L537 208 Z" fill="#E36656" opacity="0.6" />

    <path d="M356 200 Q378 196 386 214 Q368 220 356 214 Q348 208 356 200 Z" fill="#2F6F58" opacity="0.75" />
    <path d="M358 212 Q370 208 383 213" stroke="#1B3B5F" stroke-width="1.5" fill="none" opacity="0.4" stroke-linecap="round" />

    <path d="M8 420 C8 378, 50 336, 102 326 C102 368, 70 410, 8 420 Z" fill="#2F6F58" opacity="0.32" />
    <path d="M38 398 C 54 378, 74 358, 90 344" stroke="#2F6F58" stroke-width="2.5" fill="none" opacity="0.5" stroke-linecap="round" />
  </svg>
</template>
