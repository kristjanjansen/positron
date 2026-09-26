# An alternative CMS for eccm.ee on the Cloudflare stack: a scan and a plan

Asked 2026-09-26, verbatim:

> *"do a scan of https://eccm.ee/index.php/et/ and make a plan to build an
> alternative cms for them. its joomla atm. how it will look at in cf stack?
> they seem to have news and events and pages and perhaps something else. what
> its just basic posting and scheduled posting. see their api, there are likely
> bloat schema perhaps not always filled / used. can we use cf db for it. also
> can we get away with free plan? multilanguage? joomla vs icagenda. newsletter?
> see also ../trip for some of these ideas (composer, mail rig)"*

## The verdict

eccm.ee is a Joomla site whose living content is one thing: an events calendar.
**98 events** (26 upcoming, 72 past, the oldest dated 2024-09-22) sit in the
free edition of iCagenda, entered once per language, and the front page IS that
calendar. Around it are about seven static pages per language, a members page
that is a paragraph of nine to eleven links, and one open call with a deadline
typed into its prose. "News" exists as three categories and holds **zero real
articles**: two are empty and the English one carries a single stub reading
*"This is a placeholder. Delete or change it."* There is no newsletter form on
any of the eleven pages read, no sitemap, and the Joomla JSON API answers 401.
A replacement is therefore small: one Worker, one D1 database of eleven tables,
an R2 bucket for the originals, Cloudflare Access with a one-time PIN for the
editors, and a `publish_at` column that turns scheduled posting into a WHERE
clause. **The public site fits inside the Workers Free plan with an order of
magnitude to spare at any traffic this kind of site sees**; the one thing that
does not is outbound email, because Cloudflare's Email Sending is *"Not
available"* on Workers Free and needs the $5 a month Workers Paid plan, which
then includes 3,000 emails a month. Three sessions to parity, five with a
newsletter, and the parts that will run long are the migration without database
access, the email domain setup, and the bilingual editor.

| mark | means |
| --- | --- |
| **MEASURED** | seen in a page fetched from eccm.ee on 2026-09-26, or counted in a file on this disk |
| **READ** | quoted from a documentation page fetched on 2026-09-26, with the URL in the sources |
| **INFERRED** | concluded from two measured things and stated by neither |
| **GUESSED** | an estimate with nothing behind it but reasoning, and it says so where it appears |

**How the scan was done.** Fifteen requests to eccm.ee in total, one at a time,
none retried, through a fetcher that converts a page to markdown before reading
it, so `<meta>` tags, JSON-LD and scripts were invisible to it: an absence of
`og:` tags below means *not seen through this fetcher*, never *proven absent*.
Twelve answered 200, one guessed URL answered 404, the API answered 401, and one
menu link led off Joomla entirely. Nothing was crawled and the API was not
retried with the menus endpoint once articles refused.

| # | URL | answer | what it settled |
| --- | --- | --- | --- |
| 1 | `/index.php/et/` | 200 | the front page is the iCagenda list, 26 upcoming events, menu, language switcher |
| 2 | `/index.php/en/` | 200 | the English tree, same 26 events with translated titles, per-page setting differs |
| 3 | `/index.php/et/134-gestuurid-.../2026-09-30-19-00` | 200 | every field one event shows and every field it leaves empty |
| 4 | `/index.php/et/tallinn-1965/uudised` | **404** | a guessed URL; the real one is in row 6 |
| 5 | `/index.php/et/tallinn-1965` | 200 | a static page of about 280 words, and the full menu with every href |
| 6 | `/index.php/et/tallinn-1965/tallinn-1965-uudised` | 200 | *"Selles kategoorias pole ühtegi artiklit"*: an empty news category |
| 7 | `/index.php/et/ulysses/ulysses-uudised` | 200 | the second news category, also empty |
| 8 | `/index.php/et/eccm/liikmed` | 200 | members are a paragraph of links, not a content type |
| 9 | `/index.php/et/konkursid` | 200 | one open call, a Jotform link, no deadline field |
| 10 | `/index.php/et/syndmusest/moeoedunud-suendmused` | 200 | *"72 toimunud üritust - Lehekülg 1 / 8"*, oldest 22.09.2024 |
| 11 | `/robots.txt` | 200 | stock Joomla, no `Sitemap:` line |
| 12 | `/api/index.php/v1/content/articles?page[limit]=5` | **401** | the Web Services API is token-only here; stopped as instructed |
| 13 | `/index.php/en/tallinn-1965-eng/tallinn-1965-news` | 200 | the English news category holds one placeholder |
| 14 | `/nan/` | 200 | a separate one-page static site, English only, not Joomla |
| 15 | `/index.php/et/konkursid/ansambel-u-koosloome-programm` | 200 | an 800-word article shows no date, author, hits or tags |

Not fetched, by budget: `kontakt`, `residentuurid`, `ulysses`, the English
event pages, pages 2 to 8 of the archive, and the menus API endpoint.

---

## 1. What the site actually holds

**Events, and they are the site. MEASURED.** 26 upcoming and 72 past in the
Estonian tree on 2026-09-26, so 98 rows, the oldest dated 2024-09-22, which
makes the archive about two years deep at roughly four events a month. The
front page (`Avaleht`) is the iCagenda upcoming list, not a page with a list on
it. Categories seen on event cards: `ECCM`, `Cooperation` (Koostöö),
`Improtest`, and on the English side `Ulysses_eng`, `Schönbergi ühing` and
`U: (eng)`. Venues in the sample: ECCM (saal), Arvo Pärdi Keskus, Kanuti Gildi
SAAL, ERR Uudistemaja, Mustpeade Maja Valge saal, Startbahn-Genezarethkirche in
Berlin: about six distinct strings in 19 events, which is a text column and
not a venue table yet. Three of the 19 sampled events carry no date segment in
their URL (`/140-11-uele-heli-festival-heli-on-vaba`, `/5-uele-heli-2024`,
`/10-konverents-...`) and one is printed as `22-25.10.2026`, so **iCagenda's
period (multi-day) event type is in use for festivals and the conference.**

**Pages. MEASURED.** The Estonian menu has `eccm` (with `liikmed`, `kontakt`
under it), `tallinn-1965` (with `tallinn-1965-uudised`, `residentuurid`),
`ulysses` (with `ulysses-uudised`), `konkursid`, `syndmusest` (with
`moeoedunud-suendmused`), and an external `NAN`. That is six or seven
`com_content` single articles per language. `tallinn-1965` is about 280 words
and one logo image. `liikmed` lists nine named organisations and ensembles as
plain hyperlinked text (the fetcher counted eleven entries and named nine
distinct ones), no photo, no bio, no email: **a paragraph, not a people type.**

**News. MEASURED, and the finding is that there is none.** Three categories
exist: `Tallinn 1965 uudised` (empty), `Ulysses uudised` (empty), and `Tallinn
1965 News` in English, which holds exactly one article, *"Studio Tallinn 1965
is making plans"*, whose body is the Joomla sample text *"This is a
placeholder. Delete or change it."* So news was planned, wired into two menus
in two languages, and never used. This changes what a replacement is for.

**Open calls. MEASURED.** One article under `konkursid`, about 800 words in
nine headed sections (*Mis? Miks? Kes? Kellele? Millal? Kus? Kui palju maksab?
Kuidas kandideerida?*), with *"Avalduste tähtaeg: 15.10."* and *"Tulemustest
anname teada 25.10."* typed into the prose, an application form at
`https://form.jotform.com/262584600245051`, and no expiry mechanism visible.
It is a news post with a deadline, and that is how the schema below models it.

**Things that are not content types here, and would be tempting.** Members
(a paragraph), venues (a string), sponsors (none seen on any fetched page),
galleries (none), documents (no PDF linked on any fetched page), people (none).
Tickets are external at `fienta.com`; forms are external at Jotform.

**NAN. MEASURED.** `https://eccm.ee/nan/` is the Nordic Analog Network, a
2024 to 2026 mobility programme, served as a separate one-page site with
anchor navigation (`#about`, `#activities`, `#partners`, `#outcomes`,
`#research`), English only, base64 images inline, with a timeline of seven
items. It is not Joomla and it stays out of the CMS: it is static and is
carried over as static assets, or left where it is.

**Two things seen on every page that are not content.** A Joomla login form
module sits in the sidebar of every public page (editors log in from the
front), and a month calendar module of the events sits under every article.
Both are things a replacement has to decide about rather than inherit.

### The schema underneath, and how much of it is filled

**Joomla's article table has 30 columns. MEASURED** in `installation/sql/mysql/
extensions.sql` at tag 5.3.0 on GitHub: `id, asset_id, title, alias, introtext,
fulltext, state, catid, created, created_by, created_by_alias, modified,
modified_by, checked_out, checked_out_time, publish_up, publish_down, images,
urls, attribs, version, ordering, metakey, metadesc, access, hits, metadata,
featured, language, note`, plus `#__content_frontpage` with `featured_up` and
`featured_down`. **The article API renders 29 attributes** per item (MEASURED
in `api/components/com_content/src/View/Articles/JsonapiView.php`, same tag),
and appends every custom field and `languageAssociations` when multilanguage is
on.

**What the pages show being used, MEASURED:** title, alias, body, category,
language, state, and an image in the body. **What no fetched page shows at
all:** created or modified dates, author or `created_by_alias`, hits, tags,
`metadesc` (invisible through the fetcher, so unproven), `featured` (no
featured list exists), `access` (everything is public), `note`, `urls`,
`attribs` (a 5,120-byte JSON of per-article display options), `version`,
`checked_out`, `ordering`. **INFERRED:** on a site with about eight articles
and no news, roughly two thirds of the article schema is carrying defaults.

**iCagenda's fields, read off one event page. MEASURED present:** title, one
date, a start time (19:00), a duration (60 minutes), venue name, a phone
number (`55655596`), an email (JavaScript-cloaked), a website (`eccm.ee`), a
ticket link to Fienta, one image served as a generated thumbnail at
`/images/icagenda/thumbs/themes/ic_large_w900h600q100_gestures-situations-small.jpg`,
a description, and four add-to-calendar buttons (Google, iCal, Outlook, Yahoo).
The address `Pühavaimu 9, Tallinn` was INFERRED by the fetcher from other
listings, not read on that page. **MEASURED empty or absent on the same page:**
map, registration form, capacity, attached files, price, tags, author, hits,
related events, JSON-LD and `og:` tags (through the fetcher). The footer reads
*"Powered by iCagenda"*, which the Pro edition removes, so **this is the free
edition** (READ on icagenda.com: Pro 1-Year is €29.90 and its first listed
benefit is removal of that line).

The iCagenda table definition itself was not obtained: iCagenda has no public
GitHub repository (`gh api repos/iCagenda/iCagenda` answers 404) and the forum
thread a search pointed at held no schema. A search summary names `id,
asset_id, ordering, state, approval, site_itemid, checked_out, checked_out_time,
title, alias, access, language, hits, created, created_by, created_by_alias,
created_by_email, modified, modified_by, username, catid` plus `period,
weekdays, startdate, enddate`. **That list is UNVERIFIED** and is here only so
the migration knows which names to expect in a dump.

## 2. Is it basic posting plus scheduled posting?

**Basic posting: yes, and less than that. MEASURED.** Eight or so pages that
change rarely, one open call, and an event entered per concert. No article
displays a date, author, or counter, so the editorial metadata Joomla keeps is
not part of what visitors see.

**Scheduled posting: UNVERIFIED from outside.** Joomla has `publish_up` and
`publish_down` on every article and iCagenda has `state` and `approval`; whether
any editor here sets a future `publish_up` cannot be seen without the admin or
the API. One piece of evidence points the other way: the open call's deadline is
in the prose and the article has no visible expiry, so `publish_down` is at
least not used there. An event needs no scheduling at all in the Joomla sense,
because its date already sorts it out of the upcoming list.

**What the workflow implies, INFERRED from what is exposed.** The login module
on every public page means editors sign in on the front end. Joomla's core
front-end article editing then covers the pages and the open call; iCagenda's
*"Frontend Event Edition"* is Pro-only (READ), so events are entered in the
administrator. There is no sign of a review step, a draft queue, featured
placement, or expiry in use. **The honest model is: a small number of trusted
editors, publish on save, and the calendar does the rest.** The one addition a
replacement should offer unasked is a `publish_at` for the open call and for
announcements written ahead of a press embargo, because it costs one column.

## 3. Multilanguage

**What is there. MEASURED.** Two content languages under SEF prefixes `/et/`
and `/en/` with flag images from `mod_languages`. Each language has its own menu
tree with its own aliases: `eccm` against `eccm-new-eng`, `liikmed` against
`memeng`, `kontakt` against `new-eng-contact`, `konkursid` against
`open-calls`, `syndmusest` against `eventseng`. The switcher on `tallinn-1965`
points at `tallinn-1965-eng`, so **menu items are associated** in Joomla's
sense. On the open-call article the switcher pointed at `/index.php/en/
konkursid`, which is not the English menu's `open-calls`; that URL was not
fetched and the discrepancy is recorded rather than explained.

**Events are doubled by hand. INFERRED from three measurements.** The English
front page lists the same 26 upcoming events with translated titles
(`GESTURES/SITUATIONS` against `GESTUURID/SITUATSIOONID`); its categories are
named `Ulysses_eng` and `U: (eng)`, which is what an editor types when a
component has one language per row and no association table; and some
translations are missing (`Schönbergi sari` untranslated, `Schönbergi ühing`
as a category label on the English side). So each concert is two iCagenda rows
with two dates, two venues, two ticket links, and nothing binding them but the
editor's memory. The two menu items even disagree on paging: Estonian prints 26
events over 3 pages, English *"26 upcoming events - Page 1 / 9"* at three per
page.

**How a replacement models it, and why: one row per thing, one text row per
language.** An event's date, venue, address, ticket link, image and category
are facts about the concert and not about the language, and on the current site
they are the fields that drift because they are entered twice. A `page`, `event`
or `post` row holds those once; `event_text (event_id, lang, slug, title,
body)` holds what a translator writes. The two alternatives were priced and
rejected:

- **One row per language** (Joomla's model, with `#__associations` pairing
  them) keeps the doubling that produces `Ulysses_eng`, and a migration from
  the current site would have to pair 98 Estonian rows with their English
  twins by matching date and venue, with no key to check against.
- **One row with `title_et, title_en, body_et, body_en`** is the smallest
  thing that works for two languages and it breaks the day a third arrives
  (NAN is a Nordic-Baltic programme; a Latvian or Finnish page is not far
  fetched). It also cannot say *the Estonian text is published and the English
  is still a draft*, which is a state the current site is visibly in.

The fallback rule goes with it: a page with no text row in the visitor's
language shows the Estonian text under an English chrome and says so in one
line, instead of vanishing from the English menu. That is what the current
English site does by accident and a replacement should do on purpose.

## 4. Events: what iCagenda gives that an articles table does not

**READ off the Joomla Extensions Directory listing, version 4.0.16, updated
2026-09-23, 179 reviews:** period events with start and end dates and weekday
selection, single dates and times, venue and address with a map on
OpenStreetMap or Google Maps, images and attached files, a description through
the site editor, *"Registration to events with options"* with custom fields
(text, list, radio, URL, email), CSV export of registrations and mass email to
registrants, event cancellation, *"Front-end buttons: Print and Add to Calendar
(iCal, Google, Yahoo, Outlook calendars)"*, RSS feeds, a calendar module, a
theme manager, and *"Available in more 40 languages"*. Pro adds an event list
module, PayPal, front-end editing and versioning.

**What of that is in use here. MEASURED against the event page and the lists:**

| capability | in use | evidence |
| --- | --- | --- |
| single date with time | yes | every URL carries `/2026-09-30-19-00` |
| period (multi-day) | yes | `22-25.10.2026`, three URLs with no date segment |
| recurrence by weekday | not seen | no series in 19 sampled events |
| venue name | yes | six strings in the sample |
| address | probably | INFERRED by the fetcher from other listings |
| map | no | field empty on the fetched event |
| category | yes | six labels across both languages |
| image | yes | one per event, as a generated thumbnail |
| description | yes | a few paragraphs |
| files | no | none on the fetched event, none on any list |
| ticket link | yes | Fienta, external |
| price | no | field empty; the price is on Fienta |
| registration and attendees | no | field empty; Jotform does the open call |
| add to calendar | yes | four buttons on the event page |
| iCal or RSS feed of the list | not linked | none seen on the front page or the archive |
| calendar month module | yes | under every page, both languages |
| front-end editing | no | Pro-only feature, free edition detected |

So a plain events table with `starts_at`, `ends_at`, `venue`, `address`,
`ticket_url`, `category`, `image_id` and a body covers everything in use. The
two things a replacement must ship on day one because visitors already have
them are **the add-to-calendar links** (an `.ics` per event is thirty lines and
the Google and Outlook links are URL templates) and **the past-events
archive**. The month grid is a nice-to-have and the plan below puts it after
cutover. Registration, capacity, recurrence, files and payments are left out on
the evidence, and the schema says where each would go if asked for.

**Joomla against iCagenda, since the question was asked in those words.**
Joomla is the CMS: pages, menus, users, languages, the news categories nobody
filled. iCagenda is a component installed into it that owns the events table,
the calendar module and the buttons. On this site iCagenda carries 98 rows of
real use and Joomla's own content is eight pages and one placeholder. **The
replacement is an events system with a few pages attached, not a general CMS
with an events plug-in**, and that ordering decides what gets built first.

## 5. Newsletter

**Today: none found. MEASURED** across the eleven HTML pages read: no signup
form, no Mailchimp, Sendinblue or Brevo embed, no *"liitu uudiskirjaga"*, no
social links, no sponsor logos. Whether ECCM mails a list from somewhere
outside the site cannot be seen from the site, and it is the first question to
ask them (section 12).

**On Cloudflare as of 2026-09-26, READ from the pricing and limits pages:**

| | Workers Free | Workers Paid |
| --- | --- | --- |
| Email Routing, inbound | *"Unlimited"* | *"Unlimited"* |
| Email Sending, outbound | *"Not available"* | *"3,000 included per month, then $0.35 per 1,000 emails"* |
| sends to verified destination addresses | free, off quota | free, off quota |

Email Sending is labelled *"Beta"* on the product page. Limits: *"50 per
email"* recipients across to, cc and bcc; *"5 MiB"* per message; 30 domains per
zone across Routing and Sending; and *"New accounts start with a conservative
daily quota and scale up over time based on your sending behavior"*, with no
number published for the starting quota. Inbound: 25 MiB per message, 200
rules per domain, 200 destination addresses per account, and an Email Worker
is subject to the ordinary CPU limits.

**The alternatives, READ the same day:** Resend gives 3,000 emails a month
and *"100 emails a day"* free on three domains with 30-day retention, and a
separate free marketing tier of 1,000 contacts where *"Broadcasts can only be
sent to existing contacts"*; Pro is $20 a month for 50,000 transactional or
$40 a month for 5,000 marketing contacts. Postmark gives 100 a month free and
$15 a month from 10,000, with broadcast streams. MailChannels' free path from
Workers ended on 2024-08-31 (READ from its own end-of-life notice), so any
2023 recipe that mentions it is dead.

**The arithmetic, GUESSED list size.** A cultural centre's list is a few
hundred to a thousand addresses. At 500 subscribers and two issues a month,
one per language, that is 1,000 emails a month: inside Cloudflare's included
3,000 on Paid, and unsendable on Resend's free transactional tier because 100
a day makes one issue a five-day drip. Resend's free Broadcasts would carry it
under 1,000 contacts, at the price of a second vendor holding the list and its
own unsubscribe.

**The recommendation:** Workers Paid at $5 a month, the `send_email` binding,
one row per recipient so each message carries its own signed unsubscribe link
(RFC 8058 `List-Unsubscribe`, which Gmail and Yahoo require of bulk senders and
which `../trip` already emits), a nightly send window so the ramping daily
quota is met rather than discovered, and **double opt-in built by us**, because
`../trip`'s newsletter plan lists *"anonymous email-capture form with true
double opt-in"* under REMAINING (unstarted), so it is not a lift. Inbound
(`info@`, replies, bounces) is Email Routing to a Worker, free, and positron's
`workers/mail` is exactly that shape.

## 6. The Cloudflare stack, concretely, with today's free limits

Every number below was READ on 2026-09-26 from developers.cloudflare.com and
the page is in the sources. The account must be **ECCM's own**, not a shared
one: several limits are per account and the Cron Trigger one in particular is
small.

| part | job here | Workers Free allows | fits? |
| --- | --- | --- | --- |
| **Workers** | render pages, serve the editor, redirect old URLs | *"100,000 per day"* requests, *"10 milliseconds of CPU time per invocation"*, Error 1027 past the limit until midnight UTC; *"Requests to static assets are free and unlimited"* | yes |
| **Workers static assets** | CSS, fonts, the `/nan/` site, pre-rendered pages if wanted | 20,000 files per version, 25 MiB per file, 2,000 static `_redirects`, 100 dynamic | yes |
| **D1** | all content, editors, subscribers | *"5 million / day"* rows read, *"100,000 / day"* rows written, *"5 GB (total)"*, 10 databases, 500 MB per database, 50 queries per invocation, 7 days Time Travel | yes |
| **R2** | image originals, D1 backups | *"10 GB-month / month"*, 1 million Class A and 10 million Class B operations a month, egress *"Free"* | yes |
| **Images** | resize originals from R2 on the fly | *"up to 5,000 unique transformations each month for free"*, then $0.50 per 1,000; storage and delivery are Paid-only and not needed | yes |
| **Cron Triggers** | scheduled sends, nightly backup, cache purge | **5 per account** on Free, 250 on Paid | yes, at one or two |
| **Access** | editor login, one-time PIN to email | *"free, without any time constraints, for up to 50 users"* (Cloudflare's SASE reference architecture page); OTP needs no identity provider, PIN expires in 10 minutes | yes |
| **KV** | not used | 100,000 reads and 1,000 writes a day | not needed |
| **Email Routing** | inbound to a Worker | *"Unlimited"* | yes |
| **Email Sending** | the newsletter | *"Not available"* | **no** |
| **Durable Objects** | not needed for this site | SQLite-backed on Free | not needed |

The per-user price above 50 Access seats is quoted as $7 a user a month by
several third-party pricing pages dated 2026; Cloudflare's own plan page did not
render text for the fetcher, so that figure is READ from resellers and marked.

**Traffic arithmetic, GUESSED at 500 visitors a day, five HTML pages each,
twenty images each.** 2,500 Worker requests a day against 100,000. Images do
not go through the Worker: they come from R2 behind a custom hostname, or
through Images transformations, so they cost no Worker requests. D1: an
upcoming list scans about 30 indexed rows, an event page one or two, so 2,500
page views read about 100,000 rows a day against 5,000,000. Writes: a few
dozen a day from editors and subscribers against 100,000. Storage: 98 events
times two languages plus pages and subscribers is under a thousand rows and
under a megabyte; image originals at 300 KB each are about 30 MB against 10 GB.

**Can we get away with the free plan? Yes for the site, no for the
newsletter.** The public site, the editor, the images, the backups and the
inbound mail all fit with more than a tenfold margin on every line above. **The
one limit most likely to be hit is the 100,000 requests a day, and only by a
crawler or an attack**, because the failure is total: Error 1027 for every
visitor until midnight UTC. The mitigation is cheap and is in the plan anyway:
pre-render public pages to static assets on publish, so a visitor never
invokes the Worker for a page that has not changed, and keep the Worker for
the editor, the redirects and the forms. The newsletter is the first paid
thing at $5 a month, and it is the same $5 that lifts every other limit
(250 crons, 10 GB per database, 30 days of Time Travel), so once it is paid
the free-plan question is closed.

## 7. The schema

D1, SQLite. Eleven tables. Times are ISO 8601 text in Europe/Tallinn local
time, which is what an editor types and a poster prints; the Worker compares
against `now()` after converting once. What is left out is listed after it.

```sql
CREATE TABLE media (
  id          INTEGER PRIMARY KEY,
  r2_key      TEXT NOT NULL UNIQUE,        -- sha256 of the bytes plus extension; a re-upload is a no-op
  bytes       INTEGER NOT NULL,
  width       INTEGER,
  height      INTEGER,
  alt_et      TEXT NOT NULL DEFAULT '',
  alt_en      TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE event (
  id          INTEGER PRIMARY KEY,
  starts_at   TEXT NOT NULL,               -- '2026-09-30T19:00'
  ends_at     TEXT,                        -- '2026-10-25T23:00' for a festival; NULL for one evening
  venue       TEXT NOT NULL DEFAULT '',    -- 'ECCM saal', 'Kanuti Gildi SAAL'
  address     TEXT NOT NULL DEFAULT '',    -- 'Pühavaimu 9, Tallinn'
  ticket_url  TEXT NOT NULL DEFAULT '',    -- fienta.com today, anything tomorrow
  category    TEXT NOT NULL DEFAULT 'eccm'
              CHECK (category IN ('eccm','koostoo','improtest','schoenberg','ulysses','u')),
  image_id    INTEGER REFERENCES media(id),
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  publish_at  TEXT,                        -- NULL means visible on publish; a future time holds it
  legacy_id   INTEGER UNIQUE,              -- the iCagenda id, so the old URL can redirect
  created_by  TEXT NOT NULL,               -- an editor email, as Access verified it
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX event_starts ON event (starts_at);

CREATE TABLE event_text (
  event_id    INTEGER NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  lang        TEXT NOT NULL CHECK (lang IN ('et','en')),
  slug        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',    -- markdown, the subset trip's md.ts renders
  PRIMARY KEY (event_id, lang),
  UNIQUE (lang, slug)
);

CREATE TABLE page (
  id          INTEGER PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,        -- 'eccm','members','contact','tallinn-1965','residencies','ulysses'
  parent_key  TEXT REFERENCES page(key),   -- 'members' sits under 'eccm', as the menu has it
  menu_order  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  publish_at  TEXT,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE page_text (
  page_id     INTEGER NOT NULL REFERENCES page(id) ON DELETE CASCADE,
  lang        TEXT NOT NULL CHECK (lang IN ('et','en')),
  slug        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (page_id, lang),
  UNIQUE (lang, slug)
);

CREATE TABLE post (                        -- news, and open calls, which are news with a deadline
  id          INTEGER PRIMARY KEY,
  kind        TEXT NOT NULL DEFAULT 'news' CHECK (kind IN ('news','call')),
  deadline    TEXT,                        -- '2026-10-15', calls only; the list shows it and sorts closed ones down
  image_id    INTEGER REFERENCES media(id),
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  publish_at  TEXT,
  legacy_id   INTEGER UNIQUE,              -- the Joomla article id
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE post_text (
  post_id     INTEGER NOT NULL REFERENCES post(id) ON DELETE CASCADE,
  lang        TEXT NOT NULL CHECK (lang IN ('et','en')),
  slug        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (post_id, lang),
  UNIQUE (lang, slug)
);

CREATE TABLE editor (                      -- an allowlist and a byline; Access holds the identity
  email       TEXT PRIMARY KEY COLLATE NOCASE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor','admin')),
  added_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE subscriber (
  id              INTEGER PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE COLLATE NOCASE,
  lang            TEXT NOT NULL DEFAULT 'et' CHECK (lang IN ('et','en')),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','unsubscribed')),
  token           TEXT NOT NULL UNIQUE,    -- random, in the confirm and the unsubscribe links
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  confirmed_at    TEXT,
  unsubscribed_at TEXT
);

CREATE TABLE issue (                       -- one newsletter, one language
  id          INTEGER PRIMARY KEY,
  lang        TEXT NOT NULL CHECK (lang IN ('et','en')),
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',    -- markdown; the composer pre-fills it from upcoming events
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sent')),
  send_at     TEXT,
  sent_at     TEXT,
  sent_count  INTEGER NOT NULL DEFAULT 0,
  created_by  TEXT NOT NULL
);

CREATE TABLE redirect (                    -- the dozen page URLs; event URLs redirect by legacy_id in code
  from_path   TEXT PRIMARY KEY,            -- '/index.php/et/eccm/liikmed'
  to_path     TEXT NOT NULL                -- '/et/eccm/liikmed'
);
```

**Left out on purpose, each with the evidence:** `hits` (never displayed);
`metakey` and `metadesc` (the description is the first paragraph, and the title
is the title); `featured`, `featured_up`, `featured_down` (no featured list
exists; the front page is upcoming events by date); `access` levels (everything
is public); Joomla workflows, `checked_out` locking and `version` (three to
five editors who can talk to each other; D1 Time Travel gives seven days of
undo on Free, and a `revision` table is one migration away if ever asked for);
tags and custom fields (none seen); a `venue` table (six strings; it becomes a
table when someone asks to filter by venue); a `category` table (a CHECK list
of six, which is a migration to change and that is the point); registration,
attendees, capacity and price (Fienta and Jotform do this and there is no sign
anyone wants it back in house); `translations` as a generic table (the
`*_text` tables are the translations, typed per thing); passwords (Access);
comments; anything for `/nan/`, which is static.

## 8. Editing

**The smallest honest version is a form per type, and it is enough for this
content.** The longest text on the site is the 800-word open call, and it is
headings, paragraphs, a numbered list, bold, and links: all of it is the
markdown subset `../trip`'s `md.ts` renders (headings, lists, paragraphs, bold,
italic, https links). So:

- `/edit/events/123` behind Access. Shared fields at the top (dates, venue,
  address, ticket link, category, image), then **two columns, Estonian and
  English**, each with title, slug (filled from the title, editable) and a
  plain `<textarea>` for the body. Three buttons: *Save draft*, *Preview*,
  *Publish*, and a `publish_at` `datetime-local` beside the third that is
  empty by default.
- **Preview renders the real template from the form's own POST body without
  saving**, so preview and published can never disagree. That is the rule
  `../trip` learned the hard way when a JavaScript port of its renderer
  drifted from the server one, and it costs a twenty-line endpoint.
- **Image upload is one file input.** The bytes are hashed, put to R2 under
  the hash, a `media` row is written, and the form gets the id back. A second
  upload of the same file is a no-op. `../trip`'s `lib/dropzone.js` (4,144
  bytes) and `/api/upload` do exactly this and can be read for the shape.
  Sizes are made on request by Images transformations from the one original.
- **No block editor, no rich-text editor, no framework**, until somebody
  needs an embed in the middle of a page. The likely first ask is a video
  of a concert; when it comes, `../trip`'s typed-block document
  (`docBlocks.ts`, 12,083 bytes: `prose`, `image`, `video` facade, `map`,
  `button`) is the upgrade path and its plan explains why it deferred Tiptap.
- The editor is server-rendered HTML forms with almost no JavaScript, which
  is also what keeps it inside 10 ms of CPU per request.

**Scheduling is a WHERE clause, not a job.** With pages rendered per request,
visibility is `status = 'published' AND (publish_at IS NULL OR publish_at <=
:now)`, and nothing has to fire at the minute. A Cron Trigger is needed only
for the things that must happen rather than merely appear: sending a scheduled
issue, purging or re-rendering a pre-built page when its `publish_at` passes,
and the nightly D1 export to R2. One trigger every fifteen minutes does all
three. positron's `workers/items` is the measured alternative, a Durable
Object alarm that fires AT the time and records scheduled-against-actual; it is
the right tool if a send must land at 09:00:00 and overkill for a concert
listing.

## 9. Migration

**Three ways out of Joomla, in order of preference, and the first two need
ECCM's cooperation.**

1. **A database dump plus the `images/` folder.** phpMyAdmin or an Akeeba
   backup from the host gives `#__content`, `#__categories`, `#__menu`,
   `#__associations`, `#__languages` and every `#__icagenda_*` table with the
   fields the HTML never shows: real start and end for period events, the
   `publish_up` values that answer section 2, drafts and unpublished rows, and
   the pairing of Estonian and English pages through the associations table.
   One script maps them into the eleven tables above. This is the only route
   that answers the open questions instead of guessing at them.
2. **A Joomla API token.** A Super User can mint one in their profile
   (*"Joomla API Token"*), and `GET /api/index.php/v1/content/articles` then
   returns the 29 attributes per article with `languageAssociations`. **It
   does not return events**: iCagenda's JED listing names its plugins (Smart
   Search, Action Log, Privacy, Installer, Quickicon, Autologin) and none is a
   web services plugin, so the API has no route for it. Articles and menus by
   API, events by dump or by scraping.
3. **Scraping, with ECCM's written consent and only then.** Once they have
   asked for the migration it is their site being read on their behalf, which
   is a different thing from the scan above. Eight archive pages and three
   upcoming pages list the events; each event page must then be fetched for
   its fields, in each language: about 220 requests once, one a second, with
   a cache on disk so it never runs twice. What it cannot recover: the end
   time of a period event (the URL carries no date), the pairing of an
   Estonian event with its English twin (matched by `starts_at` and venue,
   then checked by a person), anything unpublished, and `publish_up`.

**What breaks, and what is done about it.**

- **Event URLs have two forms for one event**, depending on which menu item
  the visitor came through: `/index.php/et/134-slug/2026-09-30-19-00` from the
  front page and `/index.php/et/syndmusest/moeoedunud-suendmused/13-slug/
  2024-09-22-18-00` from the archive. One regular expression in the Worker
  takes `(et|en)`, the trailing `(\d+)-slug` and an optional date segment, looks
  the number up in `legacy_id`, and 301s to `/{lang}/events/{slug}`. Joomla
  article URLs (`/index.php/et/konkursid/ansambel-u-koosloome-programm`) and
  the page URLs go in the `redirect` table, a dozen rows.
- **The English aliases are working names**, `eccm-new-eng`, `memeng`,
  `new-eng-contact`, `eventseng`. They are redirected and not preserved.
- **Image paths.** Event thumbnails are generated files under
  `/images/icagenda/thumbs/themes/ic_large_w900h600q100_*.jpg` and are not
  migrated; the originals under `/images/icagenda/` are, and every size is made
  from them. Page images under `/images/*.jpg` move to R2 with a redirect from
  the old path for the few that are linked from outside.
- **`/nan/`** is carried over verbatim as static assets under the same path,
  so nothing in NAN's own materials breaks. Its size is unknown and is one of
  the things to be given.
- **The public login module and `/administrator/` disappear.** Editors go to
  `/edit/` and get a PIN by email. That is a change to tell people about, not
  a bug.
- **Email cloaking** goes away; the contact address is printed as text or
  behind a form, a decision for ECCM.
- **Fienta and Jotform links are untouched**, since they were never on the
  site's own domain.
- **There is no sitemap and no linked RSS today**, so nothing is lost by
  shipping them new, and both are one query each.
- **Search engines** hold the old URLs for months; the 301s are what carries
  the ranking across, and the redirect regex has to stay for at least a year.

## 10. What positron and trip already have that carries over

**From `../trip` (`/Users/s32863/personal/trip`, an Astro site on Workers
with Postgres behind Hyperdrive, MEASURED by reading its plans and listing
`astro-prod/src/lib`).** Neither a "composer" directory nor a "mail rig" is a
thing by that name in the tree; both are plans and the libraries under them:

- **The composer** is `plans/composer.md` and `plans/offer-composer.md`, with
  the code in `astro-prod/src/lib/docBlocks.ts` (12,083 bytes, the typed-block
  parser and walker), `md.ts` (3,059 bytes, the markdown subset), `dropzone.js`
  (4,144 bytes) and the `/ds/composer`, `/api/doc-preview`, `/api/upload`,
  `/api/composer` endpoints. **What carries over is three rules and two
  files**: preview is the real renderer, never a port; images are content
  addressed and deduplicated on upload; a typed-block JSON document beats
  markdown only once an embed has to sit mid-prose, and until then a textarea
  wins. `md.ts` and the upload endpoint are small enough to port by reading.
  The half of the composer that is "AI prepares, human voices" (draft
  generation, few-shot voice, the offer watcher) does not apply: nobody here
  wants a machine to draft a concert listing.
- **The mail rig** is `plans/newsletter.md` and `plans/newsletter-composer.md`
  with `lib/email.ts` (2,497 bytes, the `_emails` outbox and drain),
  `lib/emailRender.ts` (6,885 bytes, a 600-pixel table template with inline
  styles, MSO conditional widths, a padded preheader, dark-mode block, text
  wordmark), `lib/unsub.ts` (1,182 bytes, signed one-click unsubscribe with
  the RFC 8058 headers), `lib/newsletter.ts`, the `/uudiskiri/[slug]` archive
  page and the `send_email` binding named `EMAIL` in `wrangler.jsonc`. **All
  of that ports**, and so does the DNS lesson in the plan: the apex SPF needs
  `include:_spf.mx.cloudflare.net`, Cloudflare provisions a `cf-bounce`
  subdomain with its own MX and DKIM, and a `*._domainkey` null wildcard
  silently denies DKIM for any selector not explicitly published. **What does
  not exist there either:** double opt-in for anonymous addresses (listed as
  REMAINING), so it is built here from scratch, and the storage layer, which is
  Postgres and not D1.
- **The inbound half** is `cron/src/tips.ts`: an Email Routing rule delivering
  to a Worker's `email()` handler, which is the same mechanism positron's
  `workers/mail` uses and which the reply and bounce addresses here would use.

**From positron (`/Users/s32863/personal/positron`, MEASURED by reading
`CLAUDE.md`, `LAYOUT.md`, `workers/*/wrangler.jsonc` and the two skills).**

- **`workers/mail`**: an Email Worker whose `spam.mjs` (28,278 bytes, pure, 51
  asserts in `test.mjs`) reads `Authentication-Results`, list headers and the
  envelope against `From:` and labels rather than drops, and whose `body.mjs`
  extracts the text a person typed out of a multipart message. That is a
  finished `info@` inbox handler and a bounce reader; it needs its destination
  swapped from the feedback relay to a D1 row.
- **`workers/view`'s deploy discipline**: `build.mjs` assembles static assets
  from an allowlist because the repo root holds `.env`, and `deploy.mjs`
  fingerprints the build and refuses to upload if a byte moved. Both rules
  apply to a site whose editor holds secrets. The Workers Assets configuration
  (`not_found_handling: none`, custom domain routes) is the template.
- **`workers/items`**: a SQLite Durable Object whose alarm publishes an item AT
  its time and records punctuality. The measured answer to "scheduled posting
  without a cron poll", kept in reserve for the newsletter send.
- **`.claude/skills/positron-start/`** (`SKILL.md` and `PARTS.md`): the whole
  procedure for standing a site up on somebody else's Cloudflare account, and
  the parts of it that matter here are not technical: say the revision out
  loud, run every command yourself, *"recommend what works best, then say
  what it costs, and let them choose"*, free fails closed so a nervous owner is
  safest on it, check the Worker name is not taken before the first deploy
  because a collision overwrites somebody's site, and the table of which
  steps are theirs to click (account, billing, nameservers) and which are
  ours.
- **The house rules that transfer as rules**: nothing opens or fetches on a
  visit that a visitor did not ask for; a self-check never runs for a visitor;
  a change in what a page does is a change in what it says, in the same
  commit; and a page handed over is a URL, not a path.

**What does not carry over, and the skill says so itself:** the `demo/shell/`
kit, the controls, the diagram engine, the CSS. *"Nearly all of them are this
site's taste, not its substance."* ECCM's site gets ECCM's design, and the
skill's instruction to ask what it should look like before writing any
interface applies in full.

## 11. What it costs to build, in sessions

Assumes the schema above, a plain server-rendered front end in ECCM's own
design, and a database dump or an agreed scrape for the migration.

| session | lands | test that it landed |
| --- | --- | --- |
| **1** | D1 schema; a Worker rendering the upcoming list, an event page, the archive and the static pages in both languages from a hand-loaded sample; `.ics` per event; deployed on a `workers.dev` URL | the Estonian and English front pages render from D1 and an event's calendar button imports into a phone |
| **2** | Access with one-time PIN on `/edit/`; the three forms; R2 upload; preview from the POST body; `publish_at`; the editor allowlist | an editor with no help creates a bilingual event with an image, previews it, schedules it for tomorrow, and it appears tomorrow |
| **3** | the migration script against the dump (or the consented scrape); 98 events and the pages in both languages; the redirect regex and table; sitemap and RSS; `/nan/` as static assets | every URL in the fifteen-row table above 301s to a live page, and a diff of titles and dates against the old site is empty |
| **4** | subscribers with double opt-in; the issue composer pre-filled from upcoming events; send through Email Sending on Workers Paid; one-click unsubscribe; the archive page | a test issue reaches a Gmail and an Outlook inbox with the unsubscribe header honoured, and mail-tester scores it |
| **5** | cutover: nameservers or a CNAME, DNS for mail (SPF, DKIM, DMARC, the bounce subdomain), the nightly D1 export to R2, a walk-through with the editors, a week of reading logs | the old host is off and nothing in the logs is a 404 that was a 200 before |

**Three sessions to parity, five with a newsletter.** Each is a day's work;
none is an afternoon.

**The three things most likely to take longer than that:**

1. **The migration without a dump.** Pairing 98 Estonian events with their
   English twins by date and venue, recovering end dates of festivals the URL
   does not carry, and finding out after the fact which events were
   unpublished or wrongly categorised. With a dump this is a script; with a
   scrape it is a script and an afternoon of a person checking pairs.
2. **Email.** eccm.ee's DNS lives wherever its host is today; moving mail
   sending means SPF, DKIM and DMARC changes on a zone somebody else operates,
   a new account's daily sending quota that ramps by reputation and is not
   published as a number, and a double opt-in flow that nobody in either
   repository has built. Email Sending is also still labelled Beta.
3. **The bilingual editor and the list of things nobody mentioned.** The two
   columns side by side are easy; what is not is discovering, after the
   editors start, that the month grid under every page mattered to them,
   that a category filter was used by one partner, that the Kontakt page has
   a map, or whatever the administrator holds that the public pages never
   showed.

## 12. What could not be settled from outside, and what would settle it

| unsettled | why | what would settle it |
| --- | --- | --- |
| whether anyone uses `publish_up`, `publish_down` or featured | the API is token-only (401) and no article shows its dates | a database dump, or a Super User API token for one read |
| how many drafts, unpublished events and users exist | admin unseen | the same dump, or twenty minutes of screen-shared admin |
| every field iCagenda holds per event, and the true end dates of period events | no public schema, and the HTML omits them | the dump; the `#__icagenda_events` table alone would do |
| traffic, and therefore the free-plan claim | no analytics were reachable | thirty days of server logs, or a read of whatever analytics they have |
| whether a newsletter exists today, from where, to how many | nothing on the site links one | one question to ECCM, and the export from whatever tool answers it |
| whether the English events are all doubled or only some | the English list was read on page one only | the dump, or the English archive pages |
| the `kontakt`, `residentuurid` and `ulysses` pages | out of the fifteen-request budget | three more fetches once the work is agreed |
| the Joomla and iCagenda versions running | the generator meta tag is invisible through the fetcher | the admin, or `curl -sI` for headers once it is their site being read on their behalf |
| the size and build of `/nan/` | one page fetched, images inline | the folder from the host |
| who operates DNS and hosting for eccm.ee | not visible | asked, before session 5 is scheduled |
| how many editors, and whether any is outside ECCM | not visible | asked; it decides whether 50 Access seats is even a question |
| why the article-level language switcher pointed at `/index.php/en/konkursid` rather than `/open-calls` | not fetched | one fetch, or the dump's associations table |

**The one thing to ask for first is the database dump and the `images/`
folder.** It answers eight of the twelve rows above and turns the migration
from a scrape into a script.

---

## Sources

Read on 2026-09-26 unless stated. eccm.ee pages are the fifteen in the table at
the top of this document.

Cloudflare, all under `https://developers.cloudflare.com/` unless stated:
- `workers/platform/pricing/` (100,000 requests a day, 10 ms CPU, $5 Paid, static assets free)
- `workers/platform/limits/` (5 Cron Triggers per account on Free, 20,000 static files, 25 MiB per file, Error 1027)
- `workers/static-assets/billing-and-limitations/`
- `workers/configuration/cron-triggers/`
- `d1/platform/pricing/` (5 million reads a day, 100,000 writes a day, 5 GB)
- `d1/platform/limits/` (10 databases, 500 MB per database on Free, 50 queries per invocation, 7 days Time Travel)
- `r2/pricing/` (10 GB-month, 1 million Class A, 10 million Class B, free egress)
- `kv/platform/pricing/`
- `images/pricing/` (5,000 unique transformations a month free)
- `email-service/` (Email Sending labelled Beta, `EMAIL` binding)
- `email-service/platform/pricing/` (Not available on Free; 3,000 a month then $0.35 per 1,000 on Paid; Routing unlimited on both)
- `email-service/platform/limits/` (50 recipients, 5 MiB, ramping daily quota)
- `email-routing/limits/` (25 MiB inbound, 200 rules, 200 destinations)
- `cloudflare-one/identity/one-time-pin/` (no IdP needed, 10-minute PIN)
- `cloudflare-one/account-limits/` (500 applications, 500 reusable policies; no seat count on that page)
- `reference-architecture/architectures/sase/` (*"free, without any time constraints, for up to 50 users"*)
- `https://www.cloudflare.com/plans/zero-trust-services/` did not render text for the fetcher; the $7 per user figure above is from third-party pricing pages dated June to August 2026, for example `https://zerometric.net/research/cloudflare-zero-trust-free-plan-limits-2026/`, and is marked READ from resellers

Joomla and iCagenda:
- `https://raw.githubusercontent.com/joomla/joomla-cms/5.3.0/installation/sql/mysql/extensions.sql` (the 30-column `#__content` and `#__content_frontpage`)
- `https://raw.githubusercontent.com/joomla/joomla-cms/5.3.0/api/components/com_content/src/View/Articles/JsonapiView.php` (the 29 rendered attributes, `languageAssociations`)
- `https://issues.joomla.org/tracker/joomla-cms/31579` ("allow public GET with rate limit control", merged for 4.0, closed June 2021; it is off on eccm.ee)
- `https://manual.joomla.org/docs/general-concepts/webservices/` (the `X-Joomla-Token` header)
- `https://extensions.joomla.org/extension/icagenda/` (version 4.0.16, 2026-09-23, 179 reviews, the feature list, the plugin list)
- `https://www.icagenda.com/` (free against Pro, €29.90 a year, Pro removes *"Powered by iCagenda"*)
- `https://docs.joomla.org/J4.x:Joomla_Core_APIs` answered 403 to the fetcher and was not used

Email providers:
- `https://resend.com/pricing` (3,000 a month, 100 a day, 1,000 marketing contacts free)
- `https://postmarkapp.com/pricing` (100 a month free, $15 from 10,000)
- `https://support.mailchannels.com/hc/en-us/articles/26814255454093-End-of-Life-Notice-Cloudflare-Workers` (free Workers sending ended 2024-08-31)

On this disk:
- `/Users/s32863/personal/trip/plans/composer.md`, `offer-composer.md`, `newsletter.md`, `newsletter-composer.md`, `README.md`, `CLAUDE.md`; `astro-prod/src/lib/` (file sizes as listed); `cron/src/tips.ts`
- `/Users/s32863/personal/positron/CLAUDE.md`, `LAYOUT.md`, `workers/mail/`, `workers/view/`, `workers/items/wrangler.jsonc`, `.claude/skills/positron-start/SKILL.md` and `PARTS.md`
