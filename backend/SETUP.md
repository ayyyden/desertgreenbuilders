# Booking backend setup (about 20 minutes)

The booking form needs a small free backend to save leads, check open times and text verification codes.
It runs as a Google Apps Script attached to a Google Sheet in your Google account (omdandevelopment@gmail.com).

Until this is set up, the live website tells visitors to call (760) 548-2781 instead of booking online.

## 1. Create the Sheet and paste the code

1. Go to <https://sheets.new> and name the sheet **Desert Green Builders Leads**.
2. Click **Extensions → Apps Script**.
3. Delete everything in `Code.gs`, then paste in all of [`Code.gs`](Code.gs) from this folder.
4. Click the gear icon (**Project Settings**) and tick **Show "appsscript.json" manifest file in editor**.
   Go back to the editor, open `appsscript.json`, and replace its contents with [`appsscript.json`](appsscript.json).
5. Click **Save** (disk icon).

## 2. Set up the sheets

1. Go back to the spreadsheet tab and reload it. A **Desert Green** menu appears after a few seconds.
2. Click **Desert Green → 1. Set up sheets**. Google asks for permission. Choose your account, click
   **Advanced → Go to (project name)**, then **Allow**. (Google shows this warning for any script you write yourself.)
3. You now have three tabs: **Leads**, **Blocked** and **Settings**.
4. Click **Desert Green → 2. Send a test lead email** and check that the email arrives.

## 3. Publish it as a web app

1. In the Apps Script editor click **Deploy → New deployment**.
2. Gear icon next to "Select type" → **Web app**.
3. **Execute as:** Me. **Who has access:** Anyone.
4. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. Open `assets/js/config.js` in the website and paste it:
   ```js
   bookingEndpoint: "https://script.google.com/macros/s/XXXXXXXX/exec",
   ```
6. Commit and push the change to GitHub.

When you change `Code.gs` later, use **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**.
That keeps the same URL. Creating a *new* deployment gives you a new URL.

## 4. Turn on phone verification (Twilio)

Without this step, the form still works. It just skips the text-message code, and the Leads sheet marks the phone as not verified.

1. Create an account at <https://www.twilio.com> and **upgrade** it (trial accounts can only text numbers you've verified yourself).
   Verify costs about 5 cents per successful verification plus the text message fee.
2. In the Twilio Console, go to **Verify → Services → Create new**. Name it `Desert Green Builders`, channel **SMS**.
   Copy the **Service SID** (starts with `VA`).
3. From the Console home page, copy your **Account SID** (starts with `AC`) and **Auth Token**.
4. In Apps Script, go to **Project Settings → Script Properties → Add script property** and add all three:

   | Property | Value |
   |---|---|
   | `TWILIO_ACCOUNT_SID` | `AC…` |
   | `TWILIO_AUTH_TOKEN` | your auth token |
   | `TWILIO_VERIFY_SID` | `VA…` |

5. In Twilio, go to **Verify → Services → your service → Fraud Guard** and keep it on. Under **Messaging → Settings →
   Geo permissions**, allow only the United States. That stops people abusing the form to send texts to other countries.

No redeploy is needed: the website picks it up on the next page load.

## Controlling your schedule

| You want to… | Do this |
|---|---|
| Take a day off | **Blocked** tab: type the date in column A. |
| Take several days off | **Blocked** tab: start date in A, end date in B. |
| Block part of a day | **Blocked** tab: date in A, times in C and D, like `1:00 PM` and `8:00 PM`. |
| Block anything else | Put it on your Google Calendar. Anything on it blocks that time, and all-day events block the whole day. |
| Cancel a booking | **Leads** tab: set Status to `Cancelled` (and delete the calendar event). The slot opens up again. |
| Change appointment times | **Settings** tab, *Appointment times*: e.g. `8:00 AM, 11:30 AM, 3:00 PM, 6:30 PM`. Spacing these 3 to 4 hours apart is how the gap between leads is enforced. |
| Allow fewer leads per day | **Settings** tab, *Max appointments per day*: e.g. `3`. |
| Change days | **Settings** tab, *Days open for booking*. Friday and Saturday are always closed, even if listed. |
| Stop same-day bookings | **Settings** tab, *Minimum notice (hours)*: default 18. |
| Send leads to another email | **Settings** tab, *Send new leads to (email)*. Separate several with commas. |

Each new booking adds a row to **Leads**, emails you and adds an event to your Google Calendar.
To check what visitors currently see, use **Desert Green → Show open times**.
