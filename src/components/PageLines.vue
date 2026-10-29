<template>
  <svg class="page-lines" viewBox="0 0 560 400" fill="none" aria-hidden="true">
    <g class="page-lines-sheet" stroke="currentColor" stroke-width=".7">
      <path v-for="offset in 7" :key="offset" :transform="`translate(${offset * 8}, ${offset * -5})`" d="M62 139C161 61 293 60 407 111L365 301C250 238 127 240 35 307L62 139Z" />
    </g>
    <path class="page-lines-trail" d="M105 340c81-74 185-18 225-73 41-57-60-92-72-38-9 39 50 54 99 31 44-20 60-66 100-74" stroke="currentColor" stroke-width="1" stroke-dasharray="2 6" />
    <circle cx="457" cy="186" r="3" fill="currentColor" />
  </svg>
</template>
