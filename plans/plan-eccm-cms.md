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

### The rada7 shape, MEASURED from four letters, and what an ECCM issue borrows

Asked 2026-09-26: *"see ../toimps on rada7 newsletter parser. id assume eccm
could deliver similar newsletter, any hints how rada7/ivo composes it?"*.
`../toimps` is a week calendar built out of newsletters, and its parser
(`src/parse.mjs`, 916 lines) is a description of the rada7 letter written by
somebody who had to read it by machine. Four letters sit in its `mail/`
directory as Gmail plaintext (2026-07-30, 08-26, 09-10, 09-17) and its
`PLAN.md` §5 counts ~201 threads from `uudiskiri@rada7.ee` in the owner's
Gmail. Everything below is MEASURED on those four files unless marked.

**The envelope.** From `uudiskiri@rada7.ee`, signed *Ivo* (Ivo Kiviorg),
weekly with gaps, sent late Wednesday or Thursday night: the four `Date:`
headers read 21:52Z, 22:11Z, 20:36Z and 22:06Z, and toimps found one at 22:32Z
that says *"täna ehk reedel"*, which is only true in Europe/Tallinn where it
was already 01:32 on Friday. The subject is a joke and never a summary:
*"Suvi?!"*, *"AVR, AVL ja AVP"*, *"TLN vs TRT"*, *"Suffering is not a guarantee
of art"*. Subscribers are BCC (envelope `To:` is `teave@rada7.ee`) and D1 sees
the display name as *"Rada7.ee via Rada7.ee uudiskiri"*, so a list server
relays it. No images, no columns, no HTML layout to speak of: the `text/plain`
part IS the letter, and `<strong>` survives into it as `*asterisks*`.

| letter | bytes | words | links | of which Facebook events | bold spans | day headers |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-30 | 5,522 | 590 | 20 | 14 | 35 | 0 |
| 2026-08-26 | 4,156 | 422 | 20 | 14 | 36 | 3 |
| 2026-09-10 | 3,462 | 362 | 15 | 9 | 5 | 0 |
| 2026-09-17 | 5,320 | 567 | 22 | 10 | 20 | 0 |

**The running order, the same in all four:**

1. *"Tere!"*, then one paragraph of the writer's week: a holiday, a Postimees
   article, an evening lost to SoundCloud. It is a person talking.
2. **Listening first, going out second.** New releases with the act in bold,
   the record's name in quotes and the link right after it: *"Meisterjaani
   lühialbumit "Mitteintelligentne tantsumuusika <bandcamp>""*. toimps counts
   22 such links across eight letters and attaches only the ones that name
   exactly one event; the rest are the letter's own.
3. **The events, one sentence each.** Either under bold weekday headers
   (`*REEDE*`, `*LAUPÄEV*`, `*PÜHAPÄEV*`, the 08-26 letter) or as flowing
   prose with the weekday inside the sentence (09-10, 09-17). Within a
   sentence the grammar is fixed: **the venue is the anchor text of the link,
   inflected** (*Von Krahlis*, *Paavli Kultuurivabrikus*), **the link is the
   Facebook event**, **the act or the series is in bold**, the rest of the bill
   is plain prose after *"kus"* or *"kus laval"*, the day is a weekday word,
   and an hour is almost never written (toimps first measured 84 rows and 84
   without a start time, then found a few *"kell 19.00"*). A price appears as
   a joke (*"Pilet grandmassive kolmekas"*). A listening link for the
   headliner often follows.
4. A closing culture note with press links: Tartu's night-life strategy, a
   club closing, a building threatening two rock clubs.
5. *"Head kuulamist ja kohtumisteni! Ivo"*, and a one-line footer with the
   one management link: *"/Lahkuda ja liituda <rada7.ee/uudiskiri> saab
   endiselt siin! Soovita ka sõbrale!/"*.

**What toimps had to build to read it, which is the measure of the shape.**
Ivo's prose takes *"three hundred lines of grammar and still refuses two events
in ten"*: weekday stems with seven case endings, *"järgmisel"* meaning after
this weekend (two earlier rules were wrong and the archive settled it), venue
names inflected so a 40-row lexicon with hand-written forms is needed, artist
names inflected so a prefix match is the best available, and dates and times
being the same five characters (*"18.06"*). The Disainikeskus letter, a date
line over a title line over a link, *"needs forty and refuses none"*. A venue's
own letter (Kultuurikatel, Kai) writes *"30. septembril"* and *"kell 19.00"*
in separate paragraphs and links a ticket shop, and toimps' third grammar
exists for exactly that. ⚠️ Two of the four letters the toimps inbox collected
on its own had a `text/plain` part that was an apology (*"your email software
can't display HTML emails"*, 792 characters beside 116 KB of HTML), which is
what MailerLite, Mailchimp and Smaily produce by default; and Smaily wraps
every link in `trck.smai.ly/r?url=` so the Facebook event and the ticket page
were nine identical tracking URLs until unwrapped.

**Ivo keeps a fuller list and the letter is his edit of it.** Verbatim from
2026-07-23 via toimps: *"võite täitsa uurida radaseitsme eventside alt
terviklikumat nimekirja"*, at `facebook.com/rada7.ee/events`. toimps' whole
argument is that the edit is the product: *"Ivo already did the work of
picking"*, and *"the best field is free: the verbatim sentence Ivo wrote"*.
He is Tallinn-centric and says so; Tartu, Viljandi and Vaskjala appear as side
trips.

**The hints for an ECCM issue, in order of how much they are worth:**

1. **The sentence is the product, and a machine cannot write it.** ECCM's
   advantage over rada7 is that its events are already rows with a date, an
   hour, a hall and a ticket link, so the *skeleton* of an issue is a query:
   the next seven or thirty days, grouped by day, title in the issue's
   language, venue, hour, one link. That skeleton is what the composer fills
   in; **the paragraph above it is what a named person writes**, and an issue
   with no paragraph is a calendar export nobody reads. `../trip`'s composer
   split, *"AI prepares, human voices"*, is the same conclusion from the other
   direction.
2. **Borrow the running order, not the prose style.** Greeting; one personal
   paragraph; the events grouped under **bold day headers** (they read well in
   plain text and they are the one shape both a person and toimps parse
   without a lexicon); one sentence per event with **the event's name in bold
   and the venue as the link's anchor text**; a closing note; a signature by a
   person with a name; one footer line carrying unsubscribe. A subject that is
   a line somebody wrote, not *"Uudiskiri nr 42"*.
3. **Write the date as an organisation, not as a curator.** Ivo writes
   weekdays because his letter is about the week in front of it. ECCM writes
   about specific evenings up to a fortnight ahead, so each event carries
   **"30. septembril kell 19.00"** in its own sentence, or better, the date
   block form: a date line, a title line, a link. That shape needs no year
   (rolled forward from the send date) and no lexicon. Times in 24-hour with a
   dot or a colon, never a bare number; a range as *"19.00–21.00"* is one
   evening and is read as such.
4. **One link per event and it is the canonical page on eccm.ee, not
   Facebook.** The current slugs already carry date and hour
   (`/134-gestuurid-…/2026-09-30-19-00`) and the new site's event page will
   carry JSON-LD (section 13), so the link is the machine-readable record and
   the letter can stay prose. **No click-tracking wrappers**, or if the ESP
   insists, ones that keep the target in a `url=` parameter, which is the only
   shape toimps can unwrap.
5. **Send a real `text/plain` part.** Not the ESP's apology stub. It is the
   same words as the HTML with `*bold*` and `<links>` in angle brackets, which
   is what Gmail renders from the HTML anyway; it is what toimps and every
   plaintext client read; and a multipart whose plain half matches its HTML
   half is a small deliverability signal in its own right. Since the plan
   already sends one row per recipient through the `send_email` binding, the
   plain part is one more string in the same message.
6. **Cadence follows the calendar, not the week.** rada7 is weekly because
   the scene produces a weekend every week; ECCM has 98 events over two years,
   about one a week. GUESSED: a monthly issue with the month's programme plus
   a short issue in any week that has a premiere, rather than a weekly that is
   empty half the time. Send in the evening, Tallinn time, and anchor every
   date in `Europe/Tallinn` (toimps' first rule, learned from a Friday that
   read as Thursday in UTC).
7. **Publish every issue as a page.** rada7.ee is a frozen WordPress archive
   (*"Artiklite arhiiv. 1999 – 2019."*) and the letters exist only in inboxes;
   `../trip` keeps `/uudiskiri/[slug]`. The `issue` table in section 7 already
   has a slug; render it, link it from the footer as *"loe veebis"*, and the
   archive is also the newsletter's search presence.
8. **A listening link per event is the one rada7 habit worth copying
   outright.** A Bandcamp, SoundCloud or YouTube link for the composer or the
   ensemble, right after the sentence, is what turns a listing into a reason
   to go, and the `event` row can carry it as one optional URL field.

What could not be measured: rada7's HTML half (toimps keeps only the plain
rendering), its subscriber count, and whether Ivo writes in a tool or in Gmail;
INFERRED from the list-server display name and the BCC envelope that it is a
plain mailing list, which is also why every letter is pure text.

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

### Drafts: where an unsaved draft lives

Asked 2026-09-26: *"draft saving? localstorage or bg PUT?"*. **Both, with
different jobs, and the server copy is the record.**

- **A `draft` row exists from the first keystroke that follows "New".** The
  editor page creates the row on open (`POST /api/draft` returns an id), and
  every change after that is a **debounced background `PUT /api/draft/:id`**:
  2 s after the last input, and on `blur`, `visibilitychange` to hidden and
  `pagehide`, with the full form body each time so the request is idempotent.
  The reply carries `updated_at` and `rev`, and the page shows *"salvestatud
  12:04:31"* next to the buttons. The PUT sends the `rev` it last saw and the
  server refuses a stale one with `409` and the newer body, so a tab left open
  on the laptop cannot overwrite what was typed on the phone an hour later.
  Cost on Workers Free: an hour of continuous typing at one save per 2 s idle
  is under 1,800 D1 writes against 100,000 a day, and a real editing hour is a
  fraction of that.
- **`localStorage` is the crash buffer, never the record.** Written on every
  `input` event under the key `draft:<id>`, cleared when a PUT succeeds, and
  read once on load: if the local copy is newer than the server's
  `updated_at`, the page offers *"taasta salvestamata muudatused"* and does
  nothing until asked. Wrapped in try/catch because it can be empty or throw
  in a private window. It is per browser and per device, which is exactly why
  it cannot be the record: the editor at home does not have the office
  laptop's `localStorage`, and the newsletter composer and the scheduler need
  the server to know a draft exists at all.
- **The failure that will actually happen is the Access session expiring
  mid-edit.** The PUT then returns a `302` to the login page, `fetch` follows
  it, and the page receives a `200` whose body is HTML. Test `content-type`
  before believing a save; on a non-JSON reply keep the local copy, show
  *"sessioon aegus, ava leht uuesti, tekst on alles"*, and do not clear
  anything.
- **Autosave never touches the published row.** The `draft` table holds the
  working copy of any kind of row (`kind`, `row_id`, `lang`, `body_json`,
  `rev`, `updated_at`, `updated_by`) and *Publish* copies it over the live row
  in one transaction, so an editor correcting a typo in a published event can
  save ten times without a visitor seeing a half-finished sentence. This is one
  table more than section 7 lists.

For comparison, positron's `workers/items` store has no PUT at all: an item is
POSTed once with a `publish_at`, its `unpublished` status is *scheduled*, not
*draft*, and the page's `draft()` is a function that reads the two fields at
press time. Nothing is persisted on the client. That is right for a two-field
notification and wrong for an 800-word open call.

### Paste: what a paste from Word, Google Docs or a browser becomes

Asked: *"rich text paste / parsing?"*. The body is a `<textarea>` holding the
markdown subset `md.ts` renders, and **a plain textarea receives the
`text/plain` flavour of the clipboard**, which is where the loss is: headings
become ordinary lines, bullets become `•` glyphs or vanish, **every link loses
its URL and keeps only its words**, and bold is gone. Nobody notices until the
open call is published with its Jotform link as plain text.

- **A `paste` listener on the textarea reads `clipboardData.getData('text/html')`
  first.** When it is present, parse it with `DOMParser` and walk it into the
  subset: `h1` to `h3` become `##`, `p` a paragraph, `ul` and `ol` become `- `
  and `1. `, `strong` and `b` become `**`, `em` and `i` become `*`, `a` becomes
  `[words](href)`, `br` a newline; everything else is unwrapped and its text
  kept, and `style`, `class`, `span`, `font`, `o:p`, `img` and `table` are
  dropped. Then insert the result at the caret with `setRangeText`. About 80
  lines. Turndown (READ from memory, not measured today: about 30 KB, with a
  plugin for Word) does the same with more cases covered, and is the fallback
  if the hand-written walker starts growing.
- **The two traps that the walker must know about, INFERRED from what these
  editors emit rather than measured today:** Word marks lists as
  `<p class="MsoListParagraph">` with a literal middle dot glyph and
  `mso-list` styles, not as `<ul>`, so a paragraph opening with a middle dot,
  a bullet, a hyphen or a lone `o` is turned into `- `; and Google Docs wraps the whole paste in
  `<b style="font-weight:normal">`, a bold tag that is not bold, so weight is
  read from the computed style and never from the tag name.
- **Normalise on the way in.** ` ` to a space, three dots to one
  character or three as the house style decides, straight quotes left alone
  (Estonian uses „ ” and the editor may type either), and a URL pasted as
  plain text is left as text because `md.ts` autolinks `https` on render.
- **A pasted image is an upload.** `../trip`'s `lib/dropzone.js` already does
  this: its `paste` listener walks `clipboardData.items`, uploads every
  `image/*` item through the same endpoint as drag-and-drop, and inserts the
  returned id. The same 4,144 bytes carry over.
- **The server renders, the client only edits.** Whatever the paste handler
  produces is still markdown that goes through `md.ts` on the server, and the
  preview endpoint renders the same POST body, so a paste that fooled the
  walker is visible in the preview and cannot produce raw HTML on the site.
  No `contenteditable`, no rich-text editor; the paste handler is the whole
  concession.

### Dates: the picker

Asked: *"decent datepicker (native is super rough)?"*. **Native
`<input type="datetime-local">` is fine on a phone and poor on a desk**: a
segmented field with a small popover in Chrome, spinners for the time half in
Firefox, a bare field in Safari on macOS, no week numbers, no locale control of
the month names, no way to say "the same time next Friday". Positron's kit has
no date control at all (MEASURED: no `date`, `datetime-local` or picker in
`demo/shell/`), so there is nothing to reuse.

- **The field stays a native `datetime-local` and the picker is an
  enhancement over it.** The form posts the input's ISO value whether or not
  JavaScript ran, which is also what keeps the editor a server-rendered form.
- **The enhancement is one small library, and the pick is flatpickr** (READ
  from memory, to be measured when it is installed: about 20 KB of script and
  CSS, no dependencies, an Estonian locale file, `enableTime`, `time_24hr`,
  `weekNumbers`, `altInput` so the field displays *"30. september 2026,
  19.00"* while posting ISO, `minDate` for `publish_at`, range mode for a
  festival's start and end). It has been in maintenance since 2022, which for
  a date picker is a stable thing to be. Alternatives seen and not chosen:
  Air Datepicker (smaller, ESM, fewer years behind it), Vanilla Calendar Pro
  (modern, heavier), Cally (a web component, date only, no time), and Duet's
  picker (deprecated).
- **Concerts start on the hour or the half hour**, so the time half can be a
  `<select>` of quarter hours from 10.00 to 23.00 beside a date-only picker,
  which is faster to use than any time picker and needs no library for the
  time at all. Either shape is fine; the one thing not to do is two code
  paths, native on `pointer: coarse` and a library on `pointer: fine`, because
  then one of them is never tested.
- **`publish_at` gets the same control, empty by default**, with the hint
  *"tühi = kohe"* next to it, and a preview of the moment in words
  (*"kolmapäeval 30.09 kell 09.00"*) under the field, because a wrong month
  in a segmented field is invisible and a wrong weekday in words is not.

### Items for the stream, which the editor also composes

Asked: *"note that they also compose items for streaming (see items demo)"*.
Read as: ECCM will also write short items that go out at a moment to phones
and to a feed, the thing `demo/items/` does, not only pages that appear. That
page is a two-field composer (title, body) and a moment; the store (a Durable
Object per room, `workers/items`) holds the item as `unpublished`, fires an
**alarm at the named moment**, flips it to `new`, announces it once over FCM to
the phones that asked, and later puts it away at a `shelf_at` it was also
told when written. It records scheduled-against-actual, which is how it knows
its alarms land within a few hundred milliseconds.

- **Two publish paths in one editor.** Pages and events go to D1 and appear
  by the WHERE clause; a stream item goes to the items store, because *appear
  when asked for* and *fire at 09:00:00 and tell the phones* are different
  promises and only the second needs an alarm. The editor's item form is the
  `demo/items/` composer with an `away` moment added.
- **The store's room is `eccm`**, and section 10 of this plan already says
  why the FCM topic is an allowlist of one room rather than a prefix test:
  every run of a test suite once notified every real subscriber for a day.
- **The same item can be the newsletter's short issue.** An item with
  `publish_at` and a body is also a paragraph, and the composer can offer
  *"saada ka kirjana"*, which creates an `issue` row from it; this is the
  cheap version of the *"short issue in any week that has a premiere"* above.
- **What a stream item is not**: an event. It has no venue, no hall, no
  ticket; it is *"täna õhtul on veel kümme piletit"*. Modelling it as a third
  content type with two fields is right, and modelling it as an event with
  most fields empty is the Joomla schema arriving by another road.

### Images, the `../trip` model in full

Asked: *"see ../trip on image handling and resizing and caching"*. READ on
2026-09-26 from `plans/images.md` (378 lines, status shipped), `lib/media.ts`,
`lib/lqip.ts` and the trip `CLAUDE.md`. trip settled this over a week in July
2026 with a Lighthouse lab on real 3 to 5 MB originals, and the numbers below
are its.

- **One original per image in R2, named by content hash, and every size is a
  URL.** The bucket is public through a custom hostname (`media.trip.dance`;
  `r2.dev` has *"no cache/transforms"*), objects are `ed/<sha256-16>.<ext>`
  with `Cache-Control: immutable` set on PUT, and a rendition is
  `https://media.trip.dance/cdn-cgi/image/width=800,quality=82,format=auto/<key>`,
  built by one function, `cdn(key, transform, quality)`. Quality, format and
  the width ladder live in that function and can change with no backfill.
  trip calls it the **rent model**: zone Image Transformations bill per unique
  transformation per month (5,000 free, then $0.50 per 1,000), a tiered edge
  cache serves repeats, and no Worker sits in the image path.
- **A fixed ladder bounds the bill.** Content images at 320, 800, 1200 and
  1600; heroes at 1024, 1600 and 2560; `srcset` from the ladder and an honest
  `sizes`; Client Hints rejected because arbitrary widths unbound the unique
  count and fragment the cache. Uniques are then ladder × images: for ECCM,
  98 events with one picture each is about 400 uniques a month against 5,000.
- **The markup contract that scored 100.** Explicit `width` and `height` on
  every `<img>` (CLS 0), `loading="lazy" decoding="async"` below the fold,
  `fetchpriority="high"` on the one hero, `format=auto` so the browser's
  `Accept` header picks AVIF or WebP (MEASURED by trip: 84 KB AVIF against
  110 KB WebP at 800 wide), and a **blurred tiny rendition inlined as a
  `data:` URI at render time** so a cached page paints the wash on first paint
  (`lqip.ts`: at most 8 KB, a 4 s timeout, falls back to the plain URL). The
  hero verdict after measuring: one wide-crop `<img>` with `object-fit: cover`,
  and `<picture>` art direction dropped because it cost 55 KB for a crop
  nobody needed.
- **The traps trip paid for, each one a line here so ECCM does not:**
  `wrangler r2 object put` writes to local Miniflare unless `--remote` is
  given, and a first upload pass went nowhere; **a 404 on the R2 custom
  hostname is edge-cached for four hours** (`max-age=14400`), so a URL
  requested before its object exists is poisoned, the migration order is
  upload first and announce after, and a Cache Rule makes 404s `no-store` on
  the media host; a cold transform of a 5 MB original takes 490 ms to 1.3 s,
  so trip's cron prewarms the newest ten items' renditions each morning;
  `format=auto` sometimes declines AVIF on very large sources; and a Worker's
  own same-zone subrequest can bypass `/cdn-cgi/image` and hand back the
  original, which is why `lqip.ts` refuses anything over 8 KB.
- **Uploads go through the Worker**, because the hash needs the bytes, and
  the body limit of 100 MB is plenty for a photograph. The pending-bucket
  quarantine and the vision pre-screen exist for community uploads and are
  not needed where only editors upload.
- **OG images are a fourth kind**: 1200×630, PNG or JPEG and never WebP or
  AVIF (older scrapers reject them), baked at publish time or memoised on the
  first crawler hit into R2 under `og/`, with a versioned URL that is
  `immutable` and changes when the content does.

So the earlier line in this section, *"Sizes are made on request by Images
transformations from the one original"*, stands and is now concrete: a
`media` row is `(id, key, w, h, bytes, alt_et, alt_en)`, the alt texts are
required fields in the editor, and every `<img>` on the site is produced by
one function that nobody writes around.

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

## 13. Caching, SEO and the sitemap

Asked 2026-09-26: *"add caching / seo / sitemap story"*. The current site has
none of the three that can be seen from outside: no `Sitemap:` line in
`robots.txt`, no sitemap at the usual path, no `Cache-Control` worth the name
on a Joomla page. Nothing is lost by starting from zero.

### Caching, in three layers, and what each one saves

1. **Static assets are served before the Worker runs and cost nothing.** CSS,
   fonts, the `/nan/` site and any file with a hash in its name go to Workers
   static assets, *"free and unlimited"* on the request quota (section 6), with
   `immutable` caching because the name changes when the file does. This is
   the only layer that saves Worker invocations, and it only changes on a
   deploy, which is exactly why trip's cache plan refuses to pre-render pages
   that must change without one: *"prerendered pages are deploy-time ASSETS
   that tag-purge cannot touch"*.
2. **HTML is rendered per request and cached at the edge with tags.** trip's
   pattern, READ from its pages: each route declares `maxAge`, `swr` and tags
   (`home` 300 s with a 3,600 s stale window, a news article 3,600 s with
   86,400 s stale and the tags `news-<id>` and `news`, the sitemap 86,400 s),
   through the Astro Cloudflare adapter's Workers Cache provider, whose config
   comment reads *"edge hits bypass the Worker, purge by tag"*. Publishing
   calls a purge endpoint with the tags that changed, at most 20 a call, and
   the purge is **eventually consistent, 10 to 30 s** (trip's memory of a
   session spent believing a deploy was broken). For a plain Worker without
   Astro the same shape is `Cache-Control: public, s-maxage=3600,
   stale-while-revalidate=86400` plus a `Cache-Tag` header and the zone purge
   API. ⚠️ Whether tag purge is gated by zone plan is to be READ from the
   Cloudflare docs when this is built; the fact on the table is that it works
   on trip's zone, which is not an Enterprise zone.
3. **D1 reads are what the HTML cache actually saves.** At 500 visitors a day
   the Worker request budget is untouched either way (section 6); what a
   cached list page saves is the 30-row scan on every hit and the 50 to 100 ms
   it costs. trip's measured numbers on cached pages: HIT time to first byte
   47 to 65 ms, a MISS with the database join 95 ms.

**Two rules that the WHERE-clause scheduling of section 8 now needs.** First,
**a scheduled row going live must purge the lists**, because a cached list
page does not know the clock moved; the fifteen-minute cron already in the
plan does it (select rows whose `publish_at` passed since the last run, purge
`events` and `home`, and the languages' front pages), and until it runs the
list is at most `maxAge` old, so keep the list pages' `maxAge` short (300 s)
and their stale window long. Second, **the shared shell is baked into every
cached page**, so a deploy that changes the header or footer purges the index
tags too, which trip learned by shipping a new navigation that stayed old on
every cached index.

**Three small rules from trip's traps.** A 404 is `no-store`, on the Worker
and on the media host, so a URL asked for before it exists is not poisoned for
its `maxAge`. The editor, the preview and anything behind Access are
`no-store` and carry nothing cacheable, since a cached page is communal and
*"anything personal renders ... on uncached routes ... never baked into a
cached page"*. And a preview Worker cannot purge its own zone (Cloudflare error
1003), so the purge is exercised from the deployed Worker, not from `wrangler
dev --remote`.

### SEO, which for this site means being a correct document

- **Server-rendered HTML with the content in it**, which Joomla also did, so
  nothing is lost and nothing needs hydrating. Per page: `<title>` as *"event
  title, date, ECCM"*, a `<meta name="description">` of about 160 characters
  from the body's first paragraph, a `<link rel="canonical">`, and **`hreflang`
  alternates** for `et`, `en` and `x-default`, since section 3 gives every row
  two slugs.
- **`og:` and `twitter:` tags, hand-rolled, about thirty lines.** trip checked
  and Astro core has no SEO module; its `Base.astro` emits `og:site_name`,
  `og:locale et_EE`, `og:type article` or `website`, title, description, url,
  an **absolute** `og:image` with width, height, type and alt,
  `twitter:card summary_large_image`, and `article:published_time`. The image
  is the event's own picture cropped to 1200×630 by one transformation, or the
  house card when there is none.
- **JSON-LD `Event` on every event page**, which is the one thing that makes
  the calendar legible to Google's event results, to calendar apps and to
  aggregators like toimps, whose resolvers read JSON-LD before HTML:
  `name`, `startDate` and `endDate` with the Tallinn offset written out
  (`2026-09-30T19:00:00+03:00`), `location` as a `Place` with a
  `PostalAddress`, `offers.url` for the ticket link, `image`, `organizer`,
  `eventStatus`, and `performer` when there is one. `Organization` on the
  front page with the logo and the address. No `BreadcrumbList` until there is
  a breadcrumb.
- **Feeds.** RSS per language at `/et/feed.xml` and `/en/feed.xml` (Joomla
  today answers `?format=feed&type=rss`, so that URL joins the redirect
  table), and an **iCalendar feed at `/events.ics`** for the same rows,
  because a cultural centre's calendar is something people subscribe to in
  Calendar and Outlook, and it costs forty lines.
- **`robots.txt` allows everything and carries the `Sitemap:` line.** The
  editor and `?preview=` answers carry `X-Robots-Tag: noindex`. trip's
  robots file is the staging shape (`Disallow: /` with one group per preview
  bot, because Meta's parser binds directives to the nearest `User-agent`
  line), and that lesson only matters here if the new site runs on a staging
  hostname before cutover, which it should: staging `noindex`, production
  open, and the flip is one deploy.
- **The redirect table from section 9 is the SEO work that matters most.**
  Every Joomla URL that has ever been linked 301s to its new page; a site
  that changes every URL without that loses whatever standing it had.
- **Alt text is a required field per language** in the editor, and the
  markup contract from the images section (explicit dimensions, lazy below
  the fold, one hero) is what trip's pages scored 100 with; the same recipe
  gives the same score here because the pages are smaller.

### The sitemap

- **One file, `/sitemap.xml`, generated from D1 on request** and cached for a
  day under the tag `sitemap`, purged on publish. It lists every published
  event in both languages with `xhtml:link rel="alternate" hreflang` pairs,
  every page, every news article if any ever exist, and every newsletter
  issue's web page; `lastmod` from `updated_at` and nothing else, because
  Google ignores `priority` and `changefreq`. Past events stay in it: they
  are the archive and they carry the inbound links.
- **No index file and no chunking.** trip chunks at 40,000 URLs because it
  has 54,000 threads; ECCM has about 300 URLs and will not reach the 50,000
  URL limit in its lifetime. `sitemap.xml.ts` and `lib/sitemap.js` (the XML
  escaper) are the template, minus the chunk loop.
- **The host comes from the configured origin, never from `request.url`**,
  which trip notes *"lies about protocol on workerd"*; a sitemap that names
  `http://` URLs is a sitemap of pages that redirect.
- **Submit it once in Search Console for each language's property**, and
  keep the old Joomla property alive until the redirects have been crawled,
  which the coverage report shows.

What this section costs: about a session's half, folded into session 3 of
section 11, which already lists *"sitemap and RSS"*. The JSON-LD and the
iCalendar feed are the two additions to that line.

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
