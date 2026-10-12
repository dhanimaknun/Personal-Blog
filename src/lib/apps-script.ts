// The Google Apps Script the owner pastes into script.google.com. Kept here
// (not as loose files) so the setup card on /essential can show it with the
// site's own sync URL already filled in.
//
// It uses the Gmail and Calendar *advanced services* rather than GmailApp /
// CalendarApp so the manifest can pin read-only scopes: the script can
// search mail and read calendars, and nothing else.

export function appsScriptManifest() {
  return JSON.stringify(
    {
      timeZone: "Asia/Jakarta",
      runtimeVersion: "V8",
      exceptionLogging: "STACKDRIVER",
      dependencies: {
        enabledAdvancedServices: [
          { userSymbol: "Gmail", serviceId: "gmail", version: "v1" },
          { userSymbol: "Calendar", serviceId: "calendar", version: "v3" },
        ],
      },
      oauthScopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/script.external_request",
        "https://www.googleapis.com/auth/script.scriptapp",
      ],
    },
    null,
    2,
  );
}

export function appsScriptCode(syncUrl: string) {
  return `// THE JOURNAL — Google Apps sync
// Reads your calendars and searches Gmail for subscription receipts, then
// sends the results to your site. Read-only: it never changes or sends mail.
//
// Setup: Project Settings → Script Properties → add SYNC_SECRET (the same
// value as GOOGLE_SYNC_SECRET on the site), then run install() once.

const SYNC_URL = ${JSON.stringify(syncUrl)};

function sync() {
  const secret = PropertiesService.getScriptProperties().getProperty('SYNC_SECRET');
  if (!secret) throw new Error('Add the SYNC_SECRET script property first.');
  const headers = { Authorization: 'Bearer ' + secret };

  // 1 · ask the site what to look for
  const config = JSON.parse(UrlFetchApp.fetch(SYNC_URL, { headers: headers }).getContentText());

  // 2 · calendar: every calendar ticked in Google Calendar, today → daysAhead
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + config.daysAhead * 86400000);
  const events = [];
  const calendars = Calendar.CalendarList.list({ minAccessRole: 'reader' }).items || [];
  calendars
    .filter(function (c) { return c.selected && !c.hidden; })
    .forEach(function (cal) {
      let pageToken;
      do {
        const res = Calendar.Events.list(cal.id, {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
          pageToken: pageToken,
        });
        (res.items || []).forEach(function (e) {
          if (e.status === 'cancelled') return;
          const allDay = Boolean(e.start.date);
          events.push({
            id: e.id,
            calendar: cal.summaryOverride || cal.summary || '',
            color: cal.backgroundColor || '',
            title: e.summary || '',
            location: e.location || '',
            allDay: allDay,
            start: allDay ? e.start.date : e.start.dateTime,
            end: allDay ? e.end.date : e.end.dateTime,
          });
        });
        pageToken = res.nextPageToken;
      } while (pageToken);
    });

  // 3 · Gmail: headers only (sender, subject, date) of matching receipts
  const receipts = [];
  config.searches.forEach(function (s) {
    const res = Gmail.Users.Messages.list('me', { q: s.query, maxResults: 15 });
    (res.messages || []).forEach(function (m) {
      const msg = Gmail.Users.Messages.get('me', m.id, {
        format: 'metadata',
        metadataHeaders: ['From', 'Subject'],
      });
      const header = function (name) {
        const h = (msg.payload.headers || []).filter(function (x) { return x.name === name; })[0];
        return h ? h.value : '';
      };
      receipts.push({
        subscriptionId: s.subscriptionId,
        messageId: m.id,
        from: header('From'),
        subject: header('Subject'),
        date: new Date(Number(msg.internalDate)).toISOString(),
      });
    });
  });

  // 4 · send it home
  const res = UrlFetchApp.fetch(SYNC_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify({ events: events, receipts: receipts }),
  });
  console.log(res.getContentText());
}

// Run once: schedules sync() every hour and does a first sync right away.
function install() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sync').timeBased().everyHours(1).create();
  sync();
}
`;
}
