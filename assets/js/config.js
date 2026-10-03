/*
  Site settings. This is the only file you should need to edit.

  bookingEndpoint  The Google Apps Script web app URL from backend/SETUP.md.
                   Until it's set, the booking form shows a "call us" message
                   instead of taking bookings (on localhost it runs a demo).
  licenseNumber    Your CSLB license number. California law requires it on all
                   advertising, including this website. Leave "" to hide it.
*/
window.DGB_CONFIG = {
  bookingEndpoint: "https://script.google.com/macros/s/AKfycbwwPkux1ULLpyjN87uY0e3zLwwYHJ0dqjek4T62r40kQLDEggdWbmibJd8_yAWYW-DN/exec",
  licenseNumber: "1148568",
  phoneE164: "+17605482781",
  phoneDisplay: "(760) 548-2781",
  timeZone: "America/Los_Angeles",
  // Address suggestions are biased toward this point (Coachella Valley / high desert area).
  addressBias: { lat: 33.72, lon: -116.37 }
};
