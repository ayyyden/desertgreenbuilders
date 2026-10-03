# Desert Green Builders: landing page

Static website for desertgreenbuilders.com, hosted free on GitHub Pages. There's no build step: the files in this folder are the site.

```
index.html              the landing page
terms.html, privacy.html, accessibility.html, 404.html
assets/js/config.js     <- the settings you edit (booking URL, license number)
assets/js/i18n.js       Spanish text (English lives in the HTML)
assets/js/yard.js       the scroll-built yard illustration
assets/js/booking.js    booking form
assets/css/styles.css
backend/                Google Apps Script for bookings (see backend/SETUP.md)
CNAME                   tells GitHub Pages to serve desertgreenbuilders.com
```

## Before going live

1. **Booking backend.** Follow [backend/SETUP.md](backend/SETUP.md), then paste the web app URL into `assets/js/config.js`.
2. **License number.** Put your CSLB license number in `licenseNumber` in `assets/js/config.js`. California requires it on all advertising, including websites.

## Publish on GitHub Pages

1. Create a new **public** repository on GitHub, e.g. `desertgreenbuilders-site`, and push this folder to it.
2. In the repository, go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
3. Under **Custom domain**, enter `desertgreenbuilders.com` and save.
4. At your domain registrar, set these DNS records:

   | Type | Name | Value |
   |---|---|---|
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | `YOUR-GITHUB-USERNAME.github.io` |

5. Once DNS has updated (minutes to a few hours), tick **Enforce HTTPS** in Settings → Pages.

## Preview on your computer

```
py -m http.server 8000
```

Then open <http://localhost:8000>. On localhost, the booking form runs in demo mode with fake open days, and the text code is `123456`. Nothing is saved.

## Editing text

- English: edit the text directly in `index.html`.
- Spanish: edit the matching key in `assets/js/i18n.js`. Each `data-i18n="key"` in the HTML has a Spanish entry with the same key.
- Legal pages contain both languages in the same file.
