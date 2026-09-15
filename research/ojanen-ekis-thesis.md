# Ojanen, *User Stories of Erkki Kurenniemi's Electronic Musical Instruments, 1961-1978*: extracted text

This file is a machine extraction of somebody else's PhD dissertation. It is
reference material, not this project's writing. Nothing in it was edited,
summarised or corrected. The analysis built on it is a separate file,
`research/ojanen-ekis-notes.md`.

## Provenance

| | |
|---|---|
| Zenodo record | <https://zenodo.org/records/4306056> |
| DOI (this version) | `10.5281/zenodo.4306056` |
| DOI (concept, all versions) | `10.5281/zenodo.4018719` |
| Author | Mikko Ojanen, University of Helsinki, ORCID `0000-0002-7833-9659` |
| Title | User Stories of Erkki Kurenniemi's Electronic Musical Instruments, 1961-1978 |
| Type | Thesis / doctoral dissertation, defended 2020-12-18, Porthania III, Helsinki |
| Zenodo publication date | 2020-11-27 |
| Version string | `20201127_01` |
| Zenodo access right | `open` |
| **Licence, as Zenodo states it** | **`cc-by-4.0`** (Creative Commons Attribution 4.0 International) |
| **Licence, as the book itself states it (p. ii)** | CC-BY Mikko Ojanen, **"excluding the copyrighted photographic content listed on pages viii-xi"** |
| ISBN | 978-951-51-6393-6 (paperback), 978-951-51-6394-3 (PDF) |
| URN | <http://urn.fi/URN:ISBN:978-951-51-6394-3> |
| File name | `OJANEN_PhD_dissertation_User_Stories_of_EKIS_v20201127_01.pdf` |
| File size | 11,917,086 bytes |
| MD5 | `e2e84e0672abe5346ab7cb2bb96d9bc1` (matches the checksum Zenodo publishes) |
| Page count | **320 PDF pages** = xxvi front matter + 293 numbered pages |
| PDF producer | Microsoft Word 2016 to Acrobat Distiller 20.0, created 2020-12-02 |

⚠️ **The two licence statements are not identical and the narrower one governs.**
Zenodo's record-level field says `cc-by-4.0` with no carve-out. The colophon on
printed page ii excludes the photographs listed on pages viii-xi, which are
third-party copyright with their holders named there. **Text: CC-BY, reusable
with attribution. Images: check the list on pages viii-xi first.** This
extraction contains no images, so what is in this file is CC-BY throughout.

## How it was extracted

MEASURED 2026-09-15.

```sh
curl -sSL -o ojanen.pdf \
  "https://zenodo.org/records/4306056/files/OJANEN_PhD_dissertation_User_Stories_of_EKIS_v20201127_01.pdf?preview=0&download=1"
pdftotext -layout ojanen.pdf ojanen-layout.txt
```

`pdftotext` **version 26.04.0** (poppler), already installed at
`/opt/homebrew/bin/pdftotext`. Nothing was installed on this machine to do this.
The download answered `200`, 11,917,086 bytes, and the md5 matches the checksum
in Zenodo's own API record, so the bytes are attested end to end.

The PDF is **born-digital, not scanned**: 11,275 non-empty lines of real text
layer off 320 pages, no OCR involved. `-layout` was used so the appendix tables
keep their columns.

### What was done to the output, and what was not

- **Added:** one line `[p. <printed> / pdf <n>]` before each page. `<printed>`
  is the number printed on the page itself, `<n>` is the page in the PDF.
- **Not done: nothing else.** No de-hyphenation, no reflow, no dedent, no
  spelling fixes, no removal of running heads.

🔴 **Line-end hyphens are preserved, and there are 2,548 of them in 11,275
lines.** That is 23% of lines, so a grep for a phrase will miss it whenever the
break falls inside a word: `electro-\nacoustic`, `instru-\nment`. **If a search
for something you are sure is in here comes back empty, suspect the hyphen
before the fact.** Joining them was rejected deliberately rather than skipped:
the thesis is full of genuine end-of-line compounds (`real-time`,
`user-oriented`, `electro-acoustic`), and a blind join turns `real-\ntime` into
`realtime`, which is a silent corruption of somebody else's text. A
de-hyphenated copy for searching only is one command away, and the compound
problem travels with it:

```sh
python3 -c "import re,sys;print(re.sub(r'([A-Za-zÄÖÅäöå])-\n\s*([a-zäöå])',r'\1\2',open(sys.argv[1]).read()))" \
  research/ojanen-ekis-thesis.md > /tmp/flat.txt
```

### Page numbering

The printed pagination and the PDF pagination differ by a fixed offset.
MEASURED by reading the number printed on every page: **292 numbered pages all
give the same offset of 26, with no exceptions.**

- PDF 1-26 = the front matter, roman `i` to `xxvi`. PDF 1 and 2 are the title
  page and colophon, whose numbers are suppressed.
- **PDF 27 to 319 = printed pages 1 to 293**, i.e. `printed = pdf - 26`.
  Chapter openers suppress their number but keep their place in the sequence.
- PDF 320 is blank.

Every page number cited in `research/ojanen-ekis-notes.md` is the **printed**
one, which is what the thesis's own cross-references, its index and the paper
book all use. The `/ pdf n` half of each marker is for scrolling the PDF.

---


[p. i (unnumbered) / pdf 1]

                            Faculty of Arts
                         University of Helsinki
                               Finland




                    User Stories of
                  Erkki Kurenniemi’s
            Electronic Musical Instruments,
                      1961–1978




                          Mikko Ojanen




                    DOCTORAL DISSERTATION

       Doctoral dissertation to be presented for public discussion
with the permission of the Faculty of Arts of the University of Helsinki,
     in Porthania III, on the 18th of December 2020 at 16 o’clock.


                             Helsinki 2020

[p. ii (unnumbered) / pdf 2]

Author: Mikko Ojanen; mikko.ojanen@helsinki.fi
ORCID: orcid.org/0000-0002-7833-9659.
I wrote this dissertation as a PhD Candidate in the Doctoral Programme for
Philosophy, Arts and Society / Musicology / University of Helsinki and in the
Finnish Doctoral Programme for Music Research

Supervisors: Dr. Kai Lassfolk and Dr. Alfonso Padilla
Pre-examiners: Dr. Andrew Bentley and Dr. Trevor Pinch (opponent)
Language reviser: Joan Nordlund, MA.
Layout: Mikko Ojanen
Printed by Unigrafia, Helsinki 2020

The Faculty of Arts uses the Urkund system (plagiarism recognition) to ex-
amine all doctoral dissertations.

© 2020 by Mikko Ojanen and the copyright holders listed on pages viii–xi;
see List of Illustrations and Tables. CC-BY Mikko Ojanen. This work is li-
censed under a Creative Commons Attribution 4.0 International license –
excluding the copyrighted photographic content listed on pages viii–xi, if not
specifically mentioned otherwise. To view a copy of the license; see:
https://creativecommons.org/licenses/by/4.0/

1st Edition – version: 20201127_01

Cataloguing-in-Publication Data

Ojanen, Mikko, 1974- author, respondent.
User stories of Erkki Kurenniemi’s electronic musical instruments, 1961-1978
/ Mikko Ojanen. – Helsinki, 2020 (Helsinki : Unigrafia, 2020). – xxvi, 293
pages : illustrations ; 25 cm
Thesis (Ph.D.) – University of Helsinki, 2020.
Includes bibliographical references (pages 257-290)
URN: http://urn.fi/URN:ISBN:978-951-51-6394-3
DOI: https://doi.org/10.5281/zenodo.4018719
ISBN 978-951-51-6393-6 (paperback)
ISBN 978-951-51-6394-3 (PDF)
1. Synthesizer (Musical instrument)—Scandinavia—History—20th century.
2. Synthesizer (Musical instrument)—Construction. 3. Synthesizer music—
Scandinavia—20th century—History and criticism. 4. Music and technolo-
gy—History—20th century. 5. Kurenniemi, Erkki, 1941-2017.
GAC: e-fi--- e-sw---
DDC/23: 786.7/419
LCC: ML1092 .O33 2020
UDC: 780.653.36“1961/1978”(480+485)(091)(043)=111
YKL: 64.5409; 78.8809

[p. iii / pdf 3]

Abstract


The focus in this study is on electroacoustic music and the design of electron-
ic musical instruments in Finland during 1961–1978, approached from both a
historical and an analytical perspective. There are three main threads: music
history (the historical and cultural context in the Nordic countries in the
1960s and 1970s), music technology (the design and use of electronic musical
instruments), and electroacoustic music (aesthetics and musical analysis).
The study belongs to the domain of music technology research and the scien-
tific stance is interdisciplinary. On the one hand, I employ music analysis and
the concepts of the modern historiographical paradigm, ethnography and
aesthetics theory in my analysis and description of the cultural and historical
context of electroacoustic music. On the other hand, I adopt concepts from
Science and Technology Studies (STS) in describing the technological devel-
opments and social networks.
    At the core of the study are the musical instruments and music of the
Finnish instrument designer and composer Erkki Kurenniemi (1941–2017).
At the time when technology dedicated to electronic music production was
practically nonexistent and studios accommodating the genre were rare, and
expensive to set up, Kurenniemi’s designs enabled and facilitated the work of
several composers. In addition to his Finnish collaborators, he worked with
many Nordic composers and artists. His visionary ideas and technical exper-
tise were influenced by the works of many of his contemporaries – and vice
versa. Kurenniemi’s work serves here as a lens through which I observe the
broader picture of the cultural and historical circumstances of electroacoustic
music – even beyond the Finnish scene. Instead of concentrating on the ca-
nonical works and central actors in the field, I focus on the small Helsinki-
based community, which had active links to Sweden and Norway as well as
frequent connections with Central European studios. The study sheds light
on these less commonly studied social connections.
    Beyond the temporal and the geographical, the works of Kurenniemi and
his Nordic collaborators provide overarching perspectives on the interaction
between music and technology. For example, static and detailed descriptions
of musical instruments do not suffice to depict the impact of technological
development on musical aesthetics. To study this aspect further, I examine
Kurenniemi’s instruments in the hands of their users. In analyzing the use of
his instruments, I show how technological artifacts develop in complex inter-
action between the original designer, the users, and the artifact itself rather
than in an isolated laboratory with a lonely designer.
    Kurenniemi’s own musical output, on the other hand, provides an exam-
ple of a music-production process in which the works are created in close –
and often real-time – interaction with the production technology. In extreme
cases, the role of the technology is strongly emphasized and could even be the



                                        iii

[p. iv / pdf 4]

most influential factor in the music-making. This type of technology-driven
music production and composition process challenges the traditional concept
of a musical work, questions the typical intentions of a composer, and antici-
pates many production methods that have emerged, especially in experi-
mental productions and popular music.




                                       iv

[p. v / pdf 5]

Tiivistelmä


Väitöstutkimuksessani tarkastelen elektroakustisen musiikin historiaa sekä
sähkösoitinsuunnittelua Suomessa vuosina 1961–1978. Tutkimukseni kolme
pääteemaa ovat musiikinhistoria (historiallinen ja kulttuurinen konteksti
Pohjoismaissa 1960–70-luvuilla), musiikkiteknologia (elektronisten soitin-
ten suunnittelu ja käyttö) ja elektroakustinen musiikki (estetiikka ja musiik-
kianalyysi). Työni kuuluu musiikkiteknologian tutkimuksen alaan, ja se
muodostuu monitieteisistä tutkimusteemoista. Elektronisen musiikin kult-
tuurihistorian kuvaukseen ja analyysiin sovellan modernin historiankirjoi-
tuksen, etnografian ja esteettisen teorian käsitteitä sekä musiikkianalyysiä.
Sosiaalisten verkostojen ja teknologian kehityksen hahmottamiseen hyödyn-
nän tieteen ja teknologian tutkimuksessa (Science and Technology Studies,
STS) kehitettyjä teorioita ja käsitteitä.
    Työni keskeinen toimija on soitinsuunnittelija ja säveltäjä Erkki Kuren-
niemi (1941–2017). Kurenniemen soittimet mahdollistivat elektronisen mu-
siikin tuottamisen Suomessa aikana, jolloin kyseisen musiikkityylin toteut-
tamiseen soveltuvat studiot olivat harvinaisia ja teknologia kallista. Suoma-
laisten yhteistyökumppaneidensa lisäksi Kurenniemi työskenteli myös mo-
nien pohjoismaisten säveltäjien ja taiteilijoiden kanssa. Hänen visionäärinen
ideointinsa ja tekninen asiantuntemuksensa vaikutti monien hänen aikalais-
tensa töihin – ja päinvastoin. Kurenniemen työ musiikkiteknologian parissa
toimii tutkimukseni lähtökohtana ja linssinä, jonka kautta tarkastelen poh-
joismaisen elektronisen ja kokeellisen musiikin kulttuurihistoriallista tilan-
netta sekä usean säveltäjän ja avantgardetaiteilijan töitä. Kanonisoitujen te-
osten ja elektroakustisen musiikin keskeisten toimijoiden tarkastelun sijaan
tutkimukseni painopiste on helsinkiläisessä pienessä yhteisössä, jolla oli ak-
tiiviset yhteydet Ruotsiin ja Norjaan sekä jopa Keski-Euroopan studioihin.
Tutkimukseni yhdeksi keskeiseksi teemaksi muodostuu historiallisten toimi-
joiden sosiaalisen verkoston ja yhteistyön kuvaaminen.
    Työni ajallisen ja maantieteellisen rajauksen ohella Kurenniemen ja hä-
nen yhteistyökumppaneidensa tuottama musiikki ja kokeellinen taide luovat
pohjan myös musiikin ja teknologian vuorovaikutuksen yleisemmälle tarkas-
telulle. Soitinten staattinen ja yksityiskohtainen kuvailu ei yksinään riitä mu-
siikin teknisen kehityksen ja musiikin esteettisen muutoksen vuorovaikutuk-
sen analysointiin. Tutkiakseni tätä muutosta tarkemmin tarkastelen Kuren-
niemen soittimia erityisesti niiden käyttöyhteyksissä. Analysoimalla Kuren-
niemen instrumenttien käyttöä osoitan, kuinka teknologiset artefaktit kehit-
tyvät pikemminkin alkuperäisen suunnittelijan, käyttäjien ja itse artefaktin
välisessä monimutkaisessa vuorovaikutuksessa kuin yksinäisen suunnitteli-
jan keksintöinä, muusta maailmasta eristetyssä laboratoriossa. Kurenniemen
oma taiteellinen tuotanto tarjoaa esimerkin musiikin tuotantoprosessista,
jossa teokset luodaan tiiviissä – usein reaaliaikaisessa – vuorovaikutuksessa



                                         v

[p. vi / pdf 6]

tuotantoteknologian kanssa, mikä on tyypillistä elektroakustisen ja kokeelli-
sen musiikin kontekstissa. Äärimmäisessä tapauksessa teknologian rooli ko-
rostuu jopa siinä määrin, että siitä muodostuu tärkein musiikin tekemistä
ohjaava tekijä. Tällainen musiikintuotantoprosessin muoto haastaa laajen-
tamaan perinteistä taideteoksen määritelmää sekä kyseenalaistaa säveltäjän
intention luomisprosessin osana.




                                       vi

[p. vii / pdf 7]

List of abbreviations and acronyms


ANT               Actor Network Theory (a theoretical frame)
DIMI [w/suffix]   The brand name of Kurenniemi’s DEF period DIgital Mu-
                        sical Instruments
DMI               Digital musical instrument (a generic term for modern
                        digital music instruments)
DEF               Digelius Electronics Finland (a company)
DN                Dagens Nyheter (a newspaper)
EMS               Elektronmusikstudion (EMS), Stockholm
ESS               Etelä-Suomen Sanomat (a newspaper)
FNG/EKA           Finnish National Gallery, Erkki Kurenniemi Archive
Hbl               Hufvudstadsbladet (a newspaper)
HS                Helsingin Sanomat (a newspaper)
HYY               The Student Union of the University of Helsinki
IS                Iltasanomat (a tabloid)
KAVI              The National Audiovisual Institute, Helsinki
KU                Kansan Uutiset (a newspaper)
LTS               Large Technological Systems (a theoretical frame)
UHMRL             The University of Helsinki Music Research Laboratory
SCOT              Social Construction of Technology (a theoretical frame)
STS               Science and Technology Studies (a theoretical frame)
TeaMA             Theater Museum archive, Helsinki
Yle               The Finnish Broadcasting Company, Helsinki




                                     vii

[p. viii / pdf 8]

List of illustrations and tables


Figure 1. A linear model of the innovation process © Wiebe Bijker 1995*
Figure 2. A node in a heterogeneous actor network ©/CC-BY Mikko Ojanen
2019
Figure 3. The features of a music technological artifact ©/CC-BY Mikko
Ojanen 2019
Figure 4. Human actors (HA) and nonhuman actors (NHA), and their in-
teraction in the process of instrument design and development; an ideal situ-
ation ©/CC-BY Mikko Ojanen 2019
Figure 5. Nattiez’s tripartition model © Jean-Jacques Nattiez 1990*
Figure 6. A dimension-space visualization template ©/CC-BY Mikko
Ojanen 2019
Figure 7. Nattiez’s tripartition model (© Jean-Jaques Nattiez 1990*) from
the perspective of the potential analyst, complemented with a performance
aspect (© Alfonso Padilla 1997*) and emphasized with the description of a
poietic ecosystem ©/CC-BY Mikko Ojanen 2019
Figure 8. Kurenniemi as an amateur radio operator © unknown/The Finn-
ish National Gallery/EKA**
Figure 9. Kurenniemi’s copy of The Radio Amateur’s Handbook ©/CC-BY
Mikko Ojanen 2018
Figure 10. Kurenniemi and his classmates on the loft of the school organ ©
unknown/Uusi Suomi*
Figure 11. Professor Erik Tawaststjerna in his office © Pertti Jen-
ytin/Lehtikuva**
Figure 12. A map of the Limppiece (1964) happening © unknown/The
Finnish National Gallery/EKA*
Figure 13. Kurenniemi with his first music system © Holger
Ekholm/Lehtikuva**
Figure 14. The Integrated Synthesizer in Jyväskylä © un-
known/Lehtikuva**
Figure 15. Kurenniemi and a glimpse of the Integrated Synthesizer in the
documentary film Kahdeksan tahtia tietokoneelle (Engl. Eight bars for a
computer) © Oura/Yle*
Figure 16. Kurenniemi with the Integrated Synthesizer at the Amos Ander-
son Art Museum © Mikko Oksanen/Lehtikuva**
Figure 17. The University Studio presented in the unreleased documentary
about Henrik Otto Donner © unknown/Yle*
Figures 18 and 19. The University Studio, 1971 – 1975 © unknown/The
Finnish National Gallery/EKA**
Figures 20 and 21. The University Studio from 1976 to the late 1970s ©
unknown/Otavan iso musiikkitietosanakirja*




                                      viii

[p. ix / pdf 9]

Figure 22. M.A. Numminen performing his avant-garde works Ontogim
and Oigu-S (1964) © Matti Tapola/Lehtikuva**
Figure 23. M.A. Numminen and Kullervo Aura with the Singing Machine ©
unknown/Uusi Suomi*
Figure 24. M.A. Numminen in the Vironkatu Studio © Pekka Haras-
te/Lehtikuva**
Figures 25–30. A photo set from the Andromeda Studio in the fall of 1968
© presumably by Erkki Kurenniemi/The Finnish National Gallery/EKA**
Figure 31. Composer Leo Nilsson trying out the newly finished Andromatic
in the Andromeda Studio in the fall of 1968 © presumably by Erkki Kuren-
niemi/The Finnish National Gallery/EKA**
Figure 32. The Andromatic in the exhibition Den Immateriella Processen
© unknown/The Finnish National Gallery/EKA**
Figure 33. The Andromatic in the exhibition Den Immateriella Processen
© unknown/Ralph Lundsten archive**
Figure 34. Composer Ralph Lundsten in his Andromeda Studio © un-
known/Otavan iso musiikkitietosanakirja*
Figure 35. Composer Osmo Lindeman in his home studio in 1972 © Sirkka
Lindeman/Osmo Lindeman archive**
Figures 36. Lindeman’s home studio setup in 1975 © unknown/Otavan iso
musiikkitietosanakirja*
Figure 37. Kurenniemi programming the DIMI-A © unknown/The Finnish
National Gallery/EKA**
Figure 38. The DIMI-A waiting its turn while Sähkökvartetti (the band) is
performing Kaukana väijyy ystäviä at the Sähköinen tapahtuma Vanhalla
© Pertti Messo/Lehtikuva**
Figure 39. Invitation letter to the Digelius briefing from the owner of the
Musica record company © Pertti Lehto**
Figure 40. Kurenniemi and Ruohomäki performing with the DIMI-A in the
University Studio © Matti Saves/Lehtikuva**
Figure 41. Kurenniemi playing with and programming the DIMI-O © un-
known/Lehtikuva**
Figure 42. The DIMI-O in the event featuring art group Elonkorjaajat ©
unknown/The Finnish National Gallery/EKA*
Figures 43, 44 and 45. The DIMI-O and Samuel Beckett’s play Act with-
out words © unknown/The Finnish National Gallery/EKA**
Figure 46. One of the hand-drawn sketches of the universal DIMI system ©
Erkki Kurenniemi/The Finnish National Gallery/EKA**
Figure 47. The DIMI-S tested by two unidentified players © unknown/The
Finnish National Gallery/EKA**
Figure 48. Ruohomäki programming the DIMI 6000 in the Yle Ratakatu
Studio © unknown/Pekka Sirén archive**
Figure 49. Pekka Sirén (left) assists Joe Davidow (right, at the ADDS ter-
minal) with the DIMI 6000 © unknown/Pekka Sirén archive**




                                      ix

[p. x / pdf 10]

Figure 50. Digelius Electronics Finland job announcements in Helsingin
Sanomat, 1971–1973 © Helsingin Sanomat*
Figure 51. Digelius Electronics Finland job announcements in Helsingin
Sanomat, 1974–1976 © Helsingin Sanomat*
Figure 52. Key features of the user interfaces and functionalities of Kuren-
niemi’s electronic musical instruments ©/CC-BY Mikko Ojanen 2019
Figures 53–61. The key features of Kurenniemi’s electronic musical in-
struments: the user interfaces ©/CC-BY Mikko Ojanen & Jari Suominen
2004; © Perttu Rastas/Kiasma** 2007; © Jari Lehtinen; © DEF 1972/The
Finnish National Gallery/EKA**
Figures 62–70. The key features of Kurenniemi’s electronic musical in-
struments: the dimension space visualizations ©/CC-BY Mikko Ojanen 2019
Figure 71. A detail of the user interface of the DICO: programming the ten
bits of the instrument ©/CC-BY Mikko Ojanen & Jari Suominen 2004
Figures 72 and 73. The user manual (upper image) and the user interface
(lower image) of the DIMI-A © unknown/UHMRL archive**
Figures 74 and 75. The block diagram (upper image) and the control panel
(lower image) of the DIMI-O © unknown/UHMRL archive**
Figure 76. The six pairs formed by the four players of the DIMI-S © Jörgen
Städje 2009*
Figures 77 and 78. The DIMI-T user manual and playing instructions ©
unknown/The Finnish National Gallery/EKA*
Figure 79. The DIMI 6000 block diagram © Digelius Electronic Finland *
Figures 80 and 81. The physical interface of the Integrated Synthesizer
(1964) and the virtual interface of the DIMI 6000 (1975) ©/CC-BY Mikko
Ojanen & Jari Suominen 2004
Figure 82. The Andromatic user interface (a detail), with hand-written la-
bels for pitch, gain and sustain potentiometers ©/CC-BY Mikko Ojanen 2012
Figure 83. The DIMI 6000 was programmed with octal codes typed via the
ADDS Consul 880 terminal © unknown/Otavan iso musiikkitietosana-
kirja**
Figures 84–95. Annotated sonogram images of the analyzed musical works
©/CC-BY Mikko Ojanen 2017–2020
Figure 96 and 97. Handwritten and typewritten score drafts for the DIMI-
A © Ralph Lundsten/UHMRL archive**
Figures 98–110. Annotated sonogram images of the analyzed musical
works ©/CC-BY Mikko Ojanen 2017–2020
Figure 111. Sähkö-shokki-ilta (Electric Shock Evening) at the Amos Ander-
son Art Museum, February 9, 1968 © unknown/The Amos Anderson Art
Museum**
Figure 112. Sähkö-shokki-ilta (Electric Shock Evening) at the Amos Ander-
son Art Museum, February 9, 1968 © unknown/The Amos Anderson Art
Museum**
Figures 113–116. Annotated sonogram images of the analyzed musical
works ©/CC-BY Mikko Ojanen 2017–2020



                                       x

[p. xi / pdf 11]

Figures 117–119. The Sähkökvartetti, the Putney, the Dimix, and other stu-
dio equipment set up in Yle’s Liisankatu Studio © Erkki Kurenniemi/The
Finnish National Gallery/EKA**
Figure 120. The DIMI-S (Sexophone) presented by Ralph Lundsten in a
Swedish Television documentary © unknown/Ralph Lundsten archive**
Figures 121. The Dimi is born poste and record sleeve © Meri Vennamo*
Figures 122 and 123. A hypothetical network of crucial stakeholders
©/CC-BY Mikko Ojanen 2019
Figure 124. The author’s (composers, producers, or artists) three attitudes
toward the music production process ©/CC-BY Mikko Ojanen 2019

*********

Table 1. The relationship between the research target, the source material
and their role and position in the research process
Table 2. The parameters and values for charting the user interfaces and
functionalities of Kurenniemi’s electronic musical instruments
Table 3. An overview of Kurenniemi’s electronic musical instruments
Table 4. The University Studio locations and setups during the time when
Kurenniemi was active there, from the early 1960s to the mid-70s
Table 5. The composers and artists who had first-hand experience with Ku-
renniemi’s instruments and those who were in indirect contact with them
Table 6. An overview of the users and use situations of Kurenniemi’s elec-
tronic musical instruments
Table 7. A summary of the appearances of Kurenniemi’s instruments in
front of a live audience, in other words live performances, exhibitions and
instrument demonstrations at which the actual instruments were present

                                    *********

*    Reused in this work under Quotation rights
**   Reused in this work with permission from the copyright holder

Every effort has been made to identify the rightful copyright holders of mate-
rial not specifically commissioned for use in this publication and to secure
permission, where applicable, for reuse of all such material. Credit, if and as
available, has been provided for all borrowed material either on-page, or on
the copyright page. Errors or omissions in credit citations or failure to obtain
permission if required by copyright law have been either unavoidable or un-
intentional. The author and publisher welcome any information that would
allow them to correct future reprints.




                                        xi

[p. xii / pdf 12]

Note on previously published
articles


A few sections of this dissertation are based on my previous publications, but
I have re-written them for this context.

Chapter 4.2 and some of the descriptions of musical works in Chapter 7, re-
cycled:

Ojanen, Mikko. 2014. Electroacoustic concert and happening performances
of the ’60s and early ’70s in Finland. In EMS Proceedings and Other Publica-
tions: EMS14 - Electroacoustic Music Beyond Concert Performance (pp. 1–
13). Berlin: Electroacoustic Music Studies Network.

Chapter 5 is based on our co-written articles:

Ojanen, Mikko, & Suominen, Jari. 2005. Erkki Kurenniemen sähkösoittimet.
Musiikki, 35(3), 15–44.

Ojanen, Mikko, Suominen, Jari, Kallio, Titti, & Lassfolk, Kai. 2007. Design
principles and user interfaces of Erkki Kurenniemi’s electronic musical in-
struments of the 1960’s and 1970’s. In Proceedings of the 2007 Conference
on New Interfaces for Musical Expression (NIME07), New York, NY, USA
(pp. 88–93). New York: Harvestworks.
https://doi.org/10.1145/1279740.1279756

The background of the Finnish studios (Chapter 4) and the history of the
University Studio (Chapter 5) are based on my article:

Ojanen, Mikko. 2013. Erkki Kurenniemi’s electronic music studio. In M. Mel-
lais (Ed.), Erkki Kurenniemi: a Man From The Future (pp. 99–128). (Kuva-
taiteen keskusarkisto / Central Art Archives; No. 25). Helsinki: Valtion tai-
demuseo, Kuvataiteen keskusarkisto.
https://doi.org/10.5281/zenodo.804969

Part of the analysis of Kurenniemi’s Inventio (Chapter 7) is published in:

Lassfolk, Kai, Suominen, Jari, & Ojanen, Mikko. 2015. Interaction of Music
and Technology: The Music and Musical Instruments of Erkki Kurenniemi.
In J. Krysa, & J. Parikka (Eds.), Writing and Unwriting (Media) Art Histo-
ry: Erkki Kurenniemi in 2048 (pp. 261–277). (Leonardo Book Series). Cam-
bridge, Mass.: MIT Press.




                                        xii

[p. xiii / pdf 13]

Contents

Abstract ......................................................................................................................iii
Tiivistelmä .................................................................................................................. v
List of abbreviations and acronyms........................................................................ vii
List of illustrations and tables ................................................................................ viii
Note on previously published articles .................................................................... xii
Contents ................................................................................................................... xiii
Preface and acknowledgements ............................................................................. xvi
1      Introduction .......................................................................................................1
   1.1       The objective of the study and the research task ...................................1
       1.1.1 Contextualizing the study..................................................................... 2
       1.1.2 The key concepts and the research questions..................................... 4
       1.1.3 The framing of the study ...................................................................... 9
   1.2       Research material and data ................................................................... 11
       1.2.1 Research material and data collected for the study .......................... 11
       1.2.2 The research material and data produced within this study ........... 15
       1.2.3 The ethical conducting of the research and archiving the project .. 16
   1.3       Previous research on the topic ...............................................................17
       1.3.1 General remarks on the background literature .................................17
       1.3.2 Previous research and publications about electroacoustic music
               in Finland............................................................................................. 18
   1.4       The structure of the study ..................................................................... 21
2      The conceptual and theoretical background................................................. 24
   2.1       History: general remarks on historiography ....................................... 26
   2.2       Technology: theories and definitions ................................................... 33
       2.2.1 Definition(s) of technology ................................................................. 34
       2.2.2 Theories of (socio)technical change ................................................... 35
       2.2.3 The role of agency in the designer–artifact–user interaction .......... 39
       2.2.4 Technology in a musical and historical context ................................ 42
   2.3       Music: writing music history and definition(s) of music .................... 46
       2.3.1 Writing music history.......................................................................... 46
       2.3.2 The concepts of music and a musical work ....................................... 49
       2.3.3 Definitions of electroacoustic music .................................................. 54
3      Methodology .................................................................................................... 57
   3.1       Writing a history of music technology as a qualitative research
             project ..................................................................................................... 57
   3.2       The analysis of electronic musical instruments ..................................60
   3.3       The analysis of electroacoustic music .................................................. 64
4      Preconditions for electroacoustic music and instrument design ................ 69
   4.1       An overview of the global history of electroacoustic music and
             instrument design .................................................................................. 69
   4.2       The early development of electroacoustic music in Finland .............. 73
       4.2.1 Challenging the traditional organization of a concert setting .......... 75
       4.2.2 Live processed instrumentation and experiments with sound
               spatialization ........................................................................................ 76
       4.2.3 Early studios for electroacoustic music in Finland ........................... 78



                                                              xiii

[p. xiv / pdf 14]

5    A history of Kurenniemi’s electronic musical instruments ......................... 80
  5.1     The University of Helsinki Electronic Music Studio .......................... 82
     5.1.1 Setting the scene for the University Studio ...................................... 82
     5.1.2 The foundation of the University Studio and the early years ......... 86
     5.1.3 The Integrated Synthesizer: the heart of the University Studio ..... 92
     5.1.4 Towards conventional tape music and recording studios.............. 105
  5.2     Customized designs commissioned by artists and composers ......... 110
     5.2.1 From avant-garde to underground with M.A. Numminen and
            Sähkökvartetti: the instrument and the group ............................... 110
     5.2.2 Andromatic: the automatic Andromedean and Swedish
            composers Ralph Lundsten and Leo Nilsson ...................................117
     5.2.3 Osmo Lindeman’s early home studio setup and the DICO
            digitally controlled oscillator ............................................................ 126
  5.3     The DIMI series and Digelius Electronics Finland (DEF) ................ 134
     5.3.1 The first DIMIs and the foundation of DEF .................................... 134
     5.3.2 Towards an integrated and modular studio system ....................... 146
     5.3.3 Experiments directed toward a new means of instrument control147
     5.3.4 The DIMI 6000 and the fall of DEF ................................................ 150
6    User Interfaces of Kurenniemi’s Electronic Musical Instruments ............ 156
  6.1     A general overview of Kurenniemi’s instrument design ................... 156
  6.2     The key features of Kurenniemi’s musical instruments .................... 158
     6.2.1 Short descriptions of the user interfaces ......................................... 162
     6.2.2 The usability and functionalities of the user interfaces .................. 170
     6.2.3 Control over the music-theoretical content and sound .................. 173
     6.2.4 The designer’s initial ideas of the instruments’ intended use ........ 174
     6.2.5 The pre-programmability and playability of the instruments from
            the user’s point of view...................................................................... 174
7    User Stories of Kurenniemi’s Electronic Musical Instruments ................. 177
  7.1     Within the studio environment ........................................................... 179
     7.1.1 The composers’ attitudes towards studio work and technology ... 179
     7.1.2 The studio as a real-time performance instrument ........................ 185
     7.1.3 Improvising within the studio .......................................................... 191
     7.1.4 Computer-metaphor-driven composition and music-production
            processes ............................................................................................ 195
     7.1.5 Sequencer-based examples ............................................................. 204
     7.1.6 Sound synthesis examples ............................................................... 208
  7.2     Outside the studio environment .........................................................210
     7.2.1 Electroacoustic tape music in a concert setting .............................. 212
     7.2.2 Live performances with Kurenniemi’s instruments ....................... 213
     7.2.3 Instrument tests and demonstrations ............................................ 223
     7.2.4 Collective performances with Kurenniemi’s instruments............. 224
8    Discussion ......................................................................................................227
  8.1     Kurenniemi as an instrument designer and an artist........................227
  8.2     An assessment of Kurenniemi’s design and marketing processes .. 233
  8.3     Kurenniemi’s working environment ...................................................237
  8.4     A social construction of Kurenniemi’s designs ................................. 238
  8.5     Kurenniemi’s projected users and the engagement of real users
          with his designs ................................................................................... 243
  8.6     Plugging electric sounds into other art forms and into society ....... 245
  8.7     The diversification of valuation processes in music production ......247



                                                          xiv

[p. xv / pdf 15]

9    Conclusions ................................................................................................... 253
References .............................................................................................................. 257
  Source material and research data ................................................................... 257
     Archives and collections ............................................................................... 257
     Archive material (unpublished) ................................................................... 258
     Audio-visual recordings, radio programmes, films and documentaries . 260
     Interviews ...................................................................................................... 261
     Newspaper and magazine articles, contemporary historical documents
     and retrospective memoires ......................................................................... 264
     Newspapers and magazines ......................................................................... 270
     Photographs .................................................................................................. 270
     Research data publications .......................................................................... 272
     Sound recordings .......................................................................................... 273
     Websites......................................................................................................... 274
  Research literature ............................................................................................ 276
Appendix................................................................................................................. 291
  Appendix 1. Relevant social groups related to the development of
  Kurenniemi’s instruments ................................................................................ 291




                                                            xv

[p. xvi / pdf 16]

Preface and acknowledgements


I started working at the library of the Department of Phonetics of the Univer-
sity of Helsinki, in its Vironkatu premises, on October 1, 1996. I soon realized
that the building had something to do with the legendary Finnish electronic
musical instrument designer Erkki Kurenniemi. I knew Kurenniemi’s name
and the fascinating sounds of his Andromatic synthesizer from the early
1990s CD reissue of Tombstone Valentine, the second album of the Finnish
progressive pop group Wigwam released originally on an LP vinyl record in
1970, on which an excerpt of Kurenniemi’s Antropoidien tanssi was released.
I recall being quite excited when I gradually realized that I was put to work in
the very same building in which significant steps in the history of Finnish
electronic and experimental music had been taken.
    Obviously, I had no idea about any of the stories the very rooms in which I
was working had witnessed some 30 years earlier. Fortunately, an article and
a Master’s thesis written by Kalev Tiits in the next-door musicology library
collection revealed many interesting details of those stories, and history
started to unwrap itself slowly. It was so slow, in fact, that I realized only a
few months ago that the door opposite my first desk in the library was the
one that separated Kurenniemi’s small workspace from the office of the De-
partment of Musicology in the late 1960s. I found this out during an inter-
view with composer Jukka Ruohomäki, who was Kurenniemi’s closest col-
laborator in Vironkatu in the early 1970s. Several other details are yet to be
revealed, and stories to be told.
    During the following years, and at an accelerating pace, I paid many a vis-
it to the musicology studio, which was relocated after the large-scale renova-
tion in the early 1980s to the other side of the building, half a floor down
from where I was working. By 2000, I had browsed the several cellars of the
department and, among other things, found a few tape reels with sounds
from Kurenniemi’s instruments he had recorded sometime in the early
1970s. At the time the studio was occupied by the three-piece analog synthe-
sizer group Nu Science, which I had together with Henri Tani and Aku Raski.
Copying the idea from the 30-year-old Wigwam album, I wanted to include a
snippet of Kurenniemi’s sounds on our record. I contacted Kurenniemi in
November 2000 to ask for his permission. He did not remember what the
sounds were, but he was happy to agree. So, I edited a short fragment of Ku-
renniemi’s sounds as an introduction to our track Tripodien aika. In return,
he requested a copy of our album.
    A couple of Kurenniemi’s instruments were stored in the cellar among the
tapes. Pauli Laine and Kai Lassfolk, who took care of the studio starting from
the 1980s, were kind enough to let me take a peculiar box, which turned out
to be the DIMI-A, up to the studio to try it out. Previous attempts had failed
over the years. The lights were blinking but there was no sound. One evening,



                                        xvi

[p. xvii / pdf 17]

after work, I stayed in the studio and patiently tapped the metal plates with
two styluses for a couple of hours, following the DIMI-A “user manual”. At
the time I did not understand how or why, but with a certain combination of
selected parameters and their values, the distinctive square wave sound ap-
peared. My mind was blown. I immediately rang Kai, who was probably
ready to go to bed so late in the evening. The news that the DIMI-A was
working again after some 20 years of silence had to be shared with Kuren-
niemi: he visited the studio shortly afterwards. This was the first time I met
him in person.
    Meanwhile, media artist and musicologist Petri Kuljuntausta had finished
his book about the early phases of electronic music in Finland. He had heard
from Kurenniemi that the DIMI-A had been recovered. To celebrate the pub-
lication of his book On/Off, Kuljuntausta organized a party and asked Ku-
renniemi to perform. Thinking that he might not know how to use the in-
strument, Kurenniemi suggested we demonstrate it together. The DIMI-A
was heard for the first time in public after an almost 30-year hiatus on June
5, 2002. Years later, I learned that the performance setup was similar to the
one on November 17, 1970 when Kurenniemi introduced the DIMI-A to the
public – with Ruohomäki performing. A couple of weeks after our DIMI-A
performance, film director Mika Taanila contacted me and asked if I was in-
terested in participating in the Avanto festival the following November.
    At the time, Taanila was filming a documentary about Kurenniemi enti-
tled Tulevaisuus ei ole entisensä (Engl. The Future is Not What It Used To
Be), and compiling a CD record of his musical works. Among these releases,
Taanila was organizing an event to honor Kurenniemi’s work as part of the
Avanto festival. Eventually, the Homage to Erkki Kurenniemi was given on
November 21, 2002, in the Kiasma Theater. It consisted of the premiere of
Taanila’s documentary, our remake of Kurenniemi’s Deal (1971/72) for the
DIMI-O video synthesizer together with dancer Topi Tateishi, aerial artist
Ilona Jäntti, Kurenniemi and me, and a performance by Mika Vainio and
Ilpo Väisänen from Pan Sonic, Carl Michael von Hausswolff and Kurenniemi
with Kurenniemi’s instruments restored by Jari Lehtinen. Another event in
the festival program presented a performance by the original line-up of
Sähkökvartetti with M.A. Numminen, Tommi Parko, Arto Koskinen and Pe-
ter Widén – this was and remains the only performance by the original line-
up since 1970. Sähkökvartetti is a collective electronic musical instrument
commissioned by Numminen from Kurenniemi in 1968.
    The instruments (the Andromatic, the DIMI-O and the DIMI-S) loaned
from Swedish composer Ralph Lundsten were returned to his Andromeda
Studio in Stockholm after the festival, and those that remained in Finland
were added to the University Studio collection, where they have frequently
been used in teaching, training, and performances over the years. The year
2002 clearly marked a watershed and a revival of Kurenniemi’s instruments.
During the following years Kurenniemi, Pan Sonic and von Hausswolff per-




                                      xvii

[p. xviii / pdf 18]

formed in key European biennales, while Kurenniemi and I performed in
local events together with Jari Suominen.
    In 2003, Susanna Välimäki asked me to write an article for a theme issue
on music and technology in the musicological journal Musiikki. This request
triggered a string of events, which led to this PhD dissertation – eventually.
Suominen, a distinguished media artist and instrument designer-to-be, start-
ed as a student at the University Studio some time in the early 2000s. He was
seemingly enthusiastic about Kurenniemi’s designs and deeply technological-
ly oriented. In order to strengthen the technical side of the project I thought
that he would be an excellent collaborator in its completion, so I asked him to
co-write the article with me. Suominen, Lassfolk and I soon formed the Ku-
renniemi research group, and our cooperation has continued ever since.
    Amid the concerts and performances Kurenniemi’s instruments were fre-
quently displayed at exhibitions, which together with Kurenniemi’s archival
activities were organized by Perttu Rastas and Maritta Mellais from the Finn-
ish National Gallery (FNG). Mainly due to Rastas’s efforts, Kurenniemi’s pri-
vate collection was deposited in the FNG in 2006, where his legacy remains
at the disposal of researchers. Rastas’s initiatives also led to the acquisition of
a couple of Kurenniemi’s instruments for the collections of responsible or-
ganizations. Our international collaboration with Kurenniemi’s archive re-
search reached its peak in a series of exhibitions in the early 2010s, mainly
on the initiative of the FNG, Kiasma and Rastas. Two years of intensive re-
search and production with the international curation team led to the exhibi-
tions in Documenta13 in Kassel in 2012, Kunsthal Århus in 2013, and Kias-
ma, Helsinki in 2013–14. In 2015, the collaboration spawned the MIT Press
anthology Writing and Unwriting (Media) Art History: Erkki Kurenniemi
in 2048, edited by Joasia Krysa and Jussi Parikka with a significant contribu-
tion by our Kurenniemi research group among many distinguished research-
ers. We formed a quartet for the exhibition tour, DIMIs Re-connected, with
Lebanese-French sound artist Tarek Atoui, Lassfolk, Suominen, and me.
Since then we have frequently performed as the DIMI Trio – with various
combinations of Lassfolk, Suominen, Maiju Jouppi, and me.

                                    *********

Joanna Demers writes in Listening through the noise (2010) that “aesthetics
is a dirty word in some parts of academia”. Over the years, I have observed
that academia is a dirty word among some practitioners whose goal is to get
the work done and not to ponder on theoretical or conceptual details. The
superb technical expertise of Suominen as well as his hands-on experience in
instrument design has made me understand the significance of interdiscipli-
nary approaches. Our collaboration with him and Lassfolk shows that art
studies, social sciences and humanities (SSH), engineering practices and ar-
tistic research could greatly benefit from each other. Only by bringing people
with different backgrounds together can we produce genuinely new



                                        xviii

[p. xix / pdf 19]

knowledge and understanding of our surrounding environment. This has
been my main motivation during this PhD project.
    My motivation was strengthened even further when I started to work in
Data Support at Helsinki University Library in January 2016. Our work in
training and consulting researchers on research data management (RDM)
issues is closely related to the open science and research (OSR) initiative. My
five years of trying to match this PhD project with OSR principles have
taught me a great deal about my own research, as well as how little we still
know about the implementation of RDM and OSR challenges in the social
sciences and humanities. I took OSR principles seriously. I learned that open
science requires significant planning in advance and a considerable amount
of dedicated resources – both time and money. OSR principles cannot be
added to a project, they should guide research projects on all levels – from
daily workflows on the concrete grassroots level to the ideological approach
of the researcher. The sacrifice of time and money pays off, however. In the
near future we will see how researchers earn credit for their choices in sup-
porting openness – and most importantly, OSR will help to make research
processes and outcomes more transparent, ethical and reusable. They rein-
force the impact of our work on society.
    The general requirement according which a PhD dissertation must be
based on the work of an individual researcher is absurd. We spend hours
carving our independent position in relation to the works of others, which
eventually is an impossible task. Instead, we should consider how we learn to
conduct research together as a community supporting each other and sharing
our thoughts and visions. This is what OSR is all about. To state that the fol-
lowing 300 pages are based on painstaking work by me as an individual, an
independent doctoral candidate, is a preposterous fallacy. A work of this
scale cannot be completed by a single person. Therefore, acknowledgements
are in place.

                                   *********
First and foremost, I have to say that the most exciting and utterly irreplace-
able part of this project has been the chance to talk to the people who were
there when the events that are chronicled took place. My deepest gratitude
goes to all the research participants who, without any hesitation, were willing
to talk with me, share their memories and even open their archives. Many
thanks to all of you! Your wonderful work, the cultural historical legacy, in-
spires me to return to this theme again and again.
   I am deeply moved by having had the chance to discuss matters with Hen-
rik Otto Donner, M. A. Numminen, Ralph Lundsten, Leo Nilsson, Hannu
Viitasalo, Philip Donner, Pekka Sirén, Pekka Hoikkala, Risto Rautee, Seppo
Nikkilä, Otto Romanowski, Joe Davidow, Jouko Kottila, Kari Hakala, Emu
Lehtinen, Pertti Lehto, and Andrew Bentley.
   The first interview I conducted was with Erkki Kurenniemi in 2004, to-
gether with my closest Kurenniemi research colleague Jari Suominen. Our



                                       xix

[p. xx / pdf 20]

epic almost five-hour session in the Vironkatu Studio is something I will al-
ways remember. I also have many lovely memories of subsequent encounters
with Erkki and his widow Kati Heickell. My warmest thanks go to you, Kati,
for everything. I would also like to thank Erkki’s daughter Aurora Ikävalko,
whom I contacted only very recently: she helped me with some details and
permissions regarding the research material.
    This study would have been much poorer without the support, help and
private research material archive of composer Jukka Ruohomäki. I am hon-
ored to follow the path he cleared some fifteen years before I came on the
scene. Our frequent meetings in Oulunkylä typically lasted hours and covered
several aspects going beyond the topic of this study. Many thanks for these
seemingly endless and always deeply inspiring discussions, Jukka!
    Unfortunately, I was not able to talk with Osmo Lindeman or his wife
Sirkka Lindeman. However, I have been fortunate enough to talk with Dr.
Marjaana Lindeman, who even trusted her father’s wonderful archive to the
UHMRL collection. Her help with the research material was invaluable, and
her kind support has been a great inspiration to me as a PhD student. My
warm thanks to you, Marjaana!
    I am deeply indebted to my supervisors Dr. Kai Lassfolk and Dr. Alfonso
Padilla, who have patiently, year after year, supported me, always finding the
time to read and comment on my ever-changing disposition and unfinished
drafts. My friendship with Kai goes way beyond this dissertation, and even
beyond our collaboration in the Kurenniemi research group. Amid all the
arbitrary pressures our organization has repeatedly faced over the years, his
painstaking efforts to fight for the existence of the University Studio has kept
our projects alive. Alfonso was the one who gently forced me to embark on
my PhD journey after a couple of years break following my MA. His remark-
able expertise in many fields of the arts, social sciences and humanities is
astonishing. It has been the uncompromising attitude of both of my supervi-
sors that has opened my eyes to what there is to pursue in science and re-
search.
    For a few years I have been hoping that the best scholars in our field
would review this thesis. Frankly, I never dreamt that my first choices would
accept the job. I was therefore very excited when I heard that both Dr. An-
drew Bentley and Dr. Trevor Pinch were willing and interested in reviewing
my work. Dr. Bentley was an obvious choice given his deep expertise and ex-
perience in electroacoustic music, starting from the early 1970s in York and
later, from the mid-1970s onwards, in the Finnish context: he even has first-
hand experience of Kurenniemi’s instrument.
    It was some time in the mid-2000s that I first came across Analog Days,
a book about the history and impact of an analog synthesizer written by Tre-
vor Pinch and Frank Trocco. A few years later when I started to read sociolo-
gy-based technology studies, I realized that the STS field was to all intents
and purposes founded by the very man who had written the inspiring Analog
Days. Having two pre-examiners with such expertise in all the key themes I



                                        xx

[p. xxi / pdf 21]

cover in my thesis has been a great honor as well as an invaluable help in
terms of improving the quality. My warmest thanks are due to both of them
for their very sharp and insightful comments on my work.
    I could not have been happier when I heard that Dr. Heta Pyrhönen had
accepted the invitation to act as the Custos at the public defense of this dis-
sertation. I was privileged to work for two years as one of the first salaried
PhD Students in the Doctoral Programme in Philosophy, Arts and Society,
which was set up and run by Dr. Pyrhönen. I will never forget the day in mid-
December 2013 when, to my surprise, she rang to tell me that I had been se-
lected for the position. I was also very happy to hear that Dr. Martti Vainio
had agreed to act as the representative appointed by the Faculty of Arts: he
was among the first persons I came to know when I started to work in the
Department of Phonetics Library in Vironkatu in the 1990s. I have very warm
memories of our discussions of music and sound (technology) in those dis-
tant days.
    I could not believe my luck when Dr. Juha Torvinen and Dr. Olli Sotamaa
came to my help during the last weeks before I submitted this study for pre-
examination. Amid his significant workload, Juha was forced suddenly to
take over, he managed to steer this project in the right direction and towards
its completion. Given his extensive experience, Olli managed to convince me
that the manuscript was ready to be submitted. Apart from being distin-
guished scholars in their own fields, and very inspiring as supervisors and
teachers, I am very happy to call them both dear friends.
    Over the years, and now on these final steps of this project, the support
and uncompromising comments offered by my closest childhood friend
Jaakko Tuohiniemi have been extremely valuable. Jaakko has played a signif-
icant role in so many phases of my life, which in itself could fill the pages of a
book. It may well be that this study would not exist if he had not told me
about the open position in the Department of Phonetics library in the mid-
1990s, for example. As a token of his meticulous attention to detail I advise
the reader to take a look at the CiP data on the colophon of this book. Thank
you, Jaakko, for your friendship and for your help at every turn.
    Inspiring support on the last steps of this project came from a somewhat
unexpected direction. The shape that my text has taken during the last couple
of months is due to my wonderful language reviser Joan Nordlund. Her ex-
cellent revisions and comments really helped me to see this thesis from a dif-
ferent angle and to achieve the semantic clarity that was lacking not only in
the text but also in my thinking. My sincere thanks to Joan – your last-
minute support and help are of vast significance.
    I have been very lucky to conduct this project in a very inspiring environ-
ment. My closest context research-wise has been our Kurenniemi research
group, together with Kai, Jari Suominen and Maiju Jouppi. I cannot thank
you enough for our collaboration! You have repeatedly sent me back in the
right direction from my many sidetracks.




                                         xxi

[p. xxii / pdf 22]

    Amid the closest Kurenniemi researcher group I have been fortunate to
collaborate with several distinguished scholars and experts in the field, to
whom I am extremely grateful. Our interest in the usability of Kurenniemi’s
instruments emerged very early on. In order to strengthen our understanding
of user experience and interface issues I contacted my close friend Titti Kallio
and asked for help. Our collaboration led to our first international conference
paper on Kurenniemi’s instruments, which has retained its significance over
many years. Our mutual research interest with Marko Home led us to con-
duct memorable and timely interviews. Marko’s expertise as an art historian
and a researcher, as well as his extensive knowledge of the avant-garde and
experimental art scenes of the 1960s and 1970s have been very inspiring and
helpful.
    Electroacoustic, electronic and experimental music in Finland – Kuren-
niemi’s instruments included – have attracted the interest of many people
over the years. I have been fortunate enough to network and discuss these
issues with several experts in the field, to whom I owe many warm thanks!
Tanja Tiekso, Kalev Tiits, Erkki Rautio, Jukka Mikkola, Jukka Lindfors, Atte
Häkkinen, Petri Kuljuntausta, and Pertti Grönholm have made significant
contributions. Their works and our communication have inspired and facili-
tated my own work. Our efforts with Joasia Krysa and Jussi Parikka led to
the MIT Press anthology – my sincere thanks to both for our very inspiring
collaboration.
    This dissertation would not exist without several excellent archives pre-
serving valuable historical material. The inspiring spirit I felt in every archive
in which I worked during this project was amazing. On many occasions, my
contact with these archives was not restricted to the material, and also in-
cluded enthusiastic discussions about the importance of its preservation.
Your work with fragile and highly valuable cultural historical heritage is in-
valuable – many warm thanks for all your help to Maritta Mellais (The Cen-
tral Art Archives of the Finnish National Gallery), Eva Andberg (the Finnish
Broadcasting Company’s archive), Sinikka Jokinen and Johanna Oksanen
(Lehtikuva archive), Mietta Lennes (The Language Bank of Finland), Pälvi
Laine (Theater Museum Archive), Rauno Rankinen (Oulu Symphony Orches-
tra archive), Jari Eerola (the archive of the Student Union of the University of
Helsinki), Kari Laitinen (Music Finland’s archive), Sofia Vainio (The Amos
Anderson Art Museum archive), and Petri Tuovinen (The National Library of
Finland).
    Endless discussions and collaboration with Esa Lilja and Lasse Lehtonen,
my dearest colleagues in Helsinki-based musicology and close friends even
beyond the research world, have been a great inspiration. Your escape to
Norway and Japan, respectively, has depleted our local culture here in Hel-
sinki. And although we met relatively recently, Aaro Sahari, a distinguished
historian of various fields in technology, from ships to music, could be held
responsible for an amazingly large part of my academic networks – in Hel-
sinki, nationally and even internationally. Our lunch meetings usually stretch



                                        xxii

[p. xxiii / pdf 23]

out for a couple of hours of enthusiastic debate about how to study music,
history and technology. Thanks, Esa, Lasse and Aaro, for the countless dis-
cussions!
    The atmosphere in the Department of Musicology, first in Vironkatu and
then in Topelia, has always been very special and inspiring. Thank you for
creating that warm and welcome environment for students and researchers,
and for all the discussion and comments on my works over the years: Irma
Rinne, Eero Tarasti, Pirkko Moisala, Harri Suilamo, Erja Hannula, Pauli For-
sell, Pauli Laine, Riitta Rainio, Nina Öhman, Elina Seye, Timo Laiho, Riikka
Hiltunen, Hanna Isolammi, Márta Schmidt, and all my fellow students – as
well as Dario Martinelli and Lina Navickaitė-Martinelli, who are sorely
missed after their move to Lithuania. I could not be happier to hear that Su-
sanna Välimäki is making a comeback in the University of Helsinki after
years of absence when she takes up the post of Professor of Art Studies in
December 2020.
    I would also like to thank all those in local and international contexts who
have had an influence on my work by editing my texts or commenting on my
papers in various seminars and conferences. Several editors of Musiikki have
had a significant impact not only on my texts but also on my trains of
thought. Many warm thanks to Juha Ojala, Ari Poutiainen, Milla Tiainen,
Tuire Ranta-Meyer, Laura Wahlfors, and Henri Terho.
    Our local seminars and networks are invaluable as venues in which schol-
ars and students feel welcome to present even sketchy papers without fear of
being rejected. Thank you for creating a very warm atmosphere, commenting
on my unfinished notes and helping me in various ways: Kaarina Kilpiö, Vesa
Kurkela, Olli Heikkinen, Saijaleena Rantanen, Antti-Ville Kärjä, Mieko Kan-
no, John Richardson, Meri Kytö, Heikki Uimonen, Robert Vierling, Anu
Lahtinen, and many others whom I may have neglected to mention.
    In the international context I have been privileged to discuss with and re-
ceive comments from the top scholars in our field – thank you Simon Em-
merson, Leigh Landy, James Andean, James Mooney, Mark Katz, Jonathan
Dunsby, Hans Joackim Braun, and Susan Schmidt-Horning, among many
others, and especially participants in conferences related to electronic music
studies such as EMS and AHEM.
    The University of Helsinki Library has a very special role in my life. I
simply cannot imagine a better place to work. My last five years in Data Sup-
port has had a significant influence even on this study. However, it is not the
organization but the people who make the difference. My warmest thanks for
your compassion and patience, and for our inspiring discussions on RDM
and other research-related issues to; Pälvi Kaiponen, Johanna Lahikainen,
Marja Moisio, Mari Elisa Kuusniemi, Tuija Korhonen, Liisa Siipilehto, Mo-
nica Allardt, Maija Paavolainen, Katri Larmo, Markku Roinila, Juuso Ala-
Kyyny, Tanja Lindholm, Kimmo Koskinen, Mika Holopainen, Jussi Männis-
tö, Kimmo Tuominen, as well as Leena Koivula and Tuula Ruhanen. Many
thanks to my Minerva colleagues as well as my ex-HULib colleagues Susanna



                                       xxiii

[p. xxiv / pdf 24]

Nykyri, Jari Friman and Siiri Fuchs. Very special thanks to Soile Manninen
for your help in resolving obscure legal issues related to the re-use of re-
search material, and to Pekka Manelius for taking care of all the e-publishing
connected with this study.
    From time to time my work with the Kurenniemi project has led me be-
yond the academic context to the world of arts – an inspiring journey that
has taught me a lot about my research subject. I have been privileged to work
and perform with distinguished artists and musicians, including Mikko
Turunen, Tanja Tiekso, Tommi Keränen, Carl Michael von Hausswolff, Mika
Vainio and Ilpo Väisänen from Pan sonic; Topi Tateishi, Ilona Jäntti, Johan
Svensson, Halldór Úlfarsson, Aku Raski, Tarek Atoui and DIMIs Re-
connected; and the DIMITrio as well as Sami Klemola and the Defunensem-
ble. Thank you so much for these wonderful adventures in experimental mu-
sic. I am deeply grateful to Mika Taanila for the various events and projects
in which he has invited me to collaborate. My sincere thanks, Mika!
    On many occasions the venue for these performances and concerts were
provided by the Museum of Contemporary Art Kiasma and Kiasma Theater,
where I always feel as if I am coming home. Many warm thanks to Sanni Pa-
jula, Mari Kujala, Jonna Strandberg, Joonas Pehrsson, Kati Kivinen, Esa Nii-
niranta and Leevi Haapala, as well as Perttu Rastas for his enormous contri-
bution to preserving Kurenniemi’s legacy and his help with several issues
with the research material.
    The support and compassion from friends and relatives over the years has
been heart-warming. Many warm thanks to Outi and Sami Paldanius, my
dear goddaughter Emilia Paldanius, Jenni Hokka, Jari and Minna Hildén,
Jani Tihinen and Salla Heino, Tomi and Mirva Kokko, Henri Penttinen,
Juhana Lahtinen, Marjatta Ruotsalainen, Nina Sarvana and Esko Salmela, as
well as my dearest Tonde People, who annually witness and empathize with
my highs and lows at our convention.
    These sorts of projects take the biggest toll on those who are the closest –
but let us hope that they are, at least to some extent, also rewarding. I have
no words to describe my gratitude to Maija and Raimo Ojanen for their im-
mense support at every turn throughout this project and beyond. Thanks,
too, to my brother Aleksi Ojanen for dragging me out of my dungeon from
time to time.
    Anne – I really do not know from where you have found the strength to
bear with me, and this project for ten years. It is perhaps not fair to remind
you that you suggested I start it – but I am glad that you did. I realize that I
should have ended it much sooner. My deepest gratitude to you for your lov-
ing support and invaluable help. Thank you for being there.


                                    *********




                                       xxiv

[p. xxv / pdf 25]

   I received funding for this project for 45 months as follows: the statutory
Adult education allowance from the Employment fund from August 2010 to
December 2011 and for November 2012; a two-year salaried PhD student
position at the University of Helsinki, Doctoral Programme in Philosophy,
Arts and Society (2014–2015); and a three-month University of Helsinki PhD
finalizing grant from December 2018 to February 2019.
   University of Helsinki travel grants have enabled me to present my work
to the international research community in the IMS12, EMS12, EMS14,
ARP14, AHEM16, ICOHTEC18, SISC20 and EMS21 conferences. I also re-
ceived research material funding from the The Doctoral Programme in Phi-
losophy, Arts and Society, and from the Student Union of the University of
Helsinki. My sincere thanks for this financial support, without which I would
not have been able to realize my project.




                                      xxv

[p. xxvi / pdf 26]

Seelalle ja Paavolle – ja niille aivan käsittämättömille ihmettelyn ja
 oivaltamisen prosesseille, joihin vain pienen lapsen mieli kykenee.
              Olen oppinut teiltä uskomattoman paljon.




             Lehtosen Masalle – ihan vain piruuttani.




                                xxvi

[p. 1 / pdf 27]

1 INTRODUCTION

1.1 The objective of the study and the research task
Erkki Kurenniemi (1941–2017), one of the pioneers of electroacoustic1 music
in Finland, started designing electronic musical instruments and studio de-
vices in the early 1960s. He built and maintained the University of Helsinki
Electronic Music Studio – the first permanent electronic music studio facility
in Finland. In addition to designing instruments, he produced both stan-
dalone tape music works and electronic music and sound design for various
purposes including films and documentaries, radio and theater plays, and
exhibitions. In 1970 Kurenniemi founded Digelius Electronics Finland, toge-
ther with Jouko Kottila and Peter Frisk, to further develop his instrument
design. This rapidly growing enterprise focused on large-scale industrial
technology and the design of musical instruments assumed a minor role. Af-
ter a short and eventful period, Kurenniemi declared Digelius Electronics
Finland bankrupt in 1976. This also marked the end of his intensive instru-
ment-design projects, but not of his involvement in the Finnish art scene or
in industrial technology design.
    At the time when technology dedicated to electronic music production
was practically nonexistent and the building of studio facilities required
specialized resources, Kurenniemi’s designs enabled the work of several
composers and artists in Finland and Sweden to be realized – also in various
experimental art genres beyond the field of music. Kurenniemi was designing
his instruments at the same time as Robert Moog, Donald Buchla, and Peter
Zinovieff, pioneers in the design of the synthesizer, and experimental ins-
trument builders Hugh Le Caine and Hugh Davies were active. This was
when what is recognized nowadays as a plethora of sub-genres of electroa-
coustic music was in its infancy, and when such music was heard for the first
time in Finland.
    The forthcoming instrument of the future was widely anticipated during
the 1960s. The decade was one of intensive interplay between technological
idealism and realism, in other words between utopian visions and their
simple and sometimes modest implementation on a concrete, grassroots le-

   1 At times, I use the terms electronic and electroacoustic music interchangeably. It is worth noting

   that the term electroacoustic music was used in Finland only from the 1970s onwards. Moreover,
   the history and aesthetics of electronic music is intertwined with intangible concepts such as ex-
   perimental, avant-garde and underground culture. For a more detailed discussion about the defi-
   nitions of these terms and how I use these concepts within this work, see Chapter 2.

[p. 2 / pdf 28]

Introduction



vel. Great expectations were laid upon technological development. The new
and envisioned technology provided new opportunities, which motivated de-
signers and artists to reach for novel solutions. Designers of electronic ins-
truments tried – at least to some extent – to break free from traditional user
interfaces and musical expression, even though the designs were also tied to
the tradition, especially when assessed and received. From the perspective of
historical research the period gives significant insights into the ruptures in
technological developments in music, and reveals details that would other-
wise be hidden. My main research focus in this study is on the use of Kuren-
niemi’s instruments, which offers one view of this rupture. User stories of
Erkki Kurenniemi’s electronic musical instruments also complements pre-
vious descriptions of electroacoustic music in Finland, and to some extent in
Sweden, during the 1960s and 1970s. First, I will contextualize the title of the
study.


1.1.1   Contextualizing the study
Outlining user stories is a systematic method in the assessment of modern
agile software development. The stories are based on informal but structured
natural language phrases. The term is also loosely associated with the
research on technological artifact design, which is of relevance here. Previous
research projects have neglected the composers and artists who used Kuren-
niemi’s instruments. I focus on the users, hence the phrase – user stories –
aptly emphasizes my point of view. Even though such stories would consti-
tute an effective formal method as such, I only borrow the phrase for the title
of my study and do not systematically employ them as a methodological tool.
    Erkki Kurenniemi has an indisputable key role in this study. I retain his
name in the title, even though his work serves as a point of departure for wi-
der investigation. Research setups focusing on one person have been cri-
ticized for overshadowing other actors in the field, and such a critique is valid
here. Previous research and documentary projects have presented different
actors in the field of electronic music as separate subjects and have thus –
sometimes accidentally – concentrated on telling the tales of “great men”. On
the other hand, the critique is not fully justified in this case. Kurenniemi’s
contemporaries repeatedly report, one after the other, how exceptional he
was, and put him above or in front of others. Moreover, generation upon ge-
neration find, study and appreciate Kurenniemi’s work – even though inte-
rest has repeatedly faded and has been re-activated. The adoption of Kuren-
niemi as an idol by the gradually emerging Do-It-Yourself (DIY) community
during the past 20 years, first in Finland and later internationally, is an ex-
cellent example of phased development. Moreover, Kurenniemi is a micro-
historical typical exception par excellence: on the local level he was an excep-
tional figure and from the global perspective he was a typical example of the
(techno) visionary artist of the 1960s and 1970s.




                                         2

[p. 3 / pdf 29]

    Kurenniemi has frequently been described in the media as an unsung
pioneer. He is no longer an unsung pioneer, and now we have a new group of
forgotten heroes. Taking a critical approach towards previous descriptions of
Kurenniemi’s work, I give him the credit he deserves and acknowledge the
contributions of others who were once close to him and are now shadowed by
research that concentrates solely on his work. I analyze his instrument design
in its social context and refuse to depict him as an isolated visionary genius.
Thus, this study is not solely about Kurenniemi. His work serves as a lens
through which to observe the cultural and historical state of electroacoustic
music in the Nordic countries in the 1960s and 1970s.
    The phrase electronic musical instruments, used in the title, indicates
that my point of departure is technology. I acknowledge that the starting
points of a study strongly direct the analysis and interpretation. My choice of
Kurenniemi and technology as the points of departure will produce a diffe-
rent description of the development of electroacoustic music in Finland than
if I had chosen to start from another angle. I am sensitive to this issue and
elaborate its effects in the conclusions. Lastly, I decided to use the phrase
“musical instruments” rather than “music instruments” to emphasize playa-
bility and the creative aspect.
    The subject of my study has already been addressed by several resear-
chers. I elaborate on and contextualize the theme more thoroughly than
others have done, however. The significant new information discovered in
the historical documents enriches and revises previous descriptions. Com-
plementing these new historical findings, recent interviews conducted with
the actors who were active during the time frame of this study help to shed
light on hitherto shadowy details. The new information and interpretations
challenge previous accounts of the history and development of electroacous-
tic music in Finland. Yet, at the same time I acknowledge that history writing
is a construction of the present-day writer and that understanding of the past
is relative.
    In 2016, at the Alternative Histories of Electronic Music conference, I was
asked what there was in Kurenniemi’s work that would help to portray elec-
troacoustic music from a new angle. Was there something that could be gene-
ralized? To give wider relevancy to my study, I also set a theoretical target.
My attitude towards theory is close to that of Katz (2012, 8–9), whose ethno-
graphy- and history-driven studies leave ample space for the stories and fo-
cus on the “social, cultural and historical contexts” in which his research sub-
jects lived, and events occurred: concepts and theories only lurk in the back-
ground. However, it is necessary to review existing theoretical and methodo-
logical literature in some detail to anchor this study in previous academic
discussion. Therefore, I dedicate two chapters to the key concepts and theo-
ries (see Chapter 2) and my methodological toolbox (see Chapter 3).
    Moreover, beyond the temporal and geographical frames that constitute
the local level (see the framing of the study in Chapter 1.1.2), the works of
Kurenniemi and his Nordic collaborators provide sufficient material for an



                                         3

[p. 4 / pdf 30]

Introduction



overarching analysis of interaction between music and technology – which is
sensitive to the historical contextualization. Within this wider scope, I des-
cribe Kurenniemi’s designs and art as a technology-driven process, exem-
plifying an artist who works in close – and often real-time – interaction with
the production technology. In extreme cases, the role of technology is
strongly emphasized and may even be the main factor in the production pro-
cess. In my analyses of both Kurenniemi’s own and his collaborators’ user
stories I reveal the contrast between the world of engineering and the world
of artistic activity. Summarizing the previous literature and my own study, I
conclude that Kurenniemi’s computer-metaphor-driven instrument design
strongly directed the building, marketing, selling and use of his instruments,
and that this kind of technology-driven music production diversifies the tra-
ditional concept of a work of art and its valuation.


1.1.2   The key concepts and the research questions
This study belongs to the research domain of music technology, and the sci-
entific stance is interdisciplinary. Many of the concepts I employ could be
defined and understood in several ways. I anchor them in previous literature
or re-define them in the context of this study. I employ concepts from differ-
ent areas that have explanatory power over the subject of this study. Heeding
the warning given by Bijker & Pinch (2012, xviii), I avoid conceptual chaos
and explicitly define terms in cases of conflict. Many of the terms I use here
are operative background concepts, and in many cases I do not necessarily
apply the whole theoretical package that comes with a single concept.
    The methodological toolbox of the study emphasizes qualitative research.
My key methodological concept is that of pertinences, initially deployed by
François Delalande (1998) in the context of electroacoustic music analysis.
Pertinences are features of a musical work that are considered relevant by the
analyst and lead to the analysis. I see a significant resemblance between per-
tinences – as described by Delalande – and both the collection of qualitative
observation data and archival research in history and technology studies. De-
spite my emphasis on the qualitative approach, I do not prioritize qualitative
over quantitative methods: on the contrary, quantitative methods would be
very beneficial to the analysis. I nevertheless leave quantitative approaches
for forthcoming projects. Their implementation would have required a dif-
ferent research design from the very beginning of the project.
    Here, I take my methodological cue from Pinch & Trocco (2002a) and fol-
low the instruments to where they were used – in the hands of their users.
We described this task as one of the further research suggestions in our first
article on Erkki Kurenniemi’s instruments, published in 2005 (written jointly
with Jari Suominen, see Ojanen & Suominen 2005).
    Within the main task, the three key themes of the study are music history
(the historical and cultural context in the Nordic countries in the 1960s and
1970s), music technology (the design and use of electronic musical instru-



                                       4

[p. 5 / pdf 31]

ments), and electroacoustic music (aesthetics and musical analysis). These
helped me to frame the more specific perspectives – both conceptual and re-
lated to the research questions. Even though different disciplines speak dif-
ferent languages, I see much in common with history, technology and music
studies. Similar terminology serves to describe many features of both techno-
logical artifacts and musical works. For example, the treating of innovation
success or failure in technology studies strongly resembles the criticism pre-
sented in the various history-from-below approaches of modern historiog-
raphy, or critical attitudes to canonization in music (history) studies. All of
these emphasize an analytical turn to marginal and less-closely-examined
phenomena.
    One effective way of achieving a thorough understanding of a subject is to
approach it from various points of view and with different methods. Thus, I
employ conceptual, methodological and theoretical triangulation, as de-
scribed by Denzin (1970a, 297–313; see also Rothbauer 2008). Composer
and researcher Leigh Landy made a plea for triangulation in the study con-
text of electroacoustic music in the late 1990s. He was concerned that sound-
based music was not being studied by researchers interested in note-based
music, in other words that traditional musicological tools were not being
used to study electroacoustic music. Landy also suggested that even the in-
clusion of other research branches might be potentially beneficial. (Landy
1999, 68) The plea for triangulation reflects the concept of the seamless web,
which is used especially in Science and Technology Studies (STS) to empha-
size the fact that a priori categorization directs the interpretation of phenom-
ena. Thus, technical, social, political, and economic categories should be con-
sidered together as a “fabric which has no seams”. (Hughes 1986, 284–287)
    From the historical perspective, I ask what happened. Even though a lot
of work2 has been done to describe the electroacoustic music scene in Fin-
land in the 1960s and 1970s, there is still a need for basic research on the lo-
cal level, in other words the scene in Finland. Previous research has focused
on Kurenniemi’s instruments3 as physical artifacts, and on his design process
in general. It is known what instruments he built, where they are and how
they work but little has been written about how they were used. Events,
works of art, actors, and instruments that have been identified thus far have
been considered on a general or popularized level, and only rarely more
thoroughly than as a brief mention in biographies of composers and artists,
or in retrospective reviews of the electroacoustic music of the 1960s and
1970s. There are still works of art and their authors to be discovered, there

   2 See the literature review in Chapter 1.3.

   3 Most of the instruments are owned by and located in the University of Helsinki Music Research

   Laboratory and Electronic Music Studio (UHMRL), where they can be played and studied. I pre-
   sent Kurenniemi’s instruments in Chapter 6. The presentation is concise, and it is based on my
   previous research projects in collaboration with Jari Suominen and Kai Lassfolk. For detailed and
   updated information about the instruments, the reader is advised to visit Kurenniemi’s instru-
   ments online website at http://ekis.helsinki.fi.




                                                   5

[p. 6 / pdf 32]

Introduction



are still loopholes in timelines and events to be described. My aim in this
study is to fill some of the gaps in the historical timeline and to describe the
previously unknown works and composers I discover.
    When I first considered this subject, I assumed that it would be possible
to employ a ready-made historiographical method. During the past 15 years,
for example, many Finnish writers on music history have used microhistory
as a theoretical and methodological toolbox in their projects. A closer reading
of historiographical texts, however, revealed that there was no overarching
method that I could adopt. On the contrary, the historian constructs new in-
terpretations in a close interactive process in which the researcher, the sub-
ject, and the previous theoretical background intertwine in a unique way.
    I subscribe to the view of history writing based on what we know and do
not know about the past, and draw conclusions following a critical assess-
ment of that knowledge – rather than arguing for or against how things really
were in the past. The key historiographical concept I refer to is that of unre-
solving tension introduced by historian Allan Megill (2007, 1–3), which em-
phasizes the relativeness of current understanding of the past. A historian’s
task is to bring to light the problems and loopholes rather than writing them
out of the narrative. Megill’s guidelines are detectable in the work of several
other history writers – especially microhistorians Carlo Ginzburg and Gio-
vanni Levi.
    Amidst the unresolving tension I employ concepts and methodological
tools from the field of history writing such as the typical exception and the
scale of observation outlined by Ginzburg (1993; 2012) and Levi (1991;
2012). Even though microhistory has been widely used “as such”, Ginzburg’s
and Levi’s texts reveal that it is not a unifying principle per se, but an umbrel-
la term loosely pulling several research streams together. Indeed, it is some-
times hard to distinguish it from other trends in new history writing (Pel-
tonen 2002). It would be tempting to label this project a microhistorical
study but, given that I do not systematically or exclusively use microhistorical
tools, it would be misleading. From the historical perspective it is about mu-
sic and cultural history, and the history of technology. Thus, I refer to a
broader collection of historiographical approaches rather than one theoreti-
cal frame. I review these concepts more closely in Chapter 2.1.
    From the technological perspective, I ask if the composers and artists en-
gaged with Kurenniemi’s designs and if they contributed to his design pro-
cess. I also ask whether the users 1) accepted his instruments as intended, 2)
accepted them with modifications or 3) rejected them altogether. I also as-
sess the development of his design process and employ tools from recent dig-
ital musical instrument (DMI) research. My interest also extends to the soci-
otechnical change that Kurenniemi’s case exemplifies. One of the reasons
why most of his instruments remained in a prototypical state, for instance,
was because few people used them. User experiences did not circulate back
into the design process, as they did in the development of the electric guitar
and the analog synthesizer.



                                          6

[p. 7 / pdf 33]

    Even though Kurenniemi realized most of his instruments single-
handedly, his design process was directed by the relevant social groups in
the avant-garde art scenes in Finland and Sweden. At the time, the process of
designing electronic musical instruments – to be recognized later mainly as
synthesizers – was affected by interpretative flexibility. In other words, elec-
tronic musical instruments did not have one stable meaning or purpose, as
the different social groups close to Kurenniemi had their own hopes and
needs concerning the new tools. It was only later in the 1970s that the inter-
nal structure and user interface of these new musical tools standardized and
stabilized, and the synthesizer became recognized as a keyboard instrument.
    Kurenniemi’s instrument design was driven by computer-technology-
related concepts such as automation and programmability, which also
strongly directed the use of the instruments. There were several, even com-
peting, definitions of the computer in the 1960s, but to argue for or against
any one of them is irrelevant here. To elaborate on this, I introduce the
phrase computer-metaphor-driven processes. The computer metaphor re-
fers to all the hopes, wishes, expectations, anticipations, and sometimes even
fears that Kurenniemi and his contemporaries entertained about the new
technology, as opposed to giving a static unequivocal definition.
    The concepts of success and failure are often discussed in connection with
Kurenniemi’s work. He was a successful tinkerer, but he failed as an instru-
ment marketer. His instruments were not identified as musical instruments
such as home organs, pianos or electric guitars, nor were they identified as
music-specific computers, which rendered them in between worlds. To some
extent this led to the failed marketing and branding and – even further – to
the nonexistent distribution.
    Kurenniemi’s work exemplifies the audio hardware hackerism practices
described in the local Do-It-Yourself context. Reflected against modern DIY
hack-labs, his work had many similarities with current practices – but also
differences. As instrument designer and composer Nicolas Collins (2006, 7)
points out, many current hack-lab designs are short-lived – not only by acci-
dent, but also in line with their primary purpose. As well as designing one-off
case-specific instruments, Kurenniemi also aimed at the mass production of
commercial instruments. Case-specific design was a minor concern in his
design process, even though most of his instruments were one-off. The com-
pany he founded to produce them, Digelius Electronics Finland (1970–1976),
could not turn the instrument-design process into a commercial success, or
even start mass production.
    Here, the Kurenniemi case exemplifies how the point of departure of an
analysis significantly directs interpretations of the phenomenon. There is a
difference between seeing the instrument-design process analyzed here as
commercially driven or as based on DIY practices. To clarify interpretational
contradictions such as these, and as an outcome of my study, I outline a
framework and categorization that could be useful to scholars doing histori-
cally sensitive research on music technology – especially when making as-



                                         7

[p. 8 / pdf 34]

Introduction



sessments such as those related to the questions of success and failure. Here,
I return to the STS approach and employ the symmetry principle, according
to which the failure and success of an innovation should be explained using
the same terminology. The working or non-working of an instrument is not
among its intrinsic features, but is an outcome of the implementation pro-
cess: it is something that needs to be explained, not something that explains
the success or failure of the design (see Chapter 2.2).
    Closely related to concepts from Science and Technology Studies (STS) is
the concept boundary shifter, devised by Pinch & Trocco (2002a; see also
Pinch 2009, 190), which they use to describe Robert Moog’s ability to move
between the worlds of art and engineering and to bring about a transfor-
mation in both worlds. This is where Kurenniemi differs from the users of his
instruments. Not unlike Moog, but in contrast to his local contemporaries, he
was able to cross the boundaries between art, science, and technology. I re-
view the other STS concepts I employ in this study in more detail in Chapter
2.2.
    From the perspective of music analysis, I ask what the musical works
completed with Kurenniemi’s instruments reveal about the technology used
in their realization. Here, I avoid falling into technological reductionism and
consider the use of his instruments in complex interaction among users,
technological artifacts, and the tradition of music aesthetics that the works
realized with his instruments reflected. Aside from the historical and techno-
logical aspects, Kurenniemi’s instrument designs, music and media art ex-
emplify how sociotechnical change is reflected in aesthetics. The various mu-
sical expressions and styles he and his colleagues combined in their work
even brought art and popular music closer together. For a period during the
early days electronic media was beyond the immediate value judgement of
high art and popular cultures. The synthesizer of the late 1960s that was in-
tended to compete with traditional instruments was commonly rejected by
classical music enthusiasts, for example. Nevertheless, even though the re-
ception of electronic music composer Wendy Carlos’s synthesizer arrange-
ments of Johann Sebastian Bach’s works on the album Switched-on Bach
was hostile, the album sold millions of copies.
    It is also true that various traditional instruments have been played to re-
flect any musical style. It would seem, therefore, that value judgements are
not associated with the instrument per se, but are dependent on the way it
used, and on the context in which it is played. Both classically trained com-
posers and artists working in the production of popular music have been
equally attracted to electronic sound production and processing. These com-
posers and artists differed in the way they used Kurenniemi’s instruments
and in the role they were willing to give the technology in their workflows.
    To focus my analytical perspective and elaborate on the impact of the new
technological artifacts on the definition of a musical work, I adopt the tripar-
tition model developed by Jean Molino and Jean-Jacques Nattiez. Even
though I do not use Nattiez’s semiological tools, I find the distinction of the



                                        8

[p. 9 / pdf 35]

poietic and esthesic processes, and of the musical work per se a useful point
of departure from which to map the details of the analysis. Concentration on
the poietic process of the composer, or on the reception or receiving process
of the audience/listener, or on the work on the level of its material reality,
leads to different interpretations.
    As Emmerson & Landy (2016, 22) acknowledge, a musical work in a tech-
nology-oriented genre loses at least some of its pivotal meaning if analyzed
only in terms of its reception, in other words if the poietic leakage is not con-
sidered. To emphasize the concept of technology-driven music production I
develop the tripartition further, describing the poietic ecosystems of compos-
ers using Kurenniemi’s instruments. The poietic ecosystem comprises not
only the composer’s poietic process but also the technological artifacts and
his or her complex relationship with these tools.
    Here, distinguishing between a musical work and music plays a crucial
role. Kurenniemi is an example of an artist whose output challenged the tra-
ditional meaning of music considered a work of art. In line with philosopher
Lydia Goehr’s (2007) division into music and musical works, I argue that
Kurenniemi did not compose musical works, but rather produced music. In
this respect, his visions of the future music machine are in line with the de-
velopment of so-called background music, or muzak, and music used as
soundscapes in on-demand situations (see Hamilton 2007, 54).


1.1.3   The framing of the study
This study is rooted in the period when Kurenniemi designed his instruments
and when they were actively used in Finland. My observations date from the
foundation of the University of Helsinki Electronic Music Studio in 1961. The
studio did not have an official name at first, and was variously known as the
University Studio, the Sound Technical Laboratory, Kurenniemi’s studio, and
the Electronic Music Studio at the University of Helsinki, among other
things. Today the studio is called The University of Helsinki Music Research
Laboratory (UHMRL), but in this study I refer to the University Studio (see
also Chapter 5.1).
   There is no exact date when Kurenniemi’s instruments fell out of use – it
happened gradually. Usage in Finland declined over about 20 years, from the
turn of the 1980s to the early 2000s. In Sweden, however, composer Ralph
Lundsten (b. 1936), who purchased several of the instruments, used them
continuously in his Andromeda Studio. He dismantled the studio in 2014 and
donated the instruments and the equipment – apart from the video-camera-
controlled synthesizer DIMI-O (1971) – to the Musikmuseet4 in Stockholm.
The Finnish State Art Commission purchased the DIMI-O from Lundsten in
2014 and placed it in the University Studio in Helsinki.

   4 The current name of the organization is Scenknostmuseet, teater, musik, dans, kultur (the Swe-

   dish Museum of Performing Arts); see https://scenkonstmuseet.se/.




                                                   9

[p. 10 / pdf 36]

Introduction



    I end my observation in the year 1978, two years after Digelius Electronics
Finland went bankrupt and Kurenniemi moved from Helsinki to work on
industrial robotics at the Rosenlew Company in Pori. Specifically, on August
21, 1978, Kurenniemi once more returned to the topic in the electronic music
seminar organized by UNESCO, at which he presented a retrospective of his
instruments. The seminar was recorded, and the 90-minute sound recording
was archived in the UHMRL sound archive.
    Even though the resurgence of Kurenniemi’s instruments from 2002 pro-
vides interesting research material for comparative analyses of the soci-
otechnical change, comparison of the past and the present is not in the scope
of this study and is left for forthcoming projects. I acknowledge that my expe-
rience both as a performer on Kurenniemi’s instruments and as a member of
research projects in collaboration with Jari Suominen and Kai Lassfolk dur-
ing the 2000s has influenced my interpretation of their historical context.
During our performances and research projects we discovered new ways of
using the instruments and new sonic expressions, which do not feature in the
contemporary historical source material. Here, I am sensitive to hindsight
and consider that I know more than Kurenniemi’s contemporaries knew, or
could have known, in the 1960s and 1970s about how the story continued.
    Geographically I concentrate on events in Helsinki and Stockholm. Apart
from a few exceptions – such as the sounds from Kurenniemi’s first music
machine (1964) that were broadcast on Radio Andorra in 1965, and the An-
dromatic synthesizer-sequencer (1968) that toured in the New York exhibi-
tion in 1969 – most appearances of Kurenniemi’s instruments were in Fin-
land and Sweden. I prefer the phrase “electroacoustic music in Finland” ra-
ther than “the Finnish electroacoustic music” and avoid making statements
on exactly what Finnish electroacoustic music is. Musical genres and trends
rarely follow nationalities or state borders. Electroacoustic music in Finland,
at least in the early phase, was strongly influenced by happenings and per-
formances by Ken Dewey (1934–1972), Terry Riley (b. 1935), and John Cage
(1912–1992), and ideas presented in Internationalen Ferienkursen für Neue
Musik in Darmstadt, for example. Moreover, Kurenniemi actively collaborat-
ed with Swedish artists such as Jan Bark (1934–2012), Folke Rabe (1935–
2017), Ralph Lundsten, and Leo Nilsson (b. 1939). As I note in this study, the
original ideas directing Kurenniemi’s designs can be traced to contemporary
publications and seminars, and his connections. The initial design ideas for
the University Studio, for example, strongly resemble those for Elektronmus-
ikstudion (EMS) in Stockholm, which were coordinated by Knut Wiggen
(1927–2016) and Karl-Birger Blomdahl (1916–1968). Kurenniemi met Wig-
gen as early as in 1963.
    Questions of nationalism should not be dismissed, however, and closer
consideration of them should be given in further studies. When he was as-
sessing thirty-year-old events in 2002, Kurenniemi considered the challeng-
ing geographical location one of the possible reasons for the poor commercial
success of his instruments. In his view, their origins in Finland “almost be-



                                       10

[p. 11 / pdf 37]

hind the iron curtain” may have been one reason why potential customers
failed to buy the DIMI synths (see Taanila 2002). Furthermore, given that
Kurenniemi and his collaborators chose to include Finland in the name of
their company Digelius Electronics Finland, and that the word Digelius is a
combination of the word digital and the name of the Finnish National Com-
poser Jean Sibelius,5 more detailed study on the national aspects of Kuren-
niemi, Digelius and Finnish electronic musical instrument design might
prove fruitful.


1.2 Research material and data
The primary objects of this study are Kurenniemi’s electronic musical in-
struments and works of art, and events associated with his designs. 6 The
works and events associated with the University of Helsinki Electronic Music
Studio are also of interest, because I consider the studio to have been Kuren-
niemi’s first instrument-design project. In the following I first introduce the
material and data collected for this study, and then the material and data
produced during the course of it. Lastly, I review the ethical issues concern-
ing the archiving and opening of the material and data reused and produced
within the study.


1.2.1   Research material and data collected for the study
According to the modern historiographical paradigm, historians accept di-
verse types of fragmented series of documents as source material. 7 Among
published contemporary historical accounts, this study is largely based on
non-catalogued, unorganized, fragmented documents and physical artifacts
of various kinds. A certain unfinishedness, which is a distinctive feature of
the source material, challenges the research and leaves a good deal of room
for interpretation. For example, markings on the tape reels are sparse, the
musical instruments lack a user manual and the technical specifications are
defective, and most of the archive material is undocumented (on Kurennie-
mi’s unfinishedness see Taanila 2002). One laborious sidetrack in the study
was to ensure the preservation of this unique material by documenting and
archiving it (see Chapter 1.2.3).
   A typical feature of historical, qualitative and material-driven research is
that new material appears during the project and even afterwards. I ack-

   5 Kottila (2014) in an interview with Ojanen and Suominen.

   6 The primary objects are presented in separately published tables, see Analyses of the works of

   art and events related to Erkki Kurenniemi's Electronic Musical Instruments (EKIS), see:
   https://doi.org/10.5281/zenodo.2092577 and The user interface and functionality charts of Erkki
   Kurenniemi's Electronic Musical Instruments (EKIS), see:
   https://doi.org/10.5281/zenodo.3596466
   7 For a more detailed discussion of history writing, see Chapter 2.1.




                                                  11

[p. 12 / pdf 38]

Introduction



nowledge that discovering and recognizing as many events and works of art
as possible is an important part of history writing and basic research, but I do
not intend to describe and analyze every work ever made with Kurenniemi’s
instruments. Given my analytical standpoint, the material collection is satu-
rated. Credible conclusions can be drawn from what I present here. However,
I anticipate and welcome future discoveries, which will eventually enhance
my interpretation. To keep this study dynamic even after I have published it,
I will make the documentation of the material and the data collection openly
available in the Zenodo online data archive, where I can update and revise it
(see Chapter 1.2.3).
    The key primary material comprises the works realized with Kurenniemi’s
instruments. I categorize the composers and artists as users with first-hand
experience with the instruments, and occasional users who used one instru-
ment very briefly, or were in in-direct contact with one (see Chapter 7). Wi-
thin this study, I only concentrate on those who were in closer contact with
the instruments. I therefore leave the examination of several users and their
works for a future project, but I acknowledge these gaps in the current mate-
rial (see Pinch & Trocco 2002a, 11).
    First, Kurenniemi’s instruments had more users than I can present here.
There are still potential research participants I was not able to interview for
this study. I could not approach everyone, some of those I did approach did
not answer my call, and some of the interviewees could not recall the past.
Very sadly, a few of them passed away during the project and our collabora-
tion came to a premature halt. Second, those who tried out Kurenniemi’s in-
struments but for some reason chose not to use them comprise another
group of silent voices. Here, I can only scratch the surface of research on
non-users of Kurenniemi’s electronic musical instruments, which would be a
very interesting line to follow to complete the picture. Third, the skewed gen-
der balance in the research material reveals another significant group of si-
lent voices. The almost total lack of women in the sources requires further
elaboration, which is beyond the scope of this study.
    Alongside Kurenniemi’s instruments, their documentation, and the sound
recordings and works of art associated with them, my primary source materi-
al includes rich collections of archival material. The key archives maintained
by responsible organizations I employ within this study are the University of
Helsinki Music Research Laboratory and Electronic Music Studio (UHMRL),
the Erkki Kurenniemi archive in the Finnish National Gallery (FNG/EKA),
The Finnish Broadcasting Company’s (Yle) archive, Lehtikuva’s archive,8 as
well as the archives of the Amos Anderson Art Museum, Ylioppilasteatteri
(Engl. Helsinki Student Theater),9 The University of Helsinki Student Union,


   8 Finland's leading picture agency, owned by the country’s largest news companies, see

   http://kuvakauppa.lehtikuva.fi/edoris?tem=www_e.
   9 See https://ylioppilasteatteri.fi/in-english/




                                                     12

[p. 13 / pdf 39]

The Finnish Museum of Theater, the National Archive, and the National Li-
brary of Finland.
    The UHMRL archive consists of handwritten documentation about most
of Kurenniemi’s instruments, as well as the sound-recording archive with
approximately 350 reel-to-reel tapes. The tapes related to his instruments,
which I have digitized, restored and analyzed to some extent during this
study, comprise approximately 20–30 percent of the archive (see also Chap-
ter 1.2.2 below). In addition to their role as primary source material for the
analysis of the musical works, the audio recordings also have documentary
historical value. Aside from the sound on the recordings, the tape reels and
their containers also provide valuable information.
    Other highly useful material for cross-referencing in the University Studio
archive collection includes Kurenniemi’s daily planners (1968–1975), the in-
ventory catalog of studio equipment (1958–1974), purchase documents for
components and equipment, funding and allowance applications, annual re-
ports, and a handwritten sound archive catalog (initiated by Kurenniemi in
1972). These documents contain information about the dates and details re-
lated to the instruments, works of art, and events. However, they are frag-
mented, and they should be approached with a critical eye. The annual re-
ports of the University of Helsinki, for example, are published under the
name of the current Rector at the time of publication. The real author is typi-
cally unknown, and people not necessarily involved in the activities collected
the information from the department in question weeks or months after-
wards. Details cannot be verified in many cases, and the exact time of writing
is not necessarily known. Despite the challenges, however, the documents
reveal helpful information and point out more convincing sources.
    In addition to his instruments and music, Kurenniemi’s body of work in-
cludes a vast amount of archival material consisting of experimental and
avant-garde films, photography, paintings, media art, letters and corre-
spondence, brochures and promotional texts for concerts and events, Kuren-
niemi’s Erikoistietojen kortisto (Engl. catalog of special information), as well
as writings on music, technology, media culture and future developments
from various points of view. His exceptionally rich private archive is deposit-
ed in the Finnish National Gallery, where it is at the disposal of researchers.
Given the variety of themes in the collection, research questions should ad-
dress several different disciplines. The collection could equally attract eth-
nographers, art historians, sociologists, and technology researchers to name
a few. Fortunately, interdisciplinary approaches have already briefly coincid-
ed in two book releases (see Mellais 2013; Krysa & Parikka 2015).
    Kurenniemi constantly archived his life with non-stop note-making, pho-
tographing and recording. This activity produced an extensive collection of
diaries in various formats – such as handwritten notebooks and hours of au-
dio and video recordings. One unique source that is of relevance here is his
collection of taped audio diaries (1970–1975), which consists of over 100
hours of his talk – usually when driving alone in a car. For example, when



                                        13

[p. 14 / pdf 40]

Introduction



driving from Helsinki to Tampere on Sunday October 8, 1972, Kurenniemi
describes his whereabouts and surroundings at a given moment, and he
reads the register plates of other cars aloud. Most interestingly, he reminisces
on what he did recently, where he is coming from, where he is going to, and
why. This extraordinary collection of living historical source material has vast
research potential.
    Contemporary photographs taken by Kurenniemi and others are relevant
evidence but only if the dates, contents and other details are verified, such as
if the people and the objects in them are recognized. Despite their powerful
role as sources in history writing, for several reasons they should be ap-
proached as critically as other sources. According to Gaskell (2001, 210),
“photographs are subject to many forms of manipulation” and “different cap-
tions for the same photograph often produce radically different or even con-
tradictory meanings.” This similarly applies to videos and audio recordings:
even if the details are easier to verify, they can be precisely analyzed only if
their content is recognized. Both Kurenniemi’s photographs in the FNG ar-
chive and the Lehtikuva archive were major resources for this study.
    The archive material both in official archives and in private collections al-
so includes contemporary interviews, which are significant especially con-
cerning informants who died decades ago. A couple of interviews with com-
poser Osmo Lindeman (1929–1987) from the 1970s that survive in his pri-
vate collection are invaluable, for example. Valuable documents exist outside
of the official archives and responsible organizations. The unpublished sets
of material to be found in the private collections of research participants and
other researchers are unique and fragile. Research participants are typically
eager to present their collections during an interview session, and in many
cases the informants are willing to share digital copies of their original mate-
rial with the research project. Some even entrusted original documents to us
– most notably Lindeman’s collection including his tape archive, other sound
recordings, books, letters, sheet music, scores, and a scrapbook.
    Published contemporary documents such as magazine articles and books,
biographies (typically retrospective), sound records with their covers and
liner notes are all important and could be considered research material, pos-
sibly also serving as research literature (see also Chapter 1.3 on previous re-
search on the topic and the research literature). Kurenniemi’s own writings 10
and contemporary publications are significant source material, for example.
Autobiographical publications such as Ralph Lundsten’s books En själens
vagabond11 (Engl. The Vagabond of the Soul) and Cosmic Composer,12 Mauri
Antero Numminen’s books Helsinkiin: Opiskelija Juho Niityn Sivisty-
shankkeet 1960–196413 (Engl. To Helsinki: Student Juho Niitty's Educational

   10 Kurenniemi (1999).

   11 Lundsten (2006).

   12 Lundsten (2014).

   13 Numminen (1999).




                                        14

[p. 15 / pdf 41]

Projects) and Kaukana väijyy ystäviä14 (Engl. Far Lurking Friends), well as
Eino Ruutsalo’s Maalarin rytmiä etsimässä15 (Engl. In search of the paint-
er’s rhythm) contain rich pictorial material and memories, and constitute
another important category of secondary source material. As sources for his-
tory writing they resemble interviews and oral-history material, and should
be approached critically (see also Chapter 3.1 for methodological considera-
tions).
    Digital newspaper archives, which are accessible for a fee or for free, 16
proved valuable in complementing the material collection. Within only a few
hours of browsing, I gathered 200–300 contemporary newspaper articles,
news items and announcements related to this study from key newspapers
such as Helsingin Sanomat and Dagens Nyheter, a task that would have tak-
en weeks to accomplish a couple of years ago.


1.2.2    The research material and data produced within this study
The largest set of material produced within the study consists of digital cop-
ies of the original documents. The main source material of the musical works
comprises audio recordings – either on original unreleased master tapes or
on commercially released sound records. In their management, I created
high-resolution wave files and annotated them as spectrogram images using
Steinberg Wavelab audio editing and mastering software. Annotated sound
files are archived as audio files (.wav and .mp3). The sonogram screen shots,
which I use to visualize the audio files, are archived as pictures (.tiff and
.jpg). The notes and annotations are archived as spreadsheets, tables or pic-
tures.
    An important detail to consider here is the processing of the original
source material. The signal processing may result in different versions of a
work and thus could even influence the music analysis. Therefore, the pro-
cessing of the audio material should be considered in the interpretation. 17
This issue reflects the analysis of traditional instrumental music, which
should take the interpretation of the musician, orchestra or conductor into
account.
    In addition to the digitized sound recordings, the collection includes digi-
tal repro-photographed tape reels and their covers, (hand)written documents
(letters, notebooks, memos etc.), pictures and scrapbooks. The digitized col-
lection will be openly available within the forthcoming FinEARS project. 18 As


   14 Numminen (2020).

   15 Referred to via the publications of Marko Home (see e.g. Home 2013; forthcoming doctoral dis-

   sertation).
   16 See the National Library of Finland’s digital newspaper archive for researchers;

   https://digi.kansalliskirjasto.fi/
   17 For more information about the first phase of the digitization process, see Ojanen (2015).

   18 See: http://finears.helsinki.fi; see also Chapter 1.2.3.




                                                      15

[p. 16 / pdf 42]

Introduction



part of the present study I piloted the best practices and workflows for open-
ing the material and the data.
    I have produced documents based on the primary source material that
could be considered research data, I and include observations of the primary
objects. The observations form data sets for analysis and their collection re-
flects the methodological questions concerning the primary objects of this
study, in other words the musical instruments, the musical works and the
events (on pertinences see Camilleri & Smalley 1998; see also Chapter 3).
These documents consist of copies of the original source material enhanced
with my own notes and annotations. The second-generation source material
also consists of lists and databases I have produced during this study, com-
piled as Microsoft Excel files with the help of the E-lomake tool provided by
the University of Helsinki. To ensure their long-term preservation I have
converted the spreadsheets into the .csv (comma separated) file format.
    As a by-product of the digitization I have developed systematic documen-
tation, in other words metadata, for the digitized and archived material. The
production of the metadata follows a non-standardized format, based on the
requirements I detected in the research project. I consider this to be re-
search-driven-digitization and metadata production, meaning that the re-
search questions rather than the standards direct the data collection and
documentation. However, I have developed the metadata schema to be in-
teroperable with a standardized format in order to merge the data sets with
official databases such as Finna.fi or Europeana in the future.19
    An extensive collection of secondary source material produced partially
within this study consists of interviews, and oral and communicative history.
I started conducting open thematic interviews in 2004, mainly with Jari Su-
ominen, Kai Lassfolk, and Marko Home. The open interview method tends to
reveal details that are otherwise impossible to unearth and can be verified
later from various sources. I consider memory-based material a secondary
source because it cannot be trusted without cross-referencing.20 I have ar-
chived most of the interviews both as transcriptions (.docx) and as audio files
(both .wav and .mp3). Transcriptions are invaluable when one is annotating
or browsing the material afterwards. However, they hide certain important
aspects: for example, in an audio recording it is possible to hear how the in-
terviewer fills gaps in the interviewee’s memory with almost silent gestures –
something that cannot be perceived even from an accurate transcription.


1.2.3   The ethical conducting of the research and archiving the project
I informed the research participants about the goal of the study. The goal
presented in the agreement extends beyond the scope of this dissertation,

   19 See: https://www.finna.fi/Content/about

   20 For a description of the methodological challenges related to oral history such as interviews see

   Chapter 3.1.




                                                    16

[p. 17 / pdf 43]

having been outlined for the broader research project on electroacoustic mu-
sic history and analysis in Finland. The research group, members of which
have access to and the right to use the material as agreed upon, consists of
the UHMRL Kurenniemi research group (Mikko Ojanen, Jari Suominen, Kai
Lassfolk, and Maiju Jouppi). I have also agreed on the details of how to man-
age and re-use the collected material in the future.21
    All the research participants gave their consent to participate in the study
under their own name. However, the signed agreement does not relieve the
researcher of the responsibility of following the guidelines of research ethics
and integrity if the collected material contains details that would be harmful
to them or to third parties. If I identify such details in my collection, I anon-
ymize them before making the material openly available. In many cases,
however, the anonymization renders the historical information in the sources
beyond usability. In such cases, I keep material containing sensitive, confi-
dential or copyrighted information secure, and only open the metadata.
    I have set up the data archive community Electronic Musical Instruments
by Erkki Kurenniemi in Zenodo to facilitate the archiving of the research ma-
terial after it has been cleaned up for publication. 22 The archive provides the
documents with persistent identifiers (digital object identifier, DOI), which
ensure the findability, accessibility, reusability and, most importantly, the
citability of the material and data. I open all the material I can make openly
available in line with the ethical guidelines as early as possible – in some cas-
es even before publication.23 The research material and data for which I have
the right of use, or the right to issue licenses to third parties, are published
under Creative Commons Attribution (CC-BY).


1.3 Previous research on the topic

1.3.1   General remarks on the background literature
In some cases, the textual research material and the data overlap with the
research literature. Some texts even serve both purposes at the same time.
For example, many of Kurenniemi’s own texts could be considered primary
sources when the focus is on his train of thought, and secondary sources in
introducing a contemporary review of the historical situation of electronic
music and instrument design in the Finnish context. The question is whether
to approach his texts as evidence of his thinking or as research literature on
the design of electroacoustic music and instruments. Their value in the for-
mer case is unquestionable even if their relevance in the latter is uncertain.

   21 For the content of the agreement, see: Ojanen (2018): https://doi.org/10.5281/zenodo.846985.

   22 See: https://zenodo.org/communities/electronic-musical-instruments-by-kurenniemi/.

   23 See, for example, the Appearances of Kurenniemi’s Electronic Musical Instruments:

   https://doi.org/10.5281/zenodo.842854




                                                 17

[p. 18 / pdf 44]

Introduction



To clarify the division into research material and research literature, and to
facilitate readability, I refer to the literature primarily by means of in-text
citations (the longer reference lists in this chapter are an exception), and to
the material in footnotes.
    I divided the background literature into three categories according to the
role of the text in question as follows: 1) theoretical and methodological
background, 2) studies on electroacoustic music (secondary source material
and contextualizing literature for the general background), and 3) primary
source material. I review the main theoretical and methodological back-
ground literature24 in Chapters 2 and 3. In Chapters 4–8, I use the texts as
contextualizing literature for the general background25 or the primary source
material26. In the following section (1.3.2) I only review the publications that
are relevant as background information on the academic and popular discus-
sion about the electroacoustic music of the 1960s and the 1970s in Finland.


1.3.2   Previous research and publications about electroacoustic music
        in Finland
Electroacoustic music aroused heated public discussion as soon as the genre
appeared in Finland during the late-1950s (see Kuljuntausta 2002; 2008).
Academic research on the subject, however, only dates back to the early
1990s. Thus far, studies have concentrated on dating and describing histori-
cal events, artists and musical works – not on deeper analysis or cultural con-
textualization. Moreover, events and circumstances after the 1960s are still
broadly unexplored, nor have any of the events been placed in a wider inter-
national context.
    Only a few reviews27, theses and seminar papers28 were written on the
subject of electronic and experimental music in Finland before the turn of the

   24 Geertz (1973), Denzin (1970a; 1970b), Megill (2007), Ginzburg (1989; 1993; 2012), Levi (1991;

   2012), Borgmann (1984), Bijker, Hughes & Pinch (2012b) Goehr (2007), Katz (2010), Taylor
   (2001), Nattiez (1990), Hamilton (2007), Magnusson (2009), Birnbaum et al. (2005), among oth-
   ers.
   25 The main literature for the general historical presentation of electroacoustic music includes

   Chadabe (1997), Kahn (2001), Collins & d’Escriván (2007), Holmes (2012), and Manning (2013).
   For localized descriptions I consulted national and studio-based histories such as Wiggen (1972),
   Born (1995), Glinsky (2000), Kuljuntausta (2002; 2008), Broman (2007), Bernstein (2008), Nie-
   bur (2010), Smirnov (2013), Groth (2014), and Patteson (2016).
   26 In other words, contemporary sources on electroacoustic music in Finland. I consider contem-

   porary magazine and newspaper articles to be primary sources and list them under research mate-
   rial rather than research literature.
   27 Lindfors & Salo (1988), Tiits (1990a), Eerikäinen (2007), Ruohomäki (1994; 1998), Heiniö

   (1995)
   28 Riikonen (1978), Laiho (1982), Laine (1984), Lång (1990), Tiits (1990b), Nikki (1993). Hannu

   Riikonen focuses on the music of Osmo Lindeman in his Master’s thesis for the University of Tur-
   ku written in 1978. Kalev Tiits’ Master’s thesis for the University of Helsinki written in 1990 focus-
   es on the music and instrument design of Erkki Kurenniemi, and Tarja Nikki’s on the musical the-
   ories of Kurenniemi and Jouko Tolonen.




                                                    18

[p. 19 / pdf 45]

century, and the distribution of information was in the hands of a few enthu-
siasts – most notably on the webpage pHinnweb29 (1996–) maintained by
Erkki Rautio and the radio program Avaruusromua 30 (Space Junk, 1990–
2020), produced by Jukka Mikkola for the Finnish Broadcasting Company
Yle.
    Composer Jukka Ruohomäki (b. 1947) conducted one of the most exten-
sive, mainly unpublished, basic research projects in the early 1990s. He
started to collect information on electronic music in Finland in 1993, and he
digitized approximately 600 electroacoustic works and other recordings into
the DAT collection maintained by the Finnish Music Information Center 31. In
addition to this collection, Ruohomäki produced a four-part radio program
Ihmisiä, koneita ja musiikkia32 (1993; Engl. Men, Machines and Music) and
wrote two magazine articles (Ruohomäki 1994; 1998).
    Ruohomäki’s own research project came to a halt when he started his sec-
ond composition period in 1994. Fortunately, the transcriptions of his several
interviews and the large manuscript are at the disposal of researchers. Com-
poser Mikko Heiniö wrote a concise history of electronic music in Finland for
the fourth part of the distinguished book series on Finnish music history,
which was largely based on Ruohomäki’s research material (Heiniö 1995,
182). In 2013, Ruohomäki (2013) revised and published the chapter that pre-
sents the electronic music of composer Henrik Otto Donner (1939–2013) as
an article in the journal of the Finnish Society for Ethnomusicology Musiikin
Suunta.
    One by-product of this study is the making of Ruohomäki’s previously
unpublished work openly available. The manuscript33 has now been pub-
lished in the research material database of this study, with Ruohomäki’s
permission. Even though some new source material has been found, as a re-
sult of which some of the sections of his manuscript require revising, his
work provides an extensive set of research material that I utilize especially in
my historical description. Via my study, Ruohomäki’s work, written in Finn-
ish, has become accessible to English-speaking and other audiences.
    By far the largest piece of published research was carried out by media
artist and musicologist Petri Kuljuntausta (2002; 2008).34 Kuljuntausta’s
interest in sound art and both electronic and experimental music in Finland
started in the mid-1990s when he founded the association Äänen lumo 35

   29 See: http://www.phinnweb.org/.

   30 See: https://yle.fi/aihe/ohjelma/avaruusromua.

   31 Currently Music Finland, see: https://musicfinland.com.
   32 See Ruohomäki’s radio program (1993) Ihmisiä, koneita ja musiikkia, [men, machines and mu-

   sic]. Yle Archive ID: DIG-390965-0.
   33 See Ruohomäki (2020): Suomalaisen elektroakustisen musiikin historia [käsikirjoitus] / The

   History of Electroacoustic Music in Finland [manuscript]
   https://doi.org/10.5281/zenodo.3605511.
   34 It is noteworthy that Kuljuntausta also had Ruohomäki’s manuscript at his disposal.

   35 See: www.aanenlumo.fi.




                                                  19

[p. 20 / pdf 46]

Introduction



(Charm of sound; 1995–), and hosted the radio program of the same name.
The Museum of Contemporary Art Kiasma commissioned an essay on the
subject from him in the late 1990s. The work, which started as an essay in
1999, turned out to be a manuscript of about 700 pages that was eventually
published as a comprehensive book entitled On/Off: eetteriäänistä
sähkömusiikkiin (Engl. On/off: From Ether Sound to Electronic Music;
Kuljuntausta 2002), with an accompanying CD including 15 tracks of early
electronic musical works – most of them previously unreleased. Later on,
On/off was assessed and accepted as a Licentiate thesis at the University of
Jyväskylä. Kuljuntausta’s doctoral dissertation, which he defended in 2008,
is based mainly on On/off, translated into English and published under the
title First wave: a microhistory of early Finnish electronic music (Kuljun-
tausta 2008).
    Kuljuntausta restricted his study to the early years (1958–1964), although
sporadic notes touch upon events in the 1970s beyond his formal temporal
framing. He places the historical events within the cultural context but leaves
plenty of work to be done to complete the picture, at least from the mid-
1960s onwards. However, with the inclusion of exhaustive lists of historical
newspaper and journal articles Kuljuntausta’s books provide stepping-stones
enabling researchers to access contemporary writings from the early years of
electronic music in Finland.
    Kurenniemi’s lifetime work has attracted wide international interest dur-
ing the past 20 years. The most influential source concerning his role at the
dawn of Finnish underground and avant-garde circles comes from outside
academia. A major revival of his work was initiated in 2002 by Mika Taanila
(2002) in his documentary film Tulevaisuus ei ole entisensä (Engl. The Fu-
ture Is Not What It Used to Be). Two DVD releases followed (Taanila 2003;
2007), which include a collection of Kurenniemi’s original experimental
short films from the late-1960s and slide shows of his instruments and prin-
ciples of his mathematical theory on music. As part of the film project,
Taanila compiled a CD release comprising eleven tracks of Kurenniemi’s
electroacoustic works and other recordings (Kurenniemi 2002).
    Kurenniemi’s work was presented in a series of art exhibitions 36 and in
scholarly publications in the 2010s (Mellais 2013; Krysa & Parikka 2015). It
is also recognized in the international research community and in popular
forums of electronic music (see Collins et al. 2013, 66–71; Hvidlykke 2013;
Crab 2015). Kurenniemi and his work have also been introduced in a pletho-
ra of blog postings. Even though they popularize the subject and present his
work to wider audiences, detailed information is typically defective and sim-
plistic, with no referencing to the primary material or to the origin of the in-
formation that is presented.


   36 Documenta13, Kassel Germany, 2012; Kunsthall Aarhus Denmark, 2013; The Museum of Con-

   temporary Art KIASMA, Helsinki, Finland, 2013–14.




                                               20

[p. 21 / pdf 47]

    Recent interest in Kurenniemi, his electronic music and his musical in-
struments is reflected in the various publications37 and the work coordinated
by Perttu Rastas at the Finnish National Gallery. The gallery maintains Ku-
renniemi’s personal archives and organizes his instrument-restoration pro-
jects and other activities. The international series of his archive exhibits and
international book publications are driven mainly by Rastas and his enthusi-
astic interest in Kurenniemi’s work, and the resources of the Finnish Nation-
al Gallery.


1.4 The structure of the study
Out of respect for the subject of this study, in Chapter 2 I present the techno-
logical questions before the musical and aesthetic considerations. History
writing (Chapter 2.1) is a common thread running throughout this treatise on
technology and music. I do not offer a chronological historical narrative, nor
is this study a biography. I present the contents of certain chapters as
chronological narratives, but the broad organization of the material is the-
matic. After giving the historiographical background I introduce the key con-
cepts and theories that shed light on how I address the sociotechnical, musi-
cal, and aesthetic questions (Chapters 2.2 and 2.3, respectively).
    Given the subject of the study, it is necessary to define technology. In my
view it is a cluster of concepts to be defined within the context in which they
are used rather than as a single entity. I recognize at least four types of defi-
nition (Chapter 2.2.1). I also acknowledge technology as a developing con-
cept, which requires a description of how it changes. In Chapter 2.2.2, I re-
view the key trends in science and technology studies (STS) that are relevant
in the context of this work. Most of the concepts I apply derive from the So-
cial Construct of Technology (SCOT) and Actor Network Theory (ANT). De-
spite their differences, both conceive of technological change as a sociotech-
nical process in which users and physical artifacts are seamlessly intertwined
– both acting and affecting one another. STS-based theories arose as a reac-
tion to linear models of technological development. Even though many of
them cry out for major revision, including that for the diffusion of innova-
tions outlined by Everett Rogers (1931–2004), linear models cannot be fully
disregarded.
    I present the definitions and uses of concepts such as a musical work and
the composer (as an author of the work) in Chapter 2.3 on music-history
writing. I associate such writing with the definition of a musical work, which
I contemplate in the sub-section on aesthetic theory (Chapter 2.3.2). It is

   37 See Korhonen (2002); Ojanen & Suominen (2005); Ojanen et al. (2007); Väkiparta (2007); Yli-

   Annala (2007); Taanila (2007); Uimonen (2007); Tiekso (2013; 2016); Suominen (2013); Lassfolk
   (2012; 2013a); Ojanen & Lassfolk (2012); Ojanen (2013; 2014a; 2014b; 2015); Lassfolk et al.
   (2014; 2015); Niemelä (2019); Kuljuntausta (2020) Karjalainen & Kärki (2020).




                                                21

[p. 22 / pdf 48]

Introduction



necessary to define the concept of a musical work, especially in the field of
electronic and experimental music. From aesthetics I find the ideas present-
ed by Demers (2010) useful. Even though she addresses her questions to a
notably more recent period in the history of electroacoustic music than I do,
my attitude towards the interdisciplinary nature of the topic is close to her
descriptions.
    In Chapter 3, following the same order, I present the methodological
toolbox I use in the succeeding analyses. First and foremost, I tune my meth-
odological instrument to be historically sensitive. I see a strong resemblance
between the methods I employ and qualitative research and content analysis,
for example (Chapter 3.1). Chapter 3.2 presents the concepts and tools of the
research on digital musical instruments (DMI), which I apply to Kuren-
niemi’s case. Music analysis in the electroacoustic music domain deserves its
own presentation (Chapter 3.3), although I see many analytical similarities
between the use of musical instruments and musical works.
    Writing a global history of electroacoustic music is not within the scope of
this study. However, given that previous research has not contextualized the
state of electroacoustic music in Finland, and to facilitate understanding of
how the phenomenon emerged, I review the global perspective on the key
developmental lines in Chapter 4. I also trace the preconditions of its emer-
gence, and describe developments in sound recording and technological pro-
cessing, as well as in electronic musical instruments and music aesthetics
and styles in both high art and popular genres. In addition to considering
global developments, I outline the historical context of electroacoustic music
in Finland at the turn of the 1960s, before Kurenniemi started to envision his
designs.
    In Chapter 5 I review the history of Kurenniemi’s instrument-design pro-
jects, including that of the University of Helsinki Electronic Music Studio,
focusing on those who used his instruments. I present the key features of the
instruments in Chapter 6, which have already been described in previous re-
search, hence their internal structure on the component level is beyond the
scope of this work. I rather emphasize user interfaces and usability issues.
Chapter 7 comprises user stories about Kurenniemi’s electronic musical in-
struments, as told by both Kurenniemi and his collaborators who used them.
This chapter contains the main analyses of the study and elaborates on the
usage of Kurenniemi’s instruments.
    The discussion in Chapter 8 summarizes the findings of the analytical sec-
tions in light of the academic discussion in earlier chapters. I also outline the
frameworks and categorizations as an outcome of this dissertation. Lastly, in
Chapter 9, I assess the chosen toolbox and contemplate how it works with
regard to the questions I ask and the material I present in this study. I also
look into the future and suggest a few threads of research that could be po-
tentially fruitful.
    The most important task for the future is to continue the work on preserv-
ing our rich cultural heritage, which will vanish if actions are not taken in the



                                        22

[p. 23 / pdf 49]

very short term. Information, research material and data related to electroa-
coustic music are scattered around the institutional archives, private collec-
tions and other miscellaneous locations. Collectors – in some cases even re-
sponsible organizations – may not be aware of either the significance of their
sets of material or the possibility to deposit it in repositories maintained by
responsible organizations. Significant collections have already been de-
stroyed due to the lack of archive space among both private collectors and
memory organizations. As a concrete spin-off from this study, I have set up
The Finnish ElectroAcoustic Research Sources (FinEARS) project to answer
this call.
   This study includes several references to sources originally in Finnish or
Swedish. Unless otherwise mentioned, I have translated the quotations into
English myself. In addition, to clarify the division into research material and
research literature and to facilitate readability, I refer to research material
and data in the footnotes and to research literature in in-text citations.




                                       23

[p. 24 / pdf 50]

The conceptual and theoretical background




2 THE CONCEPTUAL AND THEORETICAL
  BACKGROUND

On the conceptual and theoretical level, I concentrate on writing the history
of music technology. The three general themes – history, technology, and
music – have their own established disciplines. Thus, this study is multidis-
ciplinary in nature. The aim is to discuss controversial concepts that seem to
be constantly under debate among the scientific community. In many cases
the different approaches are complementary and not exclusive. The various
disciplines contextualize phenomena in different wording, and the academic
contentions reflect the different targets of the arguments. I do not aim in this
theoretical review to develop new solutions to conceptual and theoretical
questions that are still under discussion, I merely describe on what grounds
my work is based.
    My descriptions may be overly simplified, but I seek agreement. Accor-
ding to the present paradigm, qualitative research should be quantitatively
enriched, and vice versa. In a similar way, the interpretative orientation re-
lies on basic research or “facts” (see Hobsbawm 1998, viii), although some
postmodernists are ready to jump straight into metanarratives and to disre-
gard the painstaking “archival work, the documenting of primary sources and
theoretical pondering.” (Mantere & Kurkela 2015, 5–6; see also Rahikainen &
Fellman 2012, 1–3). According to Carr (1986, 24):

       “[t]he historian and the facts of history are necessary to one another.
       The historian without his facts is rootless and futile; the facts without
       their historian are dead and meaningless. My first answer therefore
       to the question, What is History?, is that it is a continuous process of
       interaction between the historian and his facts, an unending dialogue
       between the present and the past.”

Carr’s description is akin to defining the target of musicological research or
music analysis. The musical work as a material trace of its producer’s poietic
process does not carry a meaning in itself, but without it the receiver is de-
void of an esthesic process (see Nattiez 1990, 15).
   There is a need both for basic research and for far-reaching analytical
metanarratives – and the latter should be based on the former. In this chap-
ter I outline the overarching background concepts that can be detected in
history writing, technology studies, and aesthetics, and then I review the the-
oretical background of the key themes in separate sub-chapters.




                                            24

[p. 25 / pdf 51]

    A concept that serves as an intangible guideline, and that repeatedly
emerged when I was reviewing the theoretical and methodological literature
concerning the key themes, is thick description. It was initially formulated by
Gilbert Ryle, and then further developed by anthropologist Clifford Geertz
(1973, 5–10). Geertz uses thick description to exemplify how human behavior
should be analyzed in its context – not merely described. He refers to Ryle’s
classic example of the problem of interpretation with regard to human be-
havior. Ryle exemplifies the issue with a detailed description of the different
meanings that could be attached to the contraction of an eyelid: he distin-
guishes a twitch from a wink, a wink from the faking of winking, and so on
(ibid. 7).
    Thick description has been widely adopted as a general tenet in different
fields of science. Authors concentrating on describing a historical event (see
Burke 1991b and Levi 1991), studying a technological artifact (See Bijker 1995
and Bijker & Pinch 2012), or analyzing a musical work (see Tomlinson 1984)
seek to thicken their descriptions – quite often with an implicit mention of
the concept, but also with a literal reference to Geertz. In the field of technol-
ogy studies, for example, Bijker (1995, 9–10) calls for a balance between con-
textualized and detailed “nuts and bolts” levels of analysis. Thick description
also resonates with the concept of the seamless web outlined by researchers
in the field of Science and Technology (see Chapter 2.2). Nattiez (1990) con-
siders all three, the musical work in its material reality, in other words the
“nuts and bolts” level, the producer’s poietic process and the receiver’s esthe-
sic process as necessary parts of musical analysis. There is a plethora of simi-
lar examples in history studies.
    Whereas there is a solid consensus among scholars on the matter of thick
description, a few other background concepts seem to be oxymoronic. As an
example, the contention between objectivity and subjectivity colors several
discussions about the nature of scientific knowledge – especially epistemo-
logical issues. Objectivity has traditionally been among the cardinal virtues of
the scientific paradigm. In a historical presentation, for example, the histori-
an is required to avoid anachronism, presentism, hindsight and teleological
explanation. Yet at the same time it is acknowledged that history is written
from the current perspective by a present-day author, whose subjective atti-
tudes affect the process. In other words, historians writing history with a dis-
tinctive voice from the present are obliged to detach themselves from the
here and now, even from their own personal opinions.
    Another pair of general concepts whose role in epistemology is disputed is
the descriptive and the analytic. These research frames are considered con-
tradictory in various fields, but they do not need to be. Most notably, the seg-
regation between the analytic and the descriptive appears in historiography
when historians argue about what their discipline should concentrate on - the
chronological narration of events or analyses of the structures and circum-
stances. I argue that there is a need for descriptions of what happened and
for overarching analyses of the underlying structures.



                                         25

[p. 26 / pdf 52]

The conceptual and theoretical background



    A few shifts in focus in the Social Sciences, Humanities, and Science and
Technology during the past 100 years are also worth mentioning, specifically
from the global to the local, in other words from macro to micro, and from
society to people. Current research settings also emphasize users alongside
engineers, consumption alongside production, audiences alongside compos-
ers, women alongside men,38 and failure alongside success, to give a few ex-
amples (see Burke 1991b, 1). As underlying causes of many of these changes
Rahikainen & Fellman (2012) identified two pivotal movements in the devel-
opment of 20th-century academia, namely the linguistic turn and the post-
modernist challenge.
    One way of solving seemingly contradictory problems is through concepts
such as the etic vs the emic (see Pike 1967; Geertz 1973; Nattiez 1990, 60–62;
Headland 1990; Emmerson & Landy 2016, 18–19). Researchers representing
the etic perspective consider the research subject from the outside and em-
ploy their own methodological tools and concepts, whereas those adopting an
emic stance consider it from within, the categories and descriptions used re-
flecting the insiders’ concepts. Emmerson & Landy (ibid., 18) define these
approaches as measurable difference (etic) and significant difference (emic),
whereas Collins & Yearley (in Leskinen 2000, 186) describe them as theoreti-
cal language and observation language.
    The main themes of this study (history, technology, and music) could be
considered individual cultures (emic), for example, and my observations on
them as from the outside (etic). Distinguishing two levels raises awareness of
the concepts and descriptions used to interpret the subject of the study.
Oldenziel (2006, 481–482) considers the issue in the context of history and
technology studies, claiming that historians of technology “fail to recognize
the fundamental distinctions between technology as an ‘analytical tool’ [etic]
and as a ‘lived experience’ [emic].” For me this became evident when I was
considering the terminology I would use to define the subject of my study –
my detachment from the original 50-year-old context, from concepts such as
electronic music, sound art, the computer, and the (digital) synthesizer, in-
fluenced my interpretation of past circumstances, and I pay special attention
to the historical definitions.39


2.1 History: general remarks on historiography
       “Histories do not exist in facts, or artifacts, or documents, or ar-
       chives, or collections, or any other miscellaneous items we may asso-
       ciate with the past. Histories are invented. Historians invent histories
       by telling stories. The first question a historian asks is: What story do

   38 Or as Oudshoorn & Pinch (2003, 4) note, the focus has moved from a neutral to a gendered ori-

   entation.
   39 See for example Ch. 2.3.3 Definition of electroacoustic music.




                                                  26

[p. 27 / pdf 53]

       I want to tell? And answers that question from the perspective of the
       present. A historian looks around, notes that something is happening,
       and asks: How did this come about? A historian then chooses the
       events, artworks, sounds that are included in the history and inter-
       prets those items as significant to the story.”
                             Composer and electroacoustic music historian Joel Chadabe (2005)


Composer Joel Chadabe aptly captures the present paradigm of history writ-
ing. However, the citation obscures a contention that persists in the academic
discussion. Current history writing does not comprise a coherent set of paral-
lel threads. Writers rather follow several independent trends that foster disa-
greement among their advocates. Examples include the history of mentali-
ties, microhistory, women’s history, history from below, structural history,
the history of events, and cultural history, among others (see Burke 1991b;
Peltonen 1995; 2002; Sivuoja-Kauppala et al. 2013, 3–4).
    Even the most critical historians – perhaps excluding advocates of philo-
sophical skepticism – do not deny that the past happened. The question is
not whether or not the past exists, it rather concerns how and what kind of
knowledge it can yield. The dispute is about what is considered a pertinent or
even acceptable target of study. Thus, the historiographical debate is episte-
mological rather than ontological (Megill 2007; Torvinen 2007), which has
not always been obvious.
    The shift towards pluralism in history writing emerged gradually between
the 1940s and the 1980s, when the new paradigm challenged objective histo-
riography – so-called Rankean history.40 During that time there was a strong
increase in historiographical methods and in the variety of acceptable source
materials. In the words of cultural historian Jukka Sarjala (2002, 28): “Now-
adays several different roads lead to the past and they do not necessarily have
anything in common.” Due to the paradigm shift, the scientific community
abandoned its conception of the past as something that could be objectively
reconstructed. It does not exist as something “fixed and static waiting to be
described”, but the past (or our comprehension of it, to be precise), the pre-
sent, and the future are all in constant interaction with and perpetually de-
fined by one another (Goehr 1992, 183; see also Carr 1986, 24).
    Despite the plurality of modern trends, there are a few common princi-
ples. According to Burke (1991b, 2–6), at least the following five traits are
common to several historiographical trends of the late 20th century. 1) Tradi-
tional history writing in the 19th century concentrated on politics, the state,
the church and war, whereas the new trends acknowledge that “everything
has a history”. 2) History was traditionally accessed “from above”, from the
perspective of the “great deeds of great men”, whereas the new history writ-


   40 Rankean history refers to a tradition started by German historian Leopold von Ranke (1795–

   1886).




                                                 27

[p. 28 / pdf 54]

The conceptual and theoretical background



ing accesses the past “from below”, from the point of view of ordinary people.
This has a strong resemblance to the symmetry principle in technology stud-
ies, which holds that both successful and failed projects should be studied
using the same terminology (see Chapter 2.2). 3) Rankean history was based
on official documents maintained in official archives, whereas the new tradi-
tions accept a greater variety of source material such as visual, oral, and sta-
tistical. 4) Rankean history concentrated objectively on relating “how things
actually happened”, whereas during the 20 th-century researchers acknowl-
edged that (cultural) relativism affected both the process of historical writing
and its object.41 5) Finally, historiography was gradually professionalized at
the beginning of the 20th century, but later the emphasis turned to interdisci-
plinary connections and history has been written outside the professionalized
framework. I return to this in my discussion about the writing of music histo-
ry (see Chapter 2.3.1).
    The historian approaches the past from the current perspective through
surviving contemporary documents. Events in the past can be positioned
with a certain precision but the causal relationships between them are am-
biguous. Even the most comprehensive series of historical sources provide
only fragmented documentary evidence. Moreover, listing dates as a chrono-
logical timeline rarely produces anything other than a hollow collection of
consecutive notes in a calendar. Therefore, the historian must interpret both
the fragmented documents and the gaps in them to understand the past. It
has been claimed, however, that any interpretation depends on the attitudes,
opinions, intentions, age, sex, and social class of the writer, among other
things. Even the process of selecting a subject of study has been debated and
considered a political question (see Rojola 2001; Megill 2007, 214–215;
Moisala & Seye 2013, 39).
    Dividing the target of historical research into 1) the past per se, 2) the var-
ious experiences of contemporaries, 3) the surviving documents, and 4) the
historian’s interpretation of these documents facilitates understanding of the
perspectives from which the issues have been approached. Music philosopher
and historian Carl Dahlhaus (1983, 11) outlined a similar division with refer-
ence to 19th-century historians such as Droysen and Ranke, who “distin-
guished between a ‘reality’ that remains in part unaccounted for even after
the most stubborn efforts have been made to reconstruct it, and a ‘truth’ of
history that imparts sense and structure to what are otherwise mere accumu-
lations of facts.” Disagreements in academic communication often arise from

   41 The question of relativism is complex. In short, historiographical approaches can be distin-

   guished by their stance on epistemology – on other words whether they focus on the past itself, on
   the interpretation of the past or on the research method used. Otherwise, seemingly consistent ap-
   proaches may differ in whether they are relativist or anti-relativist in nature. See, for example, Le-
   vi’s (1991) detailed comparison of Italian microhistory and Geertzian interpretive anthropology.
   Furthermore, it seems that Goehr (1992) subscribes to the relativist stance in history writing,
   whereas Levi (1991) and Ginzburg (1993), for example, “refute relativism” in their approaches. See
   also Hobsbawm (1998, viii) who stresses that “what historians investigate is real.”




                                                    28

[p. 29 / pdf 55]

the failure of the debaters to recognize to which of the four above-mentioned
targets they are referring.
    The past happened in the chronological order of parallel and consecutive
events. However, people experience these strings of events uniquely, and
contemporary historians do not have direct access to the events or the expe-
riences (see Gaskell 2001, 187–188; 210; Megill 2007, 17–40; 213). Events
are attached to each other via intangible causal pathways. Culture, society,
politics, economics, and so on could be considered hidden structures that
reveal themselves through the events, but only through the events and only
partially. The past per se is gone and it cannot be caught or changed. Events
and chronology provide only a fragmented framework. Historians looking
backwards are able to grasp only one presentation of the past at a time,
which is filtered by their detachment from it. They should be conscious of
these filters, whether they be related to their own political agendas or to oth-
er aspects of research such as materials, data, interviewees’ opinions, meth-
odological dilemmas or theoretical issues.
    Pinch & Trocco (2002a), who studied the history and impact of an analog
synthesizer, namely the one designed and built by Robert Moog and his com-
pany, highlight one of the problems related to historical interpretation when
they describe their point of departure in the writing of history. They avoid
hindsight by describing a historical situation in terms of “what it was like
back then, before anyone knew what it would be like now” (ibid., 11). Avoid-
ing hindsight is necessary to ensure transparent interpretation. Pinch and
Trocco were aware of the problematic nature of the process, acknowledging
that having “filtered stories to bring out certain themes” they “have muted
others” and if they “had chosen another configuration of quotes” they “could
have produced a rather different history” (ibid.). By avoiding hindsight, they
aimed to satisfy the oxymoronic demands of the simultaneous objective and
subjective perspectives.
    Burke (1991a, 239) also emphasizes the importance of interpretation, stat-
ing that researchers should make themselves visible in their presentations
and warn their readers that the presented interpretation is only one of many.
Megill (2007, 1–3), in turn, stresses the role of transparent argumentation in
history writing. By way of clarification he introduces the term unresolving
tension or unresolving dialect, meaning that “a true historian is happy to
leave her mind suspended between conflicting attitudes or claims.” Accord-
ing to Megill, “it is not the historian’s task to articulate a single unequivocal
position, let alone a single consistent theory, concerning the world as it is”
(ibid.).
    Along with the epistemological questions, the focus and form of history
writing have been debated. Historiographical presentations have been writ-
ten as narratives, which are distinguished from literary narratives. According
to Italian microhistorian Carlo Ginzburg, the difference between the two is in
the way the authors approach the reality through the fragmented documen-
tary evidence. As he points out, “the obstacles interfering with research in the



                                        29

[p. 30 / pdf 56]

The conceptual and theoretical background



form of lacunae or misrepresentations in the sources must become the part
of the account”. In other words, the historian must transform the problem of
discontinuous sources into a narrative element, whereas the literary narrator
can leap “over the inevitable gap between the fragmentary and distorted trac-
es of an event and the event itself” and thus “tacitly remove constituent limi-
tation of the historical profession.” (Ginzburg 1993, 28)
    Historians who stress the narrative approach tend to emphasize the im-
portance of events as the subject of research, whereas critics focus on the
structures and emphasize analysis over mere description (Burke 1991a, 233–
234). One spike in the debate was triggered by Lawrence Stone’s (1979) con-
troversial article “The revival of the narrative”, in which he criticizes many of
the new historians who were returning to the storytelling mode of history
writing. The problem according to Burke, however, was not whether histori-
cal presentation should be written in a narrative form: on the contrary, it has
been acknowledged that even analytic presentation focused on structures
necessarily takes a narrative form of some sort. (Burke 1991a, 233; see also
Megill 2007, 11)
    Stone acknowledged in his original article that historians have “always
told stories”. His primary concern was the development in history writing to
concentrate on “man not circumstances” and to deal “with the particular and
specific rather than the collective and statistical” (Stone 1979 3–4). He feared
that descriptive story-telling – for its own sake – about obscure, poor and
atypical people marked the end of “the attempt to produce a coherent scien-
tific explanation of change in the past” (ibid., 19–23).
    Even though Stone’s juxtapositions capture the main differences between
the paradigms of the complete history of the early 20 th century and the more
recent developments within cultural history, his critique was mainly targeted
at Italian microhistory, which has attracted wide interest during the 35 years
of its existence. The trend, which was new at the time when Stone was writ-
ing, has mainly been associated with Carlo Ginzburg and Giovanni Levi, even
though the term microhistory appeared in a few historiographical publica-
tions in the 1950s and 1960s (see Ginzburg 1993, 10–12). Of the new post-
war trends in historiography I give more detailed attention to Italian micro-
history because it is widely referred to in Finnish writing on music history
from the past ten years – and specifically with regard to electroacoustic mu-
sic (see e.g. Kuljuntausta 2008; see also Sivuoja-Kauppala et al. 2013 and the
collection of articles in Musiikki 3–4/2013, Toivakka 2015 and Reimann
2015).
    It is noteworthy that the turn from the macro to the micro is not a unique
feature of history writing, there having been a similar gradual shift of focus in
economics and sociology between the 1940s and the 1960s (Peltonen 1995;
2002). The turn to examining relationships between the larger structures and
their constitutive elements also came to be recognized as the essential prem-




                                            30

[p. 31 / pdf 57]

ise of structuralism42 and post-structuralism43. Within the field of the present
study, it is worth pointing out that Dahlhaus (1983, 8) also used juxtaposi-
tions such as great men/great works vs. the masses/the rest in music history
writing as early as in 1977. Thus, several independent but parallel threads
developed during the 20th century, which Ginzburg (1993, 28) acknowledged,
stating that their “researches were a fragment of a more general tendency.”
Moreover, even microhistory can be divided into the old and the new. Thus,
to use microhistory as a label without reflecting its multifaceted concepts and
tools in the research questions and material is to oversimplify the matter,
and to restrict description of the trend to the concepts of micro and macro is
superficial.
    Ginzburg (1989, 96–102), who studied the “silent emergence of the epis-
temological paradigm in the late 19 th century”, introduced the key micro-
historical concept, clues. He noticed striking similarities in the methods of
Giovanni Morelli (detailed pictorial marks), Sigmund Freud (traces or symp-
toms), and Sherlock Holmes (clues). According to Ginzburg (ibid.), all three
were linked to medicine, in other words to a “discipline which permits the
diagnosis of diseases inaccessible to direct observation based on superficial
symptoms.” He thereby likens historical knowledge to the physician’s
knowledge: both are indirect, presumptive and conjectural. “The reality is
opaque, but through signs and clues it can be penetrated” (ibid., 123). Pel-
tonen (2002) points out that the concept resembles pre-microhistory trends
in the academic literature, suggesting that clues can be likened to Michel de
Certeau’s concept of margins and Walter Benjamin’s notion of monads.
From the micro-historical perspective, clues are mismatched details in re-
search material. As Peltonen (ibid.) put it, they are “something that do not
quite fit, something odd that needs to be explained.”
    Another essential concept in micro-history alongside Ginzburg’s clues is
the scale of observation, which Levi (1991, 97) describes as “the unifying
principle of all microhistorical research”. Reduction of the observation scale
facilitates the use of microscopic clues to reveal larger, hidden structures and
previously unobserved factors. In this respect, the micro-historical approach
aims at a holistic understanding of large historical structures (Peltonen
2002, 349–50) rather than merely describing the research material in micro-
scopic detail. Hobsbawm (1980, 7) responded to the discussion in 1980:

       “there is nothing new in choosing to see the world via a microscope
       rather than a telescope. So long as we accept that we are studying the
       same cosmos, the choice between microcosm and macrocosm is a
       matter of selecting the appropriate technique.”




   42 Related to the early-20th-century linguist Ferdinand de Saussure (1857–1913).

   43 Related to philosophers Michel Foucault (1926–1984) and Jacques Derrida (1930–2004).




                                                  31

[p. 32 / pdf 58]

The conceptual and theoretical background



Levi (1991, 96–97) made a similar point a little later, referring to thick de-
scription, suggesting that the reduction in scale, specifically in the micro-
historical approach, allowed the adjustment of observations for experimental
purposes. On the one hand, the scaling could be likened to thick description
in its inductive starting point and in its concentration on the detail and the
context. On the other hand, it is also in line with Hobsbawm’s comment
about the scale not being fixed but being adjustable in relation to its target.
The key point here is how adjusting the scale influences the interpretation.
As I show in this study, the static scaling of observations in previous studies
has influenced – even skewed – descriptions of how electroacoustic music
developed in Finland during the 1960s.
    To exemplify the effect of the scale of observation and the outlining of the
thickness of the descriptions even further in the context of this study, let us
consider statements about continuity and discontinuity in the early history of
Finnish electroacoustic music. Several writers agree that the early years fall
into two periods (see Lång 1990, Ruohomäki 2020; Kuljuntausta 2002;
2008). There seems to have been a period when activity in this field was at a
stand-still for some years – at least judging by the number of completed mu-
sical works and the amount of concert activity. Whether the hiatus between
active periods started immediately after 1963, somewhat later in the 1960s,
or even at the turn of the next decade depends on the writer and the set of
musical works and composers under scrutiny. However, few attempts have
been made to describe what led to this dynamic development and how it
manifested itself during those years. I argue that the division into two peri-
ods is a product of later interpretation, clearly directed by the scale of obser-
vation. It is clear from an even more detailed examination that there was no
hiatus in the history of electroacoustic music in Finland during the 1960s.
    In addition to clues and scalable observation, micro-historians use the
concept of typical exception.44 The term is rooted in a conflict between quan-
titative research orientations and historical case studies. Historians have tra-
ditionally sought typical features in individual cases: whereas events are not
repetitive phenomena that could be quantified, individual events are excep-
tional. With their concepts and tools, micro-historians aim to describe the
typicality of exceptional events and circumstances, and to overcome the con-
tention between different approaches (Ginzburg 1989, 96). I consider Kuren-
niemi a typical exception. Depending on the scale of observation, he appears
to be exceptional (on the local level in Finland) or typical (on the global level
in Western culture). With this interpretation I exemplify the relativeness of
history writing: I avoid hindsight and accept unresolved tension in my de-
tached description of the past. In my view, understanding of the past is dy-
namic and open-ended, not static and definitive.



   44 Also, exceptional normal (see Peltonen 2002, 348).




                                                  32

[p. 33 / pdf 59]

2.2 Technology: theories and definitions
      “Technology is also an environment in which we experience and think
      about music; it is a set of practices in which we engage in making
      and listening to musical sounds; and it is an element in the discourses
      that we use in sharing and evaluating our experiences, defining, in
      the process, what music is and can be.”
                                                 Musicologist Paul Théberge (2001, 3)



The scientific community has debated the definition of technology for dec-
ades. It is acknowledged that unifying the use of the concept is impossible
(see Bijker & Law 1992, 202; Lemola 2000a, 10; Oldenziel 2006; Magnusson
2009). As Bijker & Law (1992, 202) state, “many recent studies have avoided
a specific definition of technology”. Magnusson (2009, 43–45), in turn, refers
to technology as “a phenomenon resisting definitions”. It has been ap-
proached from several research orientations and from different points of
view over the decades – from philosophy and history studies to the natural
sciences, and from engineering to sociology and art studies, to name a few.
Technology has been defined within the premises of the discipline in ques-
tion, therefore it can only be understood when it is contextualized.
    Not only do the various definitions of technology influence academic re-
search, they have also become inseparable from common parlance and policy
-making. Many mundane conversations include profound assumptions on
how technology acts, what effects it has, and how people react to it. It has the
potential to direct people’s assumptions and attitudes, even their decision-
making, and it has become a key concept through which people can identify
and define themselves (see Haring 2007, 6). For some it is a basis for living,
or even gives meaning to life. The medium has become the message (McLu-
han 1964). Value judgements concerning technology are ubiquitous. As
Oldenziel (2006, passim.) states, it has the power to frame social realities.
Despite its ambiguous nature, however, some researchers encourage the rou-
tine use of technology just “as we use the words ‘sociology’ or ‘psychology’”
(Magnusson 2009, 44).
    Careless use of the word is deceptive, however. Any attempt to define
technology in more detail reveals a complex web of related meanings, histori-
cal developments, and various stakeholders. It is neither possible nor neces-
sary at this point to include an in-depth review of the various definitions in
the literature. In the following, therefore, I discuss the key approaches I em-
ploy in this study in some detail. For an excellent overview of the historical
development of the concept, see Magnusson (2009, 39–77), for example.




                                        33

[p. 34 / pdf 60]

The conceptual and theoretical background



2.2.1   Definition(s) of technology
How technology is defined has a fundamental effect on the description of
technology-driven music-production processes, just as the definition of mu-
sic or a musical work has its effect on music analysis and how the role of mu-
sic is understood in society. Considered in detail, technology as a concept
may be helpful in explaining and analyzing aspects such as culture and socie-
ty – not unlike concepts such as canons and canonization in the writing on
music history (see Chapter 2.3.1). Here, I see technology as a cluster of con-
cepts. Using the word activates the conceptual structure in which technology
manifests itself through several other concepts on various hierarchical levels
with various degrees of concreteness. I recognize four levels of technology –
the list is not definitive.
    First, technology is associated with artifacts such as devices, instruments,
and machines realized as either software or hardware, as well as with
knowledge of how to design and use these artifacts. It is helpful to distinguish
the tools from the practice, in other words equipment from its design and
use. In this sense, I consider technology a counterpart to technique. My dis-
tinction between technology and technique differs from those suggested by
Elster (1983), Voorvelt (2000), Taylor (2001), and Arrasvuori (2006), for
example. Lemola (2000b) uses technique and technology as synonyms or
interchangeable terms, and the word technical has been used in a somewhat
similar fashion, such as by Elster (1983) in Explaining the Technical Change
and in several contributions to Science and Technology Studies (STS) includ-
ing Shaping Technology/Building Society: Studies in Sociotechnical Change
(Bijker & Law 1992) and Of Bicycles, Bakelites and Bulbs: Toward a Theory
of Sociotechnical Change (Bijker 1995). In the present study, on this first lev-
el I use technology to refer to technological artifacts, in other words the in-
struments and studio equipment used in the process of music production and
composition, whereas technique refers to the design and use of these arti-
facts. Technical is a broader term that merges technology and technique –
and blurs the distinction.
    The technology–technique dichotomy is also helpful when it comes to the
diverse types of knowledge involved in these processes. In the current con-
text, expertise is akin to declarative knowledge about instruments and
equipment (technology), and procedural knowledge refers to the design and
use of the instruments and equipment (technique). The former is generally
more explicit, whereas the latter is tacit knowledge. It is also worth pointing
out that knowledge embeds gradually in technological artifacts. More
knowledge is encoded into the technology per se nowadays than 60 years
ago. For example, a single integrated circuit and microprocessor can perform
more diverse and complex tasks than previous constructions with discrete
circuits; libraries for microcontrollers developed and distributed within peer-
to-peer networks and preset setups in signal-processing equipment, even
with pedagogical potential, have all accumulated technological knowledge
and memory (see also Chapter 3.2).



                                            34

[p. 35 / pdf 61]

    Second, technology also refers to institutions and organizations that are
involved in its research or development, which with their resources play a
particularly significant role in the process of researching and developing
technological artifacts. The level of resources and the state of the infrastruc-
ture have a significant effect on the design process, even though they do not
in themselves explain its effectiveness.
    Third, technology could be defined as an inseparable part of society, an
outcome of societal activity. From this perspective it has been questioned
whether society and technology can be distinguished from one another
(Bijker & Law 1992, 201). Scholars engaged in Science and Technology Stud-
ies (STS) employ the concept of the seamless web to emphasize how tightly
intertwined science, technology, society, culture, and economics are (Hughes
1986; Bijker & Law 1992, 201; Bijker 1995, 6 and 15; Bijker & Pinch 2012,
xvii). Michel Callon introduced the concept in 1980, and it is aptly described
by Hughes (1986, 284–287):

        “--- [B]oth science and technology are socially constructed cultures,
        and that the boundary between them is a matter for social negotia-
        tion and represents no underlying distinction --- Michel Callon, the
        French sociologist believes that ‘the fabric has no seams’. Callon asks
        why we categorize, or compartmentalize, the elements in a system or
        network ‘when these elements are permanently interacting, being as-
        sociated, and being tested by the actors who innovate?’”

Fourth, on the most abstract level technology is defined in terms of
Heideggerian metaphysics related to the understanding of being, and as a
mode of human existence. It is thus described as a frame that defines all hu-
man thinking in every area of life (Heidegger 1994[1953]; Lemola 2000a, 10–
11; Torvinen 2007, 12, 127; see also Théberge 2001, 3). Technology is power-
ful as an analytical tool only when it has been anchored in a certain set of def-
initions. I identify all four types of definition in this study.


2.2.2    Theories of (socio)technical change
Regardless of the definition, technology is not static but requires description
of its change and development. How does it change and develop? From
where does it originate? The concepts invention and innovation are relevant
here, especially with reference to technological artifacts. Innovations are not
necessarily physical objects and could be processes or abstract conceptual
structures (Bijker 1995). On the other hand, many scholars describe the de-
velopment of technology as a series of subsequent events, which are possible
only if certain preconditions, in other words ideas, inventions, and innova-
tions, have been met or realized (Marx & Smith 1994, x; Théberge 2001, 3–5;
2004, 760).
   Fagerberg (2006, 6) distinguishes an invention from an innovation: in-
vention is only “the first occurrence of an idea for a new product or process



                                        35

[p. 36 / pdf 62]

The conceptual and theoretical background



while innovation is the first attempt to carry it out in practice”. This division
is widely recognized. According to Gille (in Magnusson 2009, 78), “innova-
tion is invention applied and incorporated into society.” In the context of
musical instruments, Théberge (1997, 50) states that “an instrument is never
really completed at the stage of design and manufacture at all - - - an ‘inven-
tion’ only becomes an innovation once it has been put into the hands of us-
ers”. In many cases the distinction between invention and innovation may be
ambiguous. At the very least, a certain amount of time between the two stag-
es has to be assumed. In fact, anyone can come up with an invention any-
where, within or outside the scientific community, but turning it into an in-
novation requires resources from the person or the organization to ensure its
implementation. (Fagerberg 2006) The distinguishing of two stages is of sig-
nificance when it comes to analyzing the development and design of Kuren-
niemi’s instruments, which mainly remained in the initial prototype state.
    US communication theorist and sociologist Everett Rogers developed one
of the most influential theories of innovation. In Diffusion of Innovations
(1983) he acknowledges time as a necessary component in the diffusion pro-
cess. He does not explicitly distinguish invention from innovation, even
though similar stages can be assumed from his model. He also identifies dif-
ferent types of adopters, communication channels and social systems as key
components in the process. Diffusion theories inspired by Rogers distinguish
between the technical and the social, which could lead to a problematic situa-
tion in which technology has “an existence which is somehow independent of
humans”. Diffusion theories are also based on the assumption that there are
special discoverers or inventors who bring new technologies to light for the
rest of humanity. Once the invention “has been pointed out to people, it is
simply a matter of time before everyone recognises it as being obvious.” (see
McMaster et al. 1997, 72)
    The innovation process is typically described as a linear model. An engi-
neer or designer first invents or discovers a new solution or device. The in-
vention or discovery is then developed into an innovation, and after that the
finished product is ready to be marketed and distributed to consumers.
Bijker (1995, 7) exemplifies the process in his traditional six-stage model of a
linear innovation process (see Figure 1), although “the number of develop-
mental steps assumed in these models seems to be rather arbitrary” (Pinch &
Bijker 1984, 405; 2012, 16–17). The origin of the linear model is unclear
(Godin 2006, 639).




Figure 1. A linear model of the innovation process, as in Bijker (1995, 7)

Science and Technology Studies (STS; see below) approaches criticize the
linear model as merely a teleological explanation of (socio)technical change,
pointing out that there are many competing solutions in the process, which



                                                  36

[p. 37 / pdf 63]

cannot be assessed based only on a description of the winning outcome. Here
again, the scale of observation influences the assessment of the situation,
and the model cannot be entirely neglected. In certain cases, a linear model
can depict the stages adequately, whereas on another level it fails to explain
the development process. Thus, its explanatory power depends on the scale
on which the design process is observed.
    The linear routine of turning an invention into an innovation via proto-
type testing – first in a laboratory setting and then with users – may help to
explain the success or failure of a project when the focus is on the design pro-
cess of a certain artifact. For example, according to Hannu Viitasalo, Kuren-
niemi’s key engineer and designer in his Digelius Electronics Finland com-
pany, they did not “lab” the designs far enough in Digelius. 45 Viitasalo’s Finn-
ish colloquial expression “lab” (Finn. “labrata”) refers to testing prototypes in
a laboratory environment even before pilot-testing them with users. The lack
of a systematic routine explains the state of Kurenniemi’s design process. On
a detailed level, the designer needs to go back and forth between ideas when
searching for an effective solution: on a more general level, the prototype and
pilot testing require systematic steps – in other words consecutive linear ac-
tion. It is noteworthy that Viitasalo’s assessment of their process was in hind-
sight in that the systematic model for prototype and pilot testing was not at
the disposal of small-scale, DIY-based technology enterprises in the early
1970s – at least not at Digelius’s disposal.
    From another perspective, the researcher studying technological change
locates him- or herself in the grid of technological determinism–
indeterminism–voluntarism (see Marx & Smith 1994, xii–xiii; Niiniluoto
2000, 29–30; Taylor 2001, 26–38; Katz 2010, 3). The distinction is based on
the question of whether technology has a course of its own that directs hu-
man activities, or whether people have a chance to change the course of the
technological development.
    Advocates of technological determinism claim that technological change
has a pace of its own, and a course that people cannot change. Technological
determinism emerged gradually to explain what happens when innovations
generate problems that require new solutions. In deterministic terms such a
development is also described as a technological imperative, meaning that if
an innovation is feasible, it will be executed. Continuous technological devel-
opment, therefore, is beyond human control. (see Niiniluoto 2000, 29)
    Sociology-based approaches have been challenging the deterministic view
since the 1980s, subscribing to the indeterministic or voluntaristic perspec-
tive. The key advocates who rejected the linear and deterministic views came
from Science and Technology Studies (STS) – representing approaches such
as the Social Construction of Technology (SCOT; see Pinch & Bijker 1984),
Actor Network Theory (ANT; see Callon 1980; 2012; Latour 1987; Law 2012),


   45 Viitasalo (2015), in an interview with Ojanen & Suominen.




                                                  37

[p. 38 / pdf 64]

The conceptual and theoretical background



and Large Technological Systems (LTS; see Hughes 1994; 2012) (Bijker 1995,
6; Bijker & Pinch 2012, xiv). The main point within these approaches is the
consideration of technology as a socially constructed system. As Bijker &
Pinch (ibid., xv) remark, “these three approaches did not completely repre-
sent the state of ‘new’ sociology of technology”, and there were also other
contributions such as feminist studies of technology (Bijker 1995, 6; Bijker &
Pinch 2012).
    The three above-mentioned STS approaches can be described in combina-
tion even though they differ in detail. The common theme is that they “put
technology on the agenda of social studies in the first place” (Bijker & Pinch
2012, xvi). They also point out that theories of sociotechnical change should
be symmetrical without linear assumptions, and that an agent or agency –
“one that acts or exerts power - - - [or] something that produces or is capable
of producing an effect - - - [or] the capacity, condition, or state of acting or of
exerting power” (Merriam-Webster 201946) – has to be added into the de-
scriptions. (Bijker 1995, 13–17)
    Under the symmetry principle in STS, both successful and failed projects
should be explained using the same terminology. According to Staudenmaier
(in Bijker 1995, 7), however, only nine papers in the first 25 volumes of the
journal Technology and Culture, that is from 1960 to 1984, described failed
technologies. Bijker (ibid.) describes this as indicative of the view that its
success serves to explain the working of the artifact. STS approaches insist
that the success or failure of a technological artifact is not a cause (explan-
ans), but an effect (explanandum) or outcome of the process of implementing
the technological artifact in practice (ibid.; see also Borgmann 1984, 17–22).
As Pinch & Bijker (1984, 405–406) state, “[t]he success of an artifact is pre-
cisely what needs to be explained”, not something that explains its working.
The symmetry principle can be compared with the turn to studying marginal
and “poor and atypical people” in modern history writing.
    Social and political theorist Jon Elster identified “two approaches to the
study of technical change --- rational goal-oriented activity [and] --- the
process of trial and error” (Bijker (1995, 13). The goal-oriented approach
leads to a bipolar description of the technological design process in which the
value of the technological artifact is based on a simplified assessment:
achievement of the goal is assessed in terms of the functionality of the tech-
nological artifact. The device either does or does not work as designed. How-
ever, such bipolar assessment is challenged when the technological artifact is
used in a creative setting. It is possible to enrich the description of the pro-
cess using concepts such as relevant social groups, interpretative flexibility,
and closure, which were developed within the SCOT approach as a reaction
to the linear models of technological development.


   46 See Merriam-Webster keyword entry Agent in: https://www.merriam-

   webster.com/dictionary/agent (Retrieved on September 17, 2019).




                                                38

[p. 39 / pdf 65]

    The concept interpretative flexibility refers to the “radically different and
competing meanings of a technology” among relevant social groups in the
initial developmental stages of the novel innovation (Pinch & Trocco 2002b,
67). These relevant social groups aim for closure such that one meaning of
the technological artifact is eventually adopted and its use is stabilized. Bijker
and Pinch exemplify the mechanism of interpretative flexibility and closure
with reference to the early stages of bicycle development. Different features
of bicycles – such as a higher or lower front wheel, air-filled or hard tires, a
faster or safer model – were differently valued by the relevant social groups
using them. Bijker and Pinch go on to describe how the development of the
modern bicycle model, which eventually stabilized, was not straightforward
and linear, it was a random process driven by the various expectations, antic-
ipations, hopes and needs of the potential users. (Bijker 1995; see also Pinch
& Bijker 2012)
    Whether or not one believes that closure has been reached depends,
again, on the scale of observation. A certain form of interpretative flexibility
may re-emerge once the technological innovation has stabilized. At any point
in the artifact’s life cycle its users can re-define the meaning of a technologi-
cal artifact and produce use cases that the designer could not possibly have
imagined on the initial level of invention. Whether these local re-inventions
could challenge the technology on a larger scale depends on the maturity of
the system. Here, US historian of technology Thomas P. Hughes (2012) elab-
orates on the description of technological change, emphasizing the potential
effect of the size and age of the system on it. Older and larger systems are less
open to change driven by outside influence than younger and smaller sys-
tems, which are still vulnerable. The technology of electronic musical instru-
ment design was in its infancy in the 1960s, and prone to change.


2.2.3   The role of agency in the designer–artifact–user interaction
    Despite the parallel perspectives on sociotechnical change, there are some
major differences in the STS trends. The key difference between SCOT and
ANT, for example, is in the background: ANT is based on semiotics whereas
SCOT originated in sociology. Bijker & Pinch (2012, xviii) caution against
conflating the concepts from these frameworks precisely because of the back-
ground differences. According to Leskinen (2000, 186), “ANT is not suitable
in sociological explanation.”
    The specific discrepancy between ANT and SCOT concerns the role and
location of agency. In the ANT context, according to Callon and his collabora-
tors French philosopher and sociologist Bruno Latour and British sociologist
John Law, descriptions of actor networks should be symmetrical: in other
words they should not make an “ontological distinction between human and
nonhuman actant”. From the SCOT perspective, on the other hand, agency
cannot be associated with nonhuman network components (Bijker & Pinch
2012, xxii). It is worth noting here that the ANT approach does not assume



                                         39

[p. 40 / pdf 66]

The conceptual and theoretical background



“intentionality in artifacts nor mechanism in humans”, as Leskinen (2000,
186) points out, referring to Callon and Latour who state that their approach
“does not take a stand on the difference between human and nonhuman but
leaves the question unanswered.”
   The term actant is used in ANT to emphasize that the word actor (orig.
French acteur) is not restricted to individual human actors with intentions
but also includes the Greimasean 47 actant, which refers to any component of
the network playing its part in a narrative – without which the story is in-
complete. Actors in Callon’s (2012) case study on electric cars are “the heter-
ogeneous entities that constitute a network”, including “electrons, catalysts,
accumulators, users, researchers, manufacturers, and ministerial depart-
ments defining and enforcing regulations affecting technology.” (Bijker,
Hughes & Pinch 2012a, 5) Here, I outline a simplified node of human and
nonhuman components and their interaction as a network, which I use as a
basic unit in my description of sociotechnical environments (see Figure 2).




Figure 2. A simplified presentation of one node of a heterogeneous actor network with its human
(HA) and nonhuman (NHA) actors or components (Image: Ojanen)

In many cases the network remains invisible, but when a single part of it48
does not work as it should its structure becomes visible (Leskinen 2000,
184). According to Leskinen’s (2000, 186) reading of ANT there is a com-
promise between its symmetrical pole and the asymmetrical pole of SCOT,
hence nonhuman components of the network can “act or exert power”. How-
ever, their agency is not intentional, it is conditional and dependent on their
interaction with the human agent. The outcome of the interaction process is
meaningful only when someone interprets it. The following interaction chain

   47 According to Lithuanian-French semiotician Algirdas Julien Greimas (1917–1992).

   48 A part here means HA, NHA or their interaction, i.e. the arrows.




                                                   40

[p. 41 / pdf 67]

plays a key role in this: 1) human actor (HA) sets the goal for the process
when using nonhuman actor (NHA); 2) NHA reacts to HA’s maneuvers ac-
cording to its explicit and implicit features and functionalities; 3) HA reacts
to the outcome according to their assessment, in other words HA makes a
decision based on whether a) NHA worked as anticipated, b) did not work as
hoped but pleasing unexpected effects occurred, or c) did not work at all and
the possible outcome was rejected altogether. Thus, interaction could reveal
the explicit and implicit features of the technological artifact.
    The network is dynamic rather than static, which makes it necessary to
consider the perpetual contextualization of the relevant actors and their in-
teraction in the process. This dynamic quality influences the point of depar-
ture of my analysis, exemplified in French sociologist Madeline Akrich’s
(1992) distinction between the designer’s projected user and the real user.
The theoretical model initiated by Akrich (ibid.) describing the designer–
artifact–user interaction uses the concept of script. According to Van Oost
(2003, 195):

      “Designers construct – explicitly or implicitly – images of users ‘with
      specific tastes, competences, motives, aspirations, political prejudices,
      etc.’ and inscribe these representations in the technical content of the
      new artifact (Akrich 1992, 208). As a result, artifacts contain a script
      and this script prescribes (in a more or less coercive manner) what
      users have to do (or not do) to produce the envisioned functioning of
      the technological artifact.”

Magnusson (2009, 171) also elaborates on the description, stating that tech-
nological instruments are “never neutral, [but] they contain scripts that [the
users] subscribe to or reject according to [their] ideological constitution.”
Akrich’s distinction between the designer’s projected users and real users
can be applied to the different states of technological artifacts for analytical
purposes. There is a difference in whether an artifact is analyzed as the de-
signer’s initial idea or as a product in the hands of its users. The distinction
reflects the two angles from which technological artifacts can be approached.
    However, what remains obscure in Akrich’s model is that the script does
not distinguish between the explicit and implicit features of a technological
artifact, which may well explain the confusion between the SCOT and ANT
perspectives on the role and location of agency in the network. To elaborate
on the analytical frame of technological artifact evaluation, it is possible to
analyze the features and functionalities from the designer’s (DPoV) and from
the user’s (UPoV) points of view: both are faced with implicit and explicit
features and functionalities that are either deliberately designed or extrinsic
to the design process but affect the use (see Figure 3).
    From the designer’s point of view, the design process primarily concen-
trates on the intrinsic functionalities of the artifact whereas the extrinsic
functionalities are either ignored or remain hidden. From the user’s point of
view on the other hand, the artifact contains the designer’s de-scription: the



                                        41

[p. 42 / pdf 68]

The conceptual and theoretical background



extrinsic functionalities with explicit features amid all the possible ways of
using the artifact – even those not envisioned by the designer - as well as the
implicit features that are extrinsic to the designer’s initial goal. (see also
Pinch & Trocco 2002a, 311–313)

                                                    User’s point of view (UPoV)
                                            EXPLICIT                          IMPLICIT
                                    features of an artifact            features of an artifact
                                 - DPoV: features deliberately    - UPoV: in the early phase of use,
                                 designed; the initial purpose    the user does not necessarily
                                 of the design                    know all the deliberately de-
              INTRINSIC          - UPoV: Engagement with the signed functionalities of the arti-
              functionalities    design; rejection leads to two   fact and they remain hidden
              of                 outcomes: 1) the user chooses    - DPoV: the functionalities the
              the design         not to use the artifact; 2) the  designer fails to communicate to
Designer’s                       user rejects the obvious in-     the real user; i.e. translate from
point of                         tended use but focuses on        projected user to the real user
view                             modification or abuse and
(DPoV)                           searches for the extrinsic and
                                 implicit potential of the arti-
                                 fact
                                 - DPoV: not related to the       - UPoV: features disturbing the
                                 initial or immediate design      immersive use situation; the
                                 goals of an artifact             sound of the medium; e.g. the
              EXTRINSIC          - DPoV: easily recognized and crackling in the sound recording
              functionalities    can be accepted or rejected;     - DPoV: functionalities and fea-
              of                 when recognized and accepted tures hidden from the designer;
              the design         they can turn into intrinsic     they emerge only in malfunction-
                                 functionality deliberately       ing, for example
                                 designed
                                 - UPoV: extrinsic functionali-
                                 ties have potential that can be
                                 employed in the use, thereby
                                 directing the use

Figure 3. The features of a music technological artifact from the perspectives of the designer and
the user (Image: Ojanen)


2.2.4    Technology in a musical and historical context
In the context of evaluating musical instruments, O’Modhrain (2011) recog-
nizes four stakeholders in the design process: the audience, the performer or
the composer, the designer, and the manufacturer. These stakeholders could
be presented as a framework depicting the interaction among the human and
nonhuman agents involved in the design and use of the instrument (see Fig-
ure 4).




                                                 42

[p. 43 / pdf 69]

Figure 4. Human actors (HA) considered relevant social groups and nonhuman actors (NHA)
considered technological artifacts, and their interaction in the process of instrument design and
development, presented in a simplified network; an ideal situation in which all relevant stakehold-
ers have their roles. See also Figures 122 and 123 and the figures in the appendix 1 for descrip-
tions of Kurenniemi’s instruments. (image: Ojanen)

On a physical level the music-technological environment includes equipment
for producing, processing, and storing sound. Such devices could be de-
scribed as physical artifacts with features and functionalities. They are dis-
covered, invented, developed, used, and abused by human actors in interac-
tion with each other and with these artifacts. Research and development in
the field of music technology go on both in manufacturing companies and in
research institutions, as well as in small-scale DIY and audio hardware hack-
ing communities, which are rarely run by one person and usually involve a
complex community of actors. However, actors working utterly alone should
not be dismissed altogether. On the other hand, the process of producing and
composing music, in other words the use of (music) technology, takes place
in the studio, which in most cases is a hotbed of social interaction among en-
gineers, artists, composers and producers – and therefore could be consid-
ered a technological entity.
    As Théberge (2001, 3; in the epigraph of the chapter) notes, in its broad-
est sense music technology could be considered a comprehensive framework
for music-making and consumption in a musical setting. The everyday con-
sumption of music has the power to direct the use of music technology and
the production processes such that it is sometimes difficult to detect the
boundaries between human, society, culture, and technology. The concept of
the seamless web aptly describes this situation. For example, to produce or
to listen to music is to use and modify technology in one way or another. As
Sirppiniemi (2006, 190) points out, “ways of using, making, distributing, and



                                                  43

[p. 44 / pdf 70]

The conceptual and theoretical background



consuming music technology also influence the definition of musical styles
and genres”.
    Musicologist Mark Katz (2010, 2–3), who studied the development of
sound recording, came up with the concept of the phonograph effect. As he
explains, “It's not simply the technology but the relationship between the
technology and its users that determines the impact of recording.” Moreover,
“the influence --- does not flow in one direction only, from technology to user
--- [but] users themselves transform recording to meet their needs, desires,
and goals, and in doing so continually influence the technology that influ-
ences them.” Katz’s statement could be generalized to include the design of
musical instruments as well as of other technological artifacts. Taylor (2001,
31) also elaborated on the determinism question in his practice theory, sug-
gesting that determinism and voluntarism are falsely bi-polarized: “some
sociotechnical systems are more deterministic than others though never
wholly deterministic, --- some provide for more voluntarism than others
though never total voluntarism.”
    The history of musical equipment provides several examples of technolog-
ical artifacts – even commercial products – not being used according to the
initial purpose. As the development of electronic popular music demon-
strates, the unorthodox use of equipment produces sonic expressions and
even new musical genres that have a significant aesthetic impact. The cases
of the TB-303 bass sequencer manufactured by Roland Corporation and the
Auto-Tune tuning-correction software manufactured by Antares Audio Tech-
nologies exemplify end-user usage that deviates from the initial purpose of a
product. Both examples have had a profound effect on the aesthetics of mod-
ern music in various genres of electronic popular music. From this perspec-
tive, it cannot be claimed that the development of (music) technology is tak-
ing place as a process isolated from society and the cultural context.
    The various types of DIY communities, instrument builders, and audio
hardware hackers exemplify instrument-building practices that strongly em-
phasize user-centeredness. DIY and modifying designers propose unortho-
dox and experimental ideas of what might later grow into a successful means
of musical expression. Voorvelt (2000, 67–68) refers to the role of experi-
mentalism in popular music processes when he describes how experimental
pop musicians abuse their equipment and instruments to produce new sets
of musical sounds and expression, adding that this “helps in keeping pop
music alive, diverse and unpredictable.” Turning the research focus on these
actors resembles the “history from below” approach.
    In this sense, my point of departure for this study is at odds with Thé-
berge (1997, 42), who criticizes standard histories that “usually begin with a
number of so-called ‘pioneers’ in the field”. He makes apt observations con-
cerning the invention–innovation relationship within the process of design-
ing musical instruments, but his consumer-based theory unnecessarily dis-
misses the role of “isolated geniuses” and is of little use in artistic and crea-
tive genres such as electroacoustic and experimental music. Théberge con-



                                            44

[p. 45 / pdf 71]

centrates on commercial success, whereas in the underground avant-garde
art scene electronic musical instruments may be site-specific one-off sound
installations. On the other hand, Théberge’s statement could be read as a
demand for objectivity in writing the history of music technology and, in this
respect, it is utterly acceptable.
    Technology in a musical context is technology in a creative context, and
the bi-polarized dichotomy – technology works or does not work – needs to
be revised. Aside from the failing or abused equipment, the influence of
technological artifacts may be much more subtle than the TB-303 and Auto-
Tune examples. This relates to their implicit features, which are enabled by
certain technological qualities. The features emerge as functionalities that are
extrinsic to the designer’s initial idea. Their existence may even remain hid-
den until they are recognized and accepted or rejected. In the context of mu-
sic technology these are exemplified by features of sound quality such as dis-
tortion, saturation and the compression of dynamic range by means of a
magnetic tape or a vacuum tube, or various random effects due to certain
phase behavior of the audio signal. Human decision-making is emphasized in
the TB-303 and Auto-Tune examples, meaning that the producers actively try
to abuse the equipment. In the latter case the agency is encoded in the tech-
nological artifact as implicit features: in other words, its internal quality af-
fects the way the artifact enhances the audio signal.
    In the context of musical instruments, for example, active DIY groups are
modifying technological artifacts to meet their needs and hopes. Modifica-
tions have even been developed into the new commercial products. This
shows how relevant social groups can have an essential developmental role
throughout the life cycle of a technological artifact. Even though electronic
musical instruments gradually established their stabilized form as keyboard
instruments during the 1970s, the quest for instruments with new sonic ex-
pressions and user interfaces remained vibrant within experimental art
scenes. The keyboard instrument became part of the dominant culture,
whereas on the margins there was resistance even to the addition of a key-
board to the electronic musical instrument – and the resistance is persistent.
Eventually, there may be several parallel stabilized forms of one technologi-
cal artifact.
    The STS approaches attracted criticism in the 1980s when the first publi-
cations presented their frameworks. The overarching critique was that even
though such approaches concentrated on opening the black box, they found it
empty and were unable to explain the sociotechnical change. The ambiguous
term agency was difficult to define, for example, and users of technology re-
mained in a minor role. Later, SCOT-based researchers started specifically to
emphasize the user’s role in the development of technology (see Oudshoorn
& Pinch 2003).




                                        45

[p. 46 / pdf 72]

The conceptual and theoretical background



2.3 Music: writing music history and definition(s) of
    music
        “The concept of a work, seemingly the most stable element of music
        history, dissolves into a source, an authentic text, a composer’s inten-
        tion, and an historian’s notion as to the musical significance of the
        acoustical substrate sketched out by the text or realized according to
        the guidelines laid down with it.”
                                       Music philosopher and historian Carl Dahlhaus (1983, 35)


The general historiographical concepts and argumentation I have reviewed in
the previous chapters are applicable to the history of music. However, a few
specific factors distinguish music from other historical subjects. One key dif-
ference is the dual role of a musical work – as well as serving as documentary
evidence of the past, it is an aesthetic object of the present. According to
Dahlhaus (198349, 20–23; see also Huttunen 1993, 23), the documentary
value of a musical work in the writing of music history emerged only after the
Second World War. Not only do technology-driven musical works and sound
recordings have such documentary value, they also provide documentary ev-
idence of the state and quality of the technology used in their realization.
    Scholars considering the documentary value of a musical work debate
about the continuity and discontinuity of historical evidence. Regardless of
the number of musical works that are studied, they provide only fragmented
evidence. This calls into question the possibility of formulating an adequate
explanation of the past solely by studying musical works. On the one hand it
is suggested that a study focusing on works of art as autonomous objects
cannot produce a consistent description of the past, whereas on the other
hand it is suggested that researchers concentrating on other than musical
aspects do not write the history of music. (Dahlhaus 1983, 19–20; Sarjala
2002; Shreffler 2003, 514–15) The key debate on this issue has focused on
the acceptable content of musicology and the directed writing of music histo-
ry. From this perspective, music history writing, music philosophy and aes-
thetics are tightly intertwined.


2.3.1    Writing music history
Philosopher Lydia Goehr (1992) aptly points out the similarities of three
works on music historiography published in the late-1980s.50 According to
Goehr, all three writers capture


   49 It is notable that Dahlhaus’s dual definition derives from Johann Gustav Droysen’s ideas pre-

   sented in Historik (Droysen 1953[1857], Dahlhaus 1983, 3–4).
   50 Dahlhaus, Carl (1989) Nineteenth–Century Music; Meyer, Leonard B. (1989) Style and music:

   Theory, history and Ideology; Treitler, Leo (1989) Music and the historical imagination.




                                                   46

[p. 47 / pdf 73]

       “a common and very basic concern: to reconcile the desire to treat
       musical works as purely musical entities with value and significance
       of their own – with the desire to account for the fact that such works
       are conditioned by the historical, social, and psychological contexts in
       which they are produced.”

This juxtaposition has “plagued musical scholarship for at least two hundred
years”, and the problem emerges when writers are “faithful to one side at the
expense of the other” (Goehr 1992, passim). Thus, the writing of music histo-
ry has become intertwined with the definition of a musical work in a way that
warrants more detailed investigation into the development of the discipline.
    As Goehr notes, the debate over musical and non-musical content per-
sists. Musicology has been characterized by the Adlerian 51 systematic and
historical division since the late-19th century (see also Huttunen 1993). De-
spite later criticism, the discipline was essentially founded upon this distinc-
tion,52 which reflects attempts to define its acceptable content. Sarjala (2002,
26–27), expressing another point of view, suggests that the target of the re-
search specifically defines how far the researcher can diverge from music and
still call him- or herself a musicologist. In other words, the research target
dictates the contents of the musicological profession. Sarjala (ibid., passim.)
criticizes Finnish musicologists for focusing solely on composers and musical
works, and not on music in its cultural context. In his view, writing on music
history that is based on the study of musical works as autonomous entities is
too narrow and implicitly political.
    Throughout the history of musicology, attempts to reconcile the musical
and the extra-musical have concentrated on adjusting the discipline by rede-
fining its focus. This has not halted the debate, however. On the contrary,
questions that emerged in the early-1980s (see Tomlinson 1984) are still rel-
evant. Quite recently in the 2010s, for example, Mantere & Kurkela (2015, 5)
claimed that there was no consensus as to whether future research should
focus on sound or on its cultural, social, and historical context. Similar con-
cerns have been expressed by the international community of popular music
researchers initiated by Philip Tagg (see e.g. Tagg 2015). Sivuoja-Kauppala et
al. (2013, 3–4), summing up the situation, state that composers and works
are not banned as research subjects, but just as in general historiography
with its multitude of methods and targets, non- or extra-musical issues are
also acknowledged as a relevant ingredient of music research and music his-
tory. Again, the discussion turns toward thick description.
    The debate on the content of musicology has not been restricted to the
discipline, having spread to music studies and other branches of research in


   51 According to Austrian musicologist Guido Adler (1855–1941).

   52 Juxtapositions as aesthetic and historical (Dahlhaus 1983, 19–33; Goehr 1992), analytic and his-

   torical (Goehr 1992; Huttunen 1993), and historical and non-historical (Huttunen 1993, 4) were
   used later.




                                                   47

[p. 48 / pdf 74]

The conceptual and theoretical background



art and culture. According to Sarjala (2002, 21, 29), most music history is
written by musicologists, not historians, many of whom lack expertise in
methods of history writing. However, as Burke (1991b, 2–6) pointed out, the
reign of exclusively professional historiographers collapsed during the sec-
ond half of the 20th century, since when history writing has been considered a
legitimate activity in disciplines other than history, and not limited exclusive-
ly to trained historians. The contention between musicology and the other
disciplines arose from the notion that music is a specific entity the study of
which requires a thorough musicological education. As Huttunen (1993, 7–8)
states, for example: “musicologists would not accept a music historiograph-
ical study, if its material had not been defined with music theoretical con-
cepts.” From this standpoint, the writing of music history requires musico-
logical expertise rather than a degree in history studies.
    The role of the musical work as the primary focus in music history is also
linked to canonization, which is a process that emerges when the researcher
exemplifies an argument with a set of selected works considered worth study-
ing. It has even been stated that no “trivial music” can be used as an example
(see Dahlhaus 1983, 19–20; Shreffler 2003, 515). According to Huttunen
(1995, 22):

       “- - - there’s no reason to restrict canon to musical works. If we think
       of the historian’s work as a whole, we should extend the concept of
       ‘canon’ to comprise all other factors of music history, too. A certain
       class of historical persons, events, trends and other historical facts
       (understood in the very wide sense of the word) has become canonic.
       Instead of ‘reportorial canon’ we should perhaps rather speak of the
       ‘canon of facts’”.

Thus “the canon functions as a basic tool in defining the scope of this disci-
pline” (Kurkela & Väkevä 2009, vii).
   The principles of canon formation are questioned, especially by critical
(ethno)musicologists and postmodern writers who wonder on what grounds
certain works and composers are selected, and others are excluded (Mantere
& Kurkela 2015, 1). Concentrating solely on selected works overshadows oth-
ers, and implicitly puts them in a minor position – or even destroys them
(see Adorno 2006, 34). Selecting examples for historical description means
making an implicit value judgement.
   Problems associated with canonization have inspired writers of music his-
tory to search for solutions. Terms such as probing canons, de-canonization,
and de-construction have recently emerged in the literature (see Kurkela &
Väkevä 2009; Mantere & Kurkela 2015). Turning the focus away from canon-
ized composers and selecting a work from outside the canon resembles the
history from below approach in two ways: it is accepted that everything has a
history, and the perspective shifts to that of ordinary people or those in the
margins (Burke 1991b 2–6; see also Chapter 2.1). Focusing on the marginal




                                            48

[p. 49 / pdf 75]

resembles the shift in research to failed designs in Science and Technology
Studies (see also Chapter 2.2).
    However, as Gloag (2015, 231) observes, once critical postmodernism has
built its own canon its “story is a singular one.” Kurkela & Väkevä (2009,
viii), in turn, describe how “[d]ifferent musics have already formed their own
canons.” Choosing to examine a minor subject is to draw more people and
works into the canon rather than to de-construct it. Focusing on the new sub-
ject inevitably overshadows other subjects and, in this respect, canons cannot
be avoided (ibid.), but researchers should be conscious of the process, and
clearly explain why they have selected a certain set of works to exemplify a
certain phenomenon. This clearly resembles the demands of Burke (1991a,
239) and Megill (2007, 1–3) for researchers to make themselves, their atti-
tudes and their intentions visible to the reader (see Chapter 2.1 on history
writing). Moreover, instead of referring to de-canonization, writers should
rather discuss perpetual re-canonization as an unavoidable feature of (mu-
sic) history writing. With regard to the subject of this study, it is already clear
that research centered on Kurenniemi shadows other actors in the field and
gives a one-sided description of electroacoustic music in Finland.
    Questions concerning the research focus and how to define which features
are musical and extra- or non-musical, which the discussion on the writing of
music history triggered, are of significance to anyone analyzing and writing
the history of electroacoustic music. Descriptive cultural and historical writ-
ing is essential, but it only covers one side of music: a clear definition is re-
quired to set the focus and to thicken the descriptions. My target within this
study is to reach Goehrean integration, in other words to find a balance be-
tween analyzing works – here both musical work and musical instruments –
as “purely musical entities with value and significance of their own”, and to
consider “the fact that such works are conditioned by the historical, social,
and psychological contexts in which they are produced” (Goehr 1992, 182).
    Whereas Goehr approaches the question from the producer’s point of
view, Camilleri & Smalley (1998, 7) diversify the contextualization of electro-
acoustic music to the receiver, redirecting the analytical goal to the reconcili-
ation of the internal world of work with the outside world. As Goehr (1992,
194–195) points out, the dispute continues if one side is considered essential
and the other contingent. Definitions of music and a musical work are need-
ed to delineate the target of research on electroacoustic music, and these are
to be found in concepts developed within music philosophy and aesthetics.


2.3.2   The concepts of music and a musical work
Whereas the historiographical questions posed in the previous sections are
mainly epistemological, the quest for a definition of music diversifies the dis-
cussion into ontological themes. Roughly defined, concepts and theories de-




                                         49

[p. 50 / pdf 76]

The conceptual and theoretical background



veloped within philosophical approaches, such as ontology and semiotics or
semiology (Hatten 1992 53, 88; see also Dunsby 1983, 27), cover the essence of
the research target, whereas aesthetics concentrates on questions of percep-
tion – especially in the domain of art. However, as several researchers note,
the line separating philosophy, ontology, semiotics, and aesthetics is some-
what ambiguous. Aesthetics, for example, also covers broad questions con-
cerning the essence and existence of art. 54 (Padilla & Torvinen 2005, 10–11;
Tarasti 2012, 3–10)
    Aesthetics has traditionally been concerned with the judgement of percep-
tion, especially in the beauty and value of artworks. However, topics of inter-
est diversified during the 20th century to cover perceptions of the unbeautiful
and the ugly. The focus of aesthetic scrutiny has broadened from experi-
mental and electronic music to formerly taboo phenomena such as noise and
silence. Twentieth-century experimentalism in particular challenged scholars
to debate categorizations such as art vs. non-art, and music vs. non-music. A
further focus in addition to all this is on studying the artist’s intentions and
how they are received by the recipient of the artwork or performance. (Ham-
ilton 2007; Demers 2010, 164; Tarasti 2012, 4)
    According to Demers (2010, 5), aesthetics theory, unlike ethnography and
descriptive history writing, provides interpretations of phenomena, as: “the
aesthetic interpretive subject - - - reflects critically, albeit imperfectly” and
does not “claim a truth content” as easily as an ethnographer. Demers does
not refer to Geertz’s thick description or to Megill’s unresolving tension as a
historiographical paradigm, but the resemblance to these concepts is clear.
His comment also resonates with the views of Tomlinson (1984) and Emmer-
son & Landy (2016, 22), who state that analyses based on the mere descrip-
tion of musical works as objects detached from their production or reception
produce thin descriptions. Again, contextualization is needed to thicken the
descriptions.
    As I report in the previous chapter, one of the main contentions in music
research is based on seemingly exclusive categories of music as an autono-
mous object and music as an object in relation to its production or its per-
ception: musical vs. extra-musical, in short. The line between the two is arbi-
trary. To facilitate the definition of what the work in electroacoustic music is,
I describe a few attempts that have been made to define music and musical
work and how they relate to the discussion about music as an autonomous
object or absolute music. Researchers may choose to approach music from
either of these perspectives, although both complement each other.



   53 According to Hatten, semiology is used by French writers whereas English writers use semiotics,

   although the choice of term is not merely a question of language “but there is a real difference be-
   tween the more structuralist perspective of Saussure’s semiology and a Peircean semiotic that pro-
   vides a hermeneutic component as well.”
   54 Ala-Könni et al. (1977, 354–355).




                                                   50

[p. 51 / pdf 77]

   The above-mentioned categorization forms a basis for a threefold per-
spective that is applicable not only to writing music history but also to music
analysis. This division into three parts has its roots in the concepts of poiesis
and esthesic, which derive from the Ancient Greek words for “to create” or
“to make” (-poietic), and “to sense” or “to perceive” (-esthesic). Jean Molino
(1990) uses these concepts in his semiology-based tripartition model (see
Figure 5), which his student Jean-Jacques Nattiez (1975; 1990) developed
further. Molino borrowed the word esthesic from Paul Valery, and poietic
from Étienne Gilson (Molino 1990, 129–130), the former being Valery’s ne-
ologism of the Greek word for aesthetics (Nattiez 1990, 12). The model is
based on semiotics and linguistics, and it describes the complex processes of
creating (producing) and interpreting (perceiving) the meaning of a (musi-
cal) work.




Figure 5. Nattiez’s tripartition model (1975, 52; 1990, 17)

According to Nattiez (1990, 16–17), the tripartition model is not based on the
traditional model of communication theory implying that the message is car-
ried from sender to receiver in a straightforward process. On the contrary,
the assumption is that the meaning is constructed in two different processes,
first by the composer in the poietic process and later by the receiver of the
work in the esthesic process. Thus, the meaning is not necessarily the same
to both parties, and any similarity between the composer’s intentions and the
receiver’s interpretation is serendipitous.
    Should the receiver assign the same – or even a somewhat similar –
meaning to the work, or interpret it according to the composer’s intentions, it
is because composer and receiver share similar cultural and historical back-
grounds, personal attitudes or traits, and experiences, for example. Guide-
lines dictated by the musical genre also play a significant role in both poietic
and esthesic processes. Music – as a subject of research – can be approached
from either of these perspectives (see also Chapter 3.3 for a description of the
methodology used in the study).
    Tripartition also accounts for the material reality of the work, in other
words the physical traces resulting from the poietic process including the
“work’s live production, its score, its printed text, etc.” (Nattiez 1990, 15). The
material reality does not include or consist of one stable meaning, message,
or signification per se, neither does it convey the composer’s intention (ibid.,
15). It is merely a vehicle that triggers the esthesic process – a process during
which the receiver creates his or her interpretation of the work or assigns a
meaning to it. The material reality of a work has been considered an objec-
tive entity and described as the neutral level, which has rightfully been criti-
cized. Critics have challenged the description of music on this level for two
main reasons.



                                                   51

[p. 52 / pdf 78]

The conceptual and theoretical background



    First, approaching a work on a neutral level has been considered episte-
mologically impossible (e.g. Hatten 1992; Samuels 2004). The work as a neu-
tral object disappears when it is examined, or as Demers (2010, 11) states:
“[a]n author who claims complete objectivity and value-free neutrality is - - -
being disingenuous, since every observer has a point of view.” The criticism
resonates with general historiographical tenets, such as put forward by histo-
rian Edward Hallett Carr (in Tomlinson 1984, 354):

       “[t]he belief in hard core historical facts existing objectively and inde-
       pendently of the interpretation of the historian is a preposterous fal-
       lacy, but one which it is very hard to eradicate.”

Nattiez (1989; 1990) did not mean that an objective neutral level could exist,
however. Nor did he demand “scientific neutrality on the part of the author of
analyses” (Nattiez 1989, 36): his first revision (Nattiez 1975) was misread by
scholars. He aimed to analyze the immanent sonorous configurations of the
work (Nattiez 1990, 61), in other words its material reality. My aim in this
study is to dodge ontological discussion, although I acknowledge that I take
an ontological stand in basing it on the assumption that a musical work as a
material reality with measurable and observable features exists. This seems
to be a perpetual bone of contention within the research community.
    Second, it has been stated that analysis conducted on only the neutral lev-
el produces a thin description (Tomlinson 1984; Emmerson & Landy 2016).
On the material level the work disregards the details related to both the poi-
etic process of the composer and the esthesic process of the receiver – as well
as to the performance of the work. Nattiez considered the neutral level simp-
ly a point of departure for analysis – and the analysis should be complement-
ed with examination of the poietic and esthesic processes. As Emmerson &
Landy (2016, 22) point out, technology-oriented musical works such as glitch
techno tracks lose crucial parts of their meaning if they are approached only
from the point of view of the listener. Here, they use the concept poietic
leakage to emphasize the need for contextualization. Thus, locating the
meaning of music cannot be based only on a description of the material reali-
ty of the work.
    Especially in the context of electroacoustic music – or any music on media
that can dislocate it from its original context – the analysis remains thin
when examined only on the level of the work’s material reality. Even in the
case of recorded music, in which it is seemingly static (constant or unal-
tered), approaching a musical work only as the material trace of the poietic
process is ambiguous.55 Detached from the original context, music or sonic
events start to live a life of their own without necessarily any reference to
their origin. According to Talbot (2000, 185), “recorded sound has the power

   55 For a more detailed discussion about the influence of the digitization process and the role of the

   technical engineer in music analysis see e.g. Ojanen (2015).




                                                    52

[p. 53 / pdf 79]

to turn non-works into real works. Once it has been recorded, improvised
music - - - acquires a fixed, infinitely repeatable essence that allows it to be
treated as a quasi-work.” On the other hand, one could ask whether the mu-
sical meaning is located in the work or only in a fleeting improvised perfor-
mance. According to Lebanese sound artist Tarek Atoui56 and the aesthetics
of the STEIM Studio, their art loses its (original) meaning when documented
as a sound or video recording.
    It is worth pointing out here that concepts such as absolute music and
music as an autonomous object are not interchangeable with the neutral lev-
el as described by Nattiez. The concept of absolute music outlined by 19th-
century German composer Richard Wagner denotes instrumental music
without any reference outside of itself, and contrasts with program music
(Dahlhaus 1989; Ashby 2010). As described by Demers (2010, 163), absolute
music refers to “western art music that supposedly transcends language and
forsakes explicit associations with outside world. Absolute music is instru-
mental music that lacks a program or other extramusical narrative or expla-
nation.”
    The ability of a musical work – a work understood here as a material trace
of the poietic process – to refer outside itself is not dependent on the com-
poser’s intention or the perceiver’s ability or willingness to form such refer-
ences. The material reality of a musical work and its meaning can be lik-
ened to the mass of a physical object and its weight, respectively. The object
has its mass regardless of its outside circumstances. Only when it is placed
under gravity does it gain weight, which is defined by both the internal prop-
erties of the object and its surrounding circumstances. Thus, the construction
of the meaning is dependent on both the immanent sonic configuration of the
work and the context in which this configuration is perceived. Roman
Ingarden, having noticed this flexibility in the signification of the work’s mu-
sical meaning, explains that each epoch interprets musical works in its own
way and defines what is correct and what is authentic at the time, according
to either the public or the performer (in Nattiez 1990, 74).
    It is also worth noting here that Goehr (1992, 186) warns against conflat-
ing the concepts of music and a musical work. She refers to her key argument
in The Imaginary Museum of Musical Works (Goehr 2007) that the concept
of a musical work emerged around the year 1800: prior to that date, com-
posers were not able to think of or define their compositions as works. She
further argues (Goehr 2007) that, when considered a work, music has regula-
tive power, which dictates how the works are performed and how the music
is used. Even though she concentrates on classical music, in which the work
concept even drives concert practices, her argument has explanatory power
over the processes of electroacoustic music production and performance. As I
show in this study, users of Kurenniemi’s instruments differ in their attitudes


   56 Personal communication with Atoui in 2012.




                                                   53

[p. 54 / pdf 80]

The conceptual and theoretical background



towards the definitions of music and a musical work. As an extreme example,
it could be said that Kurenniemi produced music, but he did not compose
musical works. Moreover, his electronic musical instrument of the future was
supposed to produce digital on-demand music at the flick of switch whenever
needed. He57 predicted that, in the age of digital music production, music
would lose its identity and, if nothing else, it would be cheap – I read this to
mean that there would be no copyright. From this perspective, it is not fruit-
ful to classify Kurenniemi’s future digital music as works that have regulative
power. Endless music flow can be acquired on demand.
    I use concepts from aesthetics as tools for unveiling the subject of this
study rather than for defining what is valued as good, beautiful, or ugly in
electronic music. The historiographical contention over the musical and the
extra/non-musical challenges music analysis. To focus the analysis within
this work, one primary task is to contemplate questions such as how to define
electroacoustic and technology-driven music; what kind of information can
be gained from it; and from what perspectives it can be approached. Accord-
ing to Demers (2010, 158–159), the aesthetic theory of electroacoustic music
needs particularly to consider “how nonmusical sound differs from tradition-
ally musical sound”.
    Electroacoustic music together with the design and use of electronic mu-
sical instruments provide an excellent testbed for seeking answers to these
questions. As a theoretical set of concepts, Nattiez’s tripartition is an effective
point of departure for setting the focus of music analysis. Enhancing under-
standing of electroacoustic music in its context requires investigation into
instrument-building practices on the one hand, and performance and percep-
tion practices on the other. I discuss this in more detail in the chapter on
methodology (Chapter 3). Before that, to put this study in context, I outline
various definitions of electroacoustic music.


2.3.3   Definitions of electroacoustic music
The concept of electroacoustic music has been evolving since the 1950s
(Emmerson & Smalley 2001; Weale 2005). Its definition and content vary
not only across disciplines but also across geographical locations and profes-
sions. In the context of this study, I use electroacoustic music as an umbrella
term referring to the technology-emphasized musical genres and styles that
developed mainly in the West starting in the mid-1940s. Like many other
genres, electroacoustic music breaks down into several sub-genres. As Em-
merson & Landy (2016, 8) point out, the EARS website lists 81 sub-genres of
electroacoustic music. Here, I simplify matters and use the term electroa-
coustic music to “bind together facts that other” advocates “keep separate”
(Nattiez 1990, 55).


   57 Kurenniemi (1967) in an interview with Oura.




                                                 54

[p. 55 / pdf 81]

    Within this study, electroacoustic music refers to musical styles and gen-
res such as electronic (both general electronic music and the German el-
ektronische Musik), concrete (the French musique concrète), acousmatic,
and tape music, and to some extent live electronic and computer music. Gen-
res that have emerged with an emphasis on popular culture such as elec-
tronica, intelligent or electronic dance music (IDM or EDM), techno, mi-
crosound, glitch, and ambient could also be categorized under electroacous-
tic music, but they fall beyond the time frame of this study. The division be-
tween high and low, in other words between classical art music and popu-
lar-culture-oriented music, on the other hand, is of special relevance to the
discussion on electroacoustic music.
    In addition, genres such as sonic, sound, and sounding art, as well as
sound installation and Klangkunst are very closely linked to electroacoustic
music and are sometimes categorized as part of it. Many works and artists
discussed in this study could be categorized under contemporary sonic or
sound art but, given that the terms sound and sonic art have been widely
used only since the 1980s, describing artists of the 1960s in such terms would
be anachronistic. Of course, there are always exceptions: Gordon Mumma,
Robert Ashley, David Behrman, and Alvin Lucier, for example, used the
name Sonic Arts Group – and later Sonic Arts Union – as early as in the
1960s in the United States (Mumma 2015, 298). Nevertheless, most contem-
porary sources that served as research material for this study use the term
electroacoustic music, whereas sound art and its variants are rarely men-
tioned. Moreover, none of the above-mentioned popular electronic music
genres – at least by name – appeared within the time frame of this study.
Thus, the question of terminology is significant when considering issues re-
lated to emic and etic approaches to the research project.
    In the context of this study, the term acousmatic music requires special
attention. Besides being a musical genre in itself nowadays, it is a term with
overarching significance within electroacoustic music. As a musical genre it is
a special type of electroacoustic tape music, the origin of which is in French
concrete music (musique concrète). Acousmatic music also refers to listening
situations in which the sound is detached from its source, meaning that the
listener cannot see the cause of the sound. The term refers to Pythagoras,
who spoke behind a curtain to enable his pupils to concentrate on the con-
tents of his lectures rather than on him (Schaeffer 2017, 64; see also Kane
2014, 45–72 for a critical review of the myth of the Pythagorean veil). Elec-
troacoustic music is typically standalone tape music, which is produced in
the studio environment directly on tape and reproduced through loudspeak-
ers from the sound recording in the concert setting: in other words, members
of the audience perceive only the sound and do not see the poietic process or
the performance. Paradoxically, this was the key feature of standalone elec-
troacoustic music in the 1970s, for which it was criticized.
    Electroacoustic music is also closely related to experimental music, alt-
hough the two are not mutually exclusive. Experimentalism could be consid-



                                       55

[p. 56 / pdf 82]

The conceptual and theoretical background



ered a built-in feature of electroacoustic music due to its origin. At the dawn
of electroacoustic music there were no ready-made instruments dedicated to
music production, hence the development of the genre rested on an interest
in testing how general-purpose equipment could be used in music or sound
production – and the conscious envisioning of musical instruments of the
future.
    According to Demers (2010, 7), experimental is a time-bound, dynamic
and evolving feature of artistic activity and the direct opposite of convention-
al. The notion of experimental and conventional dynamics in the context of
electroacoustic music enriches and fulfills these reflections, as Demers (ibid.)
concludes: “- - - something experimental in 1985 could have inspired what
was conventional by 1990.” Poschardt (in Monroe 2003) made similar re-
marks, referring to pop culture as an “instrument with which counterculture
is turned into the dominant culture”; and according to Voorvelt (2000, 68),
“we often find that experimental techniques, albeit slowly, leak into the
mainstream, so that experimental musicians are often more influential than
they might seem.” Ballantine (1977, 241), in turn, states:

       “the scientific frame of mind of ‘what can we discover? is thus one of
       the central irreducible feature of experimental music.” --- “Such a
       frame of mind is totally future-oriented: its sole intention is to pro-
       duce the future. By comparison, Western traditional music tells us
       what is, or has been, known or hoped or felt; its performances repro-
       duce the past.”

I see electronic media as a tool, and experimentalism as a tenet. A composer
or an artist is free to use any tool that he or she finds appropriate while ac-
quiring an attitude, which is either conventional, traditional or experi-
mental. Experimentalism was a core feature of electroacoustic music in its
early days. There was no tradition within the genre, and in particular the in-
struments were new – even intended to break free from traditional practices
of both design and performance. Later, when composers and artists had ad-
justed to the medium, its neutral, value-free nature disappeared and similar
attitudes that defined high-art and popular started to describe the works
realized by electronic means. This comes out clearly in the material used for
this study.
    The background of electroacoustic music can be traced to various devel-
opments in music, culture, and technology during the 19 th and 20th centuries.
The historical overview of electroacoustic music and its relevant precondi-
tions I present in Chapter 4 traces the preconditions of global developments,
of Kurenniemi’s instrument design, and of electroacoustic music in Finland
in the 1960s and 1970s.




                                            56

[p. 57 / pdf 83]

3 METHODOLOGY

In this chapter I present the methodological toolbox I used when writing my
history of music technology, the emphasis being on the source-material-
driven qualitative approach. Including quantitative tools would have been
beneficial.58 General qualitative methods underlie all three themes of the
study – history, technology, and music – whereas technology and music
studies in particular have their specific applications of the general methodo-
logical tenets. First, I describe the similarities between the chosen methods.
Next, I elaborate on the specific tools employed in the research on electronic
musical instruments, and then in analyses of electroacoustic music, both of
which are within the scope of this study. It is worth noting that some of the
theoretical (see Chapter 2) and methodological concepts overlap. One con-
cept I consider important from the methodological perspective is microhis-
torical observation scaling, as described by Levi (1991) in particular.


3.1 Writing a history of music technology as a
    qualitative research project
The subject of this study – in the broadest sense – covers practices in the de-
sign of electronic musical instruments and the use of these instruments in
electroacoustic music compositions and performances in Finland during the
1960s and 1970s. On the more concrete level of research material, the study
is based on three types of primary objects: 1) historical events, 59 2) techno-
logical artifacts,60 and 3) works of art.61 I examine these objects to enhance
understanding of the subject.
    Primary objects have two kinds of roles, which should be considered when
they are interpreted. They may be static and time-bound objects related to a
certain event in the past, or fluid objects that assume different meanings at
different times and in different contexts. Primarily, this division is related to

   58 However, had I employed statistical methods I would have outlined the overall research design –

   especially the data collection – differently from the very beginning of the project. For future pur-
   poses and to broaden the project to include statistical, machine-actionable, and research data, I pi-
   lot-tested research-driven metadata production. See Ojanen, Mikko. 2019. Preliminary metadata
   for the UHMRL digital tape archive pilot (Version 20191223_01) [Data set]. Zenodo.
   http://doi.org/10.5281/zenodo.3591336
   59 Such as concerts, happenings, performances, exhibitions, conferences, seminars, and meetings.

   60 Such as musical instruments and technological devices.

   61 Such as music and musical works, poetry, sculptures, sound installations, and dance works.




                                                   57

[p. 58 / pdf 84]

Methodology



the notion that music – or more precisely, a musical work – is both an aes-
thetic object of the present and documentary evidence through which the
past can be approached (Dahlhaus 1983, 4; see also Goehr 1992, 194;
Huttunen 1993, 19). I argue that technological artifacts have a similar dual
role. On the analytical level, technological artifacts and musical works could
be considered within the same framework: for both there is the creator, ma-
terial evidence of the creation process, and the receiver or user.
    Within this study, I view history writing as an interpretative and herme-
neutic project (see Carr 1986, 24; see also Chapter 2). Documentary evidence
of the past is turned into hermeneutic units62 through selection and annota-
tion. Premises that are too narrow may direct the analysis in a predetermined
direction such that the results reflect the researcher’s hypotheses rather than
the subject of the study. The researcher should pay attention to the details
affecting the interpretation. In practice, therefore, history writing is intensive
interplay among the research material, the methods, and the target of the
project. The input of the researcher has a significant role in terms of his or
her own background and motives – whether conscious or suppressed.
    I start with my research task and initial questions, which I fine-tune dur-
ing the process. From this point of departure, I proceed bottom-up and top-
down, in turn. In other words, although the project is source-material-driven,
I anchor the study in previous research traditions by detecting existing con-
cepts and models that give it explanatory power. In many cases, these con-
cepts and models help me to target my analytical view or to describe details
in the material, although sometimes previous models or prior analyses turn
out to be deficient or biased and need to be revised. Thus, my research set-
ting emphasizes the inductive research approach, with concepts and theories
lurking in the background (see also Katz 2012, 8–9).
    The mechanism of selecting pertinent features from the research material
resembles qualitative research settings such as content analysis. I borrow my
overarching methodological concept, pertinences, from the context of elec-
troacoustic music analysis, and employ it as a general qualitative tool. The
concept was initially outlined by Delalande and then revised by Camilleri &
Smalley (1998, 5). According to Delalande (1998, 19; Camilleri & Smalley
1998, 5) pertinences are “salient sonic features”, which are “considered rele-
vant”, in line with the question, and “lead to analysis”. In the context of elec-
troacoustic music, the chosen listening strategy directs the selection of per-
tinences, which also resembles the analytical perspective in the content anal-
ysis. When one is surrounded by a plethora of research material it is im-
portant to acknowledge that not everything can be studied. Here, the idea of
pertinences helps to frame the project.
    The first concrete methodological steps taken in this study were the col-
lection and selection of the material. In this process, categorizing and choos-


   62 I borrow the concept from the qualitative research software Atlas.ti.




                                                    58

[p. 59 / pdf 85]

ing the pertinent features guided the response to the research questions. Fur-
thermore, it was necessary to analyze and interpret both the documents and
the gaps in them. I clarified the relationship between the research target and
the source material by mapping them with their role and position in the re-
search process (see Table 1).
Table 1. The relationship between the research target, the source material and their role and
position in the research process

Levels of exami-      Status of source and      Description of the object of examination
nation                data
The sixth level       Interpretation            The synthesis of the research questions, methods
                                                and analysis
The fifth level       Analysis                  Based on the fourth-level data
The fourth level      Research data             Categorized, systemized, selected primary and sec-
                                                ondary sources: the pertinences
The third level       Secondary source mate-    Retrospective interviews, imaging methods (= an-
                      rial                      notated sonograms), annotated contemporary doc-
                                                umentary evidence, observations from the contem-
                                                porary documentary evidence, previous research
                                                literature
The second level      Primary source material   Contemporary documentary evidence: photos,
                                                record sleeves, letters, applications, magazine and
                                                newspaper texts, audio and video documents, con-
                                                temporary interviews concerning the events, tech-
                                                nological artifacts and musical works
The ground level      The target of the study   The past


As I explain in the theoretical chapters, the target of the study on the ground
level – that is, the past – cannot be accessed directly and has to be ap-
proached through the primary source material. The secondary source mate-
rial, on the other hand, cannot be trusted without verification via source crit-
icism and cross-referencing: both are major methodological tools at every
turn – even with regard to the primary source material. The three upper lev-
els concern the material and data produced within the study. The farther I
move from the ground level the more relevant is my subjective interpreta-
tion. As an underlying methodological tenet, I elaborate on the role of my
subjective point of view via the concepts accepting unresolving tension and
avoiding hindsight.
    The importance of source criticism and cross-referencing is highlighted
especially in handling the interview material – both the contemporary histor-
ical interviews and those conducted more recently. As Megill (2007, 49–50)
notes, oral history, which is based on memory, does not qualify as a primary
source. Memory-based material that serves as evidence of the past in history
writing should therefore be considered a secondary source. Megill (2007, 25)
distinguishes between traces and sources thus: “sources are always already
interpretation of events whereas traces are not. Traces are insulated from
people’s (un)conscious wishes to remember. Memory lacks this kind of objec-
tivity.”
    For the most part I conducted the interviews I use in this study in collabo-
ration with Jari Suominen, Kai Lassfolk, and Marko Home. As unstructured
in-person thematic interviews they are thus typical research material in the



                                                 59

[p. 60 / pdf 86]

Methodology



field of oral and communicative history. Along with our open-ended ques-
tions, we used original documentary evidence as memory-evocation aids.
During our interviews in the 2000s I was able to use several interviews con-
ducted by composer Jukka Ruohomäki in the 1990s for his research project
on the history of electroacoustic music in Finland. The focus of this study is
on the 1960s and 1970s, therefore I consider the interviews to be secondary
sources: in another research setting such as if composers and artists were
asked how they currently felt about their past, the present interview material
could serve as a primary source.
    I crosschecked the interview material with other sources such as contem-
porary newspaper articles, journals, diaries, and daily planners, among other
documents, thereby ensuring material triangulation. Discussion based on
open-ended questions should be categorized and re-arranged according to its
pertinence to the research task and questions. From this perspective, the in-
terview method serves not only to discover or verify facts, but also to sketch
the historical interpretation.
    Memory-based problems arose not only in the interviews but also in the
contemporary historical material. This is exemplified in composer Jarmo
Sermilä’s interview with composer Osmo Lindeman in 1975, in which Lin-
deman recalls his experience of electroacoustic music starting in 1968. Even
though the focus was on the previous seven years, memory-based problems
arose in the material.
    In my view, both basic research on the historical details and overarching
structural analysis of the circumstances are essential. Even though several
researchers have already written about electroacoustic music in Finland, pre-
viously unknown events, musical works and even technological artifacts and
actors are constantly being discovered. It is typical of history projects in par-
ticular that the data collection does not necessarily end even when the project
ends as new material enhancing the analysis and the interpretation is discov-
ered from one project to another. Thus, it is becoming increasingly important
to make newly discovered material openly available. To ensure transparency
of the research process and methodology, and to facilitate future projects, I
have made all the material and data openly available within the constraints of
the ethical conduct of research: in other words, I respect privacy and copy-
right issues, respectively, when managing the documentary and interview
material, and the works of art.


3.2 The analysis of electronic musical instruments
A critical point of departure in research on electronic musical instruments is
to avoid anachronism and hindsight. First, it should be borne in mind that if
one studies the design of historical electronic musical instrument from the
perspective of the present, current knowledge about the various features of
modern digital musical instruments (DMIs), for example, is far more detailed




                                        60

[p. 61 / pdf 87]

than was thinkable among instrument builders of the 1960s and 1970s.
Technology not only changes but also improves, and more knowledge is en-
coded in technological artifacts today than 50 years ago. Second, modern
methods and concepts applied in the evaluation of musical instruments iden-
tify features in interfaces and control processes that could not have been
imagined when the original instruments were designed. Third, it may be dif-
ficult to describe a historical instrument based on its current condition. If
these challenges are kept in mind, historical instruments can be considered
in light of the features in modern instruments and knowledge of current de-
sign processes.
    One of the major changes in the development of musical instruments wi-
thin the time frame of this study coincided with the appearance of so-called
digital musical instruments (DMIs). Magnusson (2009, 172) distinguishes
three types of musical instrument: acoustic, electronic, and digital. Acoustic
and electronic instruments are designed bottom-up whereas digital musical
instruments are designed top-down (ibid.). He describes acoustic instru-
ments as embodied, extending the performer’s body, whereas digital instru-
ments are hermeneutic, cognitive extensions of the performer’s mind rather
than the body. Moreover, designers of digital instruments must have a tho-
rough knowledge of theories of musical acoustics and programming lan-
guages. (ibid.) When he writes about digital instruments, Magnusson refers
to designs that distinguish software from hardware, in other words the pro-
gramming language and the code from the physical machinery. Within the
scope of this study, Kurenniemi designed digital instruments with electronics
hardware, the software being encoded in the physical electronics. Beyond
this technology-based categorization, so-called electroacoustic and case-
specific instruments such as sound installations should be recognized as a
separate category.
    Within the organological categorization of instruments, the design pro-
cess can be evaluated from different angles. First, as with any technological
artifact, the conception of an instrument on the initial level of design may
differ significantly from what was eventually realized, as may the way it came
to be used (see Akrich 1992; see also Chapter 2.2.3). Second, recognizing the
goal of the design directs the analysis of the process. There are differences in
1) whether instrument building is seen as DIY practice or as a project aiming
at a commercial product; 2) whether the goal is to build a case-specific or a
general-purpose instrument; and 3) whether the instrument is meant to be
used in live performance or in the studio as a sound generator, for example.
These categories are not exclusive, and the instrument may even move from
one category to another during its life cycle. Third, instruments can be asses-
sed from the various stakeholders’ points of view. According to O’Modhrain’s
framework for the evaluation of digital musical instruments, stakeholders in
the design process include, for example, the audience, the performer or com-
poser, the designer, and the manufacturer (see O’Modhrain 2011, 38; Ma-




                                        61

[p. 62 / pdf 88]

Methodology



gnusson 2009, 171; see also Chapter 2.2.4). I employ these categorizations as
methodological tools in this study.




Figure 6. A dimension-space visualization template for charting the key features of the user inter-
faces and functionalities of Kurenniemi’s electronic musical instruments (Image: Ojanen)

Within the modern DMI context, several researchers have developed as-
sessment methods and visualization tools for systematizing their designs (see
Birnbaum et al. 2005; Hattwick & Wanderley 2012). Their main goal is to
develop their current projects further, whereas the tools have also been used
in DMI analysis (see Magnusson 2010). One flexible tool for charting the
chosen features, visualizing the data and facilitating comparison across va-
rious designs is the dimension space plot, which was initially developed in
the Human-Computer-Interaction research stream at the turn of the millen-
nium (see Wanderley 2001, 2002). The chosen features of an artifact can be
mapped onto their own axes and visualized as a dimension space. Here, I
employ dimension spaces to chart, visualize and compare the key features




                                                  62

[p. 63 / pdf 89]

(pertinences) of the user interfaces and functionalities of Kurenniemi’s ins-
truments (see Figure 6).
   As Birnbaum et al. (2005) acknowledge, the number of axes, or parame-
ters, and the values that are assigned to them, may be based on subjective
selection. I selected the axes and the values according to my first-hand expe-
rience as a performer on Kurenniemi’s instruments. Typically, the dimension
space axes occupy several values per parameter, although here I restrict the
number to three (see Table 2). More finely grained data collection would re-
quire a more systematic approach than my subjective take on each instru-
ment and its usability. Moreover, additional users from different back-
grounds should be used to test the instruments and thereby to gain more da-
ta for enhanced interpretation. Despite the subjective point of departure,
however, the research design unwraps the usability issues connected with
Kurenniemi’s instruments in a systematic manner. Primarily, the data set
and its visualizations presented in Chapter 6 63 serve as a reference point di-
recting the reader to the historical descriptions of user stories in Chapter 7.
Additionally, the presentation serves as preliminary data and material for
pilot testing the research design for future purposes. The further develop-
ment of the tool is beyond the scope of this study.
Table 2. The parameters and values for charting the user interfaces and functionalities of Kuren-
niemi’s electronic musical instruments: I return to the parameters and values in more detail in the
analytical section of this study (see Chapter 6.2).

 Parameter      Interface features           Values;     Values; Natural Language Defini-
    No.                                        No.       tions
     0          Short description             [n/a]      Short verbal description of the interface
     1          Physicality                   1;2;3      Physical; Both; Virtual
     2          Tactility                     1;2;3      Tactile; Both; Non-tactile
     3          Readability                   1;2;3      Clearly readable; Partially readable; Non-
                                                         readable
      4         Comprehensibility              1;2;3     Comprehensible (see what you get/hear);
                                                         Comp w/ extensive learning; Non-
                                                         descriptive (verified only by audio feed-
                                                         back)
      5         Controllability                1;2;3     All parameters available; Some parameters
                                                         available; No parameters available
      6         Intonation/tuning              1;2;3     Fully flexible tuning; Constraints can be
                                                         manipulated with abuse; Constrained to
                                                         chromatic scale
      7         Timbral flexibility            1;2;3     Fully flexible sound manipulation; Some
                                                         features can be adjusted; Constrained to
                                                         the instrument's sound
      8         Venue                          1;2;3     Live; Both; Studio
      9         Initial purpose                 1;2      General-purpose; Case-specific
     10         Accessibility                  1;2;3     Easy to use; Somewhat easy to use; Re-
                                                         quires extensive learning
      11        Programming                    1;2;3     Real-time control; Both; Pre-programmed


    63 Dimension space visualizations for each of Kurenniemi’s instruments are presented in Chapter

    6, see Figures 62–70. The charting material and data are available as The User Interface and
    Functionality Charts of Erkki Kurenniemi's Electronic Musical Instruments (EKIS) data set publi-
    cation in Electronic Musical Instruments by the Erkki Kurenniemi community in Zenodo (see:
    https://doi.org/10.5281/zenodo.2089416).




                                                  63

[p. 64 / pdf 90]

Methodology




It is noteworthy that the descriptions of dimension space are applicable only
to one specific developmental state of the design at a time, such as designer’s
initial-level idea of the instrument. User modifications and experimentation
challenge the description, thus updated versions of the dimension spaces
should be drawn. Already-tested and mass-produced artifacts acquire new
uses and meanings through being used – even after a prolonged period.
Here, my methodological approach leans on the idea of interpretative flexi-
bility from the SCOT context (see also Chapter 2.2.2). Within this study, I
anchor the description to the historical situation and avoid hindsight. Recent
research and artistic projects on Kurenniemi’s instruments have revealed the
new sonic potential, which was unthinkable to contemporary historical users.


3.3 The analysis of electroacoustic music
As I note in previous sections, conducting a research project is an intensive
interplay between the research task, the questions, the material, as well as
the chosen tools and methods used to answer the questions. The is also true
of music analysis: the research task and questions determine the analytical
frame and the necessary tools for the analysis. The purpose of music analysis
is both to describe and interpret musical works as well as to develop tools
that facilitate comparison and discussion. The aim is thus to dissect the
works into significant pieces (i.e. pertinences) and synthesize an informed
and critical interpretation of them, but it is also a balancing act between des-
criptions of the material reality of the work, and its poietic and esthesic pro-
cesses. (see Bent 1987; Padilla 1996; 1997; Emmerson & Landy 2016, 9)
    As composer Jean-Claude Risset (2002, xvii) states, works cannot be sub-
jected to “blind and automatic dissection according to a prior principle”, but
“each work requires its own approach, which may yield surprises.” A certain
systematic method or consistent language is required to compare the works
in question. In this sense, the analysis of electroacoustic music is about
choosing suitable tools in relation to both the work at hand and the target of
the research. Thus, the crucial question is: What do we want to say about
these works? Not all aspects can be analyzed at once, thus analysts need to
select according to their own intentions. Answering the question may also
facilitate the framing of the research project. (see e.g. Emmerson & Landy
2016, 9–11; see also Camilleri & Smalley 1998)
    My key analytical question here is this: What can these works tell us about
the technology used in their realization? In addition to providing answers,
the material collection and the musical analysis are intended to enrich the
previously outlined historical presentation. In mapping the points of depar-
ture I return to the tripartition model developed by Nattiez, presented in
Chapter 2.3.2 (see Figure 7). Music analysis is interpretation, which is pro-
foundly dependent on the point of departure. The interpretation differs de-




                                        64

[p. 65 / pdf 91]

pending on how the musical work is perceived: 1) as material reality, 2) as an
outcome of the intention of its composer affected by the circumstances of its
birth, 3) as an object that is both defined by and influences its receiver, or 4)
as a performance.
    Nattiez’s model was later revised by Emmerson (1982) and Padilla (1996;
1997), for example. According to Nattiez’s (1990, 100–101) guidelines, musi-
cal analysis necessarily starts with “a material level description of the work”,
in other words “an analysis of its neutral level”. However, the work is always
accessed through interpretation, even on its neutral level (see Demers 2010,
5; see also my remark in Chapter 2.1 above on how this resembles Megill’s
unresolved tension as a historiographical paradigm).




Figure 7. Nattiez’s (1975, 52; 1990, 17) tripartition model from the perspective of the potential
analyst, complemented with a performance aspect (Padilla 1997, 149), and emphasized with the
description of poietic ecosystem (Image: Ojanen 2019)

I employ Nattiez’s model here only as an analytical framework. Tripartition
helps me to dissect and direct my analytical points of view. The point of de-
parture of my scrutiny is both the material level of the work and the compos-
er’s description of poietic ecosystems. From these descriptions, having iden-
tified the relevant features (pertinences) of the works by analytical means, I
interpret the historical use situations of Kurenniemi’s instruments. As an
outcome of the material and data collection, I also comment on the esthesic
side of historical description even though it is not emphasized in this work.
    In Nattiez’s model, the poietic process in particular does not sufficiently
describe the technology-driven process. Interaction with an instrument in
technology-oriented processes could set the focus and intention of the com-
poser in a different location than traditionally intended. For example, the
random process of instrument testing or editing tape collages without a pre-
determined plan exemplifies how the focus of a composer shifts from the
sonic outcome as a composition to the design of the instrument, for example.
Given the nature of technology-driven music production, there is a risk of
describing details of a work that are of little significance, or even contradicto-
ry when it is approached from another perspective. One can receive, analyze,
interpret and even enjoy music with or without prior knowledge of the poietic
process, the composer’s intention or the rules dictated by the genre. Howev-
er, even though knowing how the work was realized is not a necessary condi-




                                                 65

[p. 66 / pdf 92]

Methodology



tion for music analysis, knowing the poietic process of the analyzed work al-
ters the interpretation.
    Emmerson & Landy (2016, 22) describe this as poietic leakage. They also
point out that most previous analyses of electroacoustic music concentrated
on the poietic side of the works and welcome an emphasis on the listener’s
side in future analyses. To elaborate further on the idea of poietic leakage, I
will take a cue from the analytical framework or research practice termed
Historically Informed Performance.64 I would describe the analytical ap-
proach I employ here as technologically informed analysis. Whereas HIP
aims at historical accuracy in performances of early music, I aim at histori-
cally and technologically informed analysis of electroacoustic music and
electronic musical instruments. The point of departure for the analysis is the
material reality of the objects and the poietic process, which I describe as a
poietic ecosystem.
    Analysis of the esthesic process, however, is two-sided, in that perception
should be distinguished from reception. On the one hand, just as Demers
(2010) distinguishes aesthetics from critique, there is perception of the work,
which is the esthesic process (an individual experience of the receiver), and
on the other hand there is its reception. The latter refers to how the work was
received by the audience when presented in a concert, or released on record,
for example.
    A typical feature of electroacoustic music is that the works exist only as
audio recordings, as software or hardware patches, or in various forms of
contemporary documentary evidence. Composers rarely outline scores or
give written instructions. Their works are realized in close interaction with
the production technology as bottom-up compositions (see Emmerson &
Landy 2016, 10), or in real-time performance with the equipment rather than
according to a prescribe score. The non-existence of a score constitutes a
challenge to music analysts compared with the traditional setting. The pri-
mary source for the analysis is aural perception, therefore various listening-
based approaches have been developed with regard to electroacoustic music.
It is noteworthy that the situation differs only a little from ethnomusicologi-
cal fieldwork. Another analytical challenge is that the fundamental material
of electroacoustic music does not comprise units as clearly outlined as notes,
but rather consists of arbitrarily defined sonic objects such as any imaginable
sound, sounds beyond imagination, or even silence. Moreover, the relation-
ships between the fundamental units of electroacoustic music do not yet fol-
low similar traditions as in note-based music.
    To present the “immanent sonorous configurations of the work” (Nattiez
1990, 61) and to overcome the lack of a score, various visual presentations,
both descriptive and symbolic, have been used in the analysis of electroa-
coustic music. Methods of outlining a descriptive score vary widely. One of


   64 HIP; see, for example: https://sohipboston.squarespace.com/what-is-hip/




                                                66

[p. 67 / pdf 93]

the earliest scores is Reiner Wehringer’s visual listening score of György Li-
geti’s Artikulation (1958), completed in 1970 65 (Holmes 2012, 370). Robert
Cogan (1984) introduced sonograms for visualizing musical sounds in the
1980s, tools that were similar to those used previously to visualize speech
sounds in phonetics. Sonograms provide the music researcher with a tool for
comparing differences in the interpretation of one work by different per-
formers (ibid., 49–56), for example, whereas for the electroacoustic music
analyst they provide “a notation that clearly specifies - - - the orientation,
motion, duration, and spectral makeup of each element of the music” and “an
analytic base, with data and evidence, for conclusions about the sonic charac-
ter and structural function of the sonorities and features that they picture”
(ibid., 103).66 I use the word sonogram in this study, which is widely used in
Europe and is equivalent to spectrogram.
    Landy (2007, 203) considers a sonogram a good point of analytical depar-
ture, but questions its role as part of the analytical process: He asks, “can we
hear everything that we see in these images? Of the information, we cannot
perceive how relevant is it in the end?” When setting up their analytical
toolbox Emmerson & Landy (2016, 9) also emphasized the “aspects of the
work that can be heard – not those that can only be detected by machines.”
Sonograms can produce a seemingly objective presentation of a sound re-
cording, but certain aspects affect the image they depict. Even at the stage of
choosing the parameters for the software that is used to draw the image, the
interpreter influences the process: in scaling the sonogram he or she alters
the picture and may drive perceptions in a certain direction. Moreover, de-
tails starting from the digitization of the analog tape and the production of
the image affect the sonogram as an “objective scaffold”, and as a point of
departure for analysis (see Ojanen 2015).
    Here, I see the sonogram as a notebook frame in which listening-based
annotation, in other words a descriptive listening score, can be outlined. Us-
ing a sonogram helps me to keep the analysis transparent. I proceed in my
analysis as follows. 1) Because there is rarely a score for the works, my pri-
mary analytical source is the audio recording. 2) When digitizing the audio
material myself, I follow a critical digitization process (see Ojanen 2015),
which I document as accurately as possible. During the course of the study I
piloted the video recording of the running tapes 67 and the research-driven
metadata production,68 which may facilitate the implementation of Digital

   65 See Craig (2007).

   66 For more information about the visualization methods of electroacoustic music and music sig-

   nals in general, see Simoni (2006), Adams (2006), or Lassfolk (2013b).
   67 See an annotated video of the master tape of the Arrangement of J.S. Bach's Invention No. 13 in

   A minor (BWV 784) for the DIMI-A synthesizer by Erkki Kurenniemi (1970):
   https://vimeo.com/278832133; see also the other documents at:
   http://doi.org/10.5281/zenodo.1469722.
   68 Ojanen, Mikko. (2019). Preliminary metadata for the UHMRL digital tape archive pilot (Version

   20191223_01) [Data set]. Zenodo. http://doi.org/10.5281/zenodo.3591336.




                                                  67

[p. 68 / pdf 94]

Methodology



Humanities research methods in the future. 3) I based my content analysis of
the work on critical and analytical listening, facilitated by 4) a sonogram as a
scaffold for annotation. 5) The annotation based on critical listening includes
structural analysis, the categorization of instruments used and sources if rec-
ognized, and a description of their role as well as of the sounds and sound
families, if I consider them significant. 6) I sketch a description of the poietic
ecosystem in which the work was produced, if possible. 7) I also consider the
relationship of the musical work with performance and improvisation, mean-
ing that I follow Goehr’s (1992, 186) advice and do not conflate music and
musical works. The analyses of user stories in Chapter 7 are based mainly on
the key findings of the music analysis. The historical description and inter-
pretation in Chapter 5 also benefit from the music analysis, even though I do
not explicitly refer to the results of the process in the narrative.




                                         68

[p. 69 / pdf 95]

4 PRECONDITIONS FOR ELECTROACOUS-
  TIC MUSIC AND INSTRUMENT DESIGN

Kurenniemi’s instrument design did not appear out of thin air. My aim in this
chapter is to outline the background of his design environment, and to iden-
tify the key developmental lines of the overall global situation before the
1960s (Chapter 4.1), as well as the local situation in Finland. It is neither nec-
essary nor possible to go into more detail about global developments. The
early phases of this music style as they evolved in Finland deserve closer
scrutiny (Chapter 4.2). Several authors have studied the history of electroa-
coustic music and have written about it on various occasions. Here, I lean
mainly on the presentations of Chadabe (1997), Holmes (2012), and Manning
(2013).


4.1 An overview of the global history of electroacoustic
    music and instrument design
The preconditions for the musical style known as electroacoustic music,
which surfaced during the late 1950s, included the emergence and develop-
ment of 1) sound recording and processing technology, and 2) electronic mu-
sical instruments and computer technology. In addition, 3) the development
of the Western classical-music tradition in the late-19th-century and the first
half of the 20th, and 4) the domestication of noise and silence as primary mu-
sical material provided a fertile background for electroacoustic music. Stages
in the development of 20th-century Western music include the melodic and
harmonic phase from late-19th-century Impressionism to atonality, from ato-
nality to dodecaphony, and eventually to integral serialism, of which the el-
ektronische Musik produced in Cologne is a typical example. At the same
time, experimentation, musical happenings and performance-art aesthetics
strongly influenced the development of electroacoustic music.
    One of the preconditions for the new musical aesthetics was the invention
of sound recording. Being able to record sound fundamentally changed the
way it was stored, transferred, and studied, and facilitated the reproduction
and repetition of unique performances, as well as sound manipulation. After
the invention of the gramophone, a musical performance could be detached
from its origin. Several scholars have carried our comprehensive studies on
the origins of sound recording and its influence on musical aesthetics and
activity (see Sterne 2003; Katz 2010).




                                         69

[p. 70 / pdf 96]

Preconditions for electroacoustic music and instrument design



    A few details of this development with specific relevance to the context of
this study include the notion of a studio as an instrument and as a composi-
tional tool. The concept of a studio has developed, from being a place for re-
cording to becoming an instrument for a composer (compose for an instru-
ment), and even a compositional tool (compose with an instrument). The
idea of using sound-recording technology in a creative setting arose in the
early days. Katz (2010, 109–123) traced the emergence of theoretical writing
on the topic, starting from the 1910s. Concrete experimentation with the
technology goes back at least to the 1930s when Igor Stravinsky, Ernst Toch
and Paul Hindemith anticipated and tested the potential use of a gramo-
phone as a musical instrument (Katz 2010, 109–123; Taylor et al. 2012, 110–
113).
    In their review of a collection of historical documents on the early days of
the phonograph, cinema and radio, Taylor et al. (2012, 110–113) classify two
texts under the heading The Phonograph as a Compositional Tool. In the first
of these, which was written in 1930, composer Igor Stravinsky hails the po-
tential of the phonograph and eagerly anticipates having the opportunity to
create music that “--- could only be preserved through mechanical reproduc-
tion.” Stravinsky’s vision exemplifies how the medium could provide sound
storage and function as a creative tool. Later, in the early 1960s, the theme
was embraced by composers such as Morton Subotnick (in Bernstein 2008,
112–114), who considered his art to be studio art. In Finland, Salmenhaara
referred to Kurenniemi using his studio as an instrument when producing his
first standalone tape music work On-Off (1963) in 1964.69
    As sound recording and production technology developed and became an
instrument of artistic creativity, various changes were gradually taking place.
The most notable of these was that a prescribed score was not necessary. The
new way of working in interaction with instruments shifted the composer’s
focus from laying out a predetermined plan or score to the immediate pro-
cess of aesthetic decision-making and listening to the direct sonic output of
the musical instruments: in some cases the composer was able to interact
with his or her instrument in real time. Furthermore, with the development
of studio technology, composition and music production have diverged from
a linear workflow to an integrated process in which previously discrete tasks
such as composition, arrangement, mixing, mastering and eventually distri-
bution are combined into a single iterative effort (see also Ojanen 2015).
    These new means of manipulating sound and advances in sound-
processing technology were preconditions for the development of electroa-
coustic music. In particular, they were integrated into the tradition of mu-
sique concrète – a musical style founded by French composer and sound en-
gineer Pierre Schaeffer. Even though sound-recording technology provided
the technological basis, it does not fully describe the genre. It enabled


   69 Salmenhaara (1964, 55).




                                               70

[p. 71 / pdf 97]

Schaeffer’s experimentation, but his point of departure for composition was
in the material used for musical works rather than the technology. He ab-
stracted musical structures and meaning from raw sound material with the
help of the new sound-recording and processing technology. In this respect,
musique concrète laid the foundations for the bottom-up compositional par-
adigm (I borrow the term bottom-up from Emmerson & Landy 2016, 10).
Schaeffer formulated his experiments into a theory, which he presents in his
cornerstone publication Traité des objets musicaux (1966): this is considered
a classic in the literature on electroacoustic music, and inspired the later de-
velopment of various styles such as acousmatic music (see Schaeffer 2017).
    The early phase of electroacoustic music is typically represented in two
European schools, the French musique concrète and the German el-
ektronische Musik. The difference between the two typically lies in the sound
material used in the respective works. As Emmerson (1986, 36) insightfully
states: it “is a gross simplification to imply that Stockhausen’s Gesang der
Jünglinge, in using the recording of a boy’s voice in part of the material,
broke the barriers between the two groups.” The two schools had strikingly
different points of departure for their compositions. Whereas musique
concrète was based on the bottom-up process initiated by features in the
sound material, the origin of elektronische Musik can be traced to the stylis-
tic development of Western art music starting from the late-19th-century,
which was based on top-down processing.
    The stylistic development of music, from early Romanticism to Impres-
sionism and Expressionism, later took a turn toward atonal music and do-
decaphony. The climax of this development was in integral (or total) serial-
ism based on the idea that all musical parameters could be predetermined by
the composer beforehand. Here, great expectations were placed on the new
technology, which allowed the use of discrete oscillators with precisely ad-
justable frequencies, and tape recorders with precisely editable sound seg-
ments, in realizing the composer’s prescribed musical scores. The point of
departure for the composition process was theoretical and contrasted signifi-
cantly with the bottom-up compositional premises of musique concrète.
    Other overarching themes behind the development of electroacoustic mu-
sic include the domestication of noise and experimentation within different
art forms. During the early phases it was integrally experimental. Given the
lack of dedicated technology, almost any technological artifact qualified as a
point of departure for testing and experimenting with sound production and
processing: examples include various types of sound-recording devices and
equipment designed in the field of communication technology or for scien-
tific purposes such as laboratory measurement. It is worth pointing out that
noise has always been a significant component of music, exemplified in the
spectrum of cymbal sounds. In this case, however, it had a secondary role as
part of other musical material. Starting from the 1910s with the experiments
and tenets of Italian futurists and American composer Edgar Varèse, noise
came to be considered primary musical material.



                                        71

[p. 72 / pdf 98]

Preconditions for electroacoustic music and instrument design



    High expectations were not restricted to sound-recording and processing
technology, and also covered the automation of musical processes that start-
ed with barrel organs and player pianos. This development continued in the
electronic age when various kinds of automated instruments were anticipat-
ed as a solution to the problem. In this context, the notion of computer-aided
composition originated in the drive to automate traditional tape-
manipulation techniques such as cutting, copying, pasting and splicing,
which are time-consuming and laborious. In addition to automating the me-
chanical process, however, expectations extended to the production of new
musical processes according to preset rules, or algorithms. Essl (2007, 107)
defines an algorithm as “a predetermined set of instructions for solving a
specific problem in a limited number of steps.” Algorithmic music has a long
history dating back to Pythagoras and the Jewish Kabbalah, but algorithmic
composition only became popular with the development of computers.
    The first tests of computer music were run on general-purpose computers
such as the Australian CSIRAC (see Doornbusch 2004) and the RCA’s pro-
grammable synthesizer. During these tests the computer either performed
previously composed popular music tunes or produced musical scores ac-
cording the algorithm outlined by the programmer to be performed by a tra-
ditional music ensemble – such as the Illiac Suite (1957) for string quartet
programmed by Lejaren Hiller and Leonard Isaacson. The first genuinely
computer-generated and performed works – including Analog #1: Noise
Study (1961) by James Tenney at Bell Labs – were produced at the turn of
the 1960s. Composing with a computer was not straightforward, however,
and required several steps before the composer could hear the final outcome.
A major shortcoming of computerized music production was the slow pro-
gram-writing and digital-to-analog-conversion process, which could take
weeks. Chadabe (1997, 112–115) gives a vivid description of it.
    The next step forward was the development of special-purpose musical
sequencers. Kurenniemi was also working with the idea of an automated mu-
sic machine to overcome the time-consuming tape splicing. The topic was
commonly pondered on at the time, and tape-manipulation techniques were
already declared obsolete at the turn of the 1960s – at least according to far-
reaching utopian envisioning.70 Notably, technological idealism and feasible
implementation were far apart. Kurenniemi frequently discussed the issue
with contemporaries such as Swedish composer Leo Nilsson, 71 and early se-
quencer designs by an American instrument designer were produced to rem-
edy the situation (Pinch & Trocco 2002a, 40).72 Buchla had several discus-
sions with composers Morton Subotnick and Ramon Sender when they were
working on improving the burdensome tape-manipulation process (see the
interview with Subotnick in Bernstein 2008). Sequencers did eventually pro-

   70 See Heikinheimo (1967, 20/HS October 29, 1967).

   71 Nilsson (2019) in an interview with Ojanen.

   72 Buchla Associates (1966).




                                                    72

[p. 73 / pdf 99]

vide a solution to tape-splicing – at least in part. As simple and straightfor-
ward mechanical devices they did not yet meet the complex demands related
to the management of musical material, such as copying and pasting musical
passages. The early models resembled analog computers and their memory
equaled their physical patches, which could not be stored or copied.


4.2 The early development of electroacoustic music in
    Finland
Even though Finnish composers first came into contact with European
trends in the mid-1950s when they started to participate in Darmstadt Inter-
national Summer Courses for New Music (see the list of participants in
Heiniö 1986, 55), the main trends never landed in Finland in their pure form.
The overall development of electroacoustic music in the country was slow
(Heiniö 1986, 56). When electronic media began to penetrate the Finnish
music scene, a significant role was played by members of the radical young
generation of musicians and composers who absorbed influences freely. They
protested consciously against tradition. The various visits of contemporary
composers such as Stockhausen (1958, 1961 and 1962), Luigi Nono (1962 and
1963), John Cage (1964), and György Ligeti (1965) strongly inspired Finnish
audiences (Heiniö 1988, 25). A total of 750 people attended Stockhausen’s
lectures in Helsinki and Turku in 1958.73 The conversation in the press about
contemporary music was lively, and there were frequent radio broadcasts of
international works. Finnish composers were nevertheless held back by lim-
ited resources – both technological and financial (Heiniö 1986, 56).
    Although electronic sound effects were frequently used in radio plays (see
the chronical list of works of Finnish origin in Kuljuntausta 2008, 332–357),
the first official electroacoustic works composed in Finland were Martti
Vuorenjuuri’s Uljas uusi maailma, a radiophonic adaptation of Aldous Hux-
ley’s (1958) Brave New World lasting over an hour, and Bengt Johansson’s
Kolme elektronista etydiä (1960; Engl. Three Electronic Studies). It was
eight years before Vuorenjuuri’s work had its first public performance, de-
layed by licensing issues concerning the movie rights for Huxley’s book. Only
one private performance was arranged in 1959, which was for the press and
invited guests. Johansson’s work was first premiered in 1960, and later in a
tape music concert of modern music at the Jyväskylän Kesä festival in 1963.
(Heiniö 1995, 179–181; Ruohomäki (2020, EH14/1–5) According to Kuljun-
tausta (2008, 308), most Finnish electronic works were heard only once or
twice, and overall public access to them was restricted. Other active compos-
ers during the early years were Erkki Salmenhaara (1941–2002), Henrik Otto
Donner, Reijo Jyrkiäinen (b. 1934), and Erkki Kurenniemi.


   73 See Stockhausen (1958/HS April 16, 1958).




                                                  73

[p. 74 / pdf 100]

Preconditions for electroacoustic music and instrument design



    Suomen Musiikkinuoriso (Engl. the Finnish Musical Youth Association)
played a pivotal role in introducing electronic music to Finland. It was be-
hind the regularly broadcast radio program Musica Nova, and its members
wrote and edited several issues of Kirkko ja Musiikki (Engl. Church and Mu-
sic) magazine, a periodical that soon became the voice of the new music.
Even though the association was founded in 1957, the first concert perfor-
mance was not until December 1962. The year following the concert was
eventful and is considered a watershed period in the history of electroacous-
tic music in Finland. Suomen Musiikkinuoriso organized over ten concerts in
1962-63, and its members were responsible for most of the electroacoustic
works composed in Finland in 1963. The association was dissolved in 1965
when its members chose to go in their own directions and Yle started to take
a stronger role in broadcasting electronic and experimental music in its pro-
grams. (Heiniö 1988, 25–28; Ruohomäki 2020, EH14/1–19 and EH26/1–
6)74
    It is suggested that the early development of electroacoustic music in Fin-
land occurred in two phases – sometimes described as two waves. Depending
on the viewpoint, the first intensive period ended in the mid-1960s and the
second one evolved gradually over the following decades. 75 (Lång 1990; Ruo-
homäki 1998, 33; Kuljuntausta 2008, 304; Ojanen 2014b, 151) Although this
is an accurate estimation in terms of the number of works composed and
concerts organized in Finland during that time, work on the grassroots level
never fully stopped. The phased development is not surprising, and intensive
bursts such as the higher levels of concert and composition activity in 1963
reflect the new generation’s search for novel aesthetic expressions and at-
tempts to break from tradition, which Heiniö (1988; 1995, 178) aptly de-
scribes as a “period of exploration”.
    The concert settings and the interdisciplinary art happenings were the
primary playgrounds for experimentation with recent technology and finding
a new kind of aesthetic expression. From the very early days, electroacoustic
music and experimentation with electronic media went beyond the tradition-
al concert setting – and during its first decade strongly towards sound art.
Moreover, the 1960s saw a shift from avant-garde to underground, and from
happenings to intermedia76 art. Interestingly, a similar attempt to break out
from tradition that arose from the experiments of Suomen Musiikkinuoriso is


   74 See also Salmenhaara (1975) in an interview with Sermilä.

   75 See also Salmenhaara (1969, 16 / HS November 19, 1969), who considers that the concert Elec-

   trcononstop on November 17, 1969 marks the new beginning for the genre in Finland.
   76 I understand intermedia here as it was employed at the time – especially as J. O. Mallander used

   it in Iiris magazine: he refers to Dick Higgins and the Fluxus movement in the avant-garde art sce-
   ne in New York, where its roots go back to the late 1950s. When I use the term here, I recognize
   that not every work of art employing various media (such as sound, picture, staging, film) can be
   considered an intermedia work, opera being one example. Later on, intermediality was defined
   slightly differently and used especially in literature studies (see e.g. Rajewsky 2005; Jensen 2016).




                                                    74

[p. 75 / pdf 101]

implied in the declaration of visual artist and experimental film director Eino
Ruutsalo (1921–2001) in 1968 (Laiho 1982, 17; Home 2013, 17).
   As Heiniö (1988) argues, the 1960s was a period of pluralism. For many
composers and artists, electronic technology was as much a tool for aesthetic
expression as a traditional instrument. This is evident in the comments of
composers Henrik Otto Donner and Erkki Salmenhaara. Donner, who had a
“utilitarian attitude towards technology”, was only interested in the sounds
one can produce with it, not in how the technology works.77 According to
Salmenhaara, writing in 1969: “technical devices have the same position in
electronic music as instruments in traditional music”, thus “technology is
merely an instrument to produce all the necessary sounds, but it does not
determine the musical structure in any way.”78


4.2.1   Challenging the traditional organization of a concert setting
Donner became acquainted with many leading contemporary European
composers and avant-garde artists during his travels in the early 1960s, in-
troducing himself to modern composition methods including serialism and
the techniques of both elektronische Musik and musique concrète (Ruo-
homäki 2013, 6–7). These experiences had a strong influence on his works.
However, being also and foremost a composer of jazz music, he used differ-
ent compositional techniques very freely. He later abandoned electronic
means in his music altogether, partly because of the mediocre quality of the
technology.79
    Donner experimented with spatial sound and audience participation in
his early works, especially in Ideogramme I & II (1962–63). Both versions of
the work are based on the same idea: how much the message can be dis-
turbed before it loses its meaning. Along with the obvious influence of Cage,
his main inspiration came from information theory, which was current at the
time. In line with some of his contemporaries, Donner brought the idea to
the musical context and tested how the players’ synchronization and concen-
tration could be distracted by different electronic means. Ideogramme I & II
were the first works in Finland in which musicians played along with a pre-
recorded tape. (Ruohomäki 2013, 7–8)
    The instrumental part of Ideogramme I & II consists of notation instruct-
ing players to play as high and as low pitches as possible, to stomp with their
feet and to shout. The timeline is organized as a second-per-bar notation, and
players follow the score with a stopwatch. The score and the tape part for
Ideogramme I exist in the composer’s private archive. Large-scale instru-
ment parts for both versions and a radio map for Ideogramme I are in the


   77 Donner (2013) in an interview with Home & Ojanen.

   78 See Salmenhaara (1968, 208).

   79 Donner (2013) in an interview with Home & Ojanen.




                                                75

[p. 76 / pdf 102]

Preconditions for electroacoustic music and instrument design



archive of Music Finland (MF No. 994, Ideogramme I80; MF No. 582, Ideo-
gramme II81).
    Ideogramme I is for four instruments (fl, cl, trb, perc) and electronics.
The first version was premiered in the first concert organized by Suomen
Musiikkinuoriso in the small concert hall of the Sibelius Academy in Decem-
ber 1962. The electronic part was realized via twelve radios, which turned out
to be too low in volume, and Donner decided to replace them with a tape for
the second concert performance held in February 1963. (Heikinheimo in
Ruohomäki 2013, 8) The tape part consists of filtered noise.
    Ideogramme II was realized for the architecture exhibition Suomi Ra-
kentaa (Engl. Finland is building), organized in Taidehalli (Kunsthalle) in
Helsinki, April 1964. It was the first work in Finland to use live music in an
exhibition (Ruohomäki 2013, 8). According to Heiniö (1988, 36), it is likely
that Donner was aware of Karlheinz Stockhausen and Mary Bauermeister’s
project to merge music and exhibition. Donner raised the number of players
to 20 for Ideogramme II and realized the electronics with a dual mono tape
recorder. The tape consisted of electronically processed noise, instrumental
sound, and speech (Oramo in Heiniö 1988, 36). At an exact moment in the
score the players are instructed to play any famous concerto or symphony
written for their instrument. Audience participation is highlighted in Ideo-
gramme II, which it is not in Ideogramme I. The players and two pairs of
loudspeakers were distributed in different rooms in Taidehalli. The audience
could wander in and around the work and thus had different perspectives on
it. The tape parts were realized in the University Studio.
    Audience participation and the spatial distribution of sound were also key
features in Donner’s For Emmy 2, which was premiered at the Sabotage con-
cert, the last concert organized by Suomen Musiikkinuoriso, in Ritarihuone
(The House of Nobility) on October 18, 1963. Apart from the loudspeakers
and amplification of the acoustical instruments, electronics did not feature in
the work, nevertheless it challenged the traditional concept of a concert ritu-
al. The players started playing when the audience was coming in and contin-
ued to improvise while walking out of the concert hall at the end of the piece.
Applause was written as part of the work. Kurenniemi recorded the work,
and the sound recording exists in the Music Finland archive. 82


4.2.2    Live processed instrumentation and experiments with sound
         spatialization
As Donner was compiling his early works, Erkki Salmenhaara was experi-
menting with spatial sound in a concert setting in Pan ja Kaiku (1963, Pan
and Echo) and Concerto per due violini (1963, Concerto for two violins).

   80 See: https://core.musicfinland.fi/works/ideogramme-i

   81 See: https://core.musicfinland.fi/works/ideogramme-ii

   82 See: https://core.musicfinland.fi/works/for-emmy-2




                                                 76

[p. 77 / pdf 103]

Moreover, Salmenhaara’s works were the first in Finland to include live pro-
cessed acoustic instruments – the former was composed for four cymbals
and a tam-tam. Along with Donner, he was among the radical composers of
Suomen Musiikkinuoriso. He composed large-scale productions in which his
electroacoustic and live electronic works are sidetracked, being only one as-
pect of the experimentalism that interested him at the time. Later he with-
drew some of his early experimental works and forbade their performance,
although he had restored them by the mid-1990s. (Heiniö 1988, 42–44; Ruo-
homäki 2020, EH24/1; Uimonen 2007, 85–87)
   Pan ja Kaiku and Concerto per due violini have a similar performance
setup. The instruments are located on the stage and the loudspeakers at the
back of the hall behind the audience. This produces a static but somewhat
heterogeneous spatial effect in that dry instrument signals are in front and
their processed counterparts come from behind. The score of Concerto per
due violini is available in the archive of Music Finland (MF No.1039 83). Pan
ja Kaiku was performed only once, in April 1963, whereas Concerto per due
violini had two performances, the premiere at the Jyväskylän Kesä festival in
July 1963 and the second one at the Sabotage concert in October 1963. A
monophonic recording of the premiere exists in the archive of the Finnish
Broadcasting Company (Yle).
   The score of Concerto per due violini consists of a graphic second nota-
tion with instructions for expressions and dynamics, but no note infor-
mation. Graphic lines and blocks on the score refer only to the string to be
played at a given moment. There are separate instructions on the second
page of the score for live processing, i.e. amplification (or distortion in this
case, judging from the surviving recording) and reverberation (at least 10
seconds according to the performance instructions). The general perfor-
mance instructions include remarks such as:
   - the work is performed with untuned violins
   - players should avoid any tonal material
   - violins are equipped with electric-guitar microphones connected to the
   bridge.
   Salmenhaara’s radical initial attempt to realize an intentionally raw and
ugly composition did not fully succeed. As Palas states (in Heiniö 1988, 44):
“in the hands of the professional musicians the end result turned out to be
instinctively tonal”. As Uimonen (2007, 87) aptly observes, this feature gives
the work an indeterminist slant, and the performance is strongly based on
the musicians’ personal musical conceptions given that the exact note infor-
mation is left undefined in the score.




   83 See: https://core.musicfinland.fi/works/concerto-per-due-violini




                                                  77

[p. 78 / pdf 104]

Preconditions for electroacoustic music and instrument design



4.2.3    Early studios for electroacoustic music in Finland
Most of the early electronic music studios were built by public broadcasting
companies and university departments. According to the canonized view of
electronic music, the first studios proper were in Paris, Cologne, and Milan.
Referring to the early situation in Europe, Davies84 acknowledges the exist-
ence of the University Studio in Helsinki. Holmes (2012, 92–93) lists nine-
teen studios, but fails to mention the situation in Finland. Seventeen of the
studio constructions in Holmes’s list were founded between approximately
five and ten years before the University Studio was designed and constructed,
and two coincide with it.85
    The first experiments aimed at building an electronic music studio in Fin-
land were conducted at the turn of the 1960s within the Finnish Broadcasting
Company, Yle. Even though Yle’s Tehosto sound-effect archive dates back to
1957, regular experimental activity such as radiophonic seminars started
around the mid-1960s, and the first permanent studio premises were built as
late as in 1973. Before there was any permanent activity the studio construc-
tions were temporary and lasted for only a few months. These studio setups
were constructed to allow composers to carry out specific projects, and they
were dismantled when the work was completed. Following on from Martti
Vuorenjuuri and Bengt Johansson, in 1963 composer Reijo Jyrkiäinen built a
temporary studio facility in Yle to realize works such as Sounds I and II and
Idiopostic I.86 (Kuljuntausta 2008, 88–101; 132–140; 176–184; 263–271;
Tamminen 2017)
    The construction of two parallel studio facilities in the early 1960s – for
Jyrkiäinen in Yle and for Kurenniemi at the University of Helsinki – attract-
ed attention, and some composers and artists expressed concern about the
situation. Donner was of the opinion that, instead of building two mediocre
facilities, all available resources should be focused on the construction of one
excellent studio.87 These parallel projects reflect the status of electroacoustic
music in Finland at the time. In effect, only a handful of people were inter-
ested in the new art form, and they did not include the organizations that had
had the necessary resources.
    The experimental productions of the time were small underground pro-
jects that were realized with modest resources. One of the active figures in
the field was visual artist and experimental film director Eino Ruutsalo, who
commissioned soundtracks for his films from Donner and Kurenniemi. The


   84 Davies (1968).
   85 For more information on the history of electronic music studios, see Schaeffer 1963 and the col-

   lection of studio reports in the Journal of Music Theory 1963 7 (1); Wiggen 1972 and the collection
   of studio reports in Interface 1972/1; Schedel 2007; Niebur 2010; Böhme-Mehner 2011 and the
   special issue of GDR electroacoustic music in Contemporary Music Review; Holmes 2012; Man-
   ning 2013.
   86 See Sirén (1976, 52–53).

   87 Hbl (August 17, 1963, 1; 8).




                                                   78

[p. 79 / pdf 105]

music and soundtracks were produced in several different studios. Ruutsalo
had a bunker studio for editing the soundtracks on Iso Roobertinkatu in the
center of Helsinki. Musician Kaarlo Kaartinen, who frequently played in
Ruutsalo’s projects, also had a modest studio facility named Cinevox. Donner
had access to an even more professional recording studio, Elektrovox, owned
by Akkuteollisuus Ltd., which was also used by Toivo Kärki and other leading
names on the Finnish popular-music scene (on the history of studios in Fin-
land see Muikku 2001, 269–282). The soundtracks for the films Kaksi kanaa
(1963; Engl. Two Chickens) and Hyppy (1965; Engl. The Jump) were pro-
duced in the University Studio.




                                      79

[p. 80 / pdf 106]

A history of Kurenniemi’s electronic musical instruments




5 A HISTORY OF KURENNIEMI’S ELEC-
  TRONIC MUSICAL INSTRUMENTS

This chapter charts the history of Kurenniemi’s instruments and the Univer-
sity of Helsinki Electronic Music Studio, which I consider Kurenniemi’s first
instrument-design project. I focus on how Kurenniemi designed his instru-
ments, when he built them, who used them, and how the users participated
in the design process. His instruments have been identified, their locations
are known, and most of them have been restored and are in working condi-
tion. Various detailed descriptions of the instruments and their design have
been published (see Ojanen & Suominen 2005; Ojanen et al. 2007; Städje
2009; 2012; 2013 ; 2017; Suominen 2013; Lassfolk et al. 2014; 2015). Howe-
ver, given that new source material has appeared and, in particular, that ex-
tensive restoration projects initiated by Jari Lehtinen and Jari Suominen du-
ring the last 15 years88 have enhanced understanding of the instruments, it is
appropriate to review the history again.
    Kurenniemi built electronic musical instruments and studio equipment
between the years of 1964 and 1975 (see Table 3). His projects fall into three
categories: 1) the electronic music studio of the University of Helsinki, inclu-
ding the Integrated Synthesizer (1964); 2) custom-designed instruments,
including Sähkökvartetti (Electric quartet) (1968), the Andromatic (1968)
and the DICO (1969); 3) instruments developed during the Digelius period
(1970–1975) known as the DIMI (Digital Musical Instrument) series, which
include synthesizers (the DIMI-A, the DIMI-O, and the DIMI 6000), bio-
feedback-based musical instruments, also likened to musical toys (the DIMI-
S and the DIMI-T; see Suominen 2013, 151), and studio equipment (the DI-
MIX). Kurenniemi’s two ambitious design projects (DIMI-P and DIMI-U)
exist only as hand-drawn sketches on paper and not a single unit was built.
Kurenniemi returned to designing musical instruments in the early 2000s
and completed the DIMI-H (2005), which is based on his mathematical
theory of musical harmonies. Even though neither the DIMI-P nor the DIMI-
U materialized, and the DIMI-H falls beyond the scope of this study, I in-
clude them in the table to give a comprehensive presentation.

   88 The restoration projects included: Sähkökvartetti and the DIMI-O (Jari Lehtinen, 2002), the

   DICO (Jari Lehtinen, 2003), maintenance of the DIMI-A and the DIMI-O (Jari Lehtinen, 2013–
   14), “DIMI is reborn”: replication of the DIMI-A (Jari Suominen, 2014), restoration of the Inte-
   grated Synthesizer generator unit (Jari Suominen 2017–2018; see Suominen, Jari. (2020). Erkki
   Kurenniemi’s Integrated Synthesizer – User Manual of the Generator Unit. Zenodo.
   https://doi.org/10.5281/zenodo.3600460).




                                                  80

[p. 81 / pdf 107]

Table 3. An overview of Kurenniemi’s electronic musical instruments (Ojanen et al. 2007, 89 with
a few updates).

Instrument (and the origin of            Year    Qty   Description
the name)
The 1st digital music system (later      1964–    1    Three-piece modular synthesizer and
known as sähkö-ääni-kone (Electric         68          sound processor unit with digital and ana-
sound machine), System-1 or Inte-                      log modules
grated Synthesizer)
Electric quartet                         1968     1    Collective instrument for four players with
                                                       mobile controllers and a 10-step sequencer
Andromatic (automatic Andromede-         1968     1    Polyphonic synthesizer with a 10-step se-
an)                                                    quencer
DICO (digitally controlled oscillator)   1969     1    Monophonic synthesizer with a 12-step
                                                       sequencer and digital memory
DIMI-A (associative memory)              1970     2    Two-voice synthesizer with a 256-step
                                                       sequencer and digital memory
DIMI-O (optical input)                   1971     1    Polyphonic synthesizer with a 32-step
                                                       sequencer and a video interface
DIMIX (mixer and digital patch bay)      1971     1    Mixing console with a digitally controlled
                                                       patch bay and video-camera connection
DIMI-U (universal)                       1971–   0     Custom-compiled and modular music pro-
                                                       duction system (none built)
DIMI-S (sexophone)                       1972     2    Instrument controlled by the skin re-
                                                       sistance of players
DIMI-P (programmable)                    1972–   0     Custom-compiled and programmable stu-
                                                       dio system (none built)
DIMI-T (thinking; also known as          1973     1    Oscillator controlled by the EEG signal of
Electroencephalophone or α/θ cy-                       the player
borg)
DIMI 6000                                1973–    2    Computer-controlled analog synthesizer
                                           75
DIMI-H (harmonies)                       2005     1    Software instrument based on Kuren-
                                                       niemi’s mathematical theory of harmonies


I begin this historical overview at the University of Helsinki Electronic Music
Studio and concentrate on the period when Kurenniemi was active at the
university. However, it is not known exactly on what date he left in the early
1970s, and he continued to collaborate actively with composer Jukka Ruo-
homäki, who succeeded him at the University Studio. I have previously re-
ferred to the University Studio during its early years as Kurenniemi’s studio
(Ojanen 2013, 100). It was built and maintained by him, and occasionally it
was even identified as such by Salmenhaara, among others, who entitled his
article in Nutida musik published in 1964 “Kurenniemi och hans studio”
(Engl. Kurenniemi and his studio).89 How widely it was known as Kuren-
niemi’s studio remains unknown. It did not have an official name, and it was
variously referred to as the electronic music studio at the University of Hel-
sinki, the Porthania studio, and the sound technical laboratory, for example.
In this text I refer to the University of Helsinki Electronic Music Studio as the
University Studio.
    Having reviewed the history of the University Studio I move on to the cus-
tom-built instruments designed during 1967–69. Then I give a brief history
of Digelius Electronics Finland, which was initially founded to manufacture

    89 See Salmenhaara (1964, 55).




                                                 81

[p. 82 / pdf 108]

A history of Kurenniemi’s electronic musical instruments



Kurenniemi’s instruments, and his series of DIMI instruments (1970–75)
deserve a dedicated presentation. Here, I refer only to key events and works,
some of which are analyzed in more detail in Chapter 7. Unfortunately, it is
not possible to review every work and event realized with Kurenniemi’s in-
struments in this study. For those interested in more thorough browsing, I
have published a frequently updated data set90 related to the appearances of
the instruments, which includes all recognized events and works.


5.1 The University of Helsinki Electronic Music Studio

5.1.1    Setting the scene for the University Studio
Kurenniemi came to the world of music technology via a technical hobby, to
borrow the concept from Haring (2007, 2–18). He first made contact with
technology and electronic music before his involvement with the university
and the world of science. As a teenager, he was an amateur radio operator
(see Figures 8 and 9).91 In fact, in his main interests and characteristics he
closely resembled what Ensmenger (2010, 1–26) describes as computer boys.
    One winter, during the school year 1959–60, Kurenniemi and his class-
mates Erkka Honkavaara, Erkki Salmenhaara, and Ilkka Oramo (b. 1940)
built a small-scale electronic music facility in the organ balcony of their
school, Helsingin Normaalilyseo92 (see Figure 10). In a temporary setup, they
used demonstration equipment from the physics class and a wire recorder to
produce electronic music. As an amateur radio operator, Kurenniemi knew
how to build and operate electronics. He recalled that the studio was disman-
tled after a few weeks when the school janitor noticed that they were drinking
beer on the balcony. No recordings from these experiments survive.93 (Kan-
tokorpi 2002; Taanila 2002; see also Ruohomäki 2020; Kuljuntausta 2002;
2008) Later on, Kurenniemi gained technical expertise as a student and an
assistant in the Department of Nuclear Physics at the University of Helsinki.
    Salmenhaara and Oramo started as musicology students at the University
of Helsinki in 1960, whereas Kurenniemi began his studies at the Depart-
ment of Nuclear Physics and as an assistant at the Radio Astronomy station
of the Department of Physics, after finishing his military service in 1961. 94 He


   90 See the Appearance of Erkki Kurenniemi’s Electronic Musical Instruments:

   https://doi.org/10.5281/zenodo.842854
   91 See also Ojanen [forthcoming] Kurenniemi’s biography in the National Biography of Finland in

   https://kansallisbiografia.fi/.
   92 Uusi Suomi (March 18, 1960, 18).

   93 Hbl (January 16, 1964, 11); Leino (1971, 35); Kurenniemi (2004) in an interview with Ojanen &

   Suominen.
   94 Erkki Kurenniemi in the register of Helsingin Normaalilyseo: 6136. Kurenniemi, Erkki Juhani.

   *Hämeenlinna 10 VII 1941; Vh Tauno Päiviö K ja Lea Marjatta Mikkola. — II:lle, yo 60. - LuK HY
   67. - Vänr 61. (Engl. Born Hämeenlinna July 10, 1941; Parents: Tauno Päiviö K and Lea Marjatta




                                                  82

[p. 83 / pdf 109]

said in an Hufvudstadsbladet interview in 1964 that his interest lay in elec-
tronic music, and that his dream to build a studio of his own dated back to
those school experiences. He was also aware that describing their early pro-
ject as the electronic music studio may have been an overstatement.95




Figure 8. Young Kurenniemi practicing his technical hobby as an amateur radio operator; Kuren-
niemi with the QSL cards confirming the communication with other operators (photo: unknown /
The Finnish National Gallery / EKA)




   Mikkola; Matriculation 1960; B.Sc Univ. Helsinki 1967; Second lieutenant 1961)
   http://www.norssit.fi/semweb/#!/tiedot/http:~2F~2Fldf.fi~2Fnorssit~2Fnorssi_6136;
   Erkki Kurenniemi in the University of Helsinki Register of Students and in the University of Hel-
   sinki Register of Faculty of Science: Kurenniemi registered in the University of Helsinki as a stu-
   dent on Septempber 11, 1961. He completed his B.Sc in the Faculty of Science on June 6, 1967. The
   degree consisted of theoretical physics (cum laude approbatur), mathematics (cum laude approba-
   tur) and practical philosophy (approbatur). Kurenniemi left the university books in the autumn
   semester of 1971. See also Kurenniemi’s thesis in the Helsinki University Library collections, Ku-
   renniemi (1972–1979?); see also Kurenniemi (1993a), in an interview with Ruohomäki.
   95 Hbl (January 16, 1964, 11); Leino (1971, 35).




                                                   83

[p. 84 / pdf 110]

A history of Kurenniemi’s electronic musical instruments




Figure 9. Kurenniemi’s copy of The Radio Amateur’s Handbook in the UHMRL archive, with his
call signs OH2-526 and OH2F2; OH2 referring to the Province of Uusimaa and 526 referring to
Taipalsaari municipality where the village Kurenniemi is located96 (photo: Ojanen 2018)




   96 See the amateur radio operator call signs in Finland wiki:

   https://fi.wikipedia.org/wiki/Radioamat%C3%B6%C3%B6ritoiminnan_kutsumerkit_ja_yhteis%
   C3%B6t_Suomessa.




                                                    84

[p. 85 / pdf 111]

Figure 10. Kurenniemi and his classmates Erkka Honkavaara, Erkki Salmenhaara and Ilkka
Oramo and their electronic music studio on the balcony of the school organ, featured in a youth
column of Uusi Suomi, March 18, 196097 (photo: unknown / Uusi Suomi)




    97 See J.V. (1960, 18/Uusi Suomi March 18, 1960).




                                                  85

[p. 86 / pdf 112]

A history of Kurenniemi’s electronic musical instruments



5.1.2    The foundation of the University Studio and the early years
The history of the University of Helsinki Electronic Music Studio started in
1961.98 It was founded “through the initiative of the newly-appointed Profes-
sor of Musicology, Erik Tawaststjerna”99, who wanted to follow current Eu-
ropean trends and have an electronic music studio in his department. 100 Dur-
ing the first phase the studio housed three Telefunken M24 reel-to-reel tape
recorders purchased by musicology student Seppo Heikinheimo, at the latest
in January 1962.101 Some time during the academic year of 1961–62, Ta-
waststjerna invited Kurenniemi to build up the studio as an unpaid voluntary
assistant. Kurenniemi received the invitation from Tawaststjerna via Sal-
menhaara. Heikinheimo does not specifically mention Kurenniemi in his ar-
ticle on the founding of the studio in the World of Music magazine published
in June 1962.102 According to the studio inventory catalogue, however, it
seems that Kurenniemi became involved in purchasing the studio equipment
as early as in January 1962 – or at least he was consulted about acquisitions.
He recalled in 2004 that the Telefunken M24 tape recorders had already
been purchased when he started to build the studio, but he did not remember
any collaboration with Heikinheimo during the first setup.103
    In 1962, Kurenniemi equipped the University Studio with a spring reverb
unit, a ring modulator, a filter, a noise generator, a four-channel mixer con-


   98 See Linkomies (1962, 69): “Laitokseen on perustettu ääniteknillinen laboratorio, joka on tieten-

   kin vasta alkuasteellaan. Kojeisto käsittää mm. kolme Telefunken-pienoisstudiomagnetofonia, os-
   killoskoopin, useita äänigeneraattoreita, suodattimia ja ohjauspöytiä. Vaikean tilanpuutteen
   vuoksi laboratorio on sijoitettu esimiehen huoneeseen.” (Engl. “A sound technical laboratory has
   been set up in the department, which is, of course, in its infancy. The equipment comprises three
   Telefunken miniature studio recorders, an oscilloscope, several sound generators, filters and mixer
   boards. Due to a severe lack of space, the laboratory is located in the supervisor's room.”) Date
   when written or published unknown; most likely written in the fall of 1962.
   99 See Heikinheimo (1962, 56): “Studio of Electronic Music founded in Helsinki. Through the initi-

   ative of the newly-appointed Professor of Musicology at the University of Helsinki, Erik Ta-
   waststjerna, a Studio of Electronic Music has been founded. University students in music research
   and composition will be allowed to use the studio. Up to now only the technicians of the Finnish
   Radio had the possibility of experimenting with the electronic equipment.” Date when written or
   published unknown; most likely written in or before June 1962; published no earlier than late
   June, this issue of World of Music (Vol. 4, Number 3, June 1962) includes reviews of the Sibelius
   week held “during the first week of June.” (Heikinheimo 1962, 55).
   100 According to Kurenniemi (1993a; in an interview with Ruohomäki on October 28, 1993), Ta-

   waststjerna thought that the Department of Musicology should have an electronic music studio.
   101 See the UHMRL Inventory catalogue: p. 18, inventoried by ES in January 1962: “Telefunken

   pienoisstudiomagnetofoni M24 K (täysraita), arvo 290.000; Telefunken pienoisstudiomagnetofoni
   M24 KL (puoliraita), arvo 273.000; Sama, arvo 273.000” (Engl. “Telefunken miniature studio re-
   corder M24 KL (full track), value 290,000; Telefunken miniature studio recorder M24 KL (half
   track), value 273,000; Same, value 273,000”); UHMRL Inventory catalogue, p 19, inventoried by
   E.S. in February 1962: “Oskilloskoopin rakennussarja Heathkit, arvo 51.840.” (Engl. “Oscilloscope
   building kit Heatkit, value 51,840.”)
   102 Heikinheimo (1962, 56).

   103 Kurenniemi (2004) in an interview with Ojanen & Suominen; see also Ruohomäki (2020,

   EH22).




                                                  86

[p. 87 / pdf 113]

sole, and a few oscillators built from an assembly kit. By September 1, at the
latest, he had built some of the equipment including the mixing desk and the
Heathkit oscilloscope (purchased in February 1962; see Figure 11). He com-
pleted the setup in 1963 with a Studer C37 professional tape recorder. 104
    Kurenniemi’s first assignment with the first studio setup (1962–1964) was
to produce electronic sounds for Ylioppilasteatteri’s theater play Tintagilesin
kuolema.105 The production plan was introduced to the press on October 9,
1962106 and the play was premiered on January 29, 1963.107 In 2013, recalling
the play and its music, Henrik Otto Donner mentioned, for example, that no
live pianist was used and that the piano music was played from the tape. 108
The theater performance or the rehearsals were recorded. Among his other
recordings, Donner used fragments109 from this audio recording in the
soundtrack of Eino Ruutsalo’s film Kaksi kanaa (1963), completing the first
version of the soundtrack in the University Studio before early April 1963.
The film was premiered at the Annecy International Animated Film Festival
in June 1963 (Home [forthcoming]; see also Kuljuntausta 2002, 413). In ad-
dition to working on Kaksi kanaa, Donner prepared the tape music parts for
his live works Ideogramme I and II (1963) in the University Studio (see
Ojanen 2014a, 2–3). The second version of Ideogramme I with the back-
ground tape was premiered on February 4, 1963 at the Ung Nordisk Musik
concert in Helsinki, and Ideogramme II in Taidehalli on April 7, 1963. Don-
ner left for a trip to Europe after the Taidehalli concert.




   104 See Salmenhaara (1964, 55); see also UHMRL Inventory catalogue, p 38; Inventoried by E.K. on

   October 1, 1967: “Studer C37 No. 353, arvo 9543.”; see also Kivinen (1963, 65): “Laitoksen
   ääniteknilliseen laboratorioon on hankittu Studer-merkkinen magnetofoni sekä muuta pienempää
   kojeistoa.” (Engl. “The Studer tape recorder and other smaller equipment were purchased for the
   Department's sound technical laboratory.”)
   105 Originally a play for marionettes by Maurice Maeterlinck (1894); French La Mort de Tintagiles;

   Engl. The Death of Tintagiles.
   106 HS (October 9, 1962); Uusi Suomi (October 10, 1962); see also Kuljuntausta (2002, 387–388;

   2008, 203–205).
   107 According to the minutes of a meeting of the executive committee of Ylioppilasteatteri held on

   January 15, 1963, Jyri Schreck introduced the premieres for the spring term, listing both Tintagile-
   sin kuolema and Carlos ja kynttilät to be premiered on January 29, 1963 (TeaMA1487: Cb:2). Ac-
   cording to the minutes of a committee of meeting held on February 6, 1963, Kurenniemi was paid
   FIM70 (nmk 70; approx. €150 in 2019) for Tintagilesin kuolema (TeaMA1487: Cb:2). According to
   the Ylioppilasteatteri’s annual report of 1963, Tintagilesin kuolema was translated into Finnish by
   Markku Raudas, staging design by Juhana Blomstedt, costumes by Anja Blomstedt, electronic mu-
   sic by Erkki Kurenniemi. The play was performed 17 times. (TeaMA1487: Db) Tintagilesin
   kuolema was performed in Tampereen Työväen Teatteri and at Jyväskylän kulttuuripäivät (Yliop-
   pilasteatteri executive committee minutes, May 4, 1963 / TeaMA1487: Cb:2). Kuljuntausta (2002,
   387–388; 2008, 203–205) mistakenly claims that the play was performed as early as in November
   and December 1962.
   108 Donner (2013) in an interview with Home & Ojanen.

   109 According to Donner (2013: 1:14:10–1:17:45), Pirkko Peltonen’s lines “Igram, minä kuolen ellet

   sinä ---” used in the film Kaksi kanaa were from the recording of the theater performance.




                                                   87

[p. 88 / pdf 114]

A history of Kurenniemi’s electronic musical instruments




Figure 11. Professor Erik Tawaststjerna in his office with the first studio equipment on Septem-
ber 1, 1962 In the seemingly framed photo session, Tawaststjerna is controlling the Telefunken
M24 tape recorder with his left hand and the horizontal position of the image of the Heathkit La-
boratory Oscilloscope O-12 with his right hand. It remains unclear whether the oscilloscope is
connected or switched on or not. Underneath, and left from, the oscilloscope there is custom-built
studio equipment – probably mixer and amplifier units assembled by Kurenniemi. Another Tele-
funken M24 is placed behind Tawaststjerna. Kurenniemi’s110 retrospective description of the inte-
riors of department’s office and the location of the equipment corresponds with the photograph.
(photo: Pertti Jenytin / Lehtikuva 111 September 1, 1962)

The two first standalone tape music works from the studio were Kuren-
niemi’s On-Off (1963) and Erkki Salmenhaara’s White Label (1963), both of
which premiered at the Jyväskylän Kesä festival on July 11, 1963. Even
though a few individual works such as Tintagilesin kuolema, Kaksi kanaa,
and versions of Ideogramme had been performed publicly during the first

    110 Kurenniemi (2004) in an interview with Ojanen & Suominen.

    111 Picture in the Lehtikuva archive, ID: 6667509; Date created: 19620901; Creator: Pertti Jenytin;

    Subject/Caption: “Professori Erik Tawaststjerna magnetofonien ja Tekniikan ääressä 1. syyskuuta
    1962.” (Engl. “Professor Erik Tawaststjerna with the recoders and technology on September 1,
    1962.”). The photograph was previously published in Finnish Music Quarterly in 1987, and in
    Wikimedia Commons in 2017.




                                                    88

[p. 89 / pdf 115]

half of 1963, the electronic music concert in Jyväskylän Kesä was considered
the first official public appearance of the studio. Reviewing Jyväskylän Kesä
in Ylioppilaslehti dated August 30, 1963, Ilpo Saunio refers to the unknown
host of the concert. He introduced it as the first public collective appearance
of the University Studio, which had already established its specific sound and
had received a lot of attention in music circles.112
    After Kurenniemi had built the first studio setup in the departmental of-
fice the studio moved to the cellar of the Porthania building. As Kurenniemi
recalled in 2004, the move was due to the disturbance it caused when located
on the office floor of the building. The meteorologists next door did not ap-
preciate the studio experiments as music. Kurenniemi associated the critical
comments and the move to the cellar with his recording session of On-Off,
which could have happened at the end of 1962.113 The container of the On-Off
master tape114 does not include any date markings. Donner claimed that he
produced the background tape for Ideogramme I115 and the soundtrack for
Kaksi kanaa116 in the cellar studio.117 However, according to the university’s
annual report for the academic year 1963–64, the studio moved to the cellar
in the fall of 1963.118 The exact dates of the move, and of Kurenniemi’s On-Off
session remain unknown. (Ruohomäki 2020, EH22/4–5; EH23/3–4)
    In August 1963, Kurenniemi, Donner, Salmenhaara, Kaj Chydenius, and
Raija Mattila produced a tape collage Äänikirje Jan Barkille (1963; Engl.
Sound Letter to Jan Bark) as a tribute to Swedish composer Jan Bark, who
had given a composition course in Helsinki during August 1963 119 (Kuljun-
tausta 2008, 208). Parts of tape collage were recorded in various locations.
The project was directed by Chydenius, according to whose instructions Ku-
renniemi spliced the final work.
    The collaboration between Ylioppilasteatteri and the University Studio
continued in early 1964 when Kurenniemi realized an electronic soundscape
for Yukio Mishimas’s play Hanjo – the first Japanese Noh theater play to be
performed in Finland.120 Ere Kokkonen directed a version of the play for
Mainos-TV (Finland’s commercial television channel), which was aired on

   112 Saunio (1963, 4).

   113 Kurenniemi (2004) in an interview with Ojanen & Suominen.

   114 See Ojanen, Mikko. (2020). The Photo Set of the Master Tape of Erkki Kurenniemi's On-Off

   (1963) (Version 20200108_01). Zenodo. http://doi.org/10.5281/zenodo.3601403.
   115 Premiered on February 4, 1963.

   116 Completed before Donner’s trip in early April 1963.

   117 Donner (1994) in an interview with Ruohomäki.

   118 See Kivinen (1964, 69): ”Laitoksen äänitekniikan laboratorio on ollut jatkuvasti rakenteilla ja si-

   tä varten on hankittu erilaatuista pienempää kojeistoa, tarvikkeita sekä ääninauhoja. Syyskaudella
   ääniteknillinen kojeisto siirrettiin Porthanian kellarissa sitä varten varattuun huonetilaan.” (Engl.
   “The department’s sound technical laboratory has been continually under construction, and small-
   er-sized equipment, accessories and audio tapes have been acquired. It was moved to a designated
   room in the Porthania cellar during the fall.”)
   119 Salmenhaara (1964, 55).

   120 Reijonen-Oibopuu (1964, 16/HS February 2, 1964).




                                                    89

[p. 90 / pdf 116]

A history of Kurenniemi’s electronic musical instruments



March 22, 1964.121 The original recording of the televised version has been
destroyed – neither MTV nor the National Audiovisual Institute have any
information about Kokkonen’s version.122 Two years later Hanjo was per-
formed at Kansallisteatteri (Engl. The Finnish National Theater) with Ku-
renniemi’s electronic soundscape.123 All the versions included Kurenniemi’s
electronic sound design and music reproduced from tape during the perfor-
mance. Whether or not he revised the sound work for different performances
is not known.
    Donner, together with Ken Dewey and Terry Riley as well as Swedish
composers Jan Bark and Folke Rabe, were key people involved in bringing
happenings to Finland during 1963 and 1964 (see Donner’s connections to
happenings in Ruohomäki 2013). Together with Ralf Forsström and Pertti
Lumirae, Donner organized Limppiece (1964) in the Ateneum Art Museum
on April 4, 1964, in which they diffused the sound and held separate events
to occupy the entire museum space. Members of the audience were guided
through the space by means of a map showing the locations and schedules of
the events (see Figure 12124).
    Kurenniemi produced an hour-long tape to be played as a soundscape in
the museum space during the happening (see the text ÄÄNINAUHA; Engl.
The sound tape as described on the bottom row throughout the score). Ac-
cording to Mauri Antero Numminen (b. 1940), Kurenniemi’s electronic
soundscape for Limppiece was based on the idea that sound alters so slowly
that the audience cannot perceive changes without leaving the space for a few
minutes (Numminen in Ruohomäki 2013, 11 125).
    On the same day as the Limppiece happening, Numminen performed in
the academic singing contest with Laulukone126 (Engl. Singing Machine) ac-
companied by the background tape he produced in the University Studio.
The background tape exists, but the tapes for Tintagilesin kuolema, Hanjo
and Limppiece have not survived, or their location is unknown. No audio re-
cordings that can be identified as having been associated with these events
have been discovered. Thus, further analysis of the works is impossible. I re-
turn to other key works from the early years of the University Studio in Chap-
ter 7.1.




   121 HS (March 22, 1964, 15).

   122 The movie entry in the International Movie Database (IMDb) reveals that the recording was in

   black and white, and the duration was 50 minutes (see IMDb entry:
   https://www.imdb.com/title/tt1454005/).
   123 HS (July 2, 1966, 9); Arpiainen (1966a, 13); see also Arpiainen (1966b, 16) for a review of Hanjo

   in HS, September 22, 1966.
   124 A guiding map of the event is published in Anttonen (1995).

   125 See also Numminen (2018) in an interview with Ojanen.

   126 For a closer description of Numminen and Laulukone, see Chapter 5.2.1.




                                                   90

[p. 91 / pdf 117]

Figure 12. A map of the Limppiece (1964) happening in the Ateneum Art Museum, organized by
Henrik Otto Donner, Ralf Forsström and Pertti Lumirae on April 4, 1964. The floor plan of the
museum with numbered rooms is pictured in the down right corner of the score. The timeline is
running from left to right with corresponding circled room numbers indicating where and when
separate events are taking place. The score instructs the audience to move around in the muse-
um and follow the guiding map of the events (photo: the Finnish National Gallery collections /
Erkki Kurenniemi archive)




                                                91

[p. 92 / pdf 118]

A history of Kurenniemi’s electronic musical instruments



5.1.3    The Integrated Synthesizer: the heart of the University Studio
Having built his first studio setup, Kurenniemi started to execute the exten-
sive design plans he had begun to draft in 1962 127. He attended the electronic
music festival Stockholms Elektroniska Festspel128 in Sweden from March
16–18, 1963, in the company of Donner, Heikinheimo, Chydenius and Reijo
Jyrkiäinen.129 Kurenniemi presented his plans for the forthcoming studio at
the seminar for electronic music that was part of the festival. He believed that
they differed from contemporary mainstream studio designs even then. 130
(Ruohomäki 2020, EH22/7; Hultberg 1994, 178–179)
    Kurenniemi envisioned the University Studio as a modular and integrated
facility with automated music-production possibilities. Even though he never
visited any of the leading studios in Europe, such as RTF in Paris and WDR
in Cologne, he was aware of the technology and layout of contemporary set-
ups.131 He did not wish to follow current trends, relying mainly on voltage-
controlled analogue circuits and tape manipulation. Among other influences,
his experience as computer programmer at the Department of Nuclear Phys-
ics convinced him that “the future would be digital”, as he reminisced in
2004.132
    Groth’s (2014, 115–119) description reveals that the overarching initial
plans directing Kurenniemi’s designs were very similar to those used in
Stockholm when the Elektronmusikstudion EMS was in the planning stage.
For example, Norwegian-Swedish composer Knut Wiggen, who also present-
ed his ideas at the seminar, criticized the solutions and the current state of
the leading Central European studios, and suggested basing EMS on different
premises – as a hybrid of analog and digital electronic and automated pro-
cesses. According to Wiggen (1972, 127), who led the EMS in 1964–1975, the
“clear signal to use an advanced technical solution” and not “to copy any ex-
isting studio” came from Karl-Birger Blomdahl, who was the Head of Swe-


   127 Salmenhaara (1964) refers here to the years 1962 and 1963. The text seems to have been written

   in early 1964; Jan Bark’s composition course, which Salmenhaara reviews, was held in August
   1963. See also Hbl (January 16, 1964, 11).
   128 See Hultberg (1994, 178–179) for the program of Stockholms Elektroniska Festspel, March 16-

   18, 1963; see also Groth (2014, 117–119) for the discussion during the research seminar. In the fol-
   lowing years, Swedish composers Jan Bark and Folke Rabe performed in concerts, organized sem-
   inars and composed works in Finland. Folke Rabe attended Jyväskylän Kesä in July 1963, Jan
   Bark organized a seminar in Helsinki in August 1963, and during the next year composed two
   works in the University Studio Elmus (1964) and Sverige (1964) (Davies 1968, 147). They both at-
   tended Sabotaasikonsertti (Engl. Sabotage Concert) organized in Ritarihuone, Helsinki on Octo-
   ber 18, 1963.
   129 Dagens Nyheter of April 4, 1963 reports on five young Finnish composers and music critics, but

   the text does not explicitly list Kurenniemi, Donner, Chydenius, Heikinheimo and Jyrkiäinen as at-
   tendees: their names are mentioned later in the text.
   130 Chydenius (1963, 6) / Hbl April 2, 1963; DN (April 4, 1963, 19); Salmenhaara (1964); Hbl (Jan-

   uary 16, 1964).
   131 Hbl (January 16, 1964, 11).

   132 Kurenniemi (2004) in an interview with Ojanen & Suominen.




                                                   92

[p. 93 / pdf 119]

dish Radio’s Music Department. The tape-manipulation techniques were al-
ready considered outdated in the early 1960s and the planning was focused
on automated and computerized implementation.
   Kurenniemi started to build a system in which sound production and con-
trol signals were based on digital logic. Even though the implementation of
digital logic modules in music systems was a new development, Kurenniemi
was not utterly alone in his endeavor: computer and digital control signals
were guiding EMS designs, for example, and Seppo Mustonen was experi-
menting with the Elliott 803 B computer in Kaapelitehdas in Helsinki. Ku-
renniemi frequently visited Stockholm and EMS during the 1960s and 1970s,
and apparently even consulted EMS about their plans.133 (Wiggen 1972; see
also Groth 2014, 115–116)
   The computer metaphor that drove Kurenniemi’s designs reflects his in-
terest in algorithmic composition and in building a machine that was capable
of producing preprogrammed music automatically. 134 As he recalled in 1993,
he was more interested in building an automated machine than in the music
production.135 One of his main sources of inspiration was the RCA’s digitally
controlled synthesizer designed by Harry F. Olson and Herbert Belar in the
early 1950s.136 Olson and Belar were convinced that music could be generat-
ed mathematically by means of a computer. Their design ideas were based on
Claude E. Shannon’s mathematical theory of communication (Baer 2011).
   Kurenniemi was also inspired by Max Matthews’s experiments with com-
puter-generated music in the Bell Laboratories.137 Matthews (1963) wrote a
popularizing article about music by numbers in Science (1963), and the com-
puter music of Matthews, James Tenney, and Newman Guttman was pre-
sented at Stockholms Elektroniska Festspel. Greek-French composer Iannis
Xenakis also attended the festival, presented several of his own works and
hosted panel discussions in Stockholm (Hultberg 1994, 178–179). The
world’s leading advances in computer and digital music were at Kurenniemi’s
disposal from very early on in his career.
   The first manifestation of Kurenniemi’s automated music machine was
the three-piece studio system. His goal was to build a modular system into
which the entire studio could be integrated and that could control all the
equipment, including the tape recorders. The system was eventually named

   133 Nilsson (2019) in an interview with Ojanen. Interestingly, Kurenniemi’s ideas of sound genera-

   tion and rhythm were very similar to those expressed by Leon Theremin and Joseph Schillinger
   some three decades earlier. They include theories of rhythm and methods of electronic sound gen-
   eration, which are based on mathematics and subharmonics. At the time, the ideas were imple-
   mented in electronic instruments such as the Trautonium and the Rhytmicon. The recent design
   by Moog Music, the Subharmonicon (2020), is based on the ideas of Theremin and Schillinger,
   combined. It is not known how well Kurenniemi was aware of these methods in the 1960s. For
   more information see Glinsky (2000, 131–136), Smirnov (2013, 43–77), Patteson (2016, passim.).
   134 Hbl (January 16, 1964, 11).

   135 Kurenniemi (1993a) in an interview with Ruohomäki.

   136 Kurenniemi (2004) in an interview with Ojanen & Suominen.

   137 Kurenniemi (2004, 34) in an autobiographical article in Framework.




                                                  93

[p. 94 / pdf 120]

A history of Kurenniemi’s electronic musical instruments



the Integrated Synthesizer.138 The name is anachronistic, however, in that the
system did not have a proper name initially, and it is not known when it first
appeared. The system was referred to as the Sähkö-ääni-kone (Engl. electric
sound machine; see Home 2013) in 1968, whereas in the early 1970s Kuren-
niemi called it System-1 in his curriculum vitae.139 (Ruohomäki 2020, EH22;
Ojanen and Suominen 2005, 18–20; Suominen 2013, 133–135; Lassfolk et al.
2015, 262) According to Pinch & Trocco (2002a, 67), wondering what to call
a new instrument was a typical problem in the 1960s. US synthesizer design-
ers Robert Moog and Donald Buchla, for example, hesitated to use the word
synthesizer: Moog used it for the first time in print in 1966.
   Kurenniemi’s first system consisted of the tone generator unit, the mixer
unit, and the filter unit (see Figure 13). The tone generator and mixer units
are still in the University Studio’s collection, but the filter unit was lost or
dismantled during the 1960s. Only the tone generator and mixer units are
recognizable in various photographs, and the missing filter unit has not been
identified among the documentary evidence. Kurenniemi recalled that he
probably dismantled the filter unit because it was already a conventional de-
sign by 1960s standards.140
   Compared with the RCA synthesizer, among the advantages of Kuren-
niemi’s instrument were its portability 141 due to the compact size – the sys-
tem weighs only 20 kilos and covers an area of one square meter – and its
capability to produce rhythm patterns, melodies, and harmonies in real time.
The RCA Mark II synthesizer measured over two by six meters and weighed
about three tons. Furthermore, the RCA system was incapable of real-time
sound production, being programmed with punched paper tape (Baer 2011;
Holmes 2012; 176–190). On the other hand, it could be (pre)programmed
more precisely than Kurenniemi’s system, the parameter input of which was
approximate.
   Kurenniemi said in an interview conducted during 1993 that he did not
have a design plan for the instrument, and that he built it module by module
in a trial-and-error process.142 He spotted interesting designs in the contem-
porary literature and tried them out. On account of this practice, the Inte-
grated Synthesizer was under constant development and was never fully
completed. What remains of it bears less resemblance to a finished music
technological product than to a workbench for prototype testing that strongly
resembles the current DIY modular synthesizer format or Eurorack projects,
for example. Apparently, for the same reason, the instrument was poorly
documented. Without a strict deadline, such as with the commissioned in-


   138 I use the name Integrated Synthesizer in this study when referring to the instrument.

   139 See Kurenniemi’s CV in FNG/EKA, 1971.

   140 Kurenniemi (2004) in an interview with Ojanen & Suominen.

   141 Portability was also one of the key features of Buchla’s Music Systems (see Buchla Associates

   1966).
   142 Kurenniemi (1993a) in an interview with Ruohomäki.




                                                   94

[p. 95 / pdf 121]

struments he later designed, Kurenniemi did not have any reason to com-
plete the project.143




Figure 13. Kurenniemi with his first music system – later called the Integrated Synthesizer – in an
unknown location in Helsinki, March 23, 1965. The location could be the University Studio in its
second setup in the cellar of the Porthania building. However, M. A. Numminen, who worked in
the studio at the time, does not recognize the room.144 A six-channel mixer unit (in a sideways-
upward position its bottom faced to the camera) in front of Kurenniemi. On the right, behind Ku-
renniemi, the tone generator unit (its rear panel faced to the camera) and behind his right shoul-
der a meter bridge of some sort (later dismantled or vanished). The meter bridge and mixer unit
are waiting to be installed into the custom build table which corner is partially visible on the left –
in the interview in 2004, Kurenniemi described a table like the one in the picture. 145 (photo: Holger
Ekholm / Lehtikuva146 March 23, 1965)




    143 Kurenniemi (1993a and b) in interviews with Ruohomäki.

    144 Numminen (2018) in an interview with Ojanen.

    145 Kurenniemi (2004) in an interview with Ojanen & Suominen.

    146 Picture in the Lehtikuva archive, ID: 1316442; Date created: 19650323; Subject/Caption:

    “19650323 HELSINKI: Suomalaisen elektronisen musiikin varhainen vaikuttaja säveltäjä-keksijä




                                                    95

[p. 96 / pdf 122]

A history of Kurenniemi’s electronic musical instruments



In the second phase (1964–1968) the University Studio was built around the
Integrated Synthesizer. As Ruutsalo recalled in his retrospective memoires
(2000, 88147 in Home 2013, 17), Kurenniemi had the first version of the tone
generator unit in a functional condition in the fall of 1964. During the even-
ing following the completion of this first version he recorded sound material
for the experimental film Hyppy (1965). Swedish composer Leo Nilsson 148
also recorded sound material with “Kurenniemi’s music machine” for his
work Skorpionen149 (1964).
    The dates of these recording sessions are unknown. Ruutsalo’s Hyppy
was premiered at the Westdeutsche Kurzfilmtage in Oberhausen on February
21–27, 1965 (Elonet 2013; see also Home [forthcoming]150), while Nilsson
realized Skorpionen for the exhibition to honor Pablo Picasso on his 84 th
birthday on October 25, 1965. Skorpionen was released on a 7” sound record
by Konstsalongen Samlaren (Engl. The Samlaren Art Salon; Samlaren trans-
lates into English as collector). The owner of the gallery, Agnes Widlund, sent
the sound recording to Radio Andorra, where the work was aired in October
1965.151




   Erkki Kurenniemi.” (Engl. “Early influencer of Finnish electronic music, composer-inventor Erkki
   Kurenniemi.”)
   147 Ruutsalo describes how they produced the sound material in the Vironkatu studio, but the de-

   partment did not move to Vironkatu until two-and-a-half years later in early 1967. It is worth men-
   tioning that that Ruutsalo wrote his memoires decades afterwards and therefore on the detailed
   level they would need critical revision. Some of the electronic material included in the background
   tape for two works by M.A. Numminen (Ontogim and Oigu-S) may have been produced with an
   earlier version of the generator unit or with a similar construction during the spring of 1964.
   148 Nilsson (2019) in an interview with Ojanen. Leo Nilsson wrote his surname with one s in his

   early works and record sleeves. Here I use the version with a double-s.
   149 Skorpionen has a subheading “Musiken til hyllningsutställningen ’Picasso i går och i dag’"

   (Engl. Music for the tribute exhibition “Picasso yesterday and today”). See Nilsson’s work released
   by Samlaren (Private pressing by Samlaren, 1964) in Discogs database:
   https://www.discogs.com/Leo-Nilson-Skorpionen-Copa-De-
   Poma/release/11323683#images/31900490). Nilsson has made the work openly available in his
   Soundcloud account, see https://soundcloud.com/user-745910767. The title refers to Picasso’s
   star sign (see Nilsson 2019) – Picasso was born on October 25, 1881. See also the sleeve notes of
   Lundsten and Nilsson (1966) Elektronmusikstudion Dokumentation 1 (Sveriges Radio, LPD 1,
   1966) in Discogs database: https://www.discogs.com/Ralph-Lundsten-Leo-Nilson-
   Elektronmusikstudion-Dokumentation-1/release/938156.
   150 For Hyppy (1965) details in Elonet, see: https://www.elonet.fi/fi/elokuva/129895. See also

   Home ([forthcoming]): “XI. Westdeutsche Kurzfilmtage Oberhausen vom 21. bis 27. Februar 1965,
   Diplom, Der Film Hyppy (Prod. Eino Ruutsalo, Regie Eino Ruutsalo) wurde aus einem Angebot
   von 935 Kurzfilmen aus 45 Nationen für das Wettbewerbsprogramm der Westdeutschen Kurzfilm-
   tage ausgewählt” as in attendance diploma in the Eino Ruutsalo Archive.
   151 DN (October 24, 1965, 23); Mangs (1965, 15); DN (November 20, 1965, 41); DN (February 10,

   1966, 10); see also Nilsson (2019) in an interview with Ojanen.




                                                  96

[p. 97 / pdf 123]

Figure 14. The Integrated Synthesizer: tone generator unit under eager inspection by Ralph
Lundsten (in the middle, over the instrument), Leo Nilsson (on the right) and two unrecognized
participants (in the background) of the algorithmic music seminar organized by Fylkingen as a
part of Jyväskylän Kesä festival program in Kilistiikka building of the University of Jyväskylä, July
1965. Photo originally published in Helsingin Sanomat on July 8, 1965 accompanying the festival
review by Seppo Heikinheimo152 (photo: unknown / Lehtikuva153)


    152 Heikinheimo (1965).

    153 Picture in the Lehtikuva archive, ID: 2038894; Created; [Anonymous] Date Created: 19650707;

    Subject/Caption (as in HS review): “19650707 JYVÄSKYLÄ: Erkki Kureniemen [sic!] rakentama
    “musiikkitietokone” on ollut kiinnostuneen tarkkailun kohteena vanhassa kilistriikka[sic!]-
    rakennuksessa Jyväskylän korkeakoulualueella, Algoritmimusiikki kuuluu osana Jyväskylän Ke-
    sään.” (Engl. “The ‘music computer’ built by Erkki Kureniemi [sic!] has been under an eager ob-
    servation in the old kilistriikka [sic!] building in the Jyväskylä university area, Algorithmic music is
    part of Jyväskylän Kesä.”) Photo originally published in Seppo Heikinheimo’s review of Jyväskylän
    Kesä in Helsingin Sanomat, July 8, 1965. Heikinheimo (1965, 11) does not mention the algorith-
    mic music seminar in his review. See also Kivinen (1965, 73): “Laitoksen äänitekniikan laboratorio
    on ollut jatkuvasti rakenteilla ja sitä varten on hankittu erilaatuista kojeistoa. Syntetisaattori on
    kesällä 1965 valmistumisvaiheessa.” (Engl. “The sound technical laboratory of the Department is
    constantly under construction and various equipment has been purchased to meet its needs. The
    synthesizer will be completed in the summer of 1965.”) See also Ruohomäki (2020, EH22/7): “Al-
    goritmisen musiikin seminaari pidettiin Jyväskylän kesän v. -65 ohjelman mukaan 4.–9. 7. Kuren-
    niemen esitelmän otsikkona oli ‘About definitions, programs, machines and all that’. Muita esitel-




                                                      97

[p. 98 / pdf 124]

A history of Kurenniemi’s electronic musical instruments



Kurenniemi presented the tone generator unit on July 7, 1965 at the algo-
rithmic music seminar organized jointly by the University Studio and
Fylkingen – New Music and Intermedia Art, a Swedish association for exper-
imental music and art, as part of the Jyväskylän Kesä festival. Nilsson at-
tended the seminar with his close collaborator composer Ralph Lundsten
(see Figure 14; see also Städje 2012). According to Lundsten, he and Nilsson
visited the University Studio in Porthania on December 17, 1965, where they
recorded the sound material154 they used in the work realized for the exhibi-
tion Hej Stad (1966; Engl. Hi, City!). The exhibition was organized by the
Swedish Museum of Architecture, initially at Moderna Museet in Stockholm
in April 1966, and then in Messuhalli (Engl. Exhibition Hall) in Helsinki in
May 1966. The electronic exhibit was the first four-channel work to be pro-
duced in the Swedish Radio Studio, and the sound was diffused around the
exhibition space to accompany 2,800 slides depicting the modern urban en-
vironment. The work presented in the exhibition was released as a sound re-
cording, Elektronmusikstudion Dokumentation 1 (Sveriges Radio, LPD 1,
1966) entitled Aloha Arita155 (1965–66), named after the two movie theaters
located next to the University Studio in Helsinki at the time. According to
several documents,156 the sound material for the work was first recorded in


   möitsijöitä olivat mm. Carl Lesche, joka puhui tietokonemusiikin estetiikasta ja Knut Wiggen, jon-
   ka aiheena oli ’Kompositionssystemet Wiggen 1’. Seminaari oli järjestetty yhteistyössä Ruotsin ny-
   kymusiikkiseuran Fylkingenin kanssa.” (Engl. “According to the festival program the algorithmic
   music seminar was held in Jyväskylä in the summer of -65, July 4- 9. Kurenniemi's presentation
   was entitled ‘About Definitions, Programs, Machines and All That’. Other lecturers included Carl
   Lesche, who spoke about the aesthetics of computer music, and Knut Wiggen, on ‘Komposi-
   tionssystemet Wiggen 1’. The seminar was organized in cooperation with the Swedish Contempo-
   rary Music Society Fylkingen.")
   154 Lundsten (2018) in an interview with Ojanen.

   155 Nilsson has uploaded Aloha Arita to his Soundcloud account under the name Alarm, which was

   the title of the Stockholm architecture exhibition in 1965, which preceded Hej Stad.
     156 See the sleeve notes on their first LP record Elektronmusikstudion Dokumentation 1 (Sveriges

   Radio – LPD 1, 1966): “Hösten 1965 tog planerarna av Alarm-utställningen ånyo kontakt med Sve-
   riges Radios elektronmusikstudio för att fortsätta samarbetet. Denna gång gällde det musik till in-
   vä/ågningutställningen för Sveriges Arkitekturmuseum på Moderna Museet i Stockholm, april
   1966. Elektronmusikstudion lokala apparatekniska situation var nu något gynnsammare, då delar
   av den beställda apparaturen hade börjat anlända och studion hade fått sig tilldelad lokaliteter på
   Kungsgatan 8. Men fortfarande hade studion små möjligheter att producera det musikaliska rå-
   materialet. Tonsättarna Ralph Lundsten och Leo Nilson, som åter kontaktades, löste problemet
   genom att ta kontakt med fysikern och tonsättaren Erkki Kurenniemi i Helsingfors och från hans
   musikmaskin spela in kompositionens råmaterial. Detta material bearbetades sedan i SRs
   elektronmusikstudio. Denna komposition döptes till ‘Aloha Arita’ och den är en ren elektronisk
   komposition, dvs. det finns inga inspelade klanger i form av röster, instrumentala klanger eller
   vardagsljud med.” (Engl. “In the autumn of 1965, planners of the Alarm exhibition contacted the
   Swedish Radio Music Studio again to continue the collaboration. This time it was music for the in-
   augural exhibition of the Swedish Museum of Architecture at Moderna Museet in Stockholm, in
   April 1966. The technical situation at the electronic music studio was now somewhat more favora-
   ble: equipment that had been ordered began to arrive, and the studio was allocated premises at
   Kungsgatan 8. However, the studio had little opportunity to produce the raw musical material.
   Composers Ralph Lundsten and Leo Nilson were again contacted, and solved the problem by con-




                                                  98

[p. 99 / pdf 125]

the University Studio on Kurenniemi’s instrument, and then finalized in the
Swedish Radio Studio in Stockholm.157
   Previously, only Aloha Arita has been presented as an example of
Lundsten and Nilsson’s work based on the sound material recorded on the
Integrated Synthesizer. Closer analysis of their works – both collaborative
and individual – indicates that they used sounds from the instrument more
widely than previously thought. Lundsten also used sounds from the Inte-
grated Synthesizer on the soundtrack of his film EMS nro 1 (1966). Städje
(2012; 2017) claims that the instrument in question is the Andromatic se-
quence-synthesizer, which is impossible given that Kurenniemi built it two
years after Lundsten released the film (see Chapter 5.2.2). The synthesized
and sequenced sounds in EMS nro 1 strongly resemble the sounds in Aloha
Arita. In both works, the Integrated Synthesizer is only one sound source
among others. If one listens closely one can hear that sequences in works
such as Skorpionen (1964) and Skulpturmusik (1966) by Nilsson, the first
part of their collaborative three-piece Jo, Nä, Oj (1966), and Tellus (1968)
closely resemble the sonic characters of the Integrated Synthesizer.
   The Department of Musicology and the studio moved from the Porthania
building to a new location in Vironkatu in early 1967 (see Figure 15).158 In-


   tacting physicist and composer Erkki Kurenniemi in Helsinki and recording the raw material on
   his music machine. This material was then processed in SR's electronic music studio. The compo-
   sition was entitled ‘Aloha Arita’ and it is a purely electronic, in other words there are no recorded
   sounds in the form of voices, instruments or everyday noise.”)
   See also Lundsten’s (2006, 52; 2014, 56) memoires, and comments from both in their individual
   interviews (Städje 2012; Lundsten 2018 in an interview with Ojanen; Nilsson 2019 in an interview
   with Ojanen).
   157 See Heimolan talo pictures with the names Aloha and Arita in Finna by Hakli (1959; 1969); see

   also DN (March 24, 1966, 15); Zweigberck (1966, 4); HS (May 4, 1966, 16); Maunula (1966, 22 [HS
   May 15, 1966, 22]) Lundsten (2006, 52; 2014, 56); Lundsten (2018) an interview with Ojanen.
     158 See Tawaststjerna’s application for funds dated January 26, 1967: “Historiallis-

   kielitieteelliselle Osastolle / Anon kunnioittavasti, että Musiikkitieteen laitokselle myönnettäisiin
   vuodeksi 1968 elektronisen studion perushankintoihin mk 8.000:-. / Noin puolet tästä summasta
   tulisi käytettäväksi laitoksella itse konstruoitavan digitaali-analogia-konvertterin osien hankkimi-
   seen. Tämän kojeen avulla voidaan muodostaa suurella tarkkuudella mielivaltaisia signaaleja, ja si-
   tä voidaan käyttää myös tutkimustyöhön. Toinen suurehko hankintakohde olisi monikanavanau-
   huri. Näiden laitteiden lisäksi studion kehittäminen edellyttää eräiden pienempien laitteiden
   hankkimista. / Elektronisen studion siirryttyä nyt musiikkitieteen laitoksen uusiin tiloihin (Viron-
   katu 1) sen kehittämismahdollisuudet ja sen käyttö elektronisen musiikin realisoimiseen ja tutki-
   mustyöhön ovat kokonaan uudella pohjalla. Mainittakoon, että studiossa realisoidaan parhaillaan
   Montrealin maailmannäyttelyyn tilattua elektronista sävellystä. / Helsingissä 26.1.1967 (Erik Ta-
   waststjerna)”
   (Engl. “To the Historical-Linguistic Department / I respectfully request that the Department of
   Musicology be granted FIM 8,000 for the basic procurement of an electronic studio for 1968. /
   About half of this amount would be used to purchase parts for the digital-to-analog converter con-
   structed in the department. This instrument can generate high-resolution arbitrary signals and it
   could also be used for research purposes. Another major acquisition would be a multi-channel re-
   corder. In addition to this equipment, the studio needs to purchase some smaller pieces. / Now
   that the electronic studio has moved to the new premises of the Department of Musicology (Viron-
   katu 1), its development potential and its use in research and in the realization of electronic music




                                                   99

[p. 100 / pdf 126]

A history of Kurenniemi’s electronic musical instruments



stalled in the new premises, Kurenniemi and Kari Hakala used the Integrated
Synthesizer as a sound source for the two-piece work Saharan uni (1967),
which was the first stereophonic electronic work produced in Finland. Ku-
renniemi and Hakala recorded the sound material in the University Studio in
Vironkatu, but they mixed the final work with the four-tracker in the Yle
sound-control room in Kulttuuritalo (Helsinki Hall of Culture). 159 On Octo-
ber 27, 1967, Kurenniemi was interviewed for the short documentary film
about Markku Nurminen’s computer-generated tango Kesän muistatko sen,
which was composed on a computer according to an algorithm based on
analyses of Toivo Kärki’s tangos. Kurenniemi commented on the results, on
the current situation, and on the future of computer music in general.
    Saharan uni was premiered on February 9, 1968 during the Sähköshokki-
ilta (Engl. Electro Shock Evening) event at the Amos Anderson Art Museum
in Helsinki, at which the Integrated Synthesizer made its last known public
appearance (see Figure 16).160 The event was part of Ruutsalo’s Valo ja liike
(Engl. Light and Motion) exhibition at the museum on February 7–14, 1968.
Ruutsalo describes his starting point for the exhibition in a press release
about the event: “We have to set pictures in motion whatever it takes. For
there is no life without motion. In stillness lurks death.” (Ruutsalo in Home
2013, 17.) This was realized in the exhibition with moving lights, pictures and
films projected on the walls, and light kinetic works that were constantly
transforming. Visitors were allowed to touch the sculptures. A tape music
collage 22’20” consisting mainly of sounds edited from the soundtracks of the
experimental films was played repeatedly in the exhibition space. (Home
2013, 17)




   is on a whole new level. It should be noted that an electronic composition commissioned for the
   Montreal World Expo is currently being realized in the studio. / Helsinki, January 26, 1967 (Erik
   Tawaststjerna)”). FIM 8,000 in 1967 was equivalent to about EUR12,500 in 2019.
   See also Kivinen (1967, 91): “Laitos muutti kl:lla uusiin tiloihin, Vironkatu 1:een. Tilat käsittävät
   kuunteluhuoneen, pienen lukusalin ja seminaarisalin, ääniteknillisen laboratorion, kansliahuo-
   neen sekä esimiehen ja assistentin huoneet. - - - Ääniteknillistä studiota on jatkuvasti suunniteltu,
   täydennetty ja rakennettu.”
   (Engl. “The department moved to new premises at Vironkatu 1 in the Spring. The facilities include
   a listening room, a small reading room and a seminar room, a sound-technology laboratory, a
   clerk's room and a room for a manager and an assistant'. - - - The sound-technology studio is con-
   stantly being designed and perfected.”)
   159 Hakala (2013) in an interview with Lassfolk & Ojanen.

   160 Sähköshokki-ilta programme, Pictures at Lehtikuva’s archive, Pictures at the Amos Anderson

   museum archive, sound recording from the rehearsals on February 8, 1968.




                                                   100

[p. 101 / pdf 127]

Figure 15. Kurenniemi and a glimpse of the Integrated Synthesizer in the documentary film
Kahdeksan tahtia tietokoneelle (Engl. Eight bars for a computer). Kurenniemi’s interview was
recorded in the University Studio on Vironkatu in the fall of 1967. (photo: a screen shot of the
documentary film / Yle)161

Ruutsalo also organized concerts as part of the exhibition. The first one,
Sähköshokki-ilta (Electric Shock Evening) on February 9, 1968, consisted of
Johann Sebastian Bach’s Inventions Nos. 3 and 4 on a pipe organ played
from the tape, the premier of Kurenniemi and Hakala’s electronic tape music
work Saharan Uni, an improvisation with the Integrated Synthesizer featur-
ing Kurenniemi and Donner, accompanied by Donner’s younger brother
Philip on an amplified zither, the machine poems, and Donner’s electronic
guitar improvisation Execethis.




    161 Documentary film Kahdeksan tahtia tietokoneelle in Yle’s archive; Name of the program: Kah-

    deksan tahtia tietokoneelle (Engl. Eight bars for a computer). Media ID: MEDIA_2012_00467326;
    Program ID: PROG_2009_00123373; First aired on October 27, 1967. Director: Aki Oura.




                                                  101

[p. 102 / pdf 128]

A history of Kurenniemi’s electronic musical instruments




Figure 16. Kurenniemi with the Integrated Synthesizer at the Amos Anderson Art Museum’s
event Sähköshokki-ilta (Engl. Electric Shock Evening) on February 9, 1968 The event was a part
of Eino Ruutsalo Valo ja liike (Engl. Light and movement) exhibition in the museum during Febru-
ary 7 to 14, 1968 (photo: Mikko Oksanen / Lehtikuva, February 9, 1968 162)

The second studio setup and the Integrated Synthesizer remained in use until
late 1968 or early 1969, the exact date on which the studio was re-arranged
and the Integrated Synthesizer retired is unknown. The instrument served as
the sound source on the soundtrack of Risto Jarva’s short commercial film
Tietokoneet palvelevat (1968; Engl. Computers Serve), which was commis-
sioned by Postisäästöpankki (Engl. Postal Savings Bank) and completed on
September 9, 1968.163

    162 Picture in the Lehtikuva archive, ID: 22215978; Date Created: 19680209; Subject/Caption:

    “Sähköshokki-ilta, monitaiteellinen happening Amos Anderssonin [sic!] taidemuseossa 9.
    helmikuuta 1968. Henrik Otto Donner tekee musiikkia, Claes Andersson lausuu runojaan. Eino
    Ruutsalon kineettistä taidetta on myös esillä. Edessä vasemmalla Erkki Kurenniemi sekä hänen
    suunnittelemansa sähkö-ääni-kone (integroitu syntesoija). Taustalla yleisön joukossa Kalevi Seilo-
    nen ja Claes Andersson.” (Engl. “Electro shock night, inter-artistic happening at the Amos Ander-
    son Art Museum on February 9, 1968. Henrik Otto Donner makes music, Claes Andersson recites
    his poems. The kinetic art of Eino Ruutsalo is also on display. On the left is Erkki Kurenniemi and
    the electric sound machine (integrated synthesizer). Kalevi Seilonen and Claes Andersson in the
    audience.”)
    163 See KAVI database: https://elavamuisti.fi/aikajana/tietokoneet-palvelevat; See Elonet data-

    base: https://www.elonet.fi/fi/elokuva/601470




                                                   102

[p. 103 / pdf 129]

    Kurenniemi and the third phase of the University Studio feature in the
unpublished documentary film about the musical activities of composer Hen-
rik Otto Donner, produced as a documentary training project for the Yle edu-
cation office in early 1969164 (see Figure 17). The Integrated Synthesizer does
not appear in the documentary. The only sound source present is the
Sähkökvartetti (Engl. Electric quartet; see Chapter 5.2.1), which was used in
works realized in the University Studio during 1969, such as in the sound-
track of Jarva’s short commercial film Pakasteet II (1969; Engl. Frozen
Foods II), commissioned by Paulig Ltd. 165 The other equipment presented in
the documentary includes the Studer C37 tape recorder, the studio equip-
ment rack,166 and some unidentified devices. Composer Jukka Ruohomäki 167,
who started to work at the University Studio in 1969, recalls that the Inte-
grated Synthesizer was there, but he does not remember it being used.168
    Kurenniemi took part in the International Convention of Experimental
Centres of Electronic Music at Teatro Comunale in Florence, Italy on June 9–
14 in 1968, where he presented his plans to build a music terminal. Accord-
ing to the plans, the terminal computers would allow a remote connection to
a main frame located at the university. On payment of a small fee, people
could contact the university main frame computer and produce music over
the network connection. This would have required digital to analog (A/D)
converters, which Kurenniemi was designing at the time169 (Zaffiri 2007).


   164 A documentary project produced by a group consisting of Aaltonen, Kajander, Lampila, Mart-

   tila, Saar, Vehniäinen (kuvaus/äänitys = shooting/recording: Kaivanto, Ketola, Mähönen) at Yle’s
   education office; Title: Otto Donner / 15 min. (Materiaalinauha = material tape). Document in
   Yle’s archive; Media ID: MEDIA_2015_00923242; Program ID: PROG_2009_0035191; complet-
   ed on February 24, 1969.
   165 See KAVI database: https://elavamuisti.fi/aikajana/pakasteet-ii; See Elonet database:

   https://www.elonet.fi//fi/elokuva/640415
   166 The rack is the same as in the Sähköshokki-ilta pictures from February 9, 1968. (See e.g. Amos

   Anderson Art Museum archive; Figures 112; see also the photograph of M.A. Numminen in the Vi-
   ronkatu studio; Figure 24.)
   167 MTL Juuso is mentioned for the first time in Kurenniemi’s daily planner, Sunday February 16,

   1969 (Kurenniemi daily planners in the UHMRL archive).
   168 Ruohomäki (2004) in an interview with Ojanen & Suominen; Ruohomäki (2018) in an inter-

   view with Ojanen.
   169 See Kivinen (1968, 100–101): ”Ääniteknisen studion suunnittelu- ja rakennustyötä on jatkettu

   koko lukuvuoden ajan. Silmällä pitäen omia ja Fonetiikan laitoksen tarpeita laboratoriossa on ke-
   hitetty studiovahvistinsarja, josta koottu ensimmäinen sekoitusvahvistinyksikkö on valmistunut
   toukokuussa. Studion yhden päätavoitteen, musiikkiterminaalin suunnitelmat on saatu keskeisiltä
   osiltaan valmiiksi, ja sen rakennustyö on aloitettu toukokuussa. - - - Volontääriassisstentti Erkki
   Kurenniemi osallistui laitoksen edustajana kesäkuussa 1968 Firenzen Teatro Comunalen järjestä-
   mään elektronimusiikin kongressiin pitäen siellä esitelmän laitoksessa kehitteillä olevasta musiik-
   kiterminaalista.” (Engl. “The design and construction of the sound studio have continued through-
   out the academic year. For the needs of both Departments, the Department of Musicology and the
   Department of Phonetics, a studio amplifier kit has been developed in the laboratory, the first mix-
   ing amplifier unit of which was completed in May. One of the studio's main goals, the music termi-
   nal, has largely been completed, and construction work began in May. - - - Voluntary assistant
   Erkki Kurenniemi attended the Congress of Electronic Music organized by Teatro Comunale in




                                                  103

[p. 104 / pdf 130]

A history of Kurenniemi’s electronic musical instruments




Figure 17. The University Studio presented in the unreleased documentary about Henrik Otto
Donner (in a black shirt and mustache on the left-hand side). Filmed in the early 1969. Kuren-
niemi (on the right) is pointing to an unidentified equipment. The Studer C37 is partially visible in
the bottom-right corner.170 (photo: a screen shot of the unreleased documentary: Otto Donner/15
min, Materiaalinauha, Yle archive)

According to funding applications related to the University Studio 171 and Eni-
ro Zaffiri’s conference notes (2007), Kurenniemi’s terminal computer, main
frame and converter development were active for a couple of years, but not a
single unit was built.172 The idea re-emerged later in his DIMI instruments in
the 1970s. Kurenniemi173 envisioned that composers would be able to com-
municate with their studios directly – and eventually that technology would
even be capable of reading their thoughts directly. Theses utopian visions
nevertheless remained unattainable.




    Florence in June 1968, giving a presentation on the music terminal being developed at the De-
    partment.”)
    170 Document in Yle’s archive; Media ID: MEDIA_2015_00923242; Program ID:

    PROG_2009_0035191; completed on February 24, 1969.
    171 Tawaststjerna (1970; 1971); the Department of Musicology annual funding applications in the

    UHMRL archive.
    172 Kivinen (1969, 89): ”Äänitekniseen studioon on hankittu kaksi nauhuria sekä musiikkitermi-

    naaliin kuuluvan musiikkikone 2:n laitteita. Studiossa on jatkettu musiikkiterminaalin kehit-
    tämistä tietokoneliitäntää silmällä pitäen.” (Engl. “Two tape recorders have been purchased for the
    sound technical studio, as well as equipment for the second music machine, which is part of the
    music terminal. The studio has continued to develop a music terminal with a computer interface in
    mind.”) On the plans to build an analog-digital-analog converter see also the Department of Musi-
    cology annual funding applications.
    173 Kurenniemi (1971a).




                                                   104

[p. 105 / pdf 131]

5.1.4   Towards conventional tape music and recording studios
The gap between technological idealism and reality did not hinder the active
use of the studio throughout the 1960s and 1970s. There was not yet the
technology to realize Kurenniemi’s far-reaching utopian visions of advanced
automated algorithmic music production, therefore most of the works pro-
duced in the University Studio were based on tape manipulation or sound
recording and processing. From the early 1970s it was equipped with Kuren-
niemi’s DIMI synthesizer-sequencers the DIMI-A and the DIMI-O (see Chap-
ter 5.3), and in December 1970 Kurenniemi purchased the EMS VCS-3 (Put-
ney) synthesizer for the studio from British synthesizer manufacturer Peter
Zinovieff. Thereafter the Electric Quartet, the DIMIs (mainly DIMI-A), and
the Putney were the main electronic sound sources in the studio. By 1972, in
the fourth phase of its history, all the instruments were connected to the
DIMIX digital mixer and patch bay unit.174
    Gradually, the University Studio became known as the place in which to
produce electronic sounds and to compose electronic works, and many elec-
tronic music works and electronic sounds for popular music recordings were
realized there over the years. The tape music works from the studio were fre-
quently performed in local concerts such as the regular Yle concert series in
Vanha Ylioppilastalo (1969; 1970; 1971) also known as Electrononstops 175,
and the frequent tape music concerts in the Porthania Music Hall and in Yle’s
Liisankatu Studio. Ruohomäki started teaching electroacoustic music in the
studio during the academic year 1972–73. The participants of the first course
included rock guitarist Hasse Walli, composers Otto Romanowski, Tuomo
Teirilä, and Eero Hämeenniemi, among others.
    One of the first works completed using the new sound sources of the stu-
dio – the Putney and the second version of Kurenniemi’s DIMI synthesizer,
the DIMI-O video organ – was the sound recording Muusa ja Ruusa (1971),
which consists of songs for children based on the work of Finnish poet Kirsi
Kunnas and composed by saxophonist and composer Eero Koivistoinen (b.
1946).176 The album was released as a literary sound recording by WSOY
(Werner Söderström OY) but remained unknown at the time.177 The Univer-

   174 The DIMIX was acquired from Digelius Electronics Finland in 1971. See the DIMIX specifica-

   tions; UHMRL Inventory catalogue, p. 12 inventoried by JR on March 31, 1974: “DIMIX sekoi-
   tuspöytä; arvo 16 200” (Engl. “DIMIX mixer; value 16 200”); see also Juva (1972, 96–97): “Ääni-
   tekniseen studioon on hankittu DIMIX-ristiinkytkentäpöytä, johon kaikki studion laitteet on kyt-
   ketty, sekä JBL-Lansing -kaiutinjärjestelmä. Lisäksi on hankittu nauhureita, vahvistimia ja muita
   studiolaitteita.” (Engl. “The DIMIX mixer to which all studio equipment is connected, and a JBL-
   Lansing speaker system has been purchased for the sound technical studio. Recorders, amplifiers
   and other studio equipment have also been purchased.”)
   175 It is noteworthy that Fylkingen in Stockholm also arranged events entitled Electrononstop – see

   also Saunio (1963, 4) referring to the “plan for an electronic music nonstop concert hall”.
   176 Koivistoinen, Eero 1971. Muusa ja Ruusa, LP, WSOY WS 8; see:

   https://www.discogs.com/Eero-Koivistoinen-Muusa-Ja-Ruusa/release/2450473
   177 See the record sleeve notes by Henriksson (2016); Tarkka (1971, 22/HS review on November 28,

   1971).




                                                  105

[p. 106 / pdf 132]

A history of Kurenniemi’s electronic musical instruments



sity Studio’s synthesizers appear on three tracks of the record – the Putney
on Sammakkokeitto (Engl. Frog Soup) and Herra Pii Poo (Engl. Mister Pii
Poo), and the DIMI-O on Sammakkojen ulosmarssi (Engl. The Walkout of
the Frogs). Other early sound recordings of popular music consisting of elec-
tronic sounds produced in Finland and associated with the University Studio
include Pekka Streng’s (1972) Kesämaa (Engl. Summerland) with the Putney
on Mimosaneito and Roope Hattu, Hector’s (1973) Herra Mirandos (Engl.
Mister Mirandos) with the Putney on several tracks.
    Kurenniemi concentrated on his company Digelius Electronics Finland in
the early 1970s. However, even when he started withdrawing from the uni-
versity,178 he maintained close collaboration with his successor in the studio,
composer Jukka Ruohomäki, and the other composers and artists in the field
of electroacoustic music. Kurenniemi’s company was located in Katajanokka
– a district in Helsinki that is close to the University Studio. He documented
some of his casual visits to the studio in his audio diaries.179
    Under Ruohomäki’s leadership the emphasis of the University Studio
shifted from instrument design to electroacoustic music composition among
teaching. Although Kurenniemi built and maintained the studio in different
physical spaces (see Table 4), as a physical space it was irrelevant to him. In
the fall of 1975 it was relocated to new facilities on the courtyard-side of the
Vironkatu building. The difference between Kurenniemi’s studio in the 1960s
and Ruohomäki’s in the 1970s is striking: Kurenniemi’s instruments re-
mained in use, but Ruohomäki re-arranged the overall layout to resemble the
traditional tape music studio more closely (see Figures 18–21).
    The history of the studio from the late 1960s intertwines with Kuren-
niemi’s custom-built instruments commissioned by artists and composers
(see Chapter 5.2) and the history of his company Digelius Electronics Finland
(see Chapter 5.3). I return to the history of the University Studio later in con-
nection with these themes.




   178 According to Juva (1973, 150), Kurenniemi resigned from his post at the Department of Nuclear

   Physics on March 15, 1973
   179 According to his audio diary on October 8, 1972 (C4060; R-4086 '72-10-08 Dimi demo TRD

   dimensio + “Sunday 12:31”) Kurenniemi is driving from the Vironkatu Studio where he met Ruo-
   homäki who was maintaining the DIMIX. Kurenniemi picked up the DIMI-O video-controlled syn-
   thesizer on his way to the Dimensio exhibition in Tampere. The DIMIX was also expanded in 1972;
   see DIMIX purchase documents in the UHMRL archive (ID: HMA DEF Musiikkitieteen studio
   DIMIX 0611_001; ID: HMA Musiikkitieteen studio DEF DIMIX 1972 0612_001).




                                                 106

[p. 107 / pdf 133]

Table 4. The University Studio locations and setups during the time when Kurenniemi was active
there, from the early 1960s to the mid-70s. I have chosen the periods for studio setups according
to points when there was a major change in the core technology such as the main sound source,
however, the studio was naturally under constant development and different technological setups
overlapped.

 Studio location        Years             Studio setup                    Years       Maintained by
             th
 Porthania, 6 floor     1961–             The 1st pre-synthesizer setup   1962–       (Heikinheimo)
                                                                          summer      Kurenniemi
                                                                          1964
 Porthania cellar       1963–             The 2nd setup; Integrated       fall        Kurenniemi
                                          Synthesizer                     1964–
                                                                          late 1968
 Vironkatu 1, the 1st   January 1967–     Same as above                               Kurenniemi
 studio facility, 1st
 floor
 Vironkatu 1, the 2nd   1969/70(?)–       The 3rd setup; Sähkökvartetti   1969–       Kurenniemi,
 studio facility, 1st                     (occasionally)                  August      Ruohomäki
 floor corner room                                                        1970180
 Vironkatu 1, the 3rd   1971 –            The 4th setup: VCS-3, DIMI-A,   August      Kurenniemi,
 studio facility, 4th                     DIMI-O181                       1970–       Ruohomäki
 floor                                                                    1975
 Vironkatu 1, the 4th   1975 autumn–      The 5th setup                   1975–       Ruohomäki
 studio facility, the                     Ruohomäki’s studio
 courtyard room




    180 Kivinen (1970, 82): ”Äänitekniseen studioon on hankittu nauhureita, vahvistimia ja muita stu-

    diotarvikkeita. Studion äänipöydän piirustukset ovat valmiina ja sen rakentaminen on aloitettu.”
    (Engl. “Recorders, amplifiers and other studio equipment have been purchased for the sound
    technical studio. The studio sound board drawings are ready and construction has begun.”)
    181 Kivinen (1971, 82): ”Laitoksessa LuK Erkki Kurenniemen johdolla harjoitetun tutkimustyön tu-

    loksena on syntynyt digitaalisyntetisaattori Dimi. Äänitekniseen studioon on hankittu myös elekt-
    roninen musiikkistudio VCS-3, jossa on dynaamisesti porrastettu koskettimisto. Lisäksi on hankit-
    tu nauhureita, vahvistimia ja muita studiotarvikkeita.” (Engl. “As a result of research conducted by
    Erkki Kurenniemi BSc., the digital synthesizer Dimi has been born. The VCS-3 electronic music
    studio with a dynamically graded keyboard has also been purchased for the sound technical studio,
    together with recorders, amplifiers and other studio equipment.”)




                                                    107

[p. 108 / pdf 134]

A history of Kurenniemi’s electronic musical instruments




Figures 18 and 19. The University Studio in 1973 maintained by composer Jukka Ruohomäki
and Kurenniemi. The upper photo: Kurenniemi’s DIMI-A synthesizer (1970) on the lower table on
the left. From there on clock-wise the Putney keyboard and the Putney, Studer C37 and A62 tape
recorders, the digital patch bay and mixer DIMIX (1971), the EMT turntable and a cassette re-
corder. The lower photo taken from another angle, from behind the DIMI-A. The red TV monitor
of the digital patch bay and mixer DIMIX seen between the JBL speakers. (photos: unknown /
The Finnish National Gallery / Erkki Kurenniemi archive)




                                               108

[p. 109 / pdf 135]

Figures 20 and 21. The University Studio in 1976 or 1977 maintained by Ruohomäki. In the
upper photo equipment clockwise from the left: three Revox A77 tape recorders, Studer C37 tape
recorder, Studer A62 tape recorder, mixing console, the DIMIX mixer and digital patch bay (in
front of the right speaker) and its small TV monitor between the JBL speakers on the back wall,
the oscilloscopes underneath the right channel JBL speaker, the left one is the Heathkit O12 was
purchased in 1962 and seen in the previous photo (see Figure 11), the DIMI-A synthesizer (in
front of the patch bay), the Putney and its keyboard behind the DIMI 6000 synthesizer (in front of
the electronic organ). In the lower photo DIMI-6000 ADDS terminal cover open due to its heating
problems (See also Figure 83 in Chapter 6.2.5).182 (photos: unknown / Otavan iso musiikkitie-
tosanakirja183)




    182 Rautee & Hoikkala (2017) in an interview with Ojanen.

    183 See Ala-Könni et al. (1977, 147).




                                                  109

[p. 110 / pdf 136]

A history of Kurenniemi’s electronic musical instruments



5.2 Customized designs commissioned by artists and
    composers
During 1967–1969, Kurenniemi designed the customized instruments
Sähkökvartetti (1968), Andromatic (1968) and DICO (1969) at the request of
Mauri Antero Numminen, Ralph Lundsten and Leo Nilsson, and Osmo Lin-
deman, respectively. This section is based mainly on contemporary docu-
ments such as photographs and newspaper articles, as well as oral history, in
other words memory sources. The origins of Sähkökvartetti and Andromatic
in particular are somewhat contradictory in terms of detail, there being very
little documentary evidence concerning the initial design and planning of
these instruments. There are considerably more contemporary documents
related to Lindeman’s DICO, including four interviews184 as well as Linde-
man’s scrapbook, pictures and two encyclopedia articles. However, even
these contain conflicting information. In the following sub-sections, I review
the unresolved details as part of the narrative.


5.2.1    From avant-garde to underground with M.A. Numminen and
         Sähkökvartetti: the instrument and the group
In 1960, soon after leaving school, Mauri Antero Numminen moved to Hel-
sinki from Somero to study sociology at the University of Helsinki. He was a
jazz drummer, and from early on he was interested in avant-garde art forms.
When he moved to Helsinki, he soon acquainted himself with the avant-
garde art scene. Numminen met Kurenniemi for the first time at a culture-
radical gathering of some 30–40 people organized by Claes Andersson in
1963 at his home in Tammisaari. Both Kurenniemi and Numminen had a
background in amateur radio electronics and were able to talk about equip-
ment on the component level: they immediately got along. 185 (Suominen
2013, 135–139)
   Around the turn of 1964, Numminen enrolled for the academic singing
contest to be held on April 4.186 He made use of the University Studio in early
1964 to prepare for the contest, in which he wanted to perform avant-garde
electronic music. He planned to perform two pieces, Ontogim187 and Oigu-S
(1964), for which he needed equipment to process his singing. With Kuren-
niemi’s assistance, he and his childhood friend Kullervo Aura built an elec-




   184 See Koskimies (1972), Paalanen (1974), Sermilä (1975), and Santalahti (1980)

   185 Numminen (1999, 283–290); Numminen (2018) in an interview with Ojanen.

   186 Uusi Suomi (April 5, 1964, 20); Viikkosanomat (April 10, 1964, 47); Expressen (October 24,

   1966, 5).
   187 Numminen published a graphic notation and a text related to Ontogim in his Kauneimmat

   runot poem collection in 1970 (see Numminen 1970).




                                                 110

[p. 111 / pdf 137]

tronic sound-processing unit called Laulukone (Engl. Singing Machine).188
The device consisted of signal paths that effectively distorted Numminen’s
voice (see Ruohomäki 2020, EH37/4–5). Numminen recalls that Aura at-
tended the performance and plugged the cords in a patch matrix of the device
according to his prescribed time-based score. As accompaniment and using
University Studio equipment, Numminen produced a background tape 189
that included concrete and electronic sounds. For the performance, he placed
a chess clock on the top of the Telefunken M24 tape recorder, which was bor-
rowed from the University Studio and on which they followed the time. (see
Figures 22 and 23) Numminen used Laulukone only a couple of times. The
instrument was short-lived and Kurenniemi soon dismantled it, using the
parts in other projects.190
    Numminen returned to electronic music in 1966 and started to design a
new instrument191 (Suominen 2013, 136). Numminen raised FIM 5,000 in
funding in the form of a personal bank loan. The loan was guaranteed by the
office secretary of the Communist Party of Finland for the purpose of build-
ing Sähkökvartetti (1968, Electric quartet 192) – an electronic instrument col-
lectively played by four musicians. Numminen recalls that the idea for such
an instrument was based on his Underground rock orchestra that started
performing in late 1967. He wanted an electronic version of his rock quar-
tet.193 According to a short interview in Stump youth magazine in June 1968,
Numminen formed the Underground rock orchestra while waiting for his
electric quartet.194 His experiences with Laulukone three years earlier also
played a role in the development of Sähkökvartetti (Lindfors & Salo 1988,
86–87).
    Numminen recalls that Kurenniemi designed the instrument while Aura
built it.195 However, details such as their respective roles in the building pro-
cess remain unclear. According to Numminen they completed the instrument
in the Porthania cellar studio, but more contemporary documents are needed
to establish the timeline. The planning may well have started in Porthania in
1966, but the University Studio moved into new premises in January 1967

   188 The University Studio provided the parts – but whether or not Kurenniemi helped to design the

   system remains unknown. The device was completed by Aura together with Numminen in the
   Porthania cellar studio.
   189 The background tape for Oigu-S has been released on a retrospective compilation album More

   Arctic Hysteria / Son Of Arctic Hysteria: The Later Years Of Early Finnish Avant-Garde (LXCD
   647) by Love Records in 2005. See: https://www.discogs.com/Various-More-Arctic-Hysteria-Son-
   Of-Arctic-Hysteria-The-Later-Years-Of-Early-Finnish-Avant-Garde/release/600283
   190 Numminen (2018) in an interview with Ojanen; see also Numminen (1999, passim).
   191 In an interview with Gronow (1966, 47), published in Iskelmä magazine in September 1966,

   Numminen describes a collective instrument that resembles his forthcoming electric quartet.
   192 Before its completion, Sähkökvartetti was called the Melody machine; see TV (1968, 9).

   193 In an interview with Suominen, Numminen (2006 in Suominen 2013, 136) recalled that the

   idea was based on a jazz quartet.
   194 Stump (1968a, 5).

   195 Numminen (2018) in an interview with Ojanen, see also Numminen (2020, 111).




                                                 111

[p. 112 / pdf 138]

A history of Kurenniemi’s electronic musical instruments



and it is unlikely that there was any further activity in Porthania after the
move.196




Figure 22. M.A. Numminen performing his avant-garde works Ontogim and Oigu-S (1964) in the
academic singing contest held on April 4, 1964; the Laulukone (Engl. Singing Machine; not seen
in the picture) was operated by Kullervo Aura. On top of the Telefunken M24 tape recorder, which
they borrowed from the University Studio, Numminen has a chess clock where they can follow
the time-based score.197 The photo originally published in the magazine Viikkosanomat N:o 15 on
April 10, 1964 (photo: Matti Tapola / Lehtikuva198)




    196 Numminen (2018) in an interview with Ojanen. See also Kivinen (1967, 91); Tawaststjerna

    (1967 [funding application, January 26, 1967]).
    197 Numminen (2018) in an interview with Ojanen.

    198 Lehtikuva archive ID: 4160308; Date Created: n/a; Creator: Matti Tapola.




                                                      112

[p. 113 / pdf 139]

Figure 23. M.A. Numminen and Kullervo Aura with the Singing Machine (photo: unknown / Uusi
Suomi199)




   199 Photo published in Uusi Suomi on April 5, 1964; the location is unknown (see Uusi Suomi,

   1964, 20). The original caption: Ylioppilaiden Kulttuurikilpailut alkoivat eilen musiikkikilpailuilla.
   Päivän aikana kilpailtiin yksinlaulun sekä orkesterien ja kamariyhtyeiden sarjoissa. Kilpailut jat-
   kuvat tänään. – Yksinlaulukilpailuun osallistunut Mauri A. Numminen esitti vapaavalintaisina
   numeroina omia sävellyksiään, joissa säestäjänä toimi magnetofoni. (Engl. The Student Cultural
   Competitions started yesterday with music competitions. Competitions held during the day includ-
   ed solo singing as well as the singing in orchestra and chamber ensemble series. The event contin-




                                                   113

[p. 114 / pdf 140]

A history of Kurenniemi’s electronic musical instruments



    TV documentarian Aki Oura200 interviewed Kurenniemi in the first Vi-
ronkatu studio setup, presumably in October 1967. Moreover, Numminen
posed with a zither and the nearly finished Sähkökvartetti on his lap in front
of the studio equipment in the first or second Vironkatu studio setup on July
15, 1968 (see Figure 24). Even though the instrument was constantly being
improved, and was never fully completed, it was performance-ready in late
July 1968 when Numminen took it to Bulgaria with him. (Lindfors & Salo
1988, 86–87; Suominen 2013, 135–138; for a detailed description of the usa-
bility of the instrument see Ch. 6.2.2)
    Numminen mainly used the instrument with his band Sähkökvartetti, i.e.
M.A. Numminen (processed singing), Tommi Parko (electric saxophone and
violin), Arto Koskinen (melody machine), and Peter Widén (electric drums).
Sähkökvartetti typically played one improvised piece entitled Kaukana
väijyy ystäviä (1968, Engl. Far Lurking Friends), the duration and structure
of which varied from one performance to another. Lindfors (2016, [22]) re-
fers to a concert review by Oramo 201, who also reviews another work played
by Sähkökvartetti entitled Jospa kuu ja vesi nousevat kerran (Engl. If the
moon and the water rise once). According to Numminen, the work was ac-
companied by a prerecorded background tape on which each member of the
band sang his own vowel sound (see also Lindfors 2016, [22]). 202 Numminen
sings the phrase “Jospa kuu ja vesi nousevat kerran” as a part of the perfor-
mance of Kaukana väijyy ystäviä on November 25, 1968 in the Kommu-
nikaatiokonsertti (Engl. Communication concert) in the University of Hel-
sinki Great Hall, which underlines the casual realization of their works and
hints that they also blended with each other in improvised performances.
    Sähkökvartetti premiered at the 9th World Festival of Youth and Students
held in Sofia, Bulgaria, July 28 – August 8, 1968.203 It was reported that
hundreds of audience members walked out of the concert hall during their
show.204 During its existence, the band performed in only ten or so of their
own concerts, but the instrument was also used at various events by under-
ground art group Suomen Talvisota 1939–1940, which consisted of Num-
minen’s Underground rock quartet and contemporary underground artists
such as Markku Into (1945–2018) and Jarkko Laine (1947–2006).




   ues today. – Mauri A. Numminen, who was in the solo competition, performed his own composi-
   tions as optional numbers, accompanied by a tape recorder.)
   200 Documentary film Kahdeksan tahtia tietokoneelle in the Yle archive; Name of the program:

   Kahdeksan tahtia tietokoneelle (Engl. Eight bars for a computer). Media ID: ME-
   DIA_2012_00467326; Program ID: PROG_2009_00123373; First aired on October 27, 1967. Di-
   rector: Aki Oura.
   201 Oramo (1968, 19/HS September 29, 1968).

   202 Numminen (2018) in an interview with Ojanen.

   203 See HS (July 14, 1968, 15).

   204 See ESS (August 11, 1968, 7); Stump (1968b, 19).




                                               114

[p. 115 / pdf 141]

Figure 24. M.A. Numminen in the Vironkatu studio with zither and the almost-finished Sähkökvar-
tetti on his lap, July 15, 1968. The modular rack of unidentified University Studio equipment be-
hind Numminen. The same rack is visible on the pictures from the Sähköshokki-ilta event in the
Amos Anderson Art Museum on February 9, 1968 (see Figure 112) (photo: Pekka Haraste /
Lehtikuva205)




    205 Lehtikuva archive ID: 1928201; Date Created: 19680715; Creator: Pekka Haraste.




                                                  115

[p. 116 / pdf 142]

A history of Kurenniemi’s electronic musical instruments



Sähkökvartetti (the band) was active until the early 1970s. Two concert re-
cordings206 and an excerpt recorded by Yle for a TV documentary Ungdom
för helvete! (1969) with Sähkökvartetti have survived. After a 30-year hiatus,
the band made one public performance with its original line up at the Avanto
festival in 2002. A complete list of Sähkökvartetti performances is under
construction: those that have been identified are catalogued in the Appear-
ances of Kurenniemi’s Electronic Musical Instrument data set.207
    Sähkökvartetti (the instrument) was also used in the University Studio as
a sound source during the active period of Sähkökvartetti (the band). The
instrument had the leading role in Yle’s documentary training project from
early 1969,208 which presented Donner’s musical activities.209 Kurenniemi
used the instrument in 1969 to produce the soundtrack for Risto Jarva’s edu-
cational commercial film Pakasteet (1969; Frozen Foods), and in 1971 Don-
ner used sounds from Sähkökvartetti, DIMI-A and DIMI-O in a radio play
entitled Vihreä eläin210 based on the text of architect Marja Vesterinen (b.
1937) (Ruohomäki 2013, 14). The instrument was also used on February 27,
1974 in a live performance by Jukka Ruohomäki of his semi-improvised work
Talviunesta herääminen (1974; Engl. Waking up from hibernation), featur-
ing Olli Ahvenlahti (Minimoog), Mircea Stan (trombone), and Kurenniemi
(VCS 3, and Sähkökvartetti with Ruohomäki) in a taped concert organized by
Yle at the Liisankatu Studio.
    The instrument is also to be heard in an improvised studio session 211 rec-
orded as student work for the studio technology course in 1973, and it re-
mained in use in the University Studio until Vesterinen broke the power-
supply unit.212 After that, it remained with Numminen in a non-working con-
dition until 2002, when it was restored along with some of Kurenniemi’s oth-
er instruments: it is currently located, and is frequently played in the Univer-
sity Studio.




   206 Kommunikaatiokonsertti at the University of Helsinki on November 25, 1968 (released on

   Taisteluni by Numminen 1970); Sähköinen tapahtuma Vanhalla on November 17, 1970 (Yle’s ar-
   chive ID: 000053962).
   207 Available at https://doi.org/10.5281/zenodo.842854.

   208 See Chapter 5.1.4.

   209 However, it is interesting that Kurenniemi’s oral presentation and audible electronic sound-

   track do not seem to match any known studio equipment at the time. The Sähkökvartetti drum
   machine can be identified on the soundtrack, but otherwise Kurenniemi’s description of the func-
   tionalities accompanied by the instrument sound refers to an unidentified design.
   210 Radio play in Yle’s archive; ID: 000096478; Recording date: 1971.08.17.

   211 The improvisation session of the studio course, December 10, 1973 (Music Finland sound-

   recording archive CD 5261). The session was attended by Veikko Kumpula (Sähkökvartetti), Antti
   Ortamo (VCS3), Heikki Valkonen (VCS3), Olavi R? (DIMI-A), Arja Vanajas (DIMI-O), Jyrki Vuok-
   ko (DIMI-T and recorder), Jukka Ruohomäki (äänitarkkailu = sound engineering) and Erkki Ku-
   renniemi (kannustus = encouragement).
   212 Ruohomäki (2014) in an interview with Ojanen.




                                                 116

[p. 117 / pdf 143]

5.2.2   Andromatic: the automatic Andromedean and Swedish
        composers Ralph Lundsten and Leo Nilsson
Swedish composer Ralph Lundsten started working on electronic music in
the late 1950s. With his associate, composer Leo Nilsson, they built the An-
dromeda electronic music studio213 near Stockholm during the 1960s. Nils-
son and Kurenniemi met in March 1963 during a seminar at Stockholms El-
ektroniska Festspel. The three started collaborating at the latest during the
Jyväskylän Kesä algorithmic seminar in July 1965, and their close collabora-
tion lasted until Nilsson started to build his Viarp Studio in the early 1970s.
Nilsson recalls that he used at least three versions of Kurenniemi’s music
machines.214 Kurenniemi’s collaboration with Lundsten continued during the
1970s.
    According to Lundsten’s notes, Kurenniemi started to desing a new in-
strument for them in the fall of 1967.215 Nilsson also recalls Kurenniemi’s vis-
it to Stockholm in 1967.216 According to Dahlberg in Dagens Nyheter, the
concrete building process started in August 1968217 and Kurenniemi com-
pleted the instrument that Lundsten and Nilsson named Andromatic in the
fall of 1968. The name derives from the Swedish phrase den automatiska
Andromedaren (Engl. automatic Andromedean, Andromedean referring to
Lundsten and Nilsson’s Andromeda Studio) (Städje 2012) (see Figures 25–
31).




   213 The name Andromeda appears for the first time in the liner notes of the sound recording El-

   ektronisk Musik (1968; His Master’s Voice CSDS 1085) by Ralph Lundsten and Leo Nilsson. Their
   two previous records were released by Swedish Radio. Their first record released to the general
   public was Elektronmusikstudion: Dokumentation 1 (1966; LPD1), and produced in SR:s El-
   ektronmusikstudion (Engl. The Swedish Radio Electronic Music Studio). The liner notes of the
   second sound recording MUMS: Musik Under Millioner Stjärnor (1967; Sveriges Radio RELP
   5023) do not name the specific studio in which it was produced.
   214 Nilsson (2019) in an interview with Ojanen.

   215 Lundsten (2018) in an interview with Ojanen.

   216 Nilsson (2019) in an interview with Ojanen.

   217 Dahlberg (1968, 6).




                                                  117

[p. 118 / pdf 144]

A history of Kurenniemi’s electronic musical instruments




Figures 25–30. A photo set in Kurenniemi’s archive. Kurenniemi presumably took the photos in
the Andromeda Studio during his trip to Stockholm to deliver the Andromatic to Lundsten and
Nilsson in the fall of 1968 (photos: presumably by Erkki Kurenniemi / The Finnish National Gal-
lery / Erkki Kurenniemi archive)




                                                118

[p. 119 / pdf 145]

Figure 31. Composer Leo Nilsson trying out the newly finished Andromatic in the Andromeda
Studio in the fall of 1968 (photo presumably by Erkki Kurenniemi / The Finnish National Gallery /
Erkki Kurenniemi archive)




                                                 119

[p. 120 / pdf 146]

A history of Kurenniemi’s electronic musical instruments



Lundsten wanted an instrument without a conventional piano keyboard. He
did not wish to restrict himself to twelve-tone music and standard Western
scales (Städje 2012; Suominen 2013). Nilsson recalls that they pondered up-
on the idea of electronic musical instruments in general with Kurenniemi on
several occasions during the 1960s. Even though their original purpose was
to produce concrete music in the Andromeda Studio, they commissioned an
electronic music instrument from Kurenniemi that allowed the user to pro-
duce and control “longer series of frequencies, amplitudes and wave-
forms”.218
   Otherwise, the detailed background of the design remains unknown. Ku-
renniemi mentioned in 2004 that their retrospective views of the original
design ideas collided with Lundsten’s.219 Lundsten, however, emphasizes his
admiration of Kurenniemi’s unchained creativity (Städje 2012). Lundsten,
Nilsson, and Kurenniemi brainstormed the initial ideas for the instrument,
on the basis of which Kurenniemi realized the instrument according to his
plans. (For a detailed description of the functionality and usability of the in-
strument, see Chapter 6.2.2.)
   Kurenniemi made a recording with the Andromatic instrument before
carrying it to Stockholm in a cardboard box.220 His aim was presumably to


   218 Nilsson (2019) in an interview with Ojanen: ”Erkki var inbjuden till Fylkingen (föreningen för

   experimentell musik i Stockholm), (1967 tror jag), för att hålla ett anförande och diskutera möjlig-
   heterna för att bygga upp en elektronmusikstudio - (EMS). Vi fick bra kontakt, och började också
   fundera över elektroniska musikinstrument i allmänhet. Vid den tiden samarbetade jag med Ralph
   Lundsten. Vi hade tillsammans byggt upp en studio, Studio Andromeda, för att i huvudsak arbeta
   med sk. Konkret musik. Vi diskuterade nya konstruktioner med Erkki och han ville då gärna för-
   söka bygga en ”sequenser" där man kunde styra frekvens, amplitud och vågform (klangspektra) för
   en längre serie positioner. Detta måste ha varit någon gång 1967. Erkki åkte till Helsingfors och ef-
   ter några månader kom han tillbaka med det första exemplaret som vi döpte till Andromatic. Detta
   lilla, men lättanvända instrument, blev tillsammans med studions övriga faciliteter ett kraftfullt in-
   strument. Många kompositioner från den tiden som lämnade Studio Andromeda hade ljudmaterial
   i sig som utgick ifrån Andromatic och sedan var vidare bearbetade. Vi använde också Andromatic
   direkt i utställningar och konserter. Erkki byggde sedan fler och mera utarbetade versioner av sitt
   instrument.” (Engl. Erkki was invited to Fylkingen (The Association for Experimental Music in
   Stockholm), (I believe in 1967), to give a speech and discuss the possibilities of building an elec-
   tronic music studio - (EMS). We established contact and began to think about electronic musical
   instruments in general. At that time I was collaborating with Ralph Lundsten. We had built a stu-
   dio, Studio Andromeda, together, the idea being mainly to work with so-called concrete music. We
   discussed new designs with Erkki, and he wanted to try to build a “sequencer” where you could
   control longer series of frequency, amplitude and waveform (sound spectra). This must have been
   sometime in 1967. Erkki went to Helsinki and after some months he came back with the first copy,
   which we named Andromatic. This small but easy-to-use artifact, in combination with the studio’s
   other facilities, became a powerful instrument. The sound material of many of the compositions
   that left Studio Andromeda at the time was from Andromatic and was further processed. We also
   used Andromatic directly in exhibitions and concerts. Erkki then built more and more elaborate
   versions of his instrument.)
   219 Kurenniemi (2004) in an interview with Ojanen & Suominen.

   220 Kurenniemi (2004) in an interview with Ojanen & Suominen. See also a series of photographs

   in Kurenniemi’s collection in FNG/EKA depicting the arrival of Andromatic at the Andromeda




                                                   120

[p. 121 / pdf 147]

produce material for the commissioned album Perspectives ’68: Music in
Finland (Love records, LRLP 4), which was released jointly by The Student
Union of the University of Helsinki (HYY) and the newly founded record la-
bel Love records to honor the 100th Anniversary of HYY in November 1968.
The production of the album and collaboration with Love records were set-
tled at the meeting of the HYY executive committee on June 19, 1968. 221
Meanwhile, the draft contract between HYY and Love records and the initial
production plan for the album contents were discussed by the anniversary
planning committee on May 30, 1968. The contents of the final album are
mainly in line with the initial plan, although the draft contents only have a
placeholder for Kurenniemi’s work, indicating that Kurenniemi would pro-
duce an electronic composition with the University Studio’s music machine
that would last approximately seven minutes.222
    Later on, Kurenniemi selected three segments from the tape he recorded
with Andromatic and simply spliced them together without further pro-
cessing to complete the commissioned work. The eventual title of Kuren-
niemi’s work on the album was Antropoidien tanssi (Engl. Dance of the An-
thropoids, 1968), and it was the first work for synthesizer and the second
electroacoustic work to be released on a sound record in Finland. As a sound
recording, Antropoidien tanssi was preceded only by Salmenhaara’s Infor-
mation Explosion (1967), which was released by Love records in June 1967
(LREP 103). An excerpt from Antropoidien tanssi entitled Dance of the An-
thropoids was issued in 1970 on the second album released by Finnish pre-
progressive rock group Wigwam, entitled Tombstone valentine (1970, LRLP
19). The idea to include Kurenniemi’s track on the Wigwam album came
from their producer Kim Fowley (1939–2015), who had heard it on the HYY
compilation album.
    Lundsten and Nilsson started touring Sweden with Andromatic on Sep-
tember 24, 1968.223 The instrument was displayed in Den Immateriella Pro-
cessen exhibition (Engl. Immaterial processes 224), which opened on Novem-
ber 10, 1968 in Konstsalongen Samlaren in Stockholm225 (see Figures 32 and
33).




   studio. The first one shows Lundsten holding a cardboard box on the doorstep of the Andromeda
   studio (see Figures 25–31).
   221 The HYY executive committee meeting on June 19, 1968: “Hallitus hyväksyi Komandiittiyhtiö

   Love-Recordsin kanssa 100-vuotisjuhlien yhteydessä julkaistavasta LP-levystä tehtävän sopimuk-
   sen.” (Engl. “The board approved an agreement with the limited partnership company Love rec-
   ords for the LP to be released at the 100th anniversary celebration.”)
   222 See the documents in the HYY archive: H_Hga_2_680530_sopimus and

   H_Hga_2_680530_sopimus_liite, https://doi.org/10.5281/zenodo.4290688
   223 Lundsten (2018) in an interview with Ojanen.

   224 See the invitation card of Den Immateriella Processen, Leo Nilsson archive.

   225 Dahlberg (1968, 6 / DN November 10, 1968); Lundsten (2014, 57).




                                                121

[p. 122 / pdf 148]

A history of Kurenniemi’s electronic musical instruments




Figure 32. The Andromatic in the exhibition Den Immateriella Processen (Engl. Immaterial Pro-
cesses, 1968) in Konstsalongen Samlaren in Stockholm. The instrument and Olle Adrin’s acrylic
sculpture waiting to be assembled on a table. (photo: unknown / the Finnish National Gallery /
Erkki Kurenniemi archive)




                                               122

[p. 123 / pdf 149]

Figure 33. The Andromatic in the exhibition Den Immateriella Processen (Engl. Immaterial Pro-
cesses, 1968) in Konstsalongen Samlaren in Stockholm. Assembled setup in the exhibition.
Lundsten adjusting unidentified instrument parameter. (photo: unknown / Ralph Lundsten ar-
chive226)


   226 Photo available via Andromeda website: https://www.andromeda.se/wp-

   content/uploads/2012/10/anmdromaticljusterminal.jpg




                                               123

[p. 124 / pdf 150]

A history of Kurenniemi’s electronic musical instruments



Shortly afterwards the instrument was part of the Feel It exhibition, first at
the National Museum of Fine Arts in Stockholm in December 1968, and from
January 24 to March 16, 1969 at the Museum of Contemporary Crafts in New
York.227 Andromatic was one among a larger group of works. The work enti-
tled Andromatic, with the sub-title [A] sculptural panel for your eyes and
ears, consisted of an acrylic sculpture of the instrument and Olle Adrin. An-
dromatic controlled the lighting of the sculpture and produced the music.
The audience could interact with the work by modifying the switches and
knobs on the instrument.228 Lundsten and Nilsson also produced the two-
piece electronic tape music work Feel It for the exhibition, which was re-
leased in 1968 as the first seven-inch single record in Sweden, and on Janu-
ary 30, 1969 as the special exhibition release accompanied with a 16-page
booklet as the exhibition catalog.229
    Andromatic returned to Sweden after the Feel It exhibition, and together
with the sculpture setup was displayed at the Expo Norr festival in Östersund
from June 28 to July 6, 1969 as part of the Rikskonserter series. Lundsten
and Nilsson used the instrument among other sound sources, and realized
the two-channel tape music work Fågel Blå (1969; Engl. The Blue Bird). The
work was “commissioned by the Foundations for Nationwide Concerts to act
as festival and inauguration music”.230 When they were composing the work
Lundsten and Nilsson envisioned the sound coming from angels, hence,
Fågel Blå was performed from two large balloons that were five meters in
diameter “floating in the air over Östersund.” Nordwall 231 described
Lundsten and Nilsson’s contributions as entertainment rather than art in his
festival review. He was disappointed to report that the setup for Fågel Blå
was completed a day after the opening, and that Andromatic did not work in
the exhibition.232
    Andromatic returned to Finland at least once when Kurenniemi used it in
the Elektrononstop electronic music concert233 organized by Yle at Vanha


   227 Lundsten (2006, 53; 2014, 57); see also the American Craftsmen's Council, Museum of Con-

   temporary Crafts (1969): Feel It - Press Release
   https://digital.craftcouncil.org/digital/collection/p15785coll6/id/6547/rec/2
   228 American Craftsmen's Council. Museum of Contemporary Crafts (1968);

   https://digital.craftcouncil.org/digital/collection/p15785coll6/id/5876/
   229 Feel It, Andromeda edition, see: https://www.discogs.com/Ralph-Lundsten-And-Leo-Nilsson-

   Feel-It/release/2473419; Feel It, exhibition edition, see: https://www.discogs.com/Ralph-
   Lundsten-Leo-Nilson-Feel-It-Exhibition-Edition-/release/10416668
   230 Lundsten and Nilsson Tellus/Fågel Blå LP record sleeve https://www.discogs.com/Ralph-

   Lundsten-Leo-Nilson-Tellus-F%C3%A5gel-Bl%C3%A5/release/2215498
   231 Nordwall (1969, 16/DN July 3, 1969).

   232 See DN (April 26, 1969, 16); DN (June 12, 1969, 22).

   233 Elektrononstop is mentioned in Kurenniemi’s daily planner entry on November 17, 1969 at 4

   pm as “16.00 Nonstop” and on the bottom of the page he noted, “Nonstop n. 6 kelaa nauhaa (2
   E.S-a.)” and “Nonstop materiaali takaisin!!” (Engl. Nonstop six reels of tapes, two Erkki Salmen-
   haara; Return Nonstop material!!). It remains unresolved whether the markings refer to material
   recorded at Elektrononstop or to the tape works reproduced at the tape music concert that was




                                                 124

[p. 125 / pdf 151]

Ylioppilastalo (Engl. The Old Student House) in Helsinki on November 17,
1969. Composer Osmo Lindeman and Kurenniemi presented the electronic
music equipment as part of this six-hour event. Unfortunately, no audio, film
or photographic documents have survived, thus no closer analysis of the
event is possible. Ruohomäki (2020, EH36/6), who attended the concert,
was impressed by the vivid patterns and interaction of the players when Ku-
renniemi and Lindeman performed with Andromatic and DICO (see Chapter
5.2.3), respectively. Ruohomäki considered the performance a success. Sal-
menhaara234 wrote a positive review of the event and described Kurenniemi
and Lindeman as presenting electronic music equipment, but he did not spe-
cifically mention the instruments that were used.
    For Lundsten, Andromatic was irreplaceable as a sound source in his An-
dromeda studio, where he used it for almost 50 years. He utilized the sound
from the instrument in literally dozens of works – in addition to the above-
mentioned examples in Robot Parade (1968), the seven-piece Erik XIV
(1969), Through a Landscape of Mirrors (1970), the nine-piece Gustav III
(1971), Nattmara (1970), Shangri-La (1973), Brain Safari (1976), The Hot
Andromedary (1976), Listen The Space Sneaker (1976), Discophrenia
(1978), Ego Love Song (1979), and Horrorscope (1979). He declared in 2012
that Andromatic was “the best synthesizer in the world”. 235 The Andromeda
studio was dismantled in 2014 and Lundsten donated the instrument to Mus-
ikmuseet in Stockholm. Both Nilsson and Lundsten contributed to Kuren-
niemi’s instrument-design process. Lundsten’s collaboration with Kuren-
niemi continued after Nilsson left the Andromeda studio to build his own
Viarp Studio in the early 1970s (see e.g. Sandlund 2019). Lundsten partici-
pated in the design of the DIMI instruments, and eventually purchased four
of them to complete the Andromeda studio collection amid Andromatic (see
Figure 34; see also Chapter 5.3).




   part of it. Erkki Salmenhaara (1969) wrote a review of the event in Helsingin Sanomat. It is notable
   that Fylkingen used the name Electrononstop in their concert series in the 1960s.
   234 Salmenhaara (1969, 16)/HS 19.11.1969).

   235 Lundsten (2012) in an interview with Ojanen & Ruohomäki.




                                                  125

[p. 126 / pdf 152]

A history of Kurenniemi’s electronic musical instruments




Figure 34. Composer Ralph Lundsten in his Andromeda studio sometime between 1975 (the
completion of the DIMI 6000) and 1978 (the donation of the DIMI-A to the Musikmuseet). Kuren-
niemi’s instruments seen from left to right: the DIMI 6000 ADDS terminal (far left side of the pho-
to), the DIMI-A integrated into the mixer console (close to Lundsten’s right hand), the DIMI-O
camera (the upper right corner of the photo), the Andromatic (far right side of the photo, under
the DIMI-O video monitor), the DIMI-O keyboard underneath the Andromatic. (photo: unknown /
originally published in Otavan iso musiikkitietosanakirja236)


5.2.3    Osmo Lindeman’s early home studio setup and the DICO
         digitally controlled oscillator
Osmo Lindeman (1929–1987) was a classically trained composer and music
pedagogue, who received his composition diploma from the Sibelius Acade-
my in 1958. Before commencing his career as a composer, he was a jazz pia-
nist and recorded Latin American music with several groups. He studied
composition in the Sibelius Academy with Nils-Erik Fougstedt, and in the
State Institute of Music in Munich with Carl Orff in the early 1960s as an
UNESCO grantee237. During the academic year 1976–77, Lindeman visited
the University of Illinois and the University of Columbia, New York, where he
studied electronic music as a Fulbright-Hays Visiting Scholar.238 (Ruohomäki
2020, EH36/1; Juva 2008, 111)
   Lindeman’s repertoire for orchestra includes works such as two sympho-
nies239, two concertos240, several works of chamber music241, and Variabile



    236 See Ala-Könni et al. (1978, 123).

    237 Lindeman won the UNESCO grant as a prize for his first Symphony (1959).

    238 See FIMIC (1979), composer brochure in the UHMRL archive.

    239 Symphony No. 1 Sinfonia inornata (1959), Symphony No. 2 (1964)

    240 Concerto No.1 for piano and orchestra (1963), Concerto No. 2 for piano and orchestra (1965)




                                                  126

[p. 127 / pdf 153]

for orchestra (1967). Adding to his works for classical and contemporary or-
chestra Lindeman composed several film scores, notably for directors Matti
Kassila242 and Eino Ruutsalo243 – as well as for Ritva Arvelo,244 Aarne Tar-
kas,245 Maunu Kurkvaara,246 and Valentin Vaala.247
    Even though Lindeman had been teaching music theory at the Sibelius
Academy since 1961, he did not start to run courses on electronic music until
1972. Composer Otto Romanowski (b. 1952), who started his studies at the
Academy in 1972, recalls that electronic music was not appreciated there at
the time, and even Lindeman’s new courses were not unreservedly appreciat-
ed.248 According to Lindeman’s promotional texts published in the Sibelius
Academy’s in-house journal, as well as in Rondo music magazine, his courses
in 1973–74 were entitled Elektroniikka I (Engl. Electronics I), Elektroniikka
II (Engl. Electronics II), Tietojenkäsittelyopin peruskurssi (Engl. Basic
course in computing), Tietokoneen ohjelmointi (Engl. Computer program-
ming), and Tietokonemusiikin matematiikka (Engl. The Mathematics of
Computer Music). Given its negative attitude towards the new (electronic)
music, the Sibelius Academy did not invest in any equipment, therefore Lin-
deman’s courses were theoretical and based on simulation. However, the
University Studio provided facilities for hands-on experiments and most of
Lindeman’s students also took the university courses that Ruohomäki and
Kurenniemi started to organize in 1972. 249
    As a teacher and composer of electronic music, Lindeman felt that he had
to invent everything by himself, including the themes he taught and the lan-
guage for his electronic works (Ruohomäki 2020, EH36/7–8).250 He pub-
lished several course materials such as Tietojen käsittelyopin peruskurssi,251
Digitaalitekniikka252 and Elektronisen musiikin teknologia.253 He also trans-
lated Knut Jeppesen’s Kontrapunkt into Finnish in 1972, published a text
book on music theory (1976, Johdatus musiikin teoriaan) and a book about


   241 String Trio (1958), String Quartet (1966), Music for Chamber Orchestra (1966), Concerto for

   Chamber Orchestra (1966), Partita for Percussion (1962), Two expressions for vibraphone and ma-
   rimba (1965).
   242 Punainen viiva (1959), three Komisario Palmu movies (1960–1962), Tulipunainen kyyhkynen

   (1961), Kolmen kaupungin kasvot (1962).
   243 Puhuvat kädet (1959), Hetkiä yössä (1961), Herra Adam käy Suomessa (1966), Tämäkö on

   teddy-karhun maailma? (1969).
   244 Kultainen vasikka (1961).

   245 Minkkiturkki (1961).

   246 Rakas… (1961).

   247 Totuus on armoton (1963).
   248 Romanowski (2019) in an interview with Ojanen.

   249 See also Sirkka Lindeman (1996) in an interview with Ruohomäki.

   250 Lindeman’s interviews with Koskimies (1972), Paalanen (1974), Sermilä (1975) and Santalahti

   (1980).
   251 Lindeman (1972).

   252 Lindeman (1973).

   253 Lindeman (1974).




                                                  127

[p. 128 / pdf 154]

A history of Kurenniemi’s electronic musical instruments



electronic music entitled Elektroninen musiikki,254 which was a rare release
in Finnish – even in 1980 when it was published.
    Lindeman decided to abandon composing orchestral works in 1968,
shortly after the premiere of Variabile (1967), which was his last work for
orchestra. It was premiered on December 7, 1967 during the 50th-anniversary
concert of Suomen Säveltaiteilijain liitto (Engl. The Finnish Composers’ Un-
ion), performed by The Helsinki Philharmonic Orchestra under the baton of
Jorma Panula in the Great Hall of the University of Helsinki. Lindeman used
graphic notation in Variabile, which has been described retrospectively as
representative of his “transition from traditional instrumental resources to-
wards electronic music”255 (see also Riikonen 1978, 9–11). The notation
caused several problems in the rehearsals and eventually even caused the
concert performance to be interrupted.256
    Annoyed by these experiences Lindeman wondered why the composer
was dependent on the orchestra and the conductor. He left for Poland shortly
after the concert, where he came across electronic music scores by composer
and music teacher Andrzej Dobrowolski as well as the writings of composer,
music theoretician and teacher Boguslaw Schaeffer. Lindeman met Do-
browolski and spent most of his two-week trip in the electronic music studio
of the Warsaw school of music. He came to his decision during that period,
and thereafter he focused only on electronic music.257 (Riikonen 1978, 9–11)
    Lindeman’s tape music concert in the Porthania music hall on November
7, 1969 was reviewed by Wahlström258, who interviewed the composer. Lin-
deman talked about his interest in music constructed with an automatic
rhythm machine, even though “it was designed as a joke”. According to Ku-
renniemi’s daily diaries, Lindeman met Kurenniemi on July 22, 1968 259 –
just as Kurenniemi and Numminen were finishing Sähkökvartetti before its
premiere in Bulgaria. At that point the Andromatic was at least on the draw-
ing board, as Kurenniemi delivered the instrument to Stockholm in Septem-
ber. Either of these instruments may well have inspired Lindeman’s “rhythm
machine”, but it is not known whether he was specifically referring to Kuren-
niemi’s designs in Wahlström’s review. Nevertheless, he thought that he
could develop the idea of automated music further. He asked Kurenniemi to


   254 Lindeman (1980).

   255 See FIMIC (1979) composer brochure; see also Lindeman’s scrapbook: Lindeman, Osmo, Lin-

   deman, Sirkka, & Ojanen, Mikko. (2020). The Scrapbook of Osmo Lindeman: catalogued and an-
   notated contents with sample pictures [Data set]. Zenodo.
   http://doi.org/10.5281/zenodo.3886432.
   256 Lindeman (1975) mentions the interruption in his interview with Sermilä on February 5, 1975,

   however, none of the concert reviewers attached to Lindeman’s scrapbook mention the work being
   interrupted. The newspaper clippings, of which publication details have not been documented, in-
   clude reviews by Erik Tawaststjerna, Seppo Nummi, and pseudonyms V.V., Her, and aa.
   257 Lindeman (1975) in an interview with Sermilä.

   258 Wahlström (1969, 11/Hbl November 11, 1969).

   259 See Kurenniemi’s daily planner 1968.




                                                128

[p. 129 / pdf 155]

help when he wanted “a similar automated melody machine” 260 for his home
studio setup, which was still quite modest with a couple of pieces of equip-
ment located on the living room bookshelf (Ruohomäki 2020, EH36/6).
    Home studios were rare at the time, most of the setups being developed
and maintained by universities or national radio broadcasters. Lindeman’s
home studio was pivotal for him. He did not want to book studio time weeks
beforehand, but he did want to have all his own equipment available when
the inspiration arose – any time of the day or night. He also appreciated the
comfortable working environment, where he could be in his dressing gown
without leaving home. Lindeman moved to a new apartment with his family
in the early 1970s, where he designated one room as an electronic music stu-
dio (see Figures 35 and 36).261
    Kurenniemi finished the digitally controlled synthesizer-sequencer for
Lindeman in early 1969 at the latest. The instrument has variously been re-
ferred to as DICO, DCO, LDCO and Digo, L possibly referring to Lindeman 262
(Riikonen 1978; Suominen 2013). As with Kurenniemi’s other designs, DICO
was modified after the first version was completed: it even went back to Ku-
renniemi in early 1970.263 For a detailed description of the functionalities and
usability of the instrument, see Chapter 6.
    The first work that Lindeman realized with the DICO was probably a half-
hour tape with electronic music for the international Valo ja liike 2 (Engl.
Light and Movement 2) exhibition organized by Eino Ruutsalo in the Amos
Anderson Art Museum, May 30 – June 8, 1969. Lindeman entitled the work
Mobile264, and it was repeatedly reproduced from the tape in the exhibition.
He shortened it later and entitled it Kinetic Forms (1969), and as such it was
premiered with Mechanical Music for Stereophonic Tape (1969265) in Yle’s

   260 Wahlström (1969, 11/Hbl November 11, 1969).

   261 Wahlström (1969, 11/Hbl November 11, 1969); Lindeman (1972) in an interview with

   Koskimies; Lindeman (1975) in an interview with Sermilä.
   262 Kurenniemi’s daily planner for 1969.

   263 Kurenniemi’s daily planner, February 12, 1970; also, Sirkka Lindeman’s (1996) interview with

   Ruohomäki.
   264 The description of Mobile in the Valo ja liike 2 exhibition catalog: “Näyttelyssä kuultavan elekt-

   ronisen musiikin on säveltänyt Osmo Lindeman (s. 1929) Helsingistä. Teoksen nimenä on ‘Mobile’
   ja säveltäjä mainitsee siitä seuraavaa: Sävellys on rakennettu puhtaasti elektronisista äänistä. Ne
   on taltioitu erilaisista äänigeneraattoreista, joista yksi on varustettu elektronisin muistiyksiköin.
   Saatu sävelmateriaali on muokattu uudelleen ‘sekoittaen’ sekä erilaisia suodattimia ja kaikulaittei-
   ta käyttäen lopulliseen muotoonsa.”
   (Engl. “Osmo Lindeman (b. 1929) from Helsinki, Finland, composed the electronic music heard at
   the exhibition. The title of the work is 'Mobile' and the composer describes it as follows: The com-
   position is built purely from electronic sounds. They are recorded from various sound generators,
   one of which is equipped with electronic memory units. The resulting melody material has been
   remodelled to 'blend', using various filters and echoes, to its final form.”)
   265 Also known as Computer Music for Stereophonic Tape (Yle archive: Programme ID

   000102029) or Datamaskinmusik för stereoband (Wahlström (1969, 11/Hbl November 11, 1969).
   In contrast to my previous remark due to insufficient analysis (see Ojanen & Suominen 2005, 24,
   footnote 20), Lindeman did not employ the two-channel output of the instrument. It appears in his
   works as a point source signal.




                                                   129

[p. 130 / pdf 156]

A history of Kurenniemi’s electronic musical instruments



tape music concert on November 7, 1969. Lindeman’s other early works with
the DICO include Tropicana (1970), Midas (1970), the sound designs for the
TV commercials Sunkist and Finn-Humus, and the musical logo for the na-
tional TV news that was used by Yle throughout the 1970s.




Figure 35. Composer Osmo Lindeman in his home studio in 1972 The “comunicato” of the 1st
prize for Ritual hanging on the wall behing the work lamp next to the poster of ascenting Apollo
11 Lunar Module. The DICO located in a central place in the middle of the setup. (photo: Sirkka
Lindeman / originally published in Tiedon värikäs maailma266)



    266 See Virtaranta et al. (1973, 192). The original caption: “Säveltäjä Osmo Lindeman yksityisessä

    elektronimusiikin studiossaan. Kuvassa nähdään mm. erityyppisiä äänigeneraattoreita, äänen-
    tarkkailu- ym. mittareita, oskilloskooppi, suodin jne. Keskellä oleva laite, jossa palaa pieniä tark-
    kailulamppuja, on äänigeneraattori, jonka rakenne perustuu tietokonetekniikkaan. Tämä ns. digi-
    taalioskillaattori sisältää oman muistiyksikön, ja laittetta ohjataan binaarikoodilla. Kuvassa olevan
    studion laitteisto ei kansainvälisessä vertailussa läheskään sijoitu laajimpien ja kalleimpien jouk-
    koon. Elektronisen musiikin sävellystyössä ei ratkaiseva tekijä kuitenkaan ole laitteiden lukumäärä
    ja kalleus, vaan niiden tarkoituksenmukaisuus sekä tietenkin säveltäjän mielikuvitus ja laitteiston
    käyttötaito. Tästä on mm. todisteena kuvassa seinällä kehyksissä oleva ‘comunicato’ Lindemanin




                                                    130

[p. 131 / pdf 157]

Figure 36. Lindeman’s home studio setup in 1975. The DICO companied by the EMS VCS 3 Mk
III. The DICO input for the external signal was connected in 1972, but not in 1975. (photo: un-
known / originally published in Otavan iso musiikkitietosanakirja267)

The material Lindeman originally produced for Mobile and Tropicana was
used in the soundtrack of Eino Ruutsalo’s short film Tämäkö on teddy-
karhun maailma? (1969, Engl. Is This the World of Teddy Bear?) in 1969. It
is not known whether Lindeman re-arranged the material himself or gave the
Mobile and Tropicana tapes to Ruutsalo, who then edited the final sound-
track. In 1972, Lindeman produced the music for dancer Riitta Vainio’s
(1936–2015) two-part televised dance phantasy Hummerit ja hummarit,
Hummarit ja hammarit (1972268). The first part of the work is based mainly

    saamasta 1. palkinnosta suuressa kansainvälisessä sävellyskilpailussa elektronimusiikin kategori-
    assa Roomassa 1972.”
    (Engl. “Composer Osmo Lindeman in his private electronic music studio. The picture shows differ-
    ent types of sound generator, sound-monitoring and other meters, oscilloscope, filter, etc. The de-
    vice in the middle, where the small monitoring lamps are lit, is a sound generator, the structure of
    which is based on computer technology. This so-called digital oscillator has its own memory unit,
    and the device is controlled by a binary code. By international comparison, the equipment in the
    studio in the picture is far from being among the most extensive and expensive. However, the deci-
    sive factor in the composition of electronic music is not the amount and cost of the equipment, but
    its appropriateness and, of course, the composer's imagination and the ability to use the equip-
    ment. This is evidenced in the ‘comunicato’ in the framed certificate on the wall for Lindeman’s
    First Prize at the great international composition competition in the category of electronic music,
    held in Rome in 1972.”)
    267 See Ala-Könni et al. (1978, 74).

    268 Name of the program: Musiikkiykkönen: Hummerit ja hummarit. Hummarit ja hammarit;

    Media ID: MEDIA_2016_01094581; Programme-ID: PROG_2009_00171786; Date: 19721006;
    Subject: Kaksiosainen tanssifantasia (Engl. A dance phantasy in two parts).




                                                   131

[p. 132 / pdf 158]

A history of Kurenniemi’s electronic musical instruments



on sound material from Mobile, with some new DICO sequences and noise.
The second part includes both concrete and instrumental as well as electronic
sounds.
    Kurenniemi and Lindeman attended the electronic music seminar on No-
vember 5, 1969, which was organized and recorded by Yle. The sound record-
ing includes Kurenniemi’s only documented use of the DICO, which he
demonstrated for five minutes. The recording was later entitled Im-
provisaatio (1969) and was released on the album Äänityksiä/Recordings
1963–1973269 (Love records LXCD 637). Only the direct signal from the in-
strument with its distinctive spring reverb was recorded – not the seminar
room. Thus, it is impossible to verify whether or not Kurenniemi presented
the instrument while he was playing. However, the casual nature of the doc-
ument hints that he verbally described the instrument during the static first
part of the recording and improvised with it after a sudden 12-second break
(Ojanen & Lassfolk 2012, 6–7). Lindeman and Kurenniemi presented elec-
tronic music equipment and performed with the DICO and the Andromatic,
respectively, in the Elektrononstop event organized by Yle in Vanha Ylioppi-
lastalo in Helsinki on November 17, 1969 (see also Chapter 5.2.2 on the An-
dromatic).
    Lindeman thought of his first electronic works as mere studies, and com-
missioned works or soundscapes for different purposes such as exhibitions,
commercials and TV – not as standalone musical works. He even expressed
his wish that they should be left unnoticed if they deserved it (Riikonen 1978,
9–11).270 He only considered his last two works, Ritual (1972) and Spectacle
(1974), his official standalone works of electronic music, even though he lists
Kinetic Forms, Mechanical Music for Stereophonic Tape, Tropicana and
Midas in his curriculum.271
    Ritual was awarded first prize in the electronic and computer music cate-
gory of the 1972 International Musical Composition Contest (IMCC) orga-
nized by the Italian Society of Contemporary Music (ISCM). Over one thou-
sand works from 43 different countries were entered, 272 including 74 works
in the electronic and computer music category together with Lindeman’s Rit-
ual. The work273 was released in 1978 on the album Suomalaista elektroa-

   269 Kurenniemi (2002) CD Äänityksiä/recordings 1963–1973.

   270 Lindeman (1975) in an interview with Sermilä.

   271 See FIMIC (1979), composer brochure.

   272 See Lindeman’s scrapbook for the telegram announcing the news about the first prize, newspa-

   per and magazine articles about the news; Lindeman, Osmo, Lindeman, Sirkka, & Ojanen, Mikko.
   (2020): http://doi.org/10.5281/zenodo.3886432
   273 The description in FENO 5 (1978): “Ritual depicts a religious event which one may understand

   from any religious point of view. Dominating the opening part of the work is a monotonous and
   litany-like speaking – a kind of mumbling suqqestive of an audience, or in this case congregation.
   An electronic backcloth, later rising into foreground, pictures the moods and emotional reactions
   of the easily impressionable congregation. It goes without saying that ritual events may take on
   many different forms. They can be beautiful and festive, but may also be bewildering or even offen-
   sive. In all cases the ritual serves to channel and mould the thoughts of those who participate in it.




                                                   132

[p. 133 / pdf 159]

kustista musiikkia: Finnish electro-acoustic music.274 Spectacle275, for which
the main sound sources were the VCS 3 and the Minimoog, was commis-
sioned by Yle. It comprises three parts, Lamentation, Meeting and Epilogue,
and it was released on the album Musica Nova Academiae: Sibelius-
Akatemia 1882–1982 (Sibelius-Akatemian äänilevysarja 1, SALP 1) in 1982.
    Lindeman mainly used electronic sound sources in his electronic music
works. Even though Ritual consists of some concrete sound material such as
speech, he did not employ the techniques or follow the tenets of musique
concrète. The vocal sound for example, is fully recognizable as human speech
– even if the content is intentionally meaningless. Lindeman concentrated
solely on composing tape music works in his home studio because he thought
his equipment was not suitable for live electronics.276
    The DICO remained in Lindeman’s home studio together with his other
synthesizers including the EMS VCS 3 Mk III, the Micromoog, and several
discrete oscillators and sound-processing equipment. Lindeman died in
1987, after which his home studio was dismantled. The DICO was stored for a
couple of years, first in the premises of a music school in Espoo, and later in
CARTES (the Center of Art and Technology in Espoo). Ruohomäki eventually
stored the instrument in the cellar of the University Studio, where it was dis-
covered in 2003 and restored, shortly after a revival of interest in Kuren-
niemi’s instruments. Since then, the DICO has been used both in the Univer-
sity Studio and in live performances.




   In this respect Ritual is really a sort of parody, though not such as would be intended to cause of-
   fense. It merely attempts to point out the conscious theatricality of the ritual event: a theatricality
   whose value to modern man may seem a little questionable. Ritual was made in my own private
   studio. At the present time this studio houses two different types of electronic sound synthesis
   equipment: a programmable digital sequence oscillator, and a group of different devices for signal
   generation, control and modification (oscillators, filters, modulators, echo units, mixers and me-
   tering equipment) and three stereo tape recorders. Ritual was made using considerably more mod-
   est equipment resources, however: allow sounds other that the speech sounds were derived from
   two oscillators, a ring modulator, filter, noise generator, echo unit and tape recorders. Ritual was
   awarded first prize in the electronic category of an international composition organised by the Ital-
   ian section of the ISCM in 1972.” (Translation from the composer’s original text for the album liner
   notes by Dr. Andrew Bentley.)
   274 Fennica Nova, FENO 5.

   275 The description in SALP 1 (1982): “Elektroninen sävellys Spectacle valmistui Yleisradion sävel-

   lystilauksena v. 1974. Se sisältää kolme elektronista sävelrunoelmaa Lamentation, Meeting ja Epi-
   logue. Näille osille on säveltäjä antanut seuraavat erilliset alaotsikot: Yksinäinen äänitaajuus-
   generaattorin valitusvirsi ristikytkentäkentässä, Tunnelmia eräästä puoluekokouksesta, Pieni lyy-
   rinen loppusoitto.” (Engl. “The electronic composition Spectacle was completed as a commission
   from the Finnish Broadcasting Company in 1974. It contains three electronic poems, Lamentation,
   Meeting and Epilogue. The composer gave the following separate subtitles to these parts: A lamen-
   tation of a lonely frequency generator in a patch bay field, Moods from a party meeting, A small
   lyrical ending.”
   276 Lindeman (1975) in an interview with Sermilä.




                                                    133

[p. 134 / pdf 160]

A history of Kurenniemi’s electronic musical instruments



5.3 The DIMI series and Digelius Electronics Finland
    (DEF)
The history of Kurenniemi’s company, Digelius Electronics Finland (DEF), is
intertwined with the design and building of the DIMI (Digital Musical In-
strument) series. Because the first DIMI was completed before the founding
of the company, I present the history of Digelius only briefly as a side-track of
the narrative of DIMI synthesizers. The company would need a more thor-
ough historical presentation.


5.3.1    The first DIMIs and the foundation of DEF
In a magazine article in Apu published on February 5, 1971, Kurenniemi rem-
inisces about his trip to the Florence electroacoustic music conference in
June 1968. He describes how his enthusiasm for electronic musical instru-
ment building burst from a spark into flames after the conference. 277 He had
already spent a few years building the University Studio and the Integrated
Synthesizer. The Sähkökvartetti and Andromatic designs existed at the time
of the Florence conference, and within the forthcoming few months Kuren-
niemi would build the DICO for Lindeman. The starting points of the design
processes for each instrument cannot be verified from current documentary
evidence. Numminen recalls that he started envisioning the Sähkökvartetti in
1966278 (Suominen 2013). According to Nilsson, over the years they had sev-
eral conversations with Kurenniemi about the role of electronic musical in-
struments in the composition and production of electronic music – and with-
in the art form in general.279 Kurenniemi had a meeting with Lindeman on
July 22, 1968.280 In any case, Kurenniemi completed these three customized
designs in approximately eight months between July 1968 and early 1969. He
clearly gained momentum for instrument building and the intensive devel-
opment work continued.
    Not much is known about the early phases of the instrument that became
the first DIMI (1970; see Figure 37). Later it acquired its current name, DI-
MI-A, A standing for the technical implementation of its memory unit – the
so-called associative memory schema (Ojanen & Suominen 2005, 24–25;
Lassfolk et al. 2015 266–270; see also Chapter 6.2.5) and being the first of
the DIMIs. The DIMI-A was completed in the summer of 1970 – in August at
the latest. Alongside the DIMI-S (1972) and the DIMI 6000 (1975) it was an
exception among Kurenniemi’s instruments in that two copies were pro-
duced. One DIMI-A was purchased by Lundsten and the other one remained

   277 Leino (1971, 35/Apu February 5, 1971).

   278 See Gronow (1966, 47)

   279 Nilsson (2019) in an interview with Ojanen; see also Lundsten (2018) in an interview with

   Ojanen.
   280 See Kurenniemi’s daily planner 1968.




                                                  134

[p. 135 / pdf 161]

in the University Studio, even though its ownership history remains unclear,
and Yle also shared in its purchase.




Figure 37. Kurenniemi programming the DIMI-A sequencer synthesizer in an unknown location
(photo: unknown / The Finnish National Gallery / Erkki Kurenniemi archive)

No documentary evidence related to the instrument’s development or its
original schematics has survived. Ruohomäki, who was studying musicology
in the University Studio at the time, recalls that when the instrument ap-
peared it was already completed. He does not remember Kurenniemi build-
ing the DIMI-A in the Vironkatu premises.281 It seems plausible that Kuren-




   281 Ruohomäki (2018) in an interview with Ojanen.




                                                135

[p. 136 / pdf 162]

A history of Kurenniemi’s electronic musical instruments



niemi worked on the first DIMI at the Elektromusiikki282 premises in Kulo-
saari, Helsinki. Elektromusiikki was owned by Jouko Kottila, who imported
and designed electronic music equipment and instruments such as home or-
gans, spring reverb units and drum machines. It also seems plausible that
Kurenniemi did not build the entire synthesizer on his own. A graphic de-
signer at least, and some people who would become employees of Digelius
when the company was established – such as Jouko Ketola and a few others
– were involved in the building process, in the soldering sessions, for exam-
ple.
   Having finished the first DIMI, Kurenniemi applied for a loan from the
Finnish Innovation Fund Sitra to develop his instruments and received a
grant of FIM 84,000283. To get the funding he needed a fiscally responsible
organ. He faced a similar situation to the one Donald Buchla, Morton Su-
botnick, and Ramon Sender faced a few years earlier when they eventually
received funding from the Rockefeller Foundation. The San Francisco Tape
Music Center had to be merged with Mills College, which “fitted the bill”
(Bernstein 2008, 115).
   According to Kurenniemi, the founding of Digelius Electronics Finland
happened very hastily, and within hours Peter Frisk, the third partner and
the CEO-to-be, along with Kurenniemi and Kottila, had registered the com-
pany at the Finnish Patent and Registration Office on September 18, 1970. 284
In 1971, Kurenniemi estimated the approximate retail price of the DIMI-A at
approximately FIM 15,000.285
   Kurenniemi’s first known public appearance with the first DIMI was at
Nuorison taidetapahtuma (Engl. The Youth Art Event) in Turku on October
30, 1970, where he demonstrated the instrument.286 He and Ruohomäki in-
troduced the DIMI-A in Sähköinen tapahtuma Vanhalla287 (Engl. An Elec-
tronic Event at the Old Student House) in Vanha Ylioppilastalo, Helsinki on
November 17, 1970 (see Figure 38). In December, Kurenniemi paid a visit to
English synthesizer manufacturer Peter Zinovieff in his studio in London to
present the DIMI-A for marketing purposes. A few notes about the trip sur-
vive on Kurenniemi’s first audio tape diary c-cassette recorded December
18–20, 1971.288 Despite the promising first contact, no DIMIs were sold to


   282 See Figure 73 in Chapter 6.2.1 depicting the printed outline of the DIMI-A user interface with

   hand-written markings about the material and its properties used in the plates, as well as remarks
   about “ELEKTROMUSIIKKI”.
   283 Today approx. EUR 125,000; see the Money Value Converter:

   http://apps.rahamuseo.fi/rahanarvolaskin#ENG
   284 See journal number 1406/178-70; the Finnish Patent and the Registration Office. See also Leino

   1971; 35–36.
   285 Today approx. EUR 20,000, Leino (1971); see also Kurenniemi (1971a.)

   286 Pitkänen (1970, 29/HS October 31, 1970).

   287 Lehtikuva archive pictures ID: 33197848; see also the recording in the Yle archive ID:

   000053962.
   288 Kurenniemi’s audio diary c-cassette C4000/R-4021.




                                                 136

[p. 137 / pdf 163]

Zinovieff. However, Kurenniemi purchased the Putney for the University
Studio.289




Figure 38. The DIMI-A waiting its turn while Sähkökvartetti (the band) is performing Kaukana
väijyy ystäviä at Sähköinen tapahtuma Vanhalla (Engl. An Electronic Event at the Old Student
House) in Helsinki on November 17, 1970 (photo: Pertti Messo / Lehtikuva) 290



   289 Leino (1971, 36/Apu February 5, 1971).




                                                137

[p. 138 / pdf 164]

A history of Kurenniemi’s electronic musical instruments



The second notable demonstration of the first DIMI was in the Primula
cafe291 in Helsinki, on January 20, 1971 from 12 noon until to 2 pm. Invita-
tions to this Digelius Electronics Finland briefing were sent at least to ten
journalists writing for newspapers and magazines.292 Only a few magazine 293
and newspaper294 articles are known of, even though the authors are not
mentioned on the initial invitation list sent out by the owner of the record
label Musica Pertti Lehto, which released the Dimi-1: Dimi is born295 promo-
tional single record (see Figure 39). The program at the briefing included QA
by Peter Frisk, a demonstration of the DIMI-1 (i.e. DIMI-A) by Kurenniemi
and Ruohomäki, the release of the promotional sound recording Dimi-1: Di-
mi is born and Kurenniemi’s presentation of the DIMI-U and DIMI-O pro-
jects. The photo session for the article published the following day in Hel-
singin Sanomat was held in the University Studio at Vironkatu after the Dige-
lius briefing296 (see Figure 40).
    The first works completed with the DIMI-A were Erkki Salmenhaara’s
soundtrack for the documentary film Maan aurinko297 (1968/70; Engl. Sun
of the Earth), Kolme DIMI aihetta (1970; Engl. Three DIMI themes) and
Mikä aika on (1970; Engl. What time is) by Ruohomäki. The two-part piece
Inventio-Outventio (1970), which was realized in the fall of 1970, consists of
Kurenniemi’s arrangement of Johann Sebastian Bach’s Invention No. 13 in A
minor (BWV 784) for the DIMI-A, and the tape collage Outventio realized
jointly by Kurenniemi and Ruohomäki in a separate session. Kurenniemi’s
Bach arrangement for the DIMI-A remains the only work he composed solely
with the instrument. He used the DIMI-A sounds later in his sound collages
Mix Master Universe (1973, with Ruohomäki) and ?Death (1972–1975), as
well as in the exhibition soundscapes Suomi rakentaa (1970) and Poh-
joismaiset rakennuspäivät (1971).




   290 Lehtikuva archive ID: 33197848; Date Created: 19701117; Creator: Pertti Messo. Originally pub-

   lished in Helsingin Sanomat on November 19, 1970, see Salmenahaara (1970, 19 / HS November
   19, 1970).
   291 At the corner of Kalevankatu and Mannerheimintie in Helsinki (personal communication with

   Ruohomäki on March 27, 2020).
   292 See the list of contacts in the invitation letter sent by the owner of the record label Musica Pertti

   Lehto.
   293 See Leino (1971, 35–36/Apu February 5, 1971); Kujasalo & Fröberg (1971, 67/Suosikki June 1,

   1971).
   294 HS (January 21, 1971, 5; 13); ESS (January 21, 1971, 7); Länsi-Savo (January 21, 1971, 10). Writ-

   ten from the same news feed.
   295 Musica, DSS-1.

   296 Lehtikuva archive ID: 1316478, 1260078, 1260076; Date Created: 19710120; Creator: Matti

   Saves.
   297 Documentary film Maan aurinko in Yle’s archive; Name of the program: Maan aurinko (Engl.

   Sun of the Earth). Media ID: MEDIA_2014_00768009; Program ID: PROG_2009_00105005;
   First aired on October 25, 1970. Director: Heikki Ritavuori.




                                                    138

[p. 139 / pdf 165]

Figure 39. Invitation letter to the Digelius briefing from the owner of the Musica record company,
Pertti Lehto




                                                 139

[p. 140 / pdf 166]

A history of Kurenniemi’s electronic musical instruments




Figure 40. Kurenniemi and Ruohomäki performing with the DIMI-A in the 2nd Vironkatu setup of
the University Studio on January 20, 1971 (photo: Matti Saves / Lehtikuva298)

The instrument was used in several recording sessions at the University Stu-
dio during the 1970s. Apart from the Digelius promotional sound recording,
Dimi is born, it features on the track Sirkuksen seinillä (Engl. On the Walls
of the Circus; see Chapter 7.1.5) in the album Sirkustirehtöörin pieni sydän
(1973; Engl. The Little Heart of the Ringmaster) released by Cumulus, a folk
group with a psychedelic flavor. In addition to works published at the time, a
few unpublished recordings with the instrument survive in the University
Studio archive – such as a Dimi 1 improvisatory recording 299 with the date
December 6, 1970 on the reel container. Ruohomäki arranged Bach’s Inven-
tion No. 1 in C major (BWV 772) in the fall of 1970, and a few years later
Heikki Valkonen used the DIMI-A in his arrangement of Le Coucou (1977) by
Louis-Claude Daquin.
    At the time of the first documented demonstration session with the DIMI-
A in Sähköinen tapahtuma Vanhalla on November 17, 1970, Kurenniemi was
already of the opinion that the technology used in its implementation was
obsolete. Donner interviewed him by way of an introduction to the improvi-
sation session with Ruohomäki (DIMI-A), Ilpo Mansnerus (flute), Ralf
Gothoni (piano), and Teppo Hauta-aho (bass). During the interview Kuren-
niemi explained that a five-to-ten-times-bigger memory unit would at that
time be a little cheaper than the one designed for the instrument in the


   298 Lehtikuva archive ID: 1316478; Date Created: 19710120; Creator: Matti Saves.

   299 Released retrospectively on Kurenniemi (2012): Rules. (Full Contact Records – KRYPT-022).




                                                 140

[p. 141 / pdf 167]

summer of 1970 – only a couple months earlier. 300 Another key shortcoming
of the instrument was its cumbersome user interface, which hid the memory
content of the sequencer and the state of the instrument (see also Chapter 6).
The difficult real-time interaction with the instrument was aptly documented
in the above-mentioned improvisation session.
    New DIMI versions were already on the drawing board when the DIMI-A
was being demonstrated. To overcome its shortcomings, Kurenniemi contin-
ued to develop the user interface. The next version was equipped with a video
camera and monitor to enhance the readability of the memory content, and
an electric organ keyboard for conventional musical instrument accessibility
(see Figure 41).
    According to Kurenniemi’s diary entries, he came up with the suffix O for
the next DIMI on January 21, 1971 after having purchased the camera and
monitor.301 The prototype was still in its infancy on February 15, but on May
10 it was in working condition (Mellais 2013[2010]). Engineer Hannu Vii-
tasalo, who worked for Digelius from its early days and was still collaborating
with Kurenniemi in the 1980s, played a significant role in the design of the
instrument’s video technology.302 The initial idea behind the DIMI-O synthe-
sizer was to use a camera to read the graphic notation and then convert it
into music. Kurenniemi considered other and more interesting applications
for the instrument from early on, such as using it in experimental film and
TV productions and other happenings.303 Shortly after the first version was
completed, Kurenniemi, Ruohomäki, Donner and Vesterinen recorded sound
material for the radio play Vihreä eläin (1971) based on Vesterinen’s text.
Donner organized the session in Yle’s Fabianinkatu studio, to where the
equipment was transported from the nearby University Studio, even though
the only instruments (Sähkökvartetti, DIMI-A, DIMI-O) being used were
from the University Studio. Vihreä eläin was the first Finnish electroacoustic
work to win an award in an international competition.304



   300 Kurenniemi (1970 / Sähköinen tapahtuma Vanhalla, Sound recording in the Yle archive ID:

   000053962): ”Kehityksen vauhti on niin ilahduttava, että jos nyt – tämä DIMIhän rakennettiin
   viime kesänä – ja jos nyt vaihdetaan muisti viisi tai kymmenen kertaa suuremmaksi niin sen hinta
   on pikkusta hiukan halvempi kuin tämä vanha sadan sanan muisti.” (Engl. “The pace of develop-
   ment is so gratifying that if you now – this DIMI was built last summer – and if you now swap the
   memory for one five or ten times bigger the price would be a little cheaper than this old one-
   hundred-word memory.”) Interestingly, Lundsten describes a 500-command memory capacity
   when introducing his copy of the instrument in the documentary film in 1973 (see Sima, Jonas.
   1973: Cosmic Love).
   301 See also the Digelius briefing program, January 20, 1971.

   302 Viitasalo (2004) in an interview with Ojanen & Suominen; Viitasalo (2015) in an interview with

   Ojanen & Suominen.
   303 Kurenniemi (1971a).

   304 See HS (July 20, 1971, 25), advertising a radio program in which Donner talks about Vihreä

   eläin winning the first prize in a competition at the Prix Jean Antoine festival in Monte Carlo earli-
   er in the summer.




                                                    141

[p. 142 / pdf 168]

A history of Kurenniemi’s electronic musical instruments




Figure 41. Kurenniemi playing with and programming the DIMI-O sequencer synthesizer, Janu-
ary 24, 1972; in Digelius Electronics Finland premises in Luotsikatu 4. Previously unpublished
photo. Two other photos from the session published in Iltasanomat on February 22, 1972.305
(photo: unknown / Lehtikuva306)

   Kurenniemi’s active involvement in the performances and happenings,
which started in the early 1960s, continued in the 1970s. He had frequent
connections with the avant-garde and underground art group Elonkorjaajat,
although he was not an official member. The Elonkorjaajat gallery Halvat
huvit (Engl. Cheap thrills) was located at Huvilakatu 12 in the Eira district of
Helsinki. This was close to Kurenniemi’s first workspace, in other words the
premises of Digelius at Huvilakatu 24, from its foundation until early 1972. 307
Elonkorjaajat, and especially the leader of the group J. O. Mallander (b.
1944), had close contacts with the Fluxus movement and their leaders, in-
cluding Nam June Paik (Eerikäinen 2007, 85).
   Intermediality was one of the art concepts adopted and further developed
by Fluxus. In the Finnish context the term has been strongly associated with
Kurenniemi, who used the word intermedia to describe his work Deal (1971),
which he composed for a video-controlled instrument in 1971. The first per-
son to use the term in Finland, however, was Mallander 308 in his Iiris maga-

    305 See Pitkänen (1972, 7/Iltasanomat February 22, 1972).
    306 Lehtikuva archive ID: 1316483; Creator: [unknown/no photographer info in the Lehtikuva da-

    tabase]; Date: 19720124. See also the Lehtikuva archive IDs: 2125578, 2125579. Iltasanomat men-
    tions Ari-Veikko Peltonen as the photographer in the session.
    307 See Ojanen, Mikko. (2019). The development of Digelius Electronics Finland (DEF) in the doc-

    umentary evidence (Version 20191225_01) [Data set]. Zenodo.
    http://doi.org/10.5281/zenodo.3592770
    308 Mallander (1970, 2–4, 22/Iiris 8/1970).




                                                  142

[p. 143 / pdf 169]

zine a year before Kurenniemi drafted the score for Deal. ‘Intermedia’ was
also the main title of the first Elonkorjaajat event at the Old Student House
on May 26, 1971: this was when Kurenniemi made his first known public ap-
pearance with the DIMI-O309 (Eerikäinen 2007, 86) (see Figure 42).




Figure 42. The DIMI-O in the Elonkorjaajat event at Vanha Ylioppilastalo on May 26, 1971 with
Jaakko Vartia dancing and Kurenniemi operating the DIMI-O in shadows behind the video moni-
tor; previously published in Taide magazine 6/1971 as part of Kurenniemi’s article “Message is
Massage”310 (photo: unknown / the Finnish National Gallery collections, Erkki Kurenniemi ar-
chive)

With its versatile implementation potential in different art forms and in the
electronic music studio, the DIMI-O was tightly linked to the topical public
discussion about TV and video art. Elonkorjaajat’s Intermedia event, for ex-
ample, comprised a panel discussion and a presentation of the role of the
video in broadcasting and in the arts.311 Later, recorded on September 6 and
17, 1971 in the University Studio on Vironkatu, the DIMI-O was used to pro-
duce the title graphics and introductory music for the Yle educational and
documentary film Matkalla ylihuomiseen312 (Engl. En route to the day after
tomorrow).



   309 HS (May 26, 1971, 18); HS (May 28, 1971, 16).

   310 Kurenniemi (1971b, 36–38/Taide 6/1971).

   311 HS (May 28, 1971, 16).

   312 Yli-Ojanperä (2013): https://yle.fi/aihe/artikkeli/2013/05/30/futuristisella-matkalla-

   ylihuomiseen-1971); see also Kurenniemi's audio diaries C4136, C4137, C4138.




                                                  143

[p. 144 / pdf 170]

A history of Kurenniemi’s electronic musical instruments



    Kurenniemi took the DIMI-O to Yle on September 22, 1971 to test and de-
velop its integration into the professional television system. This pilot-testing
session was also intended to produce material for the Nordic seminar om
formproblemer ved musikkproduksjon i fjernsyn (Engl. Nordic seminar on
form problems in music production in television), held in Lysebu, Oslo from
September 29 to October 1, 1971. The Finnish representative at the seminar,
Ilkka Oramo, presented a paper about the potential of DIMI-O implementa-
tion in TV projects. As part of his talk, he screened the three-part demonstra-
tion recorded at Yle on September 22, 1971 comprising Kurenniemi’s intro-
duction to the key features of the DIMI-O, the so-called Dimi ballet with
dancer Riitta Vainio, and experiments with optical feedback. Later, in his
diary notes, Kurenniemi referred to the demonstration session as somewhat
successful, even though the test group (Kurenniemi with Yle engineers and
the director of the demonstration tape Hannu Heikinheimo) did not manage
to solve the problems that arose in the video synchronization. In his presen-
tation at the seminar, Oramo described the document “as a demonstration,
not as a program or a work of art”. These remarks of Kurenniemi and Oramo
explain why the documentary was not screened publicly or aired by Yle at the
time.313
    The DIMI-O was used frequently in front of the public before it was sold
to Lundsten. Inspired by the instrument, Kurenniemi outlined his perfor-
mance instructions for the intermedia composition Deal (1971) in October
1971.314 These instructions were simply loose boundaries within which the
material would be presented to the instrument’s camera: “The substance of
Deal is a set of rules to transform random (improvised) primary visual mate-
rial into electronic sounds and a secondary video signal”. The score for the
work does not limit its implementation to the DIMI-O, and any other similar
setup could be used in its performance. Within the time frame of this study,
Deal was performed once at the Nordic Music Days in Henie-Onstad Kun-
stsenter, Høvikodden, Oslo on September 3, 1972.
    In addition, the DIMI-O was also presented in several exhibitions, such as
the first exhibition of the Dimensio art/technology group in Tampere from




   313 The program of the Nordisk seminar and Oramo’s talk (unpublished archive document in

   FNG/EKA); Kurenniemi's audio diaries C4136, C4137, C4138; Kurenniemi’s daily planner entry on
   September 22, 1971: “12.15 “Studio 4”; Demonstration film DIMI-baletti in the Yle archive; Name
   of the program: DIMI-baletti. Media ID: MEDIA_2014_00760531; Program ID: PROG_
   2009_00206150. Created: 19710922. Producer: Hannu Heikinheimo; The three-piece demonstra-
   tion including Dimi ballet available on Yle web pages, see Lindfors (2008):
   https://yle.fi/aihe/artikkeli/2008/03/18/dimi-suomalainen-syntetisaattori; Hämäläinen (1972,
   35/Tekniikan Maailma 5/1972)
   314 The written instructions for Deal, first in Finnish (October 1971) and then in English (October

   26, 1971), and Erik Wahlström’s letter to Kurenniemi about the acceptance of the work for the
   Nordic Music Days (unpublished archive documents in FNG/EKA).




                                                  144

[p. 145 / pdf 171]

September 16 to October 15, 1972 315: Kurenniemi was one of the founding
members of the group (Jylhä 2002, passim). A few days later, he demon-
strated the instrument with the Oulu Symphony orchestra. The rehearsals
were held on October 16, 1972. Kurenniemi performed Johann Strauss II’s
Blue Danube with the orchestra on October 18, accompanied by Einojuhani
Rautavaara’s Cantus Arcticus, which was commissioned by the University of
Oulu for its first doctoral degree ceremony.316
   The Norwegian theater group Scene 7 performed Samuel Beckett's play
Act without words in front of the DIMI-O camera in the University of Oslo’s
laboratory studio (see Figures 43–45). The DIMI-O was also used in psycho-
logical tests conducted at the Department of Psychology when the camera
read the testees’ facial gestures as they were reading Rorschach pictures. Ac-
cording to Sutinen:317

       “[t]he experiment aimed at finding out whether expression created
       artificially can be reconciled with the other expressive levels of thea-
       tre, such as gestures, facial expressions, make-up etc. - - - Arild Bo-
       man of the InterMedia centre of University of Oslo saw these experi-
       ments as an opportunity to develop new communication tools for the
       theatre. According to him, the early experiments in virtual reality by
       Kurenniemi make it possible to combine different artistic expression.”

The DIMI-O was eventually sold to Lundsten’s studio, where it was frequent-
ly used until the dismantling of Andromeda in spring 2014. Lundsten used it
in the realization of dozens of works, including several series of Nordisk Na-
tursymphoni (Engl. The Nordic Nature Symphony, 1972–), and ballet music
with which the dance group toured in Finland during the early 1970s. The
Finnish State Art Commission purchased the DIMI-O from Lundsten in 2014
and placed it in the University Studio (for detailed information, see Städje
2013; for a description of the DIMI-O user interface, see Chapter 6)




   315 The first Dimensio exhibition was held at the Modern Art Museum in Tampere from September

   16 to October 15, 1972. For a review of the exhibition, see Valkonen (1972, 33/HS October 15,
   1972).
   316 See Oulu Symphony Orchestra’s concert program, https://doi.org/10.5281/zenodo.4290669;

   see also Kurenniemi’s audio diary C4059; Conductor Stephen Portman envisioned the DIMI-O
   performance for the spring term of 1971, see HS (August 30, 1971, 11); see also Heikinheimo (1972,
   24/HS October 20, 1972).
   317 Sutinen (2002).




                                                  145

[p. 146 / pdf 172]

A history of Kurenniemi’s electronic musical instruments




Figures 43–45. The DIMI-O and Samuel Beckett’s play Act without words performed in Oslo by
the Scene 7 theater group (photos: screen shots from the video in the Finnish National Gallery /
Erkki Kurenniemi archive)


5.3.2    Towards an integrated and modular studio system
Shortly after completing the first DIMIs Kurenniemi directed his attention to
developing the customer-oriented on-demand modular systems he had envi-
sioned on paper. If his individual instruments are considered part of a larger
system, it is clear that his ideas of integrating and modularizing the different
functionalities were leading themes in his designs. Both the integration of
different functionalities into one larger system and the modular design were
evident in the Integrated Synthesizer. From this perspective, the DIMI-O and
the subsequent DIMIs could be considered interface and control-surface pro-
totypes for a larger system.
    Archive documents including his diaries,318 a promotional description of
his digital instruments319, and marketing letters320 show that Kurenniemi
was planning an integrated, automated and modular studio system during
the early 1970s – ultimately realized as the DIMI-U or DIMI-P (U standing
for universal; P standing for programmable). The former was supposed to be
a complete studio system, which could have been custom-compiled from dif-
ferent sound and processing modules according to the customer’s needs (see
Figure 46). The units were never realized.




    318 DIMI-päiväkirja 1971–1972 (Engl. DIMI diary 1971–1972; (unpublished archive document in

    FNG/EKA).
    319 Kurenniemi (1973) digital instrument description (unpublished archive document in

    FNG/EKA).
    320 Kurenniemi’s correspondence (unpublished archive documents in FNG/EKA).




                                                 146

[p. 147 / pdf 173]

Figure 46. One of the hand-drawn sketches of the universal DIMI system the DIMI-U (1972) was
supposed to be a modular custom-built system where customers could choose which modules
they wanted. The sketch includes Ove III speech synthesizer, which may be related to Kuren-
niemi’s initial plans to collaborate with the University of Helsinki Department of Phonetics located
in the same building in Vironkatu together with the University Studio. (image: Kurenniemi in Eri-
koistietojen kortisto / the Finnish National Gallery / Erkki Kurenniemi archive)


5.3.3    Experiments directed toward a new means of instrument control
After realizing the DIMI-O, Kurenniemi went even further with his user-
interface experiments to satisfy his interest in stretching the constraints as-
sociated with traditional methods of interacting with an instrument, and in
finding new ways of performing music. To some extent, the inspiration for
these experiments can be traced to Teatro Comunale’s electroacoustic music
conference in Florence in June 1968, and his collaboration with Lundsten
and Nilsson. While he was at the conference Kurenniemi met American de-
signer of electronic musical instruments Manford L. Eaton, whose ideas on
biofeedback music inspired his visions of different user-interface applica-
tions. Two of his DIMIs are loosely based on the notion of biofeedback as the
control signal for musical processes. (see Zaffiri 2007)




                                                  147

[p. 148 / pdf 174]

A history of Kurenniemi’s electronic musical instruments



   Kurenniemi’s most controversial instrument was the DIMI-S321 (1972),
played by several people touching each other on the bare skin while wearing
handcuffs (see Figure 47). The instrument was designed on the initiative of
and in collaboration with Lundsten, who stressed that it was to be used only
for fun – not as a studio instrument.322 Lundsten presented his idea for the
Kärleksmaskin (Engl. Love Machine) a year before Kurenniemi built his ver-
sion of the instrument.323 He even had to ask Kurenniemi a couple of times to
build the DIMI-S before he agreed to design it.324 When they were building
the Ljudd (1968; Engl. Sound) electronic school instruments for children in
1968, Lundsten and Nilsson noticed that skin conductance could be utilized
in an electronic circuit.325 Together with Eaton’s ideas, Lundsten and Nils-
son’s discovery served as inspiration for the design principle behind the DI-
MI-S.326
   DIMI-T or the Electroencephalophone (1973), which deploys the player’s
EEG as a control signal for the oscillator’s pitch, was similarly inspired by the
notion of biofeedback as a musical control signal. The electroencephalophone
was patented327 a couple of years before Kurenniemi started to build his ver-
sion. Moreover, Alvin Lucier was already using EEG as a control signal in his
Music for Solo Performer in 1965, and Manford L. Eaton had published a
similar design a few years earlier. 328




   321 Also known as Sexophone, or Kärleksmaskin (Engl. Love Machine).

   322 Lundsten (2018) in an interview with Ojanen. For detailed information on DIMI-S see Städje

   (2009).
   323 See Ahlgren (1970, 7/Svenska dagbladet July 31, 1970); Widding (1970, 13/Expressen August

   8, 1970)
   324 Lundsten (2018) in an interview with Ojanen.

   325 Nilsson (2019) in an interview with Ojanen.

   326 See Ahlgren (1970, 7/Svenska dagbladet July 31, 1970); Widding (1970, 13/Expressen August

   8, 1970); Brandel (1971, 7/Aftonbladet August 1, 1971); Pitkänen (1972, 7/Iltasanomat February
   22, 1972).
   327 See Bakerich & Scully (1973).

   328 See also Eaton (1968).




                                                148

[p. 149 / pdf 175]

Figure 47. DIMI-S being tested by two unidentified players (presumably the secretary of Digelius
on the left and Digelius engineer on the right) in Digelius Electronics Finland premises in at
Luotsikatu 4, some time in 1972. In this version of the DIMI-S the handcuffs were not yet re-
placed with hand-held iron balls. See also three photos in Tekniikan Maailma 18/1972329 from the
same session. (photo: unknown / The Finnish National Gallery / Erkki Kurenniemi archive)


    329 Alanko (1972, 44–45/Tekniikan maailma 18/1972).




                                                149

[p. 150 / pdf 176]

A history of Kurenniemi’s electronic musical instruments



Kurenniemi’s biofeedback instruments were used in concert settings, alt-
hough the resulting performances were demonstrations rather than serious
concert performances. The DIMI-S was introduced in only a few events in
Finland, as well as in magazine articles. The first version of the instrument
was installed in Pripps Brewery in Sweden, where customers could perform
with it. Lundsten installed another version in his Andromeda studio, where it
was used in informal get-togethers with guests but not in studio work, and
controlled the colored lights in the studio.
    The DIMI-T was used only a couple of times in Finland. Kurenniemi test-
ed the instrument on August 9, 1973 and documented the test session in his
audio diaries.330 It was used during a studio course in a collective perfor-
mance session in the University Studio on December 10, 1973 331, and a year
later in the Dimensio exhibition at Dipoli, Espoo, November 7–17, 1974. Ac-
cording to the user manual and the marketing information, Digelius even
tried to sell the instrument.332 No other copies are known to exist. Presuma-
bly, the instrument did not work as Kurenniemi wished, and later he rented it
to Arild Boman at the University of Oslo. How it was used in Oslo is not
known, according to the existing documentary evidence.


5.3.4    The DIMI 6000 and the fall of DEF
The computer-controlled synthesizer DIMI 6000 is based on Intel Micro
Computer Set designs,333 and it is connected with the founding of Yle’s Ex-
perimental Studio. Again, Donner played a significant role initiating the de-
sign process. He was Head of the Yle music department in 1973, he founded
the Yle Experimental Studio, and he was instrumental in ordering the DIMI
6000 from Digelius for Yle.334 At the time, projects in Digelius were becom-
ing microcomputer-based. In 1973, for example, intern Seppo Nikkilä discov-
ered the Intel 8008 brochure on the Digelius shelf and discussed the imple-
mentation of the chip with Kurenniemi. Kurenniemi’s diary entries reveal
that he drafted the MCS-8s (Micro-Computer Set by Intel) in early 1972.335
    The development of the DIMI 6000 started as a commission from Yle in
1974. Kurenniemi delivered the finished instrument to the Experimental
Studio in April 1975 and organized a one-month course on its use. 336
Lundsten also ordered the instrument for the Andromeda studio some time
in the mid-1970s. It and the ADDS terminal used to program the computer

   330 See Kurenniemi’s audio diary C4113 in FNG/EKA.

   331 See the Music Finland sound archive CD5261.
   332 See Figures 77 and 78 – published in Kuljuntausta (2002 appendix).

   333 See: https://en.wikichip.org/wiki/intel/mcs-8

   334 See Sirén (1983) in Eksessi – the professional newsletter of the Yle Experimental studio; see al-

   so Sirén (1976).
   335 Nikkilä (2017) in an interview with Ojanen; see also Nikkilä (1993a; 1993b); see also Kuren-

   niemi’s DIMI diary in The Finnish National Gallery collections, Erkki Kurenniemi archive.
   336 See Sirén (1976).




                                                   150

[p. 151 / pdf 177]

are visible in contemporary pictures taken of the Andromeda during the
1970s, and one mounted DIMI 6000 rack unit remained in the studio in-
strument rack until the studio was dismantled in 2014. However, Lundsten
hardly ever used the instrument (Ojanen & Suominen 2005, 31).
    Ruohomäki was hired by Yle on occasions to write software for the in-
strument (see Figure 48). In his view, the Intel 8008 was too slow to process
musical data, thus it was used rarely, and only in a few works mainly as a
sound source. It would be interesting to know why it was not updated with
next-generation processors such as Intel 8080. DEF intern Pekka Hoikkala,
for example, recalls that he used the faster 8080 for the DISLOG: the logger
system developed for the University of Oulu’s mechanical technology labora-
tory, which he was hired to realize. Hoikkala completed the project in the
spring of 1976 only a few weeks before Kurenniemi declared Digelius bank-
rupt.337




Figure 48. Ruohomäki programming the DIMI 6000 in the Yle Ratakatu studio (photo: unknown /
Pekka Sirén archive)

Eventually, the DIMI 6000 was used by Pekka Sirén (1946–2019) in Ai-
lahtelua (1976), Kari Keskinen in DNA338 (1976–77), Ruohomäki in Ennen
iltaa (1977), and Andrew Bentley (b. 1952) in Bowing (1978). Composer Joe


   337 Rautee & Hoikkala (2017) in an interview with Ojanen.

   338 Assisted by Åke Andersson; see Ruohomäki’s notes on the work.




                                                 151

[p. 152 / pdf 178]

A history of Kurenniemi’s electronic musical instruments



Davidow, who briefly tested the instrument (see Figure 49) and used it in
Accompanying Composition Accompanied by ... 339 (1976), did not find it
useful. He preferred Yle’s Synclavier as an instrument for his electronic ex-
pressions.340 Bentley also found that the sound of the instrument was not
suitable for his needs. As he recalled in 2019, the key resources were focused
on hardware development, hence the more important software development
was not allocated enough time or money.341 Composers and sound techni-
cians Åke Andersson and Antero Honkanen remember the DIMI 6000, too.
Andersson said that he did not use it in his works even though he took the
course organized by Digelius upon delivery of the instrument to Yle.342




Figure 49. Pekka Sirén (left) assists Joe Davidow (right at the ADDS terminal) with the DIMI
6000 for his work Accompanying Composition Accompanied by ... (1976) in the Yle Ratakatu
Studio in 1976. (photo: unknown / Pekka Sirén archive)

Given its current dysfunctional condition, information about the functionali-
ties and sonic possibilities of the DIMI 6000 is sparse. Analyses based solely
on musical works composed with the instrument catch only one side of the
story. Moreover, in many cases its detection and recognition among many

    339 Assisted by Pekka Sirén; see Ruohomäki’s notes on the work.

    340 Davidow (2019) in an interview with Ojanen.

    341 Bentley (2019) in an interview with Ojanen.

    342 Andersson & Honkanen (2018) in an interview with Kuljuntausta.




                                                      152

[p. 153 / pdf 179]

sound sources are questionable. Davidow, for example, could not remember
precisely in which works he used the instrument. 343 Bentley, on the other
hand, recalls its sound very well. 344
    Among the job announcements in newspapers such as Helsingin Sanomat
(see Figures 50 and 51) were notifications placed by Digelius about open po-
sitions and staff needs at Helsinki University of Technology in Otaniemi.
Seppo Nikkilä, Risto Rautee, and Pekka Hoikkala, among others, noticed the
advertisements for technical students and contacted Digelius.345 Seppo Nik-
kilä does not remember being aware of any artistic projects or musical in-
strument design when he was working for DEF. According to Digelius’ 1974
balance statement and annual report, the representative of SITRA was of the
opinion that the original purpose of the work that was funded by the loan had
not been realized, and that Digelius should therefore refund it: 10 percent of
the loan was paid back to SITRA in 1974.346
    Eventually, Kurenniemi’s musical instrument design assumed a minor
role in Digelius, as the focus of the company shifted to the implementation of
and related consultation on large industrial technology projects – such as the
train scaling system developed by Risto Rautee for the large-scale metal in-
dustry company Rautaruukki347, and the DISLOG logger system developed
by Hoikkala, among several other projects. Rautee and Hoikkala worked for
Digelius until its bankruptcy. As they recalled, the bankruptcy was attributa-
ble to poor financial and project management. A major part of the capital was
invested in the expertise of the staff. Large projects were negotiated with the
customer, and only after signing the agreement did DEF hire the staff to real-
ize the project. The company could not charge customers in advance, and due
to project delays income collapsed even though there were enough orders.348
    DEF was still hiring personnel in January 1976: a planning engineer
(Finn. suunnnitteluinsinööri), a software engineer (Finn. ohjelmistosuunnit-
telija), and assembly workers (Finn. kokoonpanijoita; see Figure 51). Accord-
ing to the minutes of company meetings and announcements deposited in
the National Archives of Finland, Kurenniemi took charge of the company on
March 17, 1976 when Peter Frisk sold him his shares: Kurenniemi declared
DEF bankrupt on May 18.349


   343 Davidow (2019) in an interview with Ojanen.

   344 Personal communication with Andrew Bentley.

   345 See Nikkilä (2017) in an interview with Ojanen; see also Rautee and Hoikkala (2017) in an in-

   terview with Ojanen.
   346 See the DEF balance sheet and annual report in Jouko Kottila’s papers in the UHMRL archive.
   347 Rautee, Risto, 1978. Junavaa'an tietojenkäsittelyjärjestelmä [Train scaling data processing sys-

   tem]. M.Sci (Tech) thesis. Teknillinen korkeakoulu, Otaniemi.
   http://doi.org/10.5281/zenodo.3592770.
   348 Rautee & Hoikkala (2017) in an interview with Ojanen.

   349 On the development of DEF in documentary evidence see: Ojanen, Mikko. (2019): The devel-

   opment of Digelius Electronics Finland (DEF) in documentary evidence (Version 20191225_01)
   [Data set]. Zenodo. http://doi.org/10.5281/zenodo.3592770.




                                                  153

[p. 154 / pdf 180]

A history of Kurenniemi’s electronic musical instruments




Figure 50. Digelius Electronics Finland job announcements in Helsingin Sanomat, 1971–1973




                                               154

[p. 155 / pdf 181]

Figure 51. Digelius Electronics Finland job announcements in Helsingin Sanomat, 1974–1976




                                              155

[p. 156 / pdf 182]

User Interfaces of Kurenniemi’s Electronic Musical Instruments




6 USER INTERFACES OF KURENNIEMI’S
  ELECTRONIC MUSICAL INSTRUMENTS

The technology behind Kurenniemi’s instruments is described in detail in
previously published articles (see Ojanen & Suominen 2005; Ojanen et al.
2007; Städje 2009; 2012; 2013; Suominen 2013; Lassfolk et al. 2014; 2015).
Media artist Jari Suominen has made a particularly significant contribution
to the research on Kurenniemi in his analysis of the technical details of the
instruments during his exhaustive restoration projects (see e.g. the analysis
of the technical details of the DICO and the DIMI-A in Lassfolk et al. 2015,
263–269). The descriptions and material are presented in the online portal
dedicated to Kurenniemi’s instruments.350 In this chapter I summarize the
key features of the instruments to facilitate the reading of the user-story ana-
lyses in Chapter 7. I start by giving a general overview of Kurenniemi’s de-
signs, after which I present the key features of his instruments and use di-
mension space plots in their visualization.351


6.1 A general overview of Kurenniemi’s instrument
    design
As I note in the historical description in Chapter 5, Kurenniemi was not alone
with his design ideas, even though in the main he built his instruments by
himself. Envisioning the musical instrument of the future was a common
topic for deliberation at the time. Kurenniemi used what he learned from the
contemporary literature on electronics in his designs, as well as ideas pre-
sented in seminars and meetings. Each one of his instruments was initiated
or developed in collaboration with his associates – some closer, some more
distant.352 When one looks back, one sees that his building and design pro-
cesses constitute a continuous and ambitious project of assessing the poten-
tial of various music-technology applications.353 Several overarching themes
ran through his designs during the 15 years he was actively working on de-
veloping music technology.

   350 See: http://ekis.helsinki.fi.

   351 See: Ojanen, Mikko. (2019). The User Interface and Functionality Charts of Erkki Kuren-

   niemi's Electronic Musical Instruments (EKIS) [Data set]. Zenodo.
   https://doi.org/10.5281/zenodo.3596466
   352 Kurenniemi (1993b) in an interview with Ruohomäki.

   353 See Kurenniemi (1971a).




                                                 156

[p. 157 / pdf 183]

    First, Kurenniemi developed different applications for automating the
musical process. Therefore, the programmability of the instrument was a
significant thread in his designs. The functionality manifested in his se-
quencers and memory units, first physically and eventually in a virtual form.
According to Pinch,354 Robert Moog`s designs dominated historical descrip-
tions of early analog performance synthesizers because the story is typically
written from the perspective of instruments used to perform music in a tradi-
tional manner. In other words, the musician typically performs the note-
based musical expressions in the context of Western (popular) music. The
description would be very different if the narrative concentrated on the de-
velopment of musical sequencers, however: Donald Buchla’s designs would
have ruled over those of Moog, for example. This line of thought reveals an
exceptional feature of Kurenniemi’s instruments – his sequencers. As Jari
Suominen355 noticed when he was restoring the Integrated Synthesizer,
which included Kurenniemi’s first known sequencer, Kurenniemi’s design
preceded Buchla’s by several months.
    Second, a strong thread in Kurenniemi’s design was the implementation
of digital electronics in sound synthesis and processing, and in sequencer
and memory applications. Here in particular, his work with memory applica-
tions distinguished his instruments from many others under design at the
time. According to Pinch & Trocco (2002a, 120–121), users of Moog’s modu-
lar synthesizer in the late 1960s could not “go back” to the previous sound
when they were programming the instrument with physical patching cords
and without any memory units. The memory units in Kurenniemi’s instru-
ments helped to overcome the problem but did not solve it entirely. On the
other hand, compared to the RCA synthesizer, which could be precisely pro-
grammed, Kurenniemi’s design allowed real-time control whereas the RCA
synthesizer was not capable of real-time modification of the memory content.
    Third, Kurenniemi’s interface design challenged the traditional means of
interacting with a musical instrument – in some cases not only between the
composer or performer and the instrument, but also with the audience.
Closely related to his experimentation with the user interface and methods of
instrument control, and despite the minor role of these themes, Kurenniemi
paid close attention to usability issues and even graphic design (see e.g. the
“DIMI is born” poster marketing DIMI-A: the font set is the same as in the
digital patch bay and mixer DIMIX, as well as in the Digelius Electronics Fin-
land logo).
    Fourth, throughout his designs he aimed at collective music making and
performing, and he planned to distribute musical signal processing and
composition over the network, even to people’s homes (Zaffiri 2007).


   354 Alternative Histories of Electronic Music (AHEM) conference keynote lecture on April 15, 2016,

   The Science Museum Dana Research Centre, Queen’s Gate, London.
   355 Personal communication with Suominen; see also Suominen (2020).




                                                  157

[p. 158 / pdf 184]

User Interfaces of Kurenniemi’s Electronic Musical Instruments



6.2 The key features of Kurenniemi’s musical
    instruments
Here I describe the key features of Kurenniemi’s instruments in more detail,
using dimension-space visualization as a methodological tool (see also Chap-
ter 3.2). I concentrate on his nine musical instruments and leave the studio
equipment (such as the digital patch bay and DIMIX mixer) aside. I depict
the features related to the usability of the instruments that I consider rele-
vant (the pertinences), and necessary to complement the user stories. I pre-
sent the features as dimension space axes, which I group together here ac-
cording to their targets (see Figure 52).




Figure 52. Key features of the user interfaces and functionalities of Kurenniemi’s electronic mu-
sical instruments categorized in four groups outlining the user-interface details, the sound quality
and flexibility of the instrument, the designer’s initial ideas for its intended use and the user’s view
of its playability (figure: Ojanen 2019)




                                                   158

[p. 159 / pdf 185]

    Axes 1 to 5 cover features related to the user interfaces. The first two de-
scribe the nature of the interface, which may be physical, virtual, or both, and
tactile, partially tactile or non-tactile. The third and fourth axes break down
the readability and comprehensibility of the user interface. It may, for exam-
ple, be clearly readable in the sense that the user can see the state of the in-
strument but may not be able to comprehend what it means or how the in-
strument would sound in that state. In this case, the user has to verify the
sonic output with audible feedback from the instrument. The combination of
non-readable and fully comprehensible features would be an oxymoron,
however. The fifth axis shows whether the user has access to all the parame-
ters of the instruments or only to some of them, or no access to any controls.
    The next two axes (6 and 7) relate to the role and flexibility of the sonic
output of the instrument, in other words control options related to the mu-
sic’s theoretical content – both pitch and timbre. Axes 8 and 9 concern the
designer’s initial ideas about where the instrument was intended to be used –
whether in a studio or in a live setting, and whether it was designed to be a
case-specific or a general-purpose device. The final two axes (10 and 11) re-
late to playability issues, which are close to the first five axes – completing
the user-interface descriptions from the user’s point of view. The tenth one is
loosely related to the learning curve (see e.g. Jordà 2004, 331–332), and the
eleventh concerns the programmability of the instrument.
    In the following I use the categorization to map and compare the instru-
ments, and to depict the developmental lines in Kurenniemi’s design process.
For the general overview I first gather together the instrument user interfaces
(see Figures 53–61) and their corresponding key features, charted by means
of dimension space visualizations (see Figures 62–70).




                                       159

[p. 160 / pdf 186]

User Interfaces of Kurenniemi’s Electronic Musical Instruments




Figures 53–61. The key features of Kurenniemi’s electronic musical instruments: the user inter-
faces. NB! The scale of the images varies: the Integrated Synthesizer control panel is approx.
1x1 meter whereas the control panels of most of the other instruments occupy the width of a
studio rack unit, that is approx. 50 cm. (photos: Mikko Ojanen & Jari Suominen 2004; Ras-
tas/Kiasma 2007; Jari Lehtinen; DEF 1972)




                                                160

[p. 161 / pdf 187]

Figures 62–70. The key features of Kurenniemi’s electronic musical instruments: the dimension
space visualizations356 (figures: Mikko Ojanen 2019)




   356 See: Ojanen, Mikko. (2019). The User Interface and Functionality Charts of Erkki Kuren-

   niemi's Electronic Musical Instruments (EKIS) [Data set]. Zenodo.
   https://doi.org/10.5281/zenodo.3596466




                                                 161

[p. 162 / pdf 188]

User Interfaces of Kurenniemi’s Electronic Musical Instruments



6.2.1    Short descriptions of the user interfaces
In the following I refer to the figures on the previous pages 160–161.

The Integrated Synthesizer consists of several modules, including a five-step
sequencer, individual oscillators, a harmony generator (with a four-tone gen-
erator), a cluster generator (ten voltage-controlled oscillators), and a sum-
ming mixer (see Figure 53, top row, left). Oscillators and generators are as-
signable to the sequencer via rotary switches and their signal can be pro-
cessed by assigning them to digital logic modules via five 10x10-patch ma-
trixes. The length of each step of the sequencer can be adjusted individually.
The system is implemented as a hybrid design of digital and analog electron-
ics. (see Suominen 2013, 134–135; 2020)
    The Sähkökvartetti consists of a mainframe and six mobile controllers
(see Figure 54, top row, center). The mainframe includes a sound generator
and processing units for each member of the quartet: electric drums, a melo-
dy machine, electric saxophone, and electric violin (the violin controller has
vanished and is not shown in the photo), as well as the signal processor for a
singer consisting mainly of different distortion channels. In practice, four
synthesizers, a sound-processing unit and digital trigger signal-outputting
sequencer are integrated into the mainframe (Suominen 2013, 135–139). The
discrete instruments can be played both via the remote controllers and by
assigning their parameters to the 10-step sequencer with patch cables in the
mainframe. The overall tempo of the sequencer can be adjusted, but not the
length of each individual step. The connections make it possible to perform
with the instrument, the output of which is thus a combination of actions by
four players and the programmed sequencer. The interconnected signal pro-
cessing between the players is mainly filtering and ring modulation. The set-
up establishes chaotic premises for the collective performance, whereas the
user interface and the sequencer set the constraints that direct the overall
performance process. The distorted output signal with a narrow frequency
response emphasized on a nasal band, and the unstable tuning of oscillators
characterize the distinctively provocative character of the instrument.
    The Andromatic is a 10-step polyphonic sequencer synthesizer, each of
the ten steps having its own oscillator (see Figure 55, top row, right). Three
potentiometers on each step control the pitch, volume and holding of the
note. The player can use the flip-flop switches on the bottom row to set a
function at each step. In the basic shift register mode, the flip-flop passes the
sequence to the next step. When all the flip-flops are in this position the in-
strument plays a ten-step sequence. In another mode the flip-flop stops the
sequence while the third position sets a step to function as a counter, which
acts as a divider. When all the steps are in the counter mode, the instrument
plays a 1024 (=210)-step long sequence. (Städje 2012; Suominen 2013) The
10x10-patch matrix allows the signal to be routed into different filter banks.
Using the potentiometers on the far-right, the user can alter the filter param-
eters and control the modulation, vibrato, overall tuning and tempo of the



                                              162

[p. 163 / pdf 189]

sequencer. The memory of the instrument is reflected in the positions of the
switches and knobs. Thus, the state of the instrument is fully visible to its
user and each parameter is easily accessed.
    The DICO is a 12-step monophonic sequencer synthesizer with two output
channels (see Figure 56, middle row, left). Ten lights on the front panel dis-
play the state of one sequencer step at a time. On each step, the instrument’s
four parameters can be programmed with ten bits by grounding the pins: the
upper pin turns the bit on, and the lower pin turns it off (see Figure 71). The
grounding can be done with a metal brush or by connecting the upper or
lower pins with the middle pin. Reading from left to right, the first four bits
control the chromatic pitch of the step (24=16 pitches), the following three
control the octave range (23=8 octaves), and the next two control the articu-
lation of the note on the step from fully legato to staccato when the sequencer
is running (22=4 note lengths). The last bit assigns the sound to one of the
two output channels (21=2 channels). The two potentiometers control the
tempo of the sequencer and the overall pitch of the oscillator. The length of
the individual steps cannot be adjusted. The push buttons control the manual
stepping, and the starting and stopping of the sequencer. The 4x4 patch ma-
trix in the upper-left corner of the user interface contains the filter and the
attenuator bank. An external signal can also be fed through the filter and the
attenuator bank via the patch matrix.




Figure 71. A detail of the user interface of the DICO: programming the ten bits of the instrument
(photo: Mikko Ojanen and Jari Suominen 2004)




                                                 163

[p. 164 / pdf 190]

User Interfaces of Kurenniemi’s Electronic Musical Instruments



The DIMI-A is a two-voice synthesizer with a 256-step sequencer (see Figure
57, middle row, center). It is programmed by touching the metal plates with
two styluses. The 2x16 plates are organized ergonomically in two quarter-of-
a-circle groups – ostensibly 16 bars (left side) and 16 steps per bar (right
side), when the instrument is used in the sequencer mode. The user activates
the parameters from the left-hand side, and sets the values for the chosen
parameter from the right. The parameters and their values are presented in
the user manual (see Figure 72; upper image), which is typically in the form
of a printed sheet of paper on top of the instrument. The user controls the
running of the sequencer using the arrow-shaped plates on the upper-right
corner of the user interface (see Figure 73; lower image), which can be start-
ed, stopped, reversed and manually stepped by touching the arrow plates.
Changes in parameter value (i.e. commands) can be recorded on or erased
from any of the 256 steps in the sequencer memory via controlling the R, E,
D, 1 and 2 plates in the upper-left corner of the user interface. The memory
can hold up to 100 commands, and several changes in the same parameter
value can be programmed into one and the same memory location at a time,
which is somewhat counterintuitive and causes the memory unit to behave in
an unorthodox manner. (see Ojanen & Suominen 2005, passim.; Lassfolk et
al. 2015, 266–270)
    The programmable parameters include the clock speed (plate 0), jumping
into any of the 256 steps of the sequence via the bar and beat selector (plates
1 and 2), the chromatic pitch of both of the two-tone generator (plates 3 and
4), an octave range over eight octaves (plate 5), the vibrato speed, depth and
note bending upwards or downwards (plate 6), the signal-assignment (out-
put and input channel or ring modulator) selector (plate 7), volume (plate 8),
and setting the eight banks of band-pass filter either on or off (plates 9 and
10). As with the DICO, the DIMI-A can be used to process the external signal.
The implementation of the signal-input technology in the DIMI-A resembles
analog-to-digital conversion, and practically digitizes the inputted analog
signal with a square wave and produces a strongly distorted digitized audio
signal.




                                              164

[p. 165 / pdf 191]

Figures 72 and 73. The user manual (upper image) and the user interface (lower image) of the
DIMI-A Each row in the user manual equals the left-hand side quarter-of-a-circle plates touched
with the stylus to choose the parameter, whereas each column in the user manual equals the
right-hand side plates and alters the value of the chosen parameter when touched with the stylus.
The lower print is the layout designed to be used in the etching of the user interface circuit board.
The print-out is likely a version before manufacturing the first user interface and includes hand-
written pencil markings (Ni+Au 6–10 μ; 6 μ; johtimet Ni 6–10 μ; Numerot + tekstit: ~2 μ Au) for
different plate material properties such nickel gold and their width or thickness and ELEKTRO-
MUSIIKKI – the name of Jouko Kottila’s company where Kurenniemi likely built the first DIMI (see
also Chapter 5.3.1). (print-outs: UHMRL archive)




                                                  165

[p. 166 / pdf 192]

User Interfaces of Kurenniemi’s Electronic Musical Instruments



Kurenniemi hoped that the DIMI-O (see Figure 58, middle row right), also
known as the video organ, would overcome the problems detected in the DI-
MI-A user interface (see also Chapter 5.3.1). From the user’s point of view,
the instrument consists of five key elements (see Figure 74; upper image): the
four-octave electric organ-style keyboard, the video camera, the video moni-
tor, the 32-step sequencer (w/ full 48-note polyphony), and the control panel
with the potentiometers, dials and switches to adjust the video camera,
memory and audio functionalities (see Figure 75; lower image). Thus, the
user could control the instrument with the conventional keyboard, via the
video camera image and with the control panel. The sequencer can run in
both directions at five different speeds, or the user can step up the pointer
manually.
    The instrument can be preprogrammed with frequency/note data, with
different melodies or harmonies, for example. It has a 1,536-bit memory,
with a 32-step sequencer and a four-octave chromatic keyboard (32x48). De-
pending on the memory input mode selected on the control panel, the notes
can be recorded into the memory via the keyboard or video camera, or as a
combination of their data according to different logical conditions. Thus, the
instrument can read the static graphical notation in a studio environment,
for example, or it can be used in a real-time live performance. The prepro-
grammed score in the memory can be manipulated, transposed either by
semitones or continuously when the memory content runs upwards or
downwards and causes an interesting sonic effect. The video-camera image is
converted into black and white areas. Depending on the control-panel selec-
tion (e.g. luminance threshold and black or white dial), either light or dark
areas of the image trigger the signal. When in the logical product mode of the
memory and camera – in other words when “[a]ny particular tone is heard
only if the corresponding note is present both in the memory and in the video
signal” – the camera image can be used to trigger the notes recorded in the
memory, and thus “pick the sounds from the air” (see the DIMI-O documen-
tation).
    Ideally, two users are required to operate the instrument, especially in live
performances. In practical terms, one user either operates the camera or al-
ters the content it sees, such as dancing in front of it, or shoots the surround-
ings or audience in the performance space, while the other user plays the
keyboard and manipulates the video, audio and memory controls via the
main control panel. Contemporary historical documentary material typically
does not show the main operator – thus, his or her maneuvers are usually left
unnoticed and any analysis of the performance is based only on the dancer’s
interaction with the instrument, resulting in a simplified description (see
Niemelä 2019, 109–110).




                                              166

[p. 167 / pdf 193]

Figures 74 and 75. The block diagram (upper image) and the control panel (lower image) of the
DIMI-O (images: a copy of the DIMI-O documentation / UHMRL archive)




                                               167

[p. 168 / pdf 194]

User Interfaces of Kurenniemi’s Electronic Musical Instruments



Kurenniemi continued to develop his instrument-control method and design
in DIMI-S and DIMI-T. DIMI-S357 is based on the electrical conductivity of
the skin (see Figure 59; lower row, left). At least two people are required to
play it, but it is optimally designed for a four-people group performance.
Each player holds an iron ball in his or her hand and touches the other play-
ers on the skin. The earlier version had handcuffs instead of iron balls. The
less clothing the players have on, the higher the number of connections.
Thus, the DIMI acquired the letter S for Sexophone. (see Städje 2009; Suom-
inen 2013, 151–154)
    Ideally, the four players form six different pairs, which the instrument de-
tects (see Figure 76). Each pair is assigned its own voice, the pitch of which is
altered by the frequency-division setup each time the players in the corre-
sponding pair touch each other. In effect, the instrument has six-voice po-
lyphony and, depending on the connections between the pairs, all six voices
can be heard at the same time. The voice of the pair is audible only when the
players touch each other. The connections also alter the speed of the vibrato.
(see Städje 2009; Suominen 2013, 151–154) Overall, the collective touching
performance produces a seemingly randomized but consistent soundscape
altered by the players touching each other. Thus, the alterations in sound,
melody and harmony are beyond the players’ immediate intentional control.




Figure 76. The six pairs formed by the four players of the DIMI-S (image: Städje 2009)



    357 This description is based largely on the detailed analyses of the DIMI-S internal construction

    and working logic conducted by Städje (2009) and Suominen (2013, 151–154).




                                                    168

[p. 169 / pdf 195]

Kurenniemi went even further in his user interface testing with the DIMI-T
(see Figure 60; lower row, center). The instrument is operated by electrical
brain activity measured by EEG sensors from the player’s scalp. The
500,000-times amplified EEG signal controls the pitch of the monophonic
voltage-controlled oscillator. The player is recommended to fall asleep, or at
least to reach a calm or drowsy state of mind to reach the alpha waves. Ku-
renniemi states in the user guide that, with a little practice, players could
learn to manipulate the sonic output of the instrument – or even produce a
recognizable melody (see Figures 77 and 78). This has neither been tested
nor proved plausible, however.




Figures 77 and 78. The DIMI-T user manual and playing instructions (images: the Finnish Na-
tional Gallery collections, Erkki Kurenniemi archive; previously published in Kuljuntausta 2002,
appendix; 2008, appendix)

Within the scope of this study, Kurenniemi’s last electronic musical instru-
ment was the microcomputer-controlled analog synthesizer DIMI 6000 (see
Figure 61; lower row right). The instrument’s central unit consists of the pro-
cessor, the sound generator, and the patch bay. The user programs the in-
strument with octal codes typed on the ADDS Consul 880 terminal. The digi-
tal control commands can be stored in two ITT SL 56 cassette mass storage
devices, which were also used in real-time recording and in reproducing the
digital control commands. Kurenniemi first wrote DISCORD software for the
instrument, which allowed both the programming of sequences and real-time
control via the ADDS keyboard. Later, Ruohomäki wrote DISMAL (DIS Mu-
sic Assembly Language) and DISEQ sequencer software, which overcame the



                                                 169

[p. 170 / pdf 196]

User Interfaces of Kurenniemi’s Electronic Musical Instruments



problems in Kurenniemi’s original DISCORD software. The generator units
consist of four oscillators with sine, triangle and square waveforms, ring
modulators, two filters, and two audio outputs (see Figure 79). (see Lassfolk
et al. 2014; passim)




Figure 79. The DIMI 6000 block diagram (image in Sirén 1976, 58 / Digelius Electronics Finland)



6.2.2    The usability and functionalities of the user interfaces
The overall development of Kurenniemi’s user interfaces, from the physical
to the virtual, is clear if one compares his first and last designs – the Inte-
grated Synthesizer and the DIMI 6000 (see Figures 80 and 81). All the pa-
rameters are visible (readable) and available to the user in the fully physical
user interface of the Integrated Synthesizer, whereas the fully programmable
DIMI 6000 hides all the parameters and control surfaces behind the machine
code – with the exception of the typewriter keyboard, which could be pro-
grammed for real-time performance. Composers Pekka Sirén and Jukka Ruo-
homäki experimented with a few real-time performance options on the DIMI
6000, but even this feature required the instrument to be programed. (Lass-
folk et al. 2014, [3])




                                               170

[p. 171 / pdf 197]

Figures 80 and 81. The physical interface of the Integrated Synthesizer (1964) and the virtual
interface of the DIMI 6000 (1975) (photos: Mikko Ojanen & Jari Suominen 2004)




                                                171

[p. 172 / pdf 198]

User Interfaces of Kurenniemi’s Electronic Musical Instruments



Even though the user interface of the Integrated Synthesizer is physical, it is
not tactile. In other words, the user does not experience the instrument as an
extension of the body: it is more like an automated tool used to repeat pre-
programmed patterns, with some real-time control over their development.
The Electric Quartet (the mobile controllers), the Andromatic, the DICO, the
DIMI-O, and especially the DIMI-S allow the user concrete tangible interac-
tion with the instrument. Both the DIMI-A and the DIMI 6000, being fully
programmable, as well as the DIMI-T have the most non-tactile user inter-
face of Kurenniemi’s instruments. It is worth noting here that the description
applies to the historical situation, when the instruments were first used, and
is based on contemporary historical documentary evidence. Later, in connec-
tion with recent research projects, new sonic potential has been discovered.
However, comparison of the past and the present is beyond the scope of this
study.
    An interesting, albeit a-typical, prototype design feature of Kurenniemi`s
user interfaces is that none of the controls, knobs, or potentiometers are la-
belled. This may be because most of the instruments were custom-designed
and Kurenniemi knew who would be using them (see Ojanen et al. 2007, 92).
However, this may not be a definitive explanation. In the case of the Andro-
matic, for example, Lundsten added hand-written labels to the key functions
(see the description of the three potentiometers – pitch, gain and sustain – in
Figure 82).




Figure 82. The Andromatic user interface (a detail), with hand-written labels for the pitch, gain
and sustain potentiometers (Photo: Mikko Ojanen 2012)

In theory, the user can read the states of the Integrated Synthesizer, the An-
dromatic, the DICO, and the DIMI-O by looking at the potentiometers and
switches – and the lights in the DICO user interface. This severely loads the
user’s cognitive processes, however, given that none of the functions are la-
belled and the user has to remember the meaning of each parameter and its



                                                  172

[p. 173 / pdf 199]

values. In practice, the quantity of switches, potentiometers and dials in the
Integrated Synthesizer makes it impossible to comprehend, or even to read.
Readability and comprehensibility are enhanced in the simpler user interfac-
es used in the Andromatic and DICO, for instance, even if the content of only
one sequencer step is displayed at a time in the latter.
    Although the readability of most of Kurenniemi’s user interfaces is high,
the likelihood that the user will be able to comprehend the state of the in-
strument and to anticipate the potential sonic outcome is low. This severely
constrains their usability in real-time setups or when a fast response from
either the user or the technological artifact is required: in other words, it lim-
its the machine-user interaction potential – in traditional performance set-
tings. From an outside-the-box perspective, however, Kurenniemi’s instru-
ments set a potential point of departure for experimentation on musical in-
terfaces. This is easily said in hindsight, of course, and it is the very feature
that contemporary users could not surpass, and something that has been re-
vealed only 50 years later in thorough research projects.


6.2.3   Control over the music-theoretical content and sound
The tuning and timbral flexibility of the instruments rely partly on their theo-
retical background. Magnusson (2009, 226) refers to the design of digital
musical instruments as a top-down process, meaning that the designer must
be aware of the theoretical basis of the implemented technological solution.
Magnusson’s notion of DMI design applies to most of Kurenniemi’s instru-
ments, even though many are hybrid in design, combining analog and digital
electronics. In terms of note production, Kurenniemi relied mainly on the
idea of frequency division. In the DICO this led to just intonation, meaning
that the fourth and fifth intervals in the instrument’s scale are pure. (see Su-
ominen 2013; Lassfolk et al. 2015) What is notable here is that this was a by-
product of the technical implementation rather than Kurenniemi’s intention.
The possibility to modify the desired intonation, that is the tuning or the
scale, varies strongly from one instrument to another. The scale is fixed to
chromatic tuning in the Electric Quartet, the DICO, the DIMI-A, the DIMI-O,
and the DIMI-S, whereas users of the Integrated Synthesizer, the Andro-
matic, and the DIMI 6000 can modify the tuning more freely. The DICO user
can modify the tuning to some extent by adjusting the tune of its four oscilla-
tors, even though the sonic output is always tied to the 12 discrete pitches.
    Controllability related to the tuning is severely constrained in the DIMI-S
and the DIMI-T, whose user(s) cannot intentionally play any melodies and
the sonic output is determined by the instrument’s internal structure: in the
DIMI-S the manual step sequencer triggered by connections among the six
different combinations of four players, and in the DIMI-T the randomized
EEG signal measured from the user’s brain, affected by the extensive noise in
the signal due to poor electronic circuitry. The most flexible instrument in




                                        173

[p. 174 / pdf 200]

User Interfaces of Kurenniemi’s Electronic Musical Instruments



terms of tuning is the Andromatic in that the user is able to adjust the pitches
on each of the ten steps of the sequencer separately and continuously.


6.2.4    The designer’s initial ideas of the instruments’ intended use
The intended use of Kurenniemi’s instruments varies from one to another
and depends on the point of departure of the design process. Here, the re-
quests of the commissioners play the key role. The Integrated Synthesizer,
the Andromatic, the DICO, the DIMI-A and the DIMI 6000 were primarily
intended to be used in a studio environment – and primarily as general-
purpose electroacoustic music studio devices, the first appearances of the
Andromatic being an exception.
    The Andromatic began to take shape in negotiations between Lundsten,
Nilsson and Kurenniemi. In its first setups it was an integral part of sound
installations in gallery and museum contexts, where it produced music and
controlled the lighting of sculptures. In this sense, it could be considered a
case-specific electronic music instrument for a sound installation. This is on-
ly partially true, however. Nilsson recalled how they pondered about the fu-
ture instrument with Kurenniemi, specifically hoping for a general-purpose
musical instrument that could be used to control certain musical parameters
automatically.358
    The Sähkökvartetti was initially designed to be used as a collective live-
performance instrument, and later it served as a sound source in a studio
setting. Meanwhile, the DIMI-S was designed to be and eventually was used
exclusively in collective performances – some of them private events. The
idea to make an instrument to be used only in collective performances came
from Lundsten, who thought that it should be used only for fun, not in studio
work (Ojanen et al. 2007, 92).359 The DIMI-O was initially intended to be
used either in the studio or in live situations.


6.2.5    The pre-programmability and playability of the instruments from
         the user’s point of view
Even though the RCA synthesizer was Kurenniemi’s key inspiration, signifi-
cant differences are revealed when it is compared with his instruments. For
example, the pre-programmability of his first systems in a specifically pro-
grammable or stored-program sense is not unambiguous (see Ulmann 2013,
2–3). The RCA synthesizer had a direct reference to a programmable com-
puter when the composer could precisely determine the input parameters,
whereas the parameter input of Kurenniemi’s early instruments was approx-

   358 Nilsson (2019) in an interview with Ojanen.

   359 See Ahlgren (1970, 7/Svenska dagbladet July 31, 1970); Widding (1970, 13/Expressen August

   8, 1970); Brandel (1971, 7/Aftonbladet August 1, 1971); Pitkänen (1972, 7/Iltasanomat February
   22, 1972).




                                                     174

[p. 175 / pdf 201]

imate. The Integrated Synthesizer, the Electric Quartet, and the Andromatic
are sequencer-synthesizers rather than computers, in other words they are
capable of producing musical sequences according to their internal states
while being modified by their user. In this sense, Kurenniemi’s first designs
were closer to Buchla’s Modular Electronic Music System, which was a musi-
cal instrument – a music easel as Buchla and composers Morton Subotnick
and Ramon Sender called it – rather than a musical computer360 (Bernstein
2008, 112–114).
    Among Kurenniemi’s instruments, precise programmability was first real-
ized in the DICO, and the DIMI-A took the feature even further in that the
design process was primarily directed by the computer metaphor. The four
programmable parameters of the DICO (the note, the octave range, the artic-
ulation, and the output selection) can be stored with the 10 bits of its digital
memory and can be programmed on each of the 12 discrete steps of the se-
quencer. The DIMI-A’s memory, on the other hand, can hold 100 commands
and its sequencer consists of 256 steps. The implementation of the memory
structure of these sequencers is different: whereas DICO’s memory equals
the values of the 10 bits of discrete states on each step, DIMI-A’s runs con-
tinuously and compares the state of the instrument with the 16-bit memory
content. The programmability precision in these instruments is clearly on
another level than in previous instruments with a memory equaling the phys-
ical states of their patches (either knobs or patching cords). However, even
with the DICO and the DIMI-A, copying, pasting and modifying the memory
content were either impossible or severely restricted, respectively. The fact
that both instruments reset their memory units when switched off is detri-
mental to their use in slow-paced and long-term projects.
    As the programmability feature became increasingly important the overall
usability of Kurenniemi’s instruments declined. This tendency reached its
peak with the DIMI-A, the composer having to program all the musical ges-
tures step by step: the instrument does not have an envelope generator and
thus the dynamic alteration has to be programmed to the desired level of
precision. This is exemplified in Kurenniemi’s arrangement of Johann Sebas-
tian Bach’s Invention in A minor (see the analysis in Chapter 7). Kurenniemi
outlined the key disadvantages of the DIMI-A before the instrument had
been properly launched and the marketing started, and he started to envision
improvements. First and foremost, to overcome the problem of unreadable
memory content he added a video monitor and camera to read the graphical
scores and to facilitate flexible instrument control. The video-camera exper-
iment was followed by a touch-based user interface on the DIMI-S and an
EEG-based user interface on the DIMI-T, whereas programmability ruled the
instrument control in the DIMI 6000 – Kurenniemi’s last DIMI of the 1970s
(see Figure 83).


   360 See Buchla Associates (1966).




                                       175

[p. 176 / pdf 202]

User Interfaces of Kurenniemi’s Electronic Musical Instruments




Figure 83. The DIMI 6000 was programmed with octal codes typed via the ADDS Consul 880
terminal. Typically, the cover of the terminal was removed to handle the heating problems. 361
Here, the instrument is seen in the University Studio (see also Figure 21). (photo: unknown /
Otavan iso musiikkitietosanakirja.362)




    361 Rautee & Hoikkala (2017) in an interview with Ojanen.

    362 See Ala-Könni et al. (1977, 147).




                                                  176

[p. 177 / pdf 203]

7 USER STORIES OF KURENNIEMI’S
  ELECTRONIC MUSICAL INSTRUMENTS

The focus in this chapter is on how composers and artists used Kurenniemi’s
instruments and the University Studio. I have ordered the presentation in
line with their use 1) within the studio environment (Chapter 7.1) and 2) out-
side the studio environment (Chapter 7.2), in both cases broken down into
sub-themes. Within the studio environment the key distinction is between
the studio as a tool for implementing compositional ideas and the studio as
an instrument, which were common themes in the 1960s and 1970s. Distinc-
tive differences also arise when I consider how the computer metaphor that
drove Kurenniemi’s instrument design manifested in the use of his instru-
ments. Switching the focus to outside the studio environment, I investigate
how artists and composers used them in live and collective performances,
and how Kurenniemi demonstrated his instruments. I also consider the dis-
tinction between live performance with an electronic instrument and the
concert settings of electroacoustic tape music, which reveal interesting de-
tails from the perspective of users.
    I categorize the composers and artists whose works and contributions I
analyze in this study as 1) users with first-hand experience of the instru-
ments, who had a key role in the design process and used several of them, or
one instrument several times, and 2) users whose experiences were more or
less indirect, in other words those who used only one instrument very briefly
or whose contact was indirect, but whose experiences bring interesting in-
sights (see Table 5). My analyses in this chapter concentrate on those with
first-hand experience of the instruments. The source material provides
points of departure for many research projects in the future.
    It is noteworthy that Kurenniemi realized only a few works with his in-
struments: three with the Integrated Synthesizer (Hyppy, Saharan uni, ma-
chine poem improvisations), one each with the Andromatic (Antropoidien
tanssi), the DICO (improvisation), the DIMI-A (Inventio–Outventio) and
one for the DIMI-O (Deal). He produced only tests and demonstrations with
the DIMI-S and the DIMI-T. There are no surviving documents about any of
his works with the Sähkökvartetti or the DIMI 6000.




                                      177

[p. 178 / pdf 204]

User Stories of Kurenniemi’s Electronic Musical Instruments


Table 5. The composers and artists with first-hand experience of Kurenniemi’s instruments and
those who were in in-direct contact with them: my analyses here concentrate mainly on the for-
mer group

Composer/Artist/Group                         First-hand / in-direct contact
Ahvenlahti, Olli                              In-direct exp.; together w/ Ruohomäki
Chydenius, Kaj                                In-direct exp.; together w/ Kurenniemi and Donner
Bentley, Andrew                               First-hand experience
Boman, Arild                                  First-hand experience
Davidow, Joe                                  First-hand experience
Donner, Henrik Otto                           First-hand experience
Gothoni, Ralf                                 In-direct exp.; together w/ Ruohomäki
Hakala, Kari                                  First-hand experience; together w/ Kurenniemi
Harma, Heikki and Cumulus (the band)          In-direct exp.; together w/ Ruohomäki
Hauta-aho, Teppo                              In-direct exp.; together w/ Ruohomäki
Keskinen, Kari                                First-hand experience
Koivistoinen, Eero                            First-hand experience
Kotilainen, Esa                               First-hand experience
Kurenniemi, Erkki                             First-hand experience
Lindeman, Osmo                                First-hand experience
Lundsten, Ralph                               First-hand experience
Mansnerus, Ilpo                               In-direct exp.; together w/ Ruohomäki
Mattila, Raija                                In-direct exp.; together w/ Kurenniemi and Donner
Nilsson, Leo                                  First-hand experience
Numminen, Mauri Antero                        First-hand experience
Romanowski, Otto                              First-hand experience
Ruohomäki, Jukka                              First-hand experience
Ruutsalo, Eino                                In-direct exp.; together w/ Kurenniemi and Donner
Salmenhaara, Erkki                            First-hand experience
Sirén, Pekka                                  First-hand experience
Stan, Mircea                                  In-direct exp.; together w/ Ruohomäki
Sähkökvartetti (the band; Peter Widen, Arto   First-hand experience
“Mamba” Koskinen and Tommi Parko)
Vainio, Riitta                                In-direct exp.; together w/ Kurenniemi and Ruutsalo
Valkonen, Heikki                              First-hand experience; on his own
Vesterinen, Marja                             First-hand experience; together w/ Ruohomäki and
                                              Donner
Viljanen, Rauno                               First-hand experience; on his own


The overall number of users with stories about Kurenniemi’s instruments is
small (see Table 6). Salmenhaara and Donner completed only a few electron-
ic works, but the productions of Nilsson, Lindeman, Ruohomäki and Ro-
manowski are more extensive. Swedish composer Ralph Lundsten is the ex-
ception, and I can describe only a fragment of his opus catalog in this con-
text. Composers Pekka Sirén, Andrew Bentley, Kari Keskinen and Joe Da-
vidow tested or employed Kurenniemi’s instruments briefly – here I only in-
troduce their contributions and focus on the composers and artists with more
works. I present only the key points of the chosen examples of interest in this
study. Detailed and updated lists of appearances and closer analyses will be
available on the Electronic Musical Instruments by Erkki Kurenniemi web-
site and within the FinEARS project.




                                                178

[p. 179 / pdf 205]

Table 6. Kurenniemi’s electronic musical instruments: an overview of the users and use situa-
tions (based on Table 3 in Chapter 5)

Instrument       Used during    Within the         Outside the studio       Known users of the instrument
                                studio                                      (the primary user first)
Integrated       1964–68        in several works   only twice according     Kurenniemi, Lundsten, Nilsson
Synthesizer                                        to known documen-
                                                   tary evidence
Sähkökvartetti   1968–          in only a few      in several perfor-       Numminen with Sähkökvartetti
                 the mid ‘70s   works              mances                   (the band), Ruohomäki, Vesterinen
Andromatic       1968–          in several works   used once in Finland;    Lundsten, Nilsson, Kurenniemi
                                                   in several exhibitions   (once)
                                                   outside Finland
DICO             1969–74(?)     in several works   used twice; in a Yle     Lindeman, Kurenniemi (once)
                                                   seminar and in El-
                                                   ektrononstop
DIMI-A           1970–78(?)     in several works   Demonstrated a few       Ruohomäki, Lundsten, Valkonen
                                                   times; only one live     (twice), Viljanen (once?), Kuren-
                                                   performance              niemi (once), Salmenhaara (once)
DIMI-O           1971–          in several works   several performances     Lundsten, Ruohomäki, Vesterinen,
                                                                            Kurenniemi, Koivistoinen
DIMI-S           1972–          -                  several performances     Lundsten; Visitors at the Pripps
                                                                            brewery
DIMI-T           1973–          -                  one test; one demon-     Kurenniemi (once); Boman
                                                   stration
DIMI 6000        1975–          only in a few      -                        Ruohomäki, Sirén, Davidow,
                                works                                       Bentley, Keskinen


In the following I build on information from the composers and artists about
how they view their artistic work, gleaned mainly from contemporary docu-
ments, retrospective interviews, and music analysis. I address the question of
what these works reveal about the technology used in their realization. My
point of departure is the material description of the works and the compos-
ers’ poietic ecosystems guided by the relevant features (the pertinences) I
have detected and consider significant for the analysis (see Chapter 3.3).


7.1 Within the studio environment
I described the historical development of the University Studio in Chapter 5,
and tracked who used it. Here, I return to how the composers used the studio
and Kurenniemi’s instruments within the studio environment.


7.1.1     The composers’ attitudes towards studio work and technology
Many of the composers and artists presented here saw the studio as an essen-
tial tool for implementing their compositional ideas, whereas only a few val-
ued it as an instrument. The distinction between these working methods is
based on two types of workflow: composers and artists viewed it either 1) as a
tool with which to realize their prescribed plans or mental schema, or 2) as a
real-time instrument, and interacted with the technology without a pre-
scribed plan.




                                                      179

[p. 180 / pdf 206]

User Stories of Kurenniemi’s Electronic Musical Instruments



    Users of the University Studio to whom Kurenniemi’s utopian vision of an
automated, distributed and computerized infrastructure was out of reach
based their works mainly on tape manipulation and sound processing. De-
spite the shortcomings of the contemporary technology, the studio provided
invaluable facilities enabling composers and artists to experiment and com-
pose with – and in some cases even for – the new instrument. In the process-
es of composition and music production they prioritized composer-
centeredness over technology-driven workflow. However, users differed in
how they used the studio, and here their backgrounds played a significant
role. A comparison of users who were formally trained in composition with
autodidact composers or trained engineers, for example, reveals differing
attitudes towards studio work.363 This emerges clearly when one looks at the
respective workflows.
    Typically, the composers first improvised with the instruments to test the
features and to discover their sonic and musical potential. Occasionally, the
technology provided a point of departure for a compositional solution, but
only rarely did technology per se constitute a complete compositional setting.
Within the studio context, Kurenniemi’s individual instruments were mainly
used as sound sources. The composers outlined their initial ideas for their
compositions before realizing them, and the technology merely directed the
implementation. Here, the composers differed in their real-time interaction
with the instruments and in the role they were willing to give to technology.
    Kurenniemi in particular made use of the studio as an instrument for real-
time processing. His key standalone tape music works – including On-Off
(1963) and Antropoidien tanssi (1968) – are based on real-time interaction
with the studio technology. In addition, the soundtrack for Eino Ruutsalo’s
experimental film Hyppy (1965), the two-piece tape music work Saharan uni
I & II (1967, realized with Kari Hakala), and some of Ruutsalo’s tape collages
including Mix Master Universe (1973, realized with Jukka Ruohomäki), and
?Death (1972–75) were produced as spontaneous processes without a pre-
scribed plan, even though the collages required laborious editing and splic-
ing.
    Whereas Kurenniemi saw the studio as an instrument for real-time per-
formance, Salmenhaara and Donner composed according to a plan outlined
beforehand, even though they did not necessarily commit the score to paper.
Kurenniemi thus used the studio as a preprogramed instrument whereby he
could improvise, while Salmenhaara and Donner used it mainly as a sound-
manipulation facility. Both Donner and Salmenhaara experimented with stu-
dio technology and produced works with it during the 1960s, but both aban-
doned electronic means before the turn of the decade.
    Donner, who was one of the first users of the University Studio, described
it as a place in which he could work on experimental and unconventional

   363 It should be noted that there was no formal training for studio-based composition at the time. I

   am grateful to Dr. Andrew Bentley for this information.




                                                  180

[p. 181 / pdf 207]

projects.364 At the time, he was also utilizing Yle premises. Yle did not have a
studio dedicated to experimentation and the work had to be done at Tehosto
or in the radio theater, and according to a formal plan, which hindered the
experimentation. The University Studio provided a freer and more open en-
vironment for working without having an official project. In addition to using
studio facilities in Helsinki, Donner worked in several studios in Central Eu-
rope, and was thus aware of stylistic trends and of the technological potential
of the new medium. For him, a studio was a tool just like any other instru-
ment. The key studio works he created by electronic means include the
soundtracks for Eino Ruutsalo’s films Kaksi kanaa (1963) and Romutaiteilija
(1965), a standalone tape music work, Esther (1963) and the radio play
Vihreä eläin (1971).
    Salmenhaara emphasized the role of the composer in music production.
He pointed out that technology did not dictate compositional decisions, and
that the studio played the same role in the compositional process as musical
instruments did in more traditional music. He thus shared Donner’s view of
the studio as a tool with which to realize compositional ideas.365 Salmen-
haara’s electronic repertoire from within the studio environment includes the
standalone tape music work White Label (1963), the two-part tape collage
Information explosion (1967), and two soundtracks for TV documentaries,
Aggressio (1968; Engl. Aggression) and Maan aurinko (1968/70). (Ruo-
homäki 2020, EH24/1; Uimonen 2007, 89–90) Having completed Maan
aurinko Salmenhaara abandoned electronic means altogether. Donner and
Salmenhaara thought of the studio mainly as a potential tool for implement-
ing their musical ideas according to prescribed plans or mental schema.
    A few details in Lundsten’s and Nilsson’s works reveal their points of de-
parture for electroacoustic music composition and production. Kurenniemi’s
instruments played a significant role for both, but it seems from the way they
used them that they employed the sounds to suit their needs rather than uti-
lizing the features of the instruments to drive their compositional decisions.
Occasionally Kurenniemi’s instruments have a solo role, and they clearly
stand out from the accompanying background. Even when the sounds are
modified by means of tape splicing, overdubbing and reverberating, or
blended in with other sounds, their sonic characteristics and certain se-
quencer functionalities are recognizable.
    Nilsson describes how he outlined sketches for works but did not write
strict plans or scores.366 Once he had completed the work on tape the sketch-
es became obsolete and he threw them away. Here, the contrast to Kuren-

   364 Donner (2013) in an interview with Home & Ojanen.

   365 Salmenhaara (1968, 208); see also Tawaststjerna’s funding application dated January 26, 1967:

   “Mainittakoon, että studiossa realisoidaan parhaillaan Montrealin maailmannäyttelyyn tilattua el-
   ektronista sävellystä. / Helsingissä 26.1.1967 (Erik Tawaststjerna).” (Engl. “It should be noted that
   an electronic composition commissioned for the Montreal World Expo is currently being realized
   in the studio. / Helsinki, January 26, 1967 (Erik Tawaststjerna)”)
   366 Nilsson (2019) in an interview with Ojanen.




                                                   181

[p. 182 / pdf 208]

User Stories of Kurenniemi’s Electronic Musical Instruments



niemi’s spontaneously recorded work Antropoidien tanssi with the Andro-
matic is clear. Nilsson employed tape loops and overdubbing in Skorpionen
(1964), in other words he compiled the previously recorded sounds of the
Integrated synthesizer with tape recorders afterwards – even though he said
that the “instrument sounds were relatively unedited”.367 Unlike Nilsson, Ku-
renniemi did not employ any post-processing or overdubbing when he com-
posed Antropoidien tanssi, but simply compiled the work from three tape
segments by means of sharp splicing.
    In the end, of the instruments in Kurenniemi’s collection Lundsten used
the Andromatic and the DIMI-O in several works. He did write a few scores
for the DIMI-A and even demonstrated the instrument frequently on TV
documentaries,368 but he soon cast it aside and donated it to Musikmuseet in
1978 (see Chapter 7.1.5). According to the interview with Städje (2012),
Lundsten tried to break free from the 12-tone scale system, which was one of
the key restrictions of the DIMI-A. However, this comment should be further
considered. The DIMI-O, which was one of Lundsten’s favorite instruments
alongside the Andromatic, was as tightly intertwined with the 12-tone scale
as the DIMI-A was. The key differences between them lie in the interfaces
and their usability.
    Composer Osmo Lindeman described how he drafted notes when he
started to compose a work,369 however, the notes were rudimentary and none
of them have survived. In this sense, his workflow resembles Nilsson’s. Lin-
deman systematically tested and experimented with the equipment. His sys-
tematic way of working in his studio is exemplified in a surviving tape in
which he tests the balance of the original dry test signal and reverbed signal
by reading the values of the volume input parameter potentiometer on the
tape step by step to verify the suitable amount of reverb effect.370 This work-
ing method is also evident in the textbooks on electroacoustic music technol-
ogy and composition he compiled for students at the Sibelius Academy. Fur-
thermore, his uncompromising attitude drove him to study electronics and
computer technology from scratch. He thereby acquired a thorough under-
standing of and expertise in electronic music composition, having abandoned
composing for traditional orchestras – even though he was a trained com-
poser.
    Lindeman was cognizant of the technology in most of Kurenniemi’s in-
struments, and even included technical descriptions in his textbooks. How-
ever, in his own works he only used the custom-built DICO – and indeed, he
was the only user of the instrument. Lindeman’s early electronic works be-

   367 Ibid.

   368 See Sima, Jonas. (1973). Cosmic Love. Ralph Lundsten elektrontonsättare; Ett porträtt av Jo-

   nas Sima. http://www.svenskfilmdatabas.se/sv/item/?type=film&itemid=56455;
   http://www.sima.nu/film-cosmic.htm
   369 See Lindeman (1972) in an interview with Koskimies or Lindeman (1974) in an interview with

   Paalanen.
   370 See UHMRL digital tape archive, tape ID: 20180711_01.




                                                 182

[p. 183 / pdf 209]

fore Ritual (1972), composed in 1969–1971, are based almost entirely on DI-
CO sounds and sequences, having been composed with and in some sense
even for the instrument. His standalone tape music works largely consist of
similar and sometimes even the same sound material produced with the DI-
CO. Examples include Kinetic Forms (1969), Mechanical Music for Stereo-
phonic Tape (1969), Tropicana (1970), and Midas (1970), as well as his mu-
sic for exhibitions Mobile (1969), the experimental film Tämäkö on teddy-
karhun maailma? (1969), and the two-part dance fantasy for television
Hummerit ja hummarit. Hummarit ja hammarit (1972).
    The unifying feature of these works is the relationship between their over-
all structural organization and their constituent parts. The early electronic
works consist of various DICO-realized segments and sound gestures, which
are then compiled with tape recorders to form the final version. Because the
sketches have not survived, no closer analysis of his composition workflow is
possible. The reuse of sequences and sound gestures recorded with the DICO
implies that Lindeman’s composition process was, in turn, driven by real-
time interaction with the technology and his plans for structural organiza-
tion. Here, he both performed with the DICO in real time to produce the
segments and sound gestures, and he composed according to a prescribed
plan to form the overall structure of his works.
    After Midas (1970) Lindeman concentrated on studying electronics and
computer technology, which changed the style of his electronic works. The
DICO has a significantly smaller role in Ritual (1972) than in his previous
works. He abandoned it in Spectacle (1974) and realized the sounds with the
Putney and the Minimoog. He also blended the individual sounds of the in-
struments more tightly with other sounds in these later works, and even pro-
cessed them beyond recognition. The difference from the early works is clear
–both in his technique and in the perceivable sonic character of his composi-
tion. He went on to abandon his early electronic works, of which he consid-
ered Ritual and Spectacle the only official examples.371 He pointed out that
the first works were mere studies, which he had “accepted too easily”: he was
concentrating on his instrument, not on the composition process.
    Lindeman’s expectations and anticipation of the new medium, electronic
music, were not fulfilled. Eventually, he faced the same problems as when he
composed traditional orchestral music.372 His comments reveal a similar atti-
tude to that of Salmenhaara: technology does not dictate compositional deci-
sions – nor is it equipped to do so. The way Lindeman used the DICO se-
quencer in real time also reveals more about his attitude: as he states in a
description of his last orchestral work Variabile373 (1967), he aimed at total
composer control over his works. This extended to all aspects of his work,

   371 Lindeman (1975) in an interview with Sermilä.

   372 Lindeman (1975) in an interview with Sermilä.

   373 See the Variabile presentation text in Lindeman’s scrapbook: “Even though the work includes

   aleatoric features, there is nothing in it that is beyond the composer’s control”.




                                                 183

[p. 184 / pdf 210]

User Stories of Kurenniemi’s Electronic Musical Instruments



including its performance, and it was one of the main reasons why Lindeman
abandoned orchestral music. His early electronic works were strongly driven
by the DICO, which eventually compromised his ideal of total control over
the composition process.
    The first works of composer of electroacoustic music, researcher, and
teacher Jukka Ruohomäki exemplify his way of working in close interaction
with studio technology. He states more explicitly than others that his compo-
sition process is centered on listening to the sound material. Ruohomäki
started his studio work with the DIMI-A in particular, and first used it to
produce Kolme DIMI-aihetta (1970, Engl. Three DIMI themes) and his first
standalone tape music work Mikä aika on (1970, Engl. What time is). Early
on, he also arranged Johann Sebastian Bach’s Invention in C major for the
DIMI-A.
    Kolme DIMI-aihetta consists of drone like passages recorded on tape and
then overdubbed with each other. The synchronizing of pre-recorded tapes
with recorders played a key role in Mikä aika on. Ruohomäki came to rely on
the overdubbing and manipulation of sounds with tape recorders to produce
a layered soundscape as a composition technique in the studio context. The
soundscapes in Sähkölintupuutarha (1971/1974), Adjö (1974), and Pisces
(1975–76), which also exemplify his distinctive imitation of nature, are ex-
ceptionally rich due to the multilayered overdubbing. Ruohomäki also devel-
oped a delicate technique for using synthetic sounds to imitate nature. Hav-
ing started with a purely synthetic and tonal sound world, he developed his
compositional and sound-material-selection techniques during his first com-
positional period in the 1970s to incorporate concrete sound sources and
skilled tape manipulation. (see Ojanen 2014b)
    Composer, artist and teacher of electroacoustic music Otto Romanowski
makes a rigid distinction between improvisation and studio work. He allows
improvisation only in live situations and when acquainting himself with new
technology but declines it as a part of a tape composition. His point of view
reflects Landy’s (1994) “something to hold on to factor”, calling for compo-
nents in a musical work that maintain the listener’s interest throughout. Ro-
manowski realized various works in the University Studio, and to some ex-
tent with Kurenniemi’s instruments, including Study 21 a (1973), Study 21 b
(1974), Yesterday-Tomorrow (1974), REM (1974), Two Dreams (1975), Two
Visions (1975), and Through the Black Point (1976).374
    Romanowski uses strongly contrasting sounds. As concrete raw material
in his early works he typically used human sounds, and their contrast to elec-
tronic sounds is clear. In Yesterday-Tomorrow (1974), for example, the ag-
gressive electronic rhythmic pattern is followed by a similar pattern pro-
duced by a chanting choir. The instruments are typically processed beyond
recognition, which indicate that in his early electronic works he moved fur-


   374 Romanowski (2019) in an interview with Ojanen.




                                                184

[p. 185 / pdf 211]

ther away from his initial technological point of departure than Kurenniemi,
Nilsson, Lundsten and Lindeman, for example. Romanowski built an indi-
vidual system, such as a language or a grammar, for each of his stand-alone
tape music works. However, he wanted to add surprising elements even in
works that otherwise had predetermined static structures, which neverthe-
less were also based on prescribed ideas. For example, he inserted a multiply
speeded-up copy of Through the Black Point (1976) in the golden section of
the work, where it is heard as a snap. This speeded-up version also provides a
new time dimension for the work375 in that the listener has actually heard it
before it ends. Another time dimension resembles the relative elapse of time
in the black hole, which is the title of the work in question.376
    In the following subsections I take a closer look at the chosen works.


7.1.2   The studio as a real-time performance instrument
Closer analysis of the standalone tape music works reveals composers’ differ-
ent points of departure in their studio workflow. Analysis of the music also
reveals details about the technology used in the studio. For instance, Kuren-
niemi’s first tape music work On-Off (1963) clearly differs from works such
as Salmenhaara’s White Label (1963) and Donner’s Kaksi kanaa and Esther,
both completed in 1963 – and even from its foreign counterparts such as
Nilsson’s Skorpionen (1964), Omaggio a Emilio Vedova377 (1960, RAI studio
in Milan) by Italian composer Luigi Nono, and Analog #1: Noise Study378
(1961, Bell Labs) by American composer of computer music James Tenney.
Even though the chosen works are similar in many respects, their compari-
son reveals Kurenniemi’s unique approach.
   Kurenniemi realized On-Off as a live improvisation: the studio equipment
recorded it directly onto the master tape, which he did not edit afterwards. 379
Other composers presented here processed the material for the master tape
manually, Tenney being among them, even though his work is an early ex-
ample of music composition by computer (Tenney at al. 2015, 103). Kuren-
niemi’s working method deviated from the typical process of electroacoustic
music composition, which was based on careful tape splicing. The outcome is
that On-Off has no structure determined by its composer beforehand, and in
this respect it exemplifies technology-driven composition, meaning that the
composer works in close and real-time interaction with the studio equip-
ment.



   375 The duration of the work is 8 m 40 s (8:40 = 520 s), therefore the golden section is at 5 m 21 s

   (520 s*0,618=321).
   376 Romanowski (2019) in an interview with Ojanen.

   377 See: https://youtu.be/8WAjjtNVVKg

   378 See: https://youtu.be/fe4UlyQAgcc

   379 Salmenhaara (1964, 55).




                                                   185

[p. 186 / pdf 212]

User Stories of Kurenniemi’s Electronic Musical Instruments



    The original sound material for Kurenniemi’s, Salmenhaara’s and Don-
ner’s first works may have been concrete, or even based on discrete pitches.
The sound processing distorted the material beyond all recognition, however,
with rich spectral features closer to noise than the tonal or pitch-oriented
structures. Thus, noise is a significant component of these works. In this re-
spect, it is interesting that Kurenniemi’s instruments – apart from the Inte-
grated Synthesizer – did not include noise generators, the emphasis in his
design being on the sequencers, which produced distinctive pitches with
pure, tempered or flexible scales. Donner realized Esther in Bilthoven – not
in the University Studio – although here his work serves as a reference point
for those from the studio. All three works were premiered in the same con-
cert in the Jyväskylän Kesä festival on July 13, 1963. Saunio describes Sal-
menhaara’s and Donner’s works as studies and drafts in his review, but he
refers to Kurenniemi’s On-Off as a work with a distinctive mark of the com-
poser’s determined intention, and Kurenniemi as a “composer who knows
how to achieve his goals”.380
    According to Kurenniemi, his point of departure for On-Off was a “static
hum” without any strict structural form. 381 Retrospectively, he said he was
inspired by a static hum in the generator hall of a power plant, which he had
visited a few years earlier. Interestingly, Tenney referred to a similar acoustic
phenomenon – driving daily through the Holland tunnel in New York – as an
inspiration for his noise study (see Tenney et al. 2015, 98–99). It is notewor-
thy that Kurenniemi wrote a description of the work fifteen years after it was
completed. The point of departure manifests itself in the work, however, and
is clearly visible in the sonogram (see Figure 84; the upper image). Unlike
Tenney, with his careful documentation (see Tenney et al. 2015, 100–103),
Kurenniemi did not write a score for the work, nor did he document the stu-
dio setup he employed. Thus, it is impossible to conduct a comprehensive
analysis of the poietic ecosystem in which he produced it.




   380 Saunio (1963, 4/Ylioppilaslehti August 30, 1963). It is noteworthy that Saunio was a close col-

   league and friend of Kurenniemi, Salmenhaara and Donner.
   381 As Kurenniemi states in the program of a seminar in 1978, “[t]he point of departure for the

   work was a static hum, the duration of which would not have any meaning structure-wise”: as in
   the program text in the archive of Yle’s experimental studio (Kuljuntausta 2002, 389; see also
   Kuljuntausta’s translation in 2008, 205). The document has vanished from Yle, however, appar-
   ently during the dismantling of the studio. The quotations from Kuljuntausta’s books are the only
   surviving references to this document.




                                                   186

[p. 187 / pdf 213]

Figures 84–86. Sonograms of On-Off (1963) by Kurenniemi (upper image), White label (1963) by
Salmenhaara (middle image), and Esther (1963) by Donner (lower image) depicting the first five
minutes of each work to allow for structural comparison across them. The horizontal bars, both
dark and light, in the upper image indicate the static frequency clusters running throughout Ku-
renniemi’s On-Off, whereas White label and Esther consist of structural segments, and even
pauses in between them. (image: Ojanen)




                                               187

[p. 188 / pdf 214]

User Stories of Kurenniemi’s Electronic Musical Instruments



The distinctive feature of On-Off is its static timbre, which manifests
throughout the work as dark and white horizontal stripes in the sonogram.
The darkness of the stripe varies as the amplitude of the sound 382 changes
(darker is louder). The emphasized frequency bands are responsible for the
static nature of the work, although the dynamic variation in loudness is con-
siderable – ranging from approximately RMS -65 dBFS to -5 dBFS.383 Ac-
cording to Lassfolk (2012, 60), continuous noise textures serve as an inten-
sive pedal point on top of which different sound gestures are laid. These ges-
tures appear in the sonogram as dark vertical figures.
    Whether Kurenniemi used a tape loop to create this continuous static
hum or played a 15-minute prerecorded tape of materials is impossible to
confirm. There seems to be no periodic sequence, or the loop was long and its
edit vanished under overlaying sound gestures. In comparison with the
works of Salmenhaara and Donner the differences are clear: White label and
Esther are realized from segments, which form the structure of the work,
whereas On-Off is dominated by static noise clusters throughout its duration.
Kurenniemi recalled in 2004 that Luigi Nono, who was at the premier of the
work during the Jyväskylän Kesä festival, asked if he had heard about pauses,
and remarked that they, too, are useful musical material.384
    Some of the sound gestures and certain passages in On-Off provide in-
sights into the technology and techniques used in the realization of the work.
At the time, “the equipment of the studio was modest” and included a couple
of full-track tape recorders, sound generators and a spring reverb unit 385
(Kuljuntausta 2002, 389; 2008, 205). The inventory catalogue reveals that at
least the Heathkit oscillator and the Telefunken M24 tape recorders were at
Kurenniemi’s disposal. According to Kurenniemi, all the material used to
produce the work was recorded beforehand and no tone generators were
used during the production of the master tape (ibid.). Kurenniemi used pre-
recorded, pure electronic sounds produced with an oscillator and noise gen-
erator, although the origin of these sounds remains unknown due to the ex-
tensive signal processing. Kurenniemi recalled that he was not aiming at the
French musique concrète style.386
    Some of the sound-processing equipment – i.e. the spring reverb, the ring
modulator and the feedback line through a mixer of some sort – is detectable
in the work. Even though the origin of the sound material remains unidenti-
fied, there is one interesting sound gesture that was impossible to produce in
the University Studio given the setup and its equipment at the time: the fast
arpeggio (see Figure 87) appears twice, the first time for about two minutes,

   382 That is perceived loudness; shown in the graphic presentation along the sonogram.

   383 The dynamic range is assessed from the original master tape of the work digitized in 2012. On

   the attachment CD of his book On/off, Kuljuntausta released a compressed version of the work,
   where the dynamic range is significantly reduced. (see also Ojanen 2015)
   384 Kurenniemi (2004) in an interview with Ojanen and Suominen.

   385 Salmenhaara (1964, 55).

   386 Kurenniemi (1993a) an interview with Ruohomäki.




                                                  188

[p. 189 / pdf 215]

clearly audible although heavily reverbed. The arpeggios resemble the sonic
characters of Seppo Mustonen’s early experiments with computer music
Teema ja muunnelmia (Engl. Theme and variations; 1962), which he pro-
duced with the Elliott 803 B computer of Suomen Kaapelitehdas. Kuren-
niemi recorded these experiments and processed the tape with a spring re-
verb. Teema ja muunnelmia was performed at the Jyväskylän Kesä concert,
together with On-Off.




Figure 87. On-Off – a detail: arpeggio with electronic sounds, 1:48–2:20; a similar pattern ap-
pears again during 7:32–8:00 (image: Ojanen)

The passages in which no sound gestures appear are interesting, and empha-
size the casual nature of the work, such as in the static passage of 4:46–5:55
(see Figure 88). Here, the hectic action of sound gestures disappears, and the
background noise texture is left alone for over a minute.
    There is more to be said about the length of the work and about Kuren-
niemi’s real-time working method. Kurenniemi realized the final master tape
of the work during its approximately 13-minute duration. However, this re-
quired him to prepare the tapes and to connect and test the equipment in
advance, among other required procedures. It is impossible to know if his
intention to complete this work became firm at the moment he improvised
with the studio, long beforehand,387 or after the improvisation was over. The
container of the master tape does not include exact dates or other mark-
ings.388


    387 As Kurenniemi acknowledged, the inspiration for the piece was a hum in the generator hall of

    the power plant that he had experienced a couple of years earlier (Ruohomäki 2020, EH22/5); Ku-
    renniemi also recalls in Taanila (2002) that the acoustic experience occurred in his childhood.
    388 See Ojanen, Mikko. (2020). The Photo Set of the Master Tape of Erkki Kurenniemi's On-Off

    (1963) (Version 20200108_01). Zenodo. http://doi.org/10.5281/zenodo.3601403.




                                                  189

[p. 190 / pdf 216]

User Stories of Kurenniemi’s Electronic Musical Instruments




Figure 88. On-Off – a detail: static passage, 4:46–5:55 (image: Ojanen)

The work’s structure does not fully support the initial idea implied in its
name, in other words that music can be produced with a machine by turning
the power on and off. Kurenniemi recalled that the meteorologists in the next
room did not appreciate the sonic textures of On-Off as music, and that the
session may even have been halted due to their complaints.389 The long and
calm fade-out in particular emphasizes the delicate structural details rather
than the crudely interrupted ending when the music-producing machine was
turned off, or when the composition process was surprisingly halted by the
neighboring meteorologists (see Figure 89).




    389 See Kurenniemi (2004), interview with Ojanen and Suominen; see also Ruohomäki (2020,

    EH22/5).




                                                190

[p. 191 / pdf 217]

Figure 89. On-Off – a detail: the long and calm ending with the 30-second fade out (image:
Ojanen)



7.1.3    Improvising within the studio
For the soundtrack of the TV documentary Maan aurinko (1968/70390) Sal-
menhaara used an octave arpeggiator to set the tempo and rhythmic pattern
for the melody, played on a synthesizer. He realized the synthesized rhythmic
pattern with the DIMI-A in 1970 – apparently very shortly before the broad-
casting of the documentary.391 A few details reveal something about the reali-
zation of this nine-octave arpeggio. The steady pulse of the up-and-down pat-
tern suggests that the machine clock controlled the speed of the rhythm, and
that Salmenhaara only performed the notes of the melody manually. This is
revealed when the notes change: their onsets are not synchronized with the
arpeggio but appear randomly in-between the steps (see Figure 90).
    The soundtrack of the documentary film Aggressio (1968), which was
never completed or released, provides another example of Salmenhaara’s use
of the studio as a real-time performance instrument. He fed the signal of pre-
recorded music through the mixer back to the recoding tape recorder in Ag-
gressio, producing repetitions with a distinctive rhythmic pattern and strong
feedback. As is typical with this technique, the accumulating repetitions satu-
rate and distort the signal against the tape. The effect is clearly audible in the
segments of Aggressio.




    390 Ritavuori, Heikki 1970: Maan aurinko, see: https://areena.yle.fi/1-50096523, see also Ruoho-

    mäki (2020, EH34/14).
    391 See Länsi-Savo 17.10.1970, 10; “Musiikin on säveltänyt Erkki Salmenhaara käyttäen hyväkseen

    Erkki Kurenniemen juuri valmistunutta tietokonetta.” (Engl. “The music was composed by Erkki
    Salmenhaara using Erkki Kurenniemi's newly completed computer.”)




                                                  191

[p. 192 / pdf 218]

User Stories of Kurenniemi’s Electronic Musical Instruments




Figure 90. Synthesizer arpeggio in Maan aurinko (1968), the note changes not synchronized with
the arpeggio (image: Ojanen)

Lindeman’s use of improvisation and real-time instrument control as a com-
positional technique in his repertoire is interesting given that he turned from
orchestral music to electronic music to gain control over his musical expres-
sion. Within the studio context, he utilized the DICO sequencer to produce
sound fields in which individual notes lose their meaning. He used both the
statically pulsating sequencer sound fields with no alteration of the instru-
ment parameters, which he processed with filters, and smoothly modifying
musical patterns, which he produced by altering the rapidly running 12-step
sequencer of the DICO on the fly. Thus, he performed with the DICO in real
time within the studio environment.
    Lindeman took advantage of the DICO’s programmable features – exclud-
ing the two-channel output. The instruments appear in his electronic works
as a point source mono signal in either of the two channels, and they produce
a dual-track mono output rather than a stereo field. Lindeman introduced his
basic DICO techniques in his first work with the instrument. Mobile (1969),
which he composed for the Valo ja Liike 2 (Engl. Light and Movement) exhi-
bition, consists of 14 segments with seven different themes – some of which
are variations on previous patterns and typically appear as responses to each
other in another channel: for example, the second segment (A’) is an inver-
sion of the first segment (A), their fast ostinatos run in opposite directions,
and their volume contours and filtering are symmetrical and mirrored (see
Figure 91). The DICO sequence is unaltered in the first two segments. Lin-
deman’s real-time manipulation of the DICO’s parameters is clearly visible in
the left channel segment F: he reused the segments of Mobile in his other
works. However, the DICO-centered real-time improvisation eventually con-
flicted with Lindeman’s goal of having tight control over his material and he
decided to abandon the solely DICO-based works.




                                              192

[p. 193 / pdf 219]

Figure 91. Lindeman Mobile (1969) consists of 14 segments with seven different themes. One
very short segment – presumably the same that Lindeman used as the national TV News sound
logo – is hidden just before D’. All the DICO sequences in Mobile are point source mono signal
and only appear in one of the two channels. Thus, rather than producing a stereo field the work
produces two individual channels, which was a suitable arrangement for the exhibition space.
(image: Ojanen)

The real-time improvisation technique that Lindeman used with the DICO in
the studio environment resembles the real-time sequencer manipulation in
Nilsson’s Skorpionen (1964/65; see Figure 92) and in Kurenniemi’s Antro-
poidien tanssi (1968). The only difference between the three is that Linde-
man and Nilsson first performed with the instruments, then compiled their
works from several recordings with tape recorders. They partially over-
dubbed them, and processed the prerecorded material with a reverb, tape
delay or filtering. Kurenniemi, in turn, produced Antropoidien tanssi com-
pletely as a real-time improvisation, and did not process or overdub the
sound of the instrument afterwards. He only spliced three segments of tape
to realize the final version (see Figure 93).
    The soundtrack for Ruutsalo’s film Hyppy (1965) provides a counter-
example to the three works with real-time improvisation. Ruutsalo wanted a
mechanical soundscape for his short film about routine workflow in a felt-
boot factory, whereas Kurenniemi used the newly completed Integrated Syn-
thesizer to produce eight static sequences with no modification of the in-
strument parameters – excluding the tempo changes in the last sequence (H;
see Figure 94). Ruutsalo used all the sequences for the final soundtrack but
rearranged their order and spliced them together with the picture (see Fig-
ures 94 and 95). The film features sequence (G) as its main theme, which ap-
pears seven times in the final soundtrack, whereas other sequences (from B
to F) serve as short interludes in the main theme. The first sequence (A)
serves as a theme for the longer middle section of the film. No recordings




                                                193

[p. 194 / pdf 220]

User Stories of Kurenniemi’s Electronic Musical Instruments



were processed afterwards, and in this respect the soundtrack resembles
Antropoidien tanssi.




Figure 92. Skorpionen (1964/65) by Nilsson, with overdubbed prerecorded sound material and
live manipulation of the Integrated Synthesizer parameters (image: Ojanen)




Figure 93. Kurenniemi recorded a tape, which he later used as his work Antropoidien tanssi
(1968) to be released on a compilation album Perspectives 68: Music in Finland; he did this hasti-
ly before taking the instrument to Stockholm to Ralph Lundsten and Leo Nilsson, who had com-
missioned it. Kurenniemi realized the three segments of the work as real-time improvisations with
the Andromatic in the studio environment. (image: Ojanen)




                                                194

[p. 195 / pdf 221]

Figures 94 and 95. Kurenniemi produced eight static sequences (sections A to H) and one static
chord (section I) with the Integrated Synthesizer (upper image) for Eino Ruutsalo’s film Hyppy.
Ruutsalo used all the sequences but not the chord in the final version of the soundtrack (lower
image). (image: Ojanen)


7.1.4    Computer-metaphor-driven composition and music-production
         processes
The computer-metaphor-driven process, in other words the concept I use
here as an analytical tool, is intertwined with definitions of the computer, but
it does not call for one specific unequivocal definition of a computer per se. A
machine capable of automated processing qualified as a (analog) computer in
the 1960s and 1970s, even though it was not capable of association or of mak-
ing decisions. According to Kurenniemi (in 1971), the line between a comput-
er and a non-computer depended on the machine’s capacity for drawing con-
clusions; a programmable shift register, in other words a musical sequencer,




                                               195

[p. 196 / pdf 222]

User Stories of Kurenniemi’s Electronic Musical Instruments



did not equate it to a computer. Herein lies a hint that at the time he was an-
ticipating something that is known today as artificial intelligence. 392 Thus,
Kurenniemi’s utopian visions were not at the composers’ and artists’ dispos-
al, even though were eagerly anticipated.
    Kurenniemi’s first sequencers, from the Integrated Synthesizer (1964) to
the Andromatic (1968), did help to automate music production. However, as
is evident from the works completed with the instruments, they were based
on real-time performance and improvisation with the instrument rather than
on a computerized composition process. The performed or improvised sound
material was first recorded on tape and then processed further using tape-
manipulation techniques – or in some cases it was used without further pro-
cessing.
    Kurenniemi’s long-term aim was to build the University Studio as a com-
puterized entity, but this was never realized. Elements of a computer-
metaphor-driven composition process were present in On-Off, but only in the
sympathetically entitled name of the work. James Tenney, on the other hand,
who was one of the pioneering composers of computer music, used a stored-
program computer, IBM 7090, in his Analog #1: Noise study (1961). The pa-
rameter input of the Integrated Synthesizer was approximate, and the in-
strument could not be programmed with precision. Nevertheless, Kuren-
niemi was path-dependent and continued the development directed by his
computer-metaphor-driven goal. After the Sähkökvartetti (1968) and the
Andromatic (1968), he realized such a design for the first time in the DICO
(1969) and the DIMI-A (1970), both of which can be programmed with preci-
sion (see Chapter 6).
    These instruments advanced Kurenniemi’s designs in significant steps
and he was able to avoid the painstaking task of tape splicing. However, the
instruments only provided psychomotor extensions that helped the composer
to automate the playing and performing, rather than cognitive extensions
that could have lightened his or her mental burden. The non-visual and non-
descriptive user interfaces load the composer’s memory rather than facilitat-
ing the composition process. Users wishing to program the instruments need
a copy of the instrument’s memory content in their own minds – even if it
has been written down on paper, as Lundsten states in his notes on the DI-
MI-A, which resemble the scores used in the tracker software of the 1980s
(see Figures 96 and 97; Lassfolk et al. 2015, 268). With practice, however,
simple sequences were relatively easy and fast to program into the instru-
ment, as Ruohomäki showed in his demonstration of Sähköinen tapahtuma
Vanhalla, and Lundsten with his boogie-woogie programming example. 393

   392 Leino (1971, 35); see also Nilsson (2019) in an interview with Ojanen.

   393 See the DIMI-A boogie-woogie example in Sima, Jonas (1973). Cosmic Love. Ralph Lundsten

   elektrontonsättare; Ett porträtt av Jonas Sima.
   http://www.svenskfilmdatabas.se/sv/item/?type=film&itemid=56455; http://www.sima.nu/film-
   cosmic.htm




                                                   196

[p. 197 / pdf 223]

There is no surviving documentary evidence of the optical input of the DIMI-
O being used to read graphical scores, which was one of its initial design
goals, and is not known to be employed.394




Figure 96. Handwritten score draft for the DIMI-A by Ralph Lundsten (image: The Documentation
of the DIMI-A/UHMRL archive)



   394 A typical demonstration of the instrument is exemplified Lundsten in the Swedish magazine

   program Kika-Digga-Ding from 1975; see: https://www.youtube.com/watch?v=VfDr9zaO_TQ




                                                 197

[p. 198 / pdf 224]

User Stories of Kurenniemi’s Electronic Musical Instruments




Figure 97. Typewritten score drafts for the DIMI-A by Ralph Lundsten (image: The Documenta-
tion of the DIMI-A/UHMRL archive)

The DICO’s limited sequencer and memory capacity (only four programma-
ble parameters on 12 steps) did not encourage Lindeman to use the instru-
ment to compose prescribed note-based musical sequences (see Riikonen
1978). A detailed note-based analysis of his works is not feasible because he
used the DICO to produce fast arpeggios, in which the individual notes were
part of the dense sound field rather than produced melodic themes. Linde-




                                              198

[p. 199 / pdf 225]

man typically used the short sequence as a point of departure for the produc-
tion of raw sound material. Even if he did program the initial sequence ac-
cording to his plans, he then modified it in real time to produce slowly
morphing musical passages, which he first recorded on tape and then com-
piled into a work.
    The DIMI-A, on the other hand, encouraged composers to concentrate on
programming the instrument. However, its low memory capacity forced
them to program and record their works in short fragments, which they then
compiled on a tape recorder to form a complete work. This hurdle directed
the use of the instrument along the path of computer-metaphor-driven com-
position: its programmability took precedence over real-time performance.
    For Mikä aika on (1970) Ruohomäki programmed the DIMI-A to play
musical sequences especially dominated by the bass ostinato, which antici-
pates riff-driven music styles such as the synthesized disco that was emerging
during the 1970s, along with works by Giorgio Moroder and the German
group Kratfwerk. He programmed melodic sequences and sound gestures
over the rhythmic background driven by the bass ostinato. All the material
was then synchronized using tape recorders (see Figure 98). Mikä aika on
exemplifies how the limits of the instrument’s memory capacity forced Ruo-
homäki to return to time-consuming tape manipulation. It took a considera-
ble amount of time to realize the work, and Ruohomäki recalls Kurenniemi’s
concern about whether he could produce it in time to be issued on the DIMI-
A promotional record (Dimi is born, 1970).395
    The computer-metaphor-driven use of the DIMI-A features in a few syn-
thesized arrangements of classical music works – specifically Johann Sebas-
tian Bach’s inventions. To demonstrate the potential of the two-voice instru-
ment Kurenniemi programmed Bach’s Invention 13 in A minor with it, enti-
tled and published as Inventio (1970). Ruohomäki programmed Bach’s In-
vention 1 in C major, and a few years later Heikki Valkonen used the instru-
ment in a similar way in his realization of Le Coucou (1977) by Louis-Claude
Daquin.
    Given the limited memory capacity of the DIMI-A, Kurenniemi had to
program the Bach Invention in parts. First, he programmed two bars into the
instrument, and then recorded the segment on tape. Starting from the fourth
tape segment he only programmed one bar, and recorded that on tape: in
total the Invention is programmed in 22 parts and recorded on 22 tape seg-
ments, spliced together to form a complete work (see Figure 99; for an over-
all analysis of the arrangement see the data set;396 see also Lassfolk et al.
2015, 269–271).


   395 Ruohomäki (2018) in an interview with Ojanen.

   396 See Ojanen (2018[2015]): Arrangement of J.S. Bach's invention in A minor (BWV 784) for the

   DIMI-A synthesizer by Erkki Kurenniemi (1970): An annotated video of the master tape at:
   http://doi.org/10.5281/zenodo.1469722; Video publication: https://vimeo.com/278832133




                                                199

[p. 200 / pdf 226]

User Stories of Kurenniemi’s Electronic Musical Instruments




Figure 98. A detail of the analysis of Mikä aika on (1970). Ruohomäki compiled it from several
separately recorded DIMI-A sequences, which he then laid upon each other using tape recorders.
Here, the soloist sound gestures spread in the hard left and right in the stereo field are accompa-
nied by static bass ostinato, equally emphasized in both channels. The soloist gestures and the
accompaniment are synchronized using tape recorders, thus the onsets are not precisely aligned.
(image: Ojanen 2019)




Figure 99. Kurenniemi’s (1970) arrangement of Johann Sebastian Bach’s Invention No 13 in A
minor for the DIMI-A. Due to its memory capacity, Kurenniemi had to program the arrangement in
22 segments, and splice the tape segments together to form the final version. (image: Ojanen
2018[2015])

Unlike Ruohomäki’s Mikä aika on, Kurenniemi’s Bach rendition does not
consist of overdubbed sounds, but Bach’s two-voice Inventions yield suitable
material for a two-voice instrument to be programmed and recorded a whole
segment at a time. Wendy Carlos’s Bach arrangement realized with a Moog




                                                 200

[p. 201 / pdf 227]

system (Swithed-on Bach, 1968) differs in that Carlos performed and played
the instrument parts with the instrument and then recorded them on a multi-
track tape recorder, with several overdubs.397
    The first half of Kurenniemi’s arrangement is straightforward, note-by-
note programming with only a little alteration of other parameters of the in-
strument. Towards the end, he started to insert other than note data into the
sequencer. The computer metaphor directed the design of the DIMI-A to
such an extent that Kurenniemi did not build an envelope generator into it,
indicating that everything should be programmed. Therefore, each parameter
has to be programmed separately when tempo changes, dynamic variation,
note articulation or coloration are added to the musical output.
    Kurenniemi stretched the initial sequencer infrastructure to implement a
dynamic variation into single notes, which suggests 16 bars with 16 beats, the
minimum length of 16th-note-duration programming. When he programmed
a dynamic variation into 16th notes he employed the 256 steps of the se-
quencer to produce only four bars with 64th-duration values for each note.
Here, one 1/16 note occupied eight steps of the 256-step sequencer, during
which different filter or amplitude values could be programmed, even to the
shortest notes (see Figure 100).
    A comparison of the different arrangements of Bach’s Inventions for the
DIMI-A and Daquin’s Le Coucou reveals the different programming strate-
gies of DIMI-A users. Ruohomäki did not alter the tempo in his arrangement
of Bach’s Invention No. 1 in C major, generally settling for programming the
note data. The rare variation in the sound is the dynamic alteration in bar 12
when he used a similar technique to the one adopted by Kurenniemi (see
Figure 101). Otherwise Ruohomäki’s arrangement is static. Only a few audi-
ble snaps due to tape editing and an extra 1/16 note in the third bar are per-
ceivable unintentional sound gestures.
    In his arrangement of Louis-Claude Daquin’s Le Coucou Heikki Valkonen
followed Daquin’s score more closely than Kurenniemi or Ruohomäki fol-
lowed Bach’s instruction – which does not dictate the tempo or the dynamics,
however. Valkonen processed the final version with a subtle reverb that hides
the tape splicing. Valkonen’s master tape is not similarly spliced as Kuren-
niemi’s, therefore no detailed structural programming segmentation is possi-
ble. A few interesting details emerge from Valkonen’s master tape, however.
Daquin’s score consists of dynamic and tempo changes such as seven ritar-
dandi, which Valkonen follows, and volume changes in his performance in-
structions. (see Figures 102 and 103)




   397 See the sleeve notes in Carlos, Walter (1968): Switched-On Bach. Columbia Masterworks – MS

   7194. https://www.discogs.com/Walter-Carlos-Switched-On-Bach/release/1308287




                                                201

[p. 202 / pdf 228]

User Stories of Kurenniemi’s Electronic Musical Instruments




Figure 100. A programming example of Kurenniemi’s (1970) arrangement of Johann Sebastian
Bach’s Invention No 13 in A minor for the DIMI-A; the dynamic contour for each note pro-
grammed with closing bands of the filter bank step by step with 1/64-time values at the end of the
work on the right-hand part in bar 25 (image: Ojanen 2018[2015]398)




Figure 101. A programming example of Johann Sebastian Bach’s Invention in C major arranged
for the DIMI-A by Ruohomäki (1970); the dynamic contour for two notes in bar 12 programmed by
adjusting the volume parameter with 1/32-time values (image: Ojanen 2019)




    398 See Ojanen (2018[2015]): Arrangement of J.S. Bach's Invention in A minor (BWV 784) for the

    DIMI-A synthesizer by Erkki Kurenniemi (1970): An annotated video of the master tape at:
    http://doi.org/10.5281/zenodo.1469722




                                                202

[p. 203 / pdf 229]

Figure 102. Programming example of the arrangement of Louis-Claude Daquin’s Le Coucou for
the DIMI-A by Heikki Valkonen (1977): The dynamic and tempo variation (image: Ojanen 2019)




Figure 103. A programming example of Heikki Valkonen’s (1977) arrangement of Louis-Claude
Daquin’s Le Coucou for the DIMI-A: no dynamic, modulation or coloration alteration in the final
segment of the work – especially not in the last note; cf. the last note in Kurenniemi’s arrange-
ment (see Figure 100; image: Ojanen 2019)

Ruohomäki and Vesterinen found another interesting computer-metaphor-
driven use for Kurenniemi’s instruments in their children’s radio play
Sähkölintupuutarha (1971, Engl. The Electric Birds' Garden). Both the play
and a short film were realized in collaboration with Vesterinen. In an inter-




                                                 203

[p. 204 / pdf 230]

User Stories of Kurenniemi’s Electronic Musical Instruments



view with Paavolainen399 they give a detailed description of the techniques
they used in their search for the sounds for the work. At the time, when com-
puters for composition and music production were not available in Finland,
the composers were not able to realize works based on extensive mathemat-
ics-based signal processing, such as those relying on stochastic techniques
developed by Greek-French composer Iannis Xenakis in particular. To over-
come the challenge, Ruohomäki and Vesterinen made innovative use of the
optical input and the threshold of the luminance control of the trigger (bang-
bang) circuit of the DIMI-O. To produce stochastic sound gestures for
Sähkölintupuutarha400, in which they wanted to imitate the random chirping
of the chicks, they directed the DIMI-O camera towards the moving clouds,
the movements causing subtle changes in the lighting and thus triggering the
notes of the instrument stochastically.401


7.1.5    Sequencer-based examples
The first sequencer designs could not live up to the expectations of computer-
metaphor-driven processes, therefore composers and artists were forced to
rely on tape-manipulation techniques. However, there are a few examples of
how users facilitated the process by using sequencers innovatively: Eero Koi-
vistoinen with his music album for children Ruusa ja Muusa (1971); Donner
with his music for the radio play Vihreä eläin (1971); and Ruohomäki with
Sakari Lehtinen and Heikki Harma from the folk group Cumulus on the track
Sirkuksen seinillä (Engl. On the Walls of the Circus) from its third album
Sirkustirehtöörin pieni sydän (1973; Engl. The Little Heart of the Ringmas-
ter). All these works exemplify studio-based workflows in the context of pop-
ular music.
    Jazz musician and composer Eero Koivistoinen used electronic means on
his children’s music album Muusa ja Ruusa (1971, Engl. Muusa and Ruusa),
which is based on the poems of well-known Finnish poet Kirsi Kunnas. He
used the DIMI-O sequencer on the track entitled Sammakkojen ulosmarssi
(Engl. The Walkout of the Frogs), which allows the altering of sequence con-
tents in real time. The track is in two parts, the first part (Part A: Bars 1–34)
using the DIMI-O sequencer. The basic sequence, which runs throughout the
part, consists of a simple two-bar melody and its DIMI-O-realized accompa-
niment (see Figure 104). The first half of the 34-bar section comprises the
simple sequence with additional tonal notes appearing from the ninth bar
onwards. Koivistoinen gradually added atonal and modulated notes such that
towards the end the rhythmic cluster dominates as the original melody and
chord structure almost vanish in the chaotic sound field realized with modu-
lated atonal notes and spread in the stereo field with a tape delay. Koi-

   399 See Vesterinen and Ruohomäki (1971) in an interview with Paavolainen.

   400 See the Elonet database: https://elonet.finna.fi/Record/kavi.elonet_elokuva_153068

   401 Ibid.




                                                204

[p. 205 / pdf 231]

vistoinen may have overdubbed the sequences with the tape recorder. Start-
ing from bar 15, the onsets of the added notes are not precisely synchronized
with the original DIMI-O sequence and have different modulation (i.e. vibra-
to). Moreover, not all the added notes fit the 32-step resolution of the DIMI-
O sequencer, and a more finely grained sequencer would have been needed.
The DIMI-O part of the track ends with the sound of crashing objects and a
door slamming with a distinctive reverb. The track exemplifies the use of the
DIMI-O sequencer as a real-time programmable barrel organ.




Figure 104. The DIMI-O sequence used on the track Sammakkojen ulosmarssi by Eero Koi-
vistoinen. The barrel-organ sequence is slowly modified by adding first tonal notes in real time
(Section B), then atonal notes with frequency modulation (Section C), eventually leading to the
chaotic cluster spread in the stereo field with a tape delay (Section D). The first part of the track
(Part A), produced solely with the DIMI-O and tape recorders, ends with an explosion produced
with a distorted concrete sound gesture resembling the slamming of a door. (image: Ojanen
2019)

Kurenniemi’s instruments play a significant role in the radio play Vihreä
eläin (1971), which is based on Vesterinen’s text and Donner’s music and
sound design. Together with Vesterinen (Sähkökvartetti 402), Ruohomäki
(DIMI-A) and Kurenniemi (DIMI-O), Donner recorded the parts with Ku-
renniemi’s instruments first. The narrator’s role and the other instruments
were recorded later in another session. Donner utilizes the Sähkökvartetti
sequencer in three parts of the play to produce an accompaniment and a
metronome for the music performed by the Otto Donner Treatment jazz
group. The third part of Vihreä eläin (3:10–5:03; see Figure 105) opens with

    402 Some of the Sähkökvartetti and DIMI-A parts were released on Kurenniemi’s compilation CD

    Äänityksiä/Recordings 1963–1973 in 2002 under the track titles Sähkösoittimen ääniä #1 and #4.
    On the CD the tracks are credited to Kurenniemi and the DIMI-A track is introduced as the
    Sähkökvartetti recording. Vihreä eläin is not mentioned as the origin of the sound material.




                                                   205

[p. 206 / pdf 232]

User Stories of Kurenniemi’s Electronic Musical Instruments



the Sähkökvartetti bass drum with bongo and clave sounds added one after
another every four-bar cycle, with an approx. 81 bpm tempo. Starting from
the ninth bar, Otto Donner Treatment comes in gradually, first with the dou-
ble bass (bar 9), then the brass section with long notes (bar 13) and finally
the whole group with the saxophone solo (bar 17).
   Thereafter the tempo accelerates rapidly within two bars (17–19), from 81
to approx. 105 bpm. The accelerando, which Otto Donner Treatment follows
closely in the overdub recording session, was performed earlier by
Sähkökvartetti in real time, the master tempo of the sequencer being adjust-
ed.403 The narrator comes in at 4:25 and the DIMI-A at 4:34, mimicking
Vihreä eläin with random staccato pitches spread in the left and right chan-
nels as a point source dual mono signal employing the two-channel output of
the instrument.




Figure 105. The Sähkökvartetti provided an accompaniment and a metronome for the other in-
struments in three parts of the radio play Vihreä eläin (1971; image: Ojanen 2019)

In 1973, Ruohomäki used the DIMI-A sequencer to accompany Sakari
Lehtinen’s song Sirkuksen seinillä (Engl. On the Walls of the Circus) in the
album Sirkustirehtöörin pieni sydän (1973; Engl. The Little Heart of the
Ringmaster) released by the folk group Cumulus. Lehtinen and Heikki Har-
ma (also known as Hector, singer and songwriter with Cumulus and Ruo-
homäki’s old school mate) came to the University Studio to meet Ruohomäki
and to record sounds from the DIMI-A.404 Ruohomäki had never heard the
song, but Lehtinen asked him to produce sounds with it that were recorded

   403 The tempo change can be detected on the track Sähkösoittimen ääniä #4 on Kurenniemi’s

   compilation CD Äänityksiä/Recordings 1963–1973, which the original radio-play session record-
   ing without the latter overdubs.
   404 Ruohomäki (2018) in an interview with Ojanen; see also Karlsson and Lehtinen (2018) in an in-

   terview with Riihimaa.




                                                206

[p. 207 / pdf 233]

on a tape.405 It is not known what state the song was in at the time the
rhythmic pattern was recorded, nor the extent to which the DIMI-A pattern
influenced the final arrangement. Other instruments on the track were rec-
orded on top of the DIMI-A’s rhythmic pattern (see Figure 106) later in the
Finnvox studio.
    Here, the DIMI-A served as a metronome for the entire track, even
though it can be heard in only a few parts in the final album version. Its
sound gestures appear on the left channel, starting from the first instrumen-
tal part (part C) and on the right channel during the instrument parts (C, F,
and H). After the intro part with a lower tempo (63 bpm), the tempo of the
track is fixed to approx. 112 bpm (see Figure 107), following the tempo of the
DIMI-A sequence. In contrast to Vihreä eläin, here the tempo of the instru-
ment serving as a metronome was static. Ruohomäki also utilized DIMI-A’s
precisely adjustable clock in film work in which synchronization manage-
ment was crucial.406




Figure 106. A detailed view of Part C in which the DIMI-A sound gestures first appear: those on
both channels are precisely synchronized, which supports the interpretation that they were pro-
duced with the DIMI-A in one take (image: Ojanen 2019)




    405 Ruohomäki (2018) in an interview with Ojanen.

    406 Ibid.




                                                 207

[p. 208 / pdf 234]

User Stories of Kurenniemi’s Electronic Musical Instruments




Figure 107. The DIMI-A triplet pattern providing a temporal frame for the track Sirkuksen seinillä.
The sound gestures are visible in the sonogram – the static tempo throughout the track supports
the interpretation that the DIMI-A was recorded first, providing a metronome for the track, and the
rest of the instruments were recorded later on top of the DIMI-A rhythmic pattern. On the final
album version the DIMI-A pattern appears continuously on the left channel starting from part C,
and during the instrumental parts (C, F, and H) on the right channel. (image: Ojanen 2019)


7.1.6    Sound synthesis examples
The waveform of Kurenniemi’s instruments was mainly square, and most of
them included filters. The alteration in sonic character was to be produced
with subtractive synthesis via filtering the harmonic structure of the sound.
    Ruohomäki’s works Adjö (1974; Engl. Farewell) and Ennen iltaa (1977;
Engl. Before Evening) exemplify how to broaden the synthesis potential of
Kurenniemi’s computer-controlled designs. Ruohomäki used the DIMI 6000
in Ennen iltaa to produce rising chromatic sequences. He first programmed
several four-note sequences with the instrument, and then he overlaid the
recordings on top of each other to achieve a chaotic cluster in which the sin-
gle notes lose their meaning and the cluster forms a pulsating sound field
with a rich timbre (see Figure 108). Here, the DIMI 6000 provided the
means for producing masses of sound material, which otherwise would have
required extensive resources. A similar sound field with a tonal minimalistic
synthesizer arpeggio – typically in a major key or on a pentatonic scale – can
be found in his works from the 1970s. Three years prior to Ennen iltaa, Ruo-
homäki used the DIMI-A and the DIMI-O to produce a synthesized sound
field that had a strong association with nature. In Adjö, he employed sound
material from the radio play and animated film Sähkölintupuutarha (Engl.
The Electric Bird Garden), which explains the nature associations. He said
later on that he found his own musical language in Adjö (see Ojanen 2014b,
163). In the third part of the work, the DIMI-O provides a static, minimalistic




                                                 208

[p. 209 / pdf 235]

synthesized accompaniment for the several DIMI-A sound gestures, starting
with a deep pitch bend. (see Figure 109)
    Composer Andrew Bentley, who is especially interested in sound synthe-
sis, employed the DIMI 6000 in Bowing (1978). His point of departure for
the work was the rich timbral spectrum of the violin bow, and here he specif-
ically aimed “to bring synthesis to a level that is timbrally sophisticated and
satisfying to the ear.”407 Bentley produced most of his raw sound material in
the York studio in which he worked and studied before moving to Finland in
1976.408 He did not find the DIMI 6000 very easy to use, or flexible enough
for sound synthesis, and said that the instrument “was used for only small
parts of” the work.409




Figure 108. The DIMI 6000 cluster of chromatic sound field in Ruohomäki’s Ennen iltaa (1977;
image: Ojanen 2019)




   407 See Bentley (March 3, 2017): Historical electronic music by Andrew Bentley 2.

   https://algorithmicsound.com/2017/03/03/historical-electronic-music-by-andrew-bentley-2/
   408 Bentley (2015) in an interview with Ojanen & Lassfolk.

   409 See Bentley (March 3, 2017): Historical electronic music by Andrew Bentley 2.

   https://algorithmicsound.com/2017/03/03/historical-electronic-music-by-andrew-bentley-2/




                                                  209

[p. 210 / pdf 236]

User Stories of Kurenniemi’s Electronic Musical Instruments




Figure 109. The DIMI-A and the DIMI-O provided sound sources for a fully synthesized sound
field with a strong association with nature in Ruohomäki’s Adjö (1974): in the third part of the
work the DIMI-O provides a static minimalistic synthesizer arpeggio accompaniment for the sev-
eral sound gestures, with deep upward pitch bends realized with the DIM-A (image: Ojanen
2019)



7.2 Outside the studio environment
Beyond the studio environment of electroacoustic music, there is an interest-
ing distinction between live performance with electronic instruments and
concert performances of standalone tape music work. After briefly discussing
this distinction I will present my analyses of the appearance of these instru-
ments in three categories: 1) live performances with Kurenniemi’s instru-
ments, 2) instrument tests and demonstrations, and 3) collective perfor-
mances with Kurenniemi’s instruments.
    Kurenniemi’s instruments rarely appeared in front of live audiences dur-
ing the time frame of this study. Events during 1961–1978 identified thus far
include the following: seven instruments were played in less than 30 live per-
formances – usually only once with a certain instrument, with the exception
of Sähkökvartetti (the band), which tops the list of known performances with
the Sähkökvartetti (the instrument) – six instruments were demonstrated to
the general public in twelve events, and three instruments were displayed in
six exhibitions (see Table 7).
    The list of events is not definitive, and more will be discovered in the fu-
ture. Kurenniemi frequently presented his new prototypes, especially in the
heyday of the DIMIs starting from 1970. More documentary evidence of in-
strument demonstrations is also likely to emerge from the archives. Howev-
er, I believe that the saturation point of the research material has been
reached, and that credible arguments can be based on these examples.
    Unfortunately, most of these events were not recorded and the surviving
documentary evidence is sparse, consisting only of casual mentions in maga-



                                                210

[p. 211 / pdf 237]

zine articles or some newspaper reviews. Therefore, closer analysis of how
the instruments were used in most of the events is impossible. The events I
describe and analyze in the following are those on which there is enough sur-
viving documentation and that lie within the scope of this study.
Table 7. A summary of the appearances of Kurenniemi’s instruments in front of a live audience,
i.e. live performances, exhibitions and demonstrations at which the instruments were present, in
chronological order: the updated list410 is available in the Electronic Musical Instruments by Erkki
Kurenniemi Zenodo community

Event                           City/Country        Date                    Instrument(s)        Type of ap-
                                                                                                 pearance
Algorithmic music seminar /     Jyväskylä/Finland   July 7, 1965            Integrated Synthe-   Demonstration
Jyväskylän Kesä                                                             sizer
Machine poems /                 Helsinki/Finland    February 9, 1968        Integrated Synthe-   Live perfor-
Sähköshokki-ilta                                                            sizer                mance
Sähkökvartetti performances /   Sofia/Bulgaria;     August 1968 to Novem- Sähkökvartetti         Live perfor-
approx. 15 performances         several loca-       ber 1970                                     mance
                                tions/Finland
Den Immateriella Pro-           Stockholm/Sweden Opening on November        Andromatic           Exhibition
cessen exhibition                                10, 1968
Feel It exhibition (preview)    Stockholm/Sweden December 1968              Andromatic           Exhibition
Feel It exhibition              New York/United     January 24 to March 16, Andromatic           Exhibition
                                States              1969
Expo Norr exhibition            Östersund / Sweden June 28 to July 6, 1969 Andromatic            Exhibition
Yle seminar on electronic music Helsinki/Finland    November 5, 1969        DICO                 Demonstration
Elektrononstop 1969 /           Helsinki/Finland    November 17, 1969       Andromatic; DICO     Demonstration
Electronic music concert
Elektrononstop 1969 /           Helsinki/Finland    November 17, 1969       Andromatic; DICO     Live perfor-
Electronic music concert                                                                         mance
Nuorison taidetapahtuma 70      Turku/Finland       October 30, 1970        DIMI-A               Demonstration
Elektrononstop 1970 /           Helsinki/Finland    November 17, 1970       DIMI-A               Demonstration
Electronic music concert
Elektrononstop 1970 /           Helsinki/Finland    November 17, 1970       DIMI-A               Live perfor-
Electronic music concert                                                                         mance
Digelius marketing event        Helsinki/Finland    January 20, 1971        DIMI-A               Demonstration
Ung Nordisk Musik 1971          Helsinki/Finland    February 10, 1971       DIMI-A               Demonstration
Intermedia, Elonkorjuupäivät / Helsinki/Finland     May 26, 1971            DIMI-O               Live perfor-
Elonkorjaajat festival                                                                           mance
Dimi-musiikkikone / Pori Jazz   Pori / Finland      July 16 to 18, 1971     DIMI-A or O?         Demonstration
DIMI Ballet for TV              Helsinki/Finland    September 22, 1971      DIMI-O               Demonstration
(NB! not aired at the time)
Vaasan Kesä festival            Vaasa/Finland       June 16 to 18, 1972     DIMI-O; DIMI-S       Exhibition
Deal / Nordic Music Days        Oslo/Norway         September 3, 1972       DIMI-O; (DIMI-S)     Live perfor-
                                                                                                 mance
                                                                                                 / Exhibition
Dimensio exhibition 1972        Tampere/Finland     September 16 to Octo-   DIMI-O; DIMI-S       Exhibition
                                                    ber 15, 1972
Blue Danube w/ Oulu Sympho- Oulu/Finland            October 18, 1972        DIMI-O               Demonstration
ny Orchestra and DIMI-O
Samuel Beckett play Act with-   Oslo/Norway         [s.a. 1973?]            DIMI-O               Live perfor-
out words w/ DIMI-O and                                                                          mance
theater group Scene 7411



     410 See Ojanen (2017): https://doi.org/10.5281/zenodo.842854.

     411 For more about the theater group Scene 7 see:

     https://sceneweb.no/nb/organisation/5045/Scene_7-1966-1-1; On Riitta Vainio, Arild Boman and
     DIMI-O see: http://kiasma.fi/kiasma-lehti/16.php?lang=en&id=4




                                                        211

[p. 212 / pdf 238]

User Stories of Kurenniemi’s Electronic Musical Instruments


Event                           City/Country       Date                  Instrument(s)    Type of ap-
                                                                                          pearance
Psychological tests w/ DIMI-O   Oslo/Norway        [s.a. 1973?]          DIMI-O           Demonstration
Talviunesta herääminen /        Helsinki/Finland   February 27, 1974     Sähkökvartetti   Live perfor-
Yle Liisankatu concert                                                                    mance
Electronic music seminar /      Espoo/Finland      November 7 to 17, 1974 DIMI-T          Demonstration
Dimensio exhibition 1974




7.2.1     Electroacoustic tape music in a concert setting
The composers’ attitudes towards the electroacoustic tape music concert set-
tings reveal fascinating aspects of the role and state of electroacoustic music
in the 1960s and the 1970s. In that tape music works are realized in the stu-
dio and reproduced from the tape in concert, electroacoustic tape music in a
concert setting is an extension of studio work. This does not exclude the role
of an interpreter from the communication chain, however. The reproduction
technology and the engineer play similar roles as the conductor and the mu-
sicians in a traditional setting (Ojanen 2015). Herein lies the interest in the
electroacoustic music concert setting.
    Electroacoustic music in a concert setting is closely related to the concept
of acousmatic music, which is based on the idea of a loudspeaker orchestra.
Interestingly, this was the aspect that contemporary composers criticized at
the time. The fact that there was nothing visual for the audience to follow was
considered a general problem in tape music concerts: the core idea of acous-
matic music had turned against itself. Within the scope of this study, Linde-
man’s and Ruohomäki’s points of view differ from those of François Bayle,
who developed an acousmonium – a loudspeaker orchestra – for “pure lis-
tening” (Chadabe 1997, 68).
    Even in the mid-70s Ruohomäki was criticizing the electroacoustic music
concert setup in which there was nothing the audience could follow. 412 Lin-
deman also complained that the “traditional concert setting is too stagnant
for this type of music”.413 He was referring to tape music concert settings
here – not to live performances with electronic musical instruments. He dis-
regarded the idea of live performance because he did not believe he had the
necessary equipment. His main intention was to move away from the unpre-
dictable concert performance situation, in which the composer must rely on
the conductor and the orchestra as interpreters. In this sense Lindeman ech-
oes the views of Igor Stravinsky, who anticipated music composed to be per-
formed only through gramophones without the interpreter (see Katz 2010,
113). Unfortunate technical problems ruined the Finnish premier of his prize-
winning Ritual in the chamber music space in Finlandia Hall on December 1,
1972.414

    412 Ruohomäki (1976).

    413 Lindeman (1975) in an interview with Sermilä.

    414 See the concert reviews by Seppo Heikinheimo and Petri Sariola in hitherto unidentified news-

    papers in Lindeman’s scrapbook (Lindeman et al. 2020). Heikinheimo’s review entitled Ligetiä ja




                                                      212

[p. 213 / pdf 239]

   Even though Lindeman used the DICO in real-time improvisation in the
studio environment to produce the raw material for his tape music works, he
did not consider it an instrument for live performance. He only performed
with it live on one occasion, on November 17, 1969. Unfortunately, no docu-
mentary evidence of this event has survived.
   In Lindeman’s opinion, the perfect environment for listening to electroa-
coustic music was at home through a hi-fi sound-reproduction system in a
dedicated environment, or in an exhibition space in which the sounds could
be distributed and the audience could move. He produced soundscapes for
three of Ruutsalo’s kinetic art exhibitions in the late 1960s and early 1970s,
which provided a solid platform for Kurenniemi’s instruments and electronic
sounds in general. The Amos Anderson Art Museum provided the venue for
the Valo ja liike 2: International exhibition of kinetic art from May 10 to
June 8, 1969. Ruutsalo’s Kineettisiä kuvia (Engl. Kinetic pictures) exhibition
toured in eight cities in Finland in the spring of 1970. Lindeman’s Mobile
(1969) provided the electronic soundscape in both exhibitions.


7.2.2   Live performances with Kurenniemi’s instruments
Kurenniemi frequently presented his instruments to the public – especially
the DIMI-A and the DIMI-O. However, it was mainly to demonstrate them,
and there is little surviving documentation of the live performances. This is
interesting given that, in the context of computerized and automated music
production, Kurenniemi’s key design themes included real-time instrument
control and user interaction with the instrument. In fact, live-performance
potential was anticipated by users in the early design phases of many of his
instruments. For example, Kurenniemi planned to add c-casette recorder as a
mass storage device to the DIMI-A to facilitate live usability of the instru-
ment.415 This plan was never materialized, however. The live-performance
feature was successful only in the Sähkökvartetti, which was explicitly de-
signed as a performance instrument, and in the DIMI-O with its flexible opti-
cal input. One reason for the rare live performances was that the instruments
were new and there was no repertoire for them in the same sense as there is a
repertoire for the violin, for example. The few public performances also re-
flect their initial design target as studio-based instruments – and in some
cases their background in the computer-metaphor-driven design process.
    The Integrated Synthesizer was used mainly in the studio. Its sounds were
frequently heard in exhibitions and in concerts, but they were recorded on
tape and reproduced from it. A few surviving documents shed light on its use




   oppilaita (Engl. Ligeti and his students) was most likely published in Helsingin Sanomat. The title
   of Petri Sariola’s review is Modernismin arkipäivää (Engl. The everyday life of Modernism).
   415 Kurenniemi (1971a, 40)




                                                  213

[p. 214 / pdf 240]

User Stories of Kurenniemi’s Electronic Musical Instruments



outside the studio environment, however, even though only in two events.416
Its first documented appearance was in the algorithmic music seminar on
July 7, 1965 that was part of Jyväskylän Kesä, in which it was used for
demonstration purposes. No audio or visual recordings of the event have
survived, therefore further analysis is impossible.
    Kurenniemi performed twice with the instrument on February 9, 1968, in
the Sähköshokki-ilta (Engl. Electroshock Evening) event that was part of
Eino Ruutsalo’s Valo ja liike exhibition at the Amos Anderson Art Museum
in Helsinki. The only surviving audio document related to the event is a
sound recording of rehearsals on February 8, the day before the concert. The
recording is not an intentional document, however, although it has signifi-
cant documentary value. It is a tape from the recorder used as a delay for the
machine poems, a dual mono recording in which delayed signals ping-pong
from one channel to another. Ruutsalo used a monophonic version of the
tape later as a soundtrack in his film Runoja 60-luvulta (Engl. Poems from
the ‘60s; 1987; see Home 2013, 20–22). The tape, which Ruohomäki fortu-
nately digitized in the 1990s, has been lost. The digitized version was re-
leased by Ektro records in August 2013, and a digital copy of the original tape
is archived in Music Finland.417
    Contemporary newspaper announcements and reviews of Sähköshokki-
ilta report that Kurenniemi modulated music and speech during the impro-
vised session.418 However, according to the sound recording of the rehearsals
the speech was modulated only with the tape delay and not with the Integrat-
ed Synthesizer, which produced synthesized musical responses to the recita-
tion but did not modulate the speech (see Figure 110). The Integrated Syn-
thesizer included distortion processing for external signals, but this could not
be used at the same time as being used as a performance instrument. It is
impossible to ascertain after 50 years whether a stereo configuration was
used to form a spatial effect in the exhibition space. Judging from the photo-
graphs, a complex loudspeaker arrangement was not set up in the exhibition
space (see Figures 111 and 112). Apart from the distinctive Vox speaker grill
(probably a Vox PA system or the guitar amplifier used by Donner in his Exe-
cethis), no speakers are visible in the photographs. Given Ruutsalo’s declara-
tion about the exhibition, the fact that Saharan Uni was the first stereophon-
ic electroacoustic work in Finland, and the earlier radical experiments with
spatial sound conducted by Donner, who was the musical conductor of the
evening, the sound-diffusion experiments would have been more than obvi-
ous.


   416 At the time of writing this text, there was a note in a retrospective interview by Nilsson (2019)

   that he used an early version of the Integrated Synthesizer in the Art Parlour Samlaren in Stock-
   holm in the fall of 1964, but no contemporary documentary evidence has been found yet.
   417 An excerpt of this early Finnish machine poetry with electronic improvisation can be heard on

   Ektro records’ SoundCloud page.
   418 See e.g. HS (1968, 17 / January 17, 1968).




                                                    214

[p. 215 / pdf 241]

Figure 110. Call and response patterns in the machine-poem improvisations. The Integrated
Synthesizer was used merely as a sound source not as a sound-processing unit for the recited
poems – only the 350-ms tape delay was used for processing both the speech and the Integrated
Synthesizer. In the ping-pong delay configuration, the Integrated Synthesizer’s dry signal appears
first on the left channel and the 350-ms delayed signal on the right channel – the reciter appears
first on the right channel and the delayed signal on the left channel. (image: Ojanen 2019)




Figure 111. Sähkö-shokki-ilta (Electric Shock Evening) at the Amos Anderson Art Museum on
February 9, 1968: an improvisation with the Integrated Synthesizer and electronic zither; Henrik
Otto Donner with the microphone, Philip Donner and Mattijuhani Koponen with the electronic
zither, in other words a zither with guitar microphones (photo: unknown / The Amos Anderson Art
Museum)




                                                215

[p. 216 / pdf 242]

User Stories of Kurenniemi’s Electronic Musical Instruments




Figure 112. Sähkö-shokki-ilta (Electric Shock Evening) at the Amos Anderson Art Museum on
February 9, 1968: the machine poems; Erkki Kurenniemi (left; back to the camera) operating the
Integrated Synthesizer tone generator and Claes Andersson (right) reading poems at the micro-
phone processed with the tape delay. Between Kurenniemi and Andersson is the rack of uniden-
tified studio equipment from the University Studio. The same equipment rack appears in the pho-
to with Numminen and the almost-finished Sähkökvartetti (see Figure 24). (photo: unknown / The
Amos Anderson Art Museum)

The Sähkökvartetti (instrument) was used in several live performances by
Sähkökvartetti (the band), but only three recordings have survived. One
could conclude from the recordings and Numminen’s description that there
was a loose plan for the performance, but its realization was adjusted freely
from one event to another. Common features in the versions of Kaukana
väijyy ystäviä (1968) included Numminen’s introduction in which he pre-
sented the title or the line-up of the group, as well as the main theme of
Kaukana väijyy ystäviä, which he sang in Finnish and Swedish – on some
occasions also in English and German. Arto Koskinen, who composed the
main theme, accompanied Numminen with the melody machine. Otherwise,
the performance consisted of collective improvisations and a drum solo “if
there was enough time to perform it”.419
   The three surviving audio documents do not indicate any kind of strict
formal structure, which was followed in performances of Kaukana väijyy
ystäviä. The version of November 25, 1968 in the Kommunikaatiokonsertti
(Engl. Communication concert) in the University of Helsinki Great Hall, for

   419 Numminen (2018) in an interview with Ojanen.




                                               216

[p. 217 / pdf 243]

example, starts with the main theme of the work (see Figure 113), whereas in
Sähköinen tapahtuma Vanhalla on November 17, 1970 it appears in the
middle of the performance with the melody machine, and again at the end of
the performance sung by Numminen in Finnish and Swedish (see Figure
114). In a short excerpt from its performance in the documentary Ungdom,
för helvete! (Engl. Youth, bloody hell!), directed for television by Anki Lind-
quist, Sähkökvartetti performs as a trio while Numminen’s singing and the
theme are not heard at all. The length of the Kaukana väijyy ystäviä per-
formance varied from a few minutes to one-and-a-half hours. The longest
performance took place in the Amos Anderson Art Museum on September
29, 1968.
    The output of the instrument was typically processed only with a spring
reverb. The unit – the Telefunken spring reverb – is visible in the documen-
tary Ungdom, för helvete!. The output was processed with a tape delay in
Sähköinen tapahtuma Vanhalla420. Ruohomäki recalls that he hastily picked
up a tape recorder for the band from the University Studio, and the setup did
not turn out to be what he had expected.421 The tape delay appears suddenly
in the middle of the performance and remains present until the end. The tape
speed is varied twice, first when the speech is adjusted from the faster to the
slower mode (apparently 15 inches/second to 7.5 inches/second), and then
again back from the slower to the faster mode.




Figure 113. The Sähkökvartetti performance of Kaukana väijyy ystäviä on November 25, 1968
(image: Ojanen 2020)




   420 In the surviving documentary recording Kurenniemi describes the event as Elektrononstop.

   421 Ruohomäki (2018) in an interview with Ojanen.




                                                217

[p. 218 / pdf 244]

User Stories of Kurenniemi’s Electronic Musical Instruments




Figure 114. The Sähkökvartetti performance of Kaukana väijyy ystäviä on November 17, 1970 –
presumably their last performance (image: Ojanen 2020)

Two documented events and their comparison provide an interesting point of
departure for analysing the playability and live performance potential of Ku-
renniemi’s designs. The first event was an improvisation by Ruohomäki
(DIMI-A), Ilpo Mansnerus (flute), Ralf Gothoni (piano) and Teppo Hauta-
aho (bass) in Sähköinen tapahtuma Vanhalla on November 17, 1970, and the
second was Ruohomäki’s Talviunesta herääminen (1974; Engl. Waking up
from hibernation) by Olli Ahvenlahti (the Minimoog), Mircea Stan (trom-
bone) and Kurenniemi (the VCS 3 and the Sähkökvartetti together with Ruo-
homäki) on February 27, 1974. The three photographs of the setup used in
Talviunesta herääminen that have survived, in addition to the audio docu-
ment, reveal details of the instruments and technology used in the perfor-
mance (see Figures 117, 118 and 119).
    The points of departure for these improvisations were different. The mu-
sicians in the DIMI-A improvisation, Gothoni, Mansnerus and Hauta-aho,
are clearly anticipating a response from the machine, whereas in Talviunesta
herääminen Stan and Ahvenlahti are playing around on top of the static
pulse produced by the Sähkökvartetti sequencer. The background of the mu-
sicians also plays a role here. Those who were classically trained anticipated
the responses and reactions from the DIMI-A, whereas those experienced in
Jazz improvisation adjusted to static, non-responsive accompaniment.
    In addition, Ruohomäki – having more experience in 1974 – changed the
premises for Talviunesta herääminen from those in the DIMI-A improvisa-
tion three years earlier. In 1970, he programmed a few sound gestures and
pre-arranged musical segments in the DIMI-A, which he could choose during
the improvisation, whereas in 1974 the improvisation was built upon the stat-
ic tempo dictated by Sähkökvartetti – and here it resembles the point of de-
parture for the radio play Vihreä eläin. Moreover, Talviunesta herääminen




                                              218

[p. 219 / pdf 245]

is more clearly structured in sections, each with a unique content and pur-
pose, than the 1970 improvisation (see Figures 115 and 116). The initial inten-
tion behind the work is clearer than in 1970 when the musicians improvised
while they were waiting to see if anything came out of the DIMI-A to which
they could respond.
   The improvisations also reveal the differences in the user interfaces and
the usability of the instruments. The readability of the Putney and
Sähkökvartetti user interfaces is superior, and their real-time controllability
is more flexible than in the DIMI-A user interface, in which the functional
status is hidden and has to be verified by listening. DIMI-A’s memory con-
straints restrict the number of possible pre-programmed musical gestures,
and rapid change is impossible. Donner’s and Kurenniemi’s anticipatory in-
troduction in 1970 is also noteworthy. Even before the performance, they saw
the improvisation as a test and emphasized what was not going to happen
rather than how the group could succeed in performing with the new instru-
ment.422

   422 Donner: “Seuraavaksi saamme sitten kuulla ja nähdä, miten DIMI-musiikkikoneen kanssa im-

   provisoi kolmen hengen muusikkoryhmä, johon kuuluvat Teppo Hauta-aho, basso, Ilpo Mansne-
   rus, huilu, ja Ralf Gothoni, piano. Ja ennen kuin soittajat pääsevät alkuun, niin DIMIn suunnitteli-
   ja Erkki Kurenniemi ja minä yritämme hieman selvittää, mistä tässä kokeessa on kysymys. - - -
   Niin siis ehkä tärkeämpää kuin selvittää se, mitä kohta saattaa tapahtua, on selvittää se, mitä ei tu-
   le tapahtumaan. Toisin sanoen tämä musiikkikone ei pysty muuntamaan näiden soittimien tar-
   joamaa materiaalin muuta kuin sointivärin suhteen – eikö niin?”; Kurenniemi: ”Joo - - - tai ehkä
   on parempi sanoa, että tällä hetkellä DIMI pystyy ainoastaan tuhoamaan sävelen ja sikäli kuin se
   ei täysin pysty tuhoamaan sitä, niin siinä on asian mahdollinen kiinnostavuus.” Donner: ”Tämän
   lisäksi DIMI pystyy, kuten jo aikaisemmin konsertin aikana on esitelty, - - - itse tuottamaan mu-
   siikkistuktuureja, joihin muusikot sitten erilaisin keinoin voivat reagoida ja vastata.” Kurenniemi:
   “Nyt konepuoli ja musiikkipuoli alkoivat neuvottelut keskenään siitä, mitä tässä improvisaatiossa
   on tarkoitus tehdä - - - ja on sanottava, että tää on siinä mielessä vielä kokeilu, että konepuolella - -
   - tarvitaan vielä soittaja. Mukana ehkä jo seuraavassa Elektrononstopissa voidaan kokeilla tilan-
   netta, jossa samalla lailla kylmiltään muusikot joutuvat vastatusten tietokoneen kanssa, joka toimii
   täysin omillaan ilman operatöörin apua. Konsertti-instrumenttina DIMIä rajoittaa tällä hetkellä
   erityisesti muistin pieni koko. Tuossa Juuso on ohjelmoinut laitetta - - - tallettanut muistiin sata
   erilaista käskyä suunnilleen, joka on nyt maksimimäärä.” Donner: ”Eikö muistia voida helposti lä-
   hiaikoina laajentaa?” Kurenniemi: ”Kehityksen vauhti on niin ilahduttava, että jos nyt – tämä DI-
   MIhän rakennettiin viime kesänä – ja jos nyt vaihdetaan muisti viisi tai kymmenen kertaa suu-
   remmaksi niin sen hinta on pikkusta hiukan halvempi kuin tämä vanha sadan sanan muisti.” Don-
   ner: ”Joo, ja toivokaamme, että tämä neuvottelu koht’puolin johtaa tuloksiin ja saamme todella
   kuulla jotain.”
   (Engl. Donner: “Next we can hear and see how the group of three musicians consisting of Teppo
   Hauta-aho, bass, Ilpo Mansnerus, flute, and Ralf Gothoni, piano improvise with the DIMI music
   machine. And before the musicians get started the designer of the DIMI Erkki Kurenniemi and I
   try to explain what this test is about. - - - So perhaps more important than figuring out what might
   soon happen is to explain what is not going to happen. In other words, this music machine cannot
   modify the material provided by these musical instruments except the color of the sound – isn't
   that right?” Kurenniemi: “Yeah… or maybe it is better to say that at present the DIMI is only capa-
   ble of destroying the notes and, as far as it is not completely capable of destroying it, there is po-
   tential interesting side of it.” Donner: “In addition to this, the DIMI is capable, as has been demon-
   strated earlier during the concert, of producing music structures on its own, to which musicians
   can then react and respond in various ways.” Kurenniemi: “Now the engineering side and the mu-




                                                     219

[p. 220 / pdf 246]

User Stories of Kurenniemi’s Electronic Musical Instruments



   Kurenniemi also critically stated that this version of the DIMI was only
able to distroy the notes performed by the other musicians and it could not
respond to their playing. He thought that subsequent versions would partici-
pate in the performance. The improvisation is not nearly finished if an un-
known participant asks in a disappointed tone if it is over yet, and Donner
laconically states that the resulting performance was not much.423




Figure 115. The DIMI-A improvisation in Sähköinen tapahtuma Vanhalla on November 17, 1970:
the structure of the improvisation is arbitrary and driven by the free associations of the musicians
and their reactions to the sound gestures performed with DIMI-A (image: Ojanen 2020)




    sic side have begun to negotiate about what is meant to be done in this improvisation - - - and it
    has to be said that this is still an experiment in the sense that on the engineering side - - - a player
    is still needed. Perhaps already in the next Elektrononstop, it can be tried out a situation where
    musicians, similarly without any preparation, are confronted with a computer that works com-
    pletely on its own without the help of an operator. As a concert instrument, the DIMI is currently
    limited especially by the small memory size. There, Juuso has been programming the device - - -
    has stored approximately a hundred different commands in its memory, which is now the maxi-
    mum number.” Donner: “Can't the memory be easily expanded in the near future?” Kurenniemi:
    “The pace of development is so gratifying that if you now – this DIMI was built last summer – and
    if you now change the memory to five or ten times bigger its price is a bit cheaper than this old
    one-hundred-word memory.” Donner: “Yeah, and let's hope this negotiation will soon lead to re-
    sults and we will really hear something.”)
    423 Unknown: “Olikse siinä? Eikö oikein onnistunut? Mitä me sitten tehdään? Joks tää loppu?”

    Donner: “Joo, siis ei tästä tän kummempaa surinaa tällä kertaa tullut ja jatkamme nauhakonsert-
    tia.” (Engl. Unknown: “Was that it? It failed? It didn’t really succeed, did it? What shall we do
    now? Is this done with now?” Donner: “Yes – so not much of a buzz this time and let’s continue the
    tape music concert.)




                                                     220

[p. 221 / pdf 247]

Figure 116. The structure of Ruohomäki’s Talviunesta herääminen (1974) performed by Olli
Ahvenlahti (the Minimoog), Mircea Stan (trombone), and Kurenniemi (VCS 3 and Sähkökvartetti
together with Ruohomäki) on February 27, 1974 (image: Ojanen 2020)




Figure 117. See the caption on the next page.




                                                221

[p. 222 / pdf 248]

User Stories of Kurenniemi’s Electronic Musical Instruments




Figures 117–119. The Sähkökvartetti, the Putney, the Dimix and other studio equipment set up
for the performance of Talviunesta herääminen in Yle’s Liisankatu Studio on February 27, 1974.
In the photo on the previous page Ruohomäki is standing with his back to the camera while Olli
Ahvenlahti is on the right side of the picture on the piano with the Minimoog, Mircea Stan (trom-
bone) in front of the piano, Pentti Lahti (saxophone) and Tapani Ikonen (drums). The upper pic-
ture on this page shows the two Revox tape recorders set up for the tape delay configuration and
the back panel of the Putney. The DIMIX mixing console and patch bay with its red-housed moni-
tor on the right, the Putney and its keyboard in the middle and half of the Sähkökvartetti front
panel on the right in the lower picture. (Photos: Erkki Kurenniemi / the Finnish National Gallery /
Erkki Kurenniemi archive.)




                                                 222

[p. 223 / pdf 249]

7.2.3    Instrument tests and demonstrations
Tests and demonstrations of Kurenniemi’s instruments in front of the gen-
eral public were noted and well received by the media. Reviews of demon-
strations at various events acknowledge the prototype state of the instru-
ments, and refer to the enthusiasm and excitement about Kurenniemi’s
forthcoming designs. Heikinheimo does not mention the Integrated Synthe-
sizer in his review of Jyväskylän Kesä,424 but the instrument is highly visible
in the accompanying photograph (see Figure 14 in Chapter 5.1 3). During the
seminar the public could test the instrument after Kurenniemi had set it up,
thus the event was a demonstration rather than a live performance. The pho-
tograph depicts an enthusiastic audience – including Swedish composers
Ralph Lundsten and Leo Nilsson – fascinated with the Integrated Synthesiz-
er, referred to in the caption as musiikkitietokone (Engl. music computer; see
Figure 14). The seminar comprised presentations by Kurenniemi (“About
definitions, programs, machines and all that”), Carl Lesche (on the esthetics
of computer music) and Knut Wiggen (“Kompositionssystemet Wiggen 1”;
Engl. The Wiggen 1 composition system).
    Other significant demonstrations, which also promoted electric sounds
and Kurenniemi’s instruments to contemporary society, took place at festi-
vals and seminars, and in concert settings representing both experimental
and classical music. There were notable demonstrations of the DIMI-A and
the DIMI-O with public-outreach potential. Having completed the DIMI-A,
Kurenniemi frequently presented it, but he set it aside soon after the first
DIMI-O prototype was ready to be demonstrated. The typical demonstration
setup with the DIMI-A was similar to that at the Sähköinen tapahtuma
Vanhalla event. There was an improvisation session featuring a classically
trained musician, and both Kurenniemi and Ruohomäki demonstrated the
instrument. Kurenniemi described its key features, while Ruohomäki pre-
sented them by programming simple and known tunes such as the traditional
Swedish song Gubben Noak.
    The flexible user interface of the DIMI-O facilitated the demonstration of
the DIMIs. In his DIMI-O demonstrations Kurenniemi even asked the audi-
ence to participate in the sessions. He did this in the seminars and festival
presentation of the art group Elonkorjaajat, first during the Intermedia event
at Vanha Ylioppilastalo in Helsinki on May 26, 1972, and then during the
Vaasan kesä festival in June 1972. Two demonstration events with the DIMI-
O that are of particular interest were the session at Yle on September 22, 1971
and the one with the Oulu Symphony orchestra on October 18, 1972. Its suit-
ability was also tested in various Norwegian contexts, such as experimental
theater and psychological testing (see also Chapter 5.3).




   424 Heikinheimo (1965, 11).




                                       223

[p. 224 / pdf 250]

User Stories of Kurenniemi’s Electronic Musical Instruments



7.2.4    Collective performances with Kurenniemi’s instruments
One of the key features of Kurenniemi’s instruments relates to collective per-
formance and music production. As with most of his designs, his visions were
far-reaching and were realized only partially in his instruments. Thus, any
interpretation of the use cases needs to be contextualized. Collective music
making as a utopian lies behind Kurenniemi’s plans to build a network for
music production. He presented his ideas about terminal computers and
networks for music making at the electroacoustic music conference organized
in Florence in June 1968 (see also Chapter 5.1.3). For this purpose, he was
also designing analog-to-digital and digital-to-analog converters. One early
application of the A/D converter was in the input of the DIMI-A. Even
though networked music making never happened, the idea manifested in his
later designs.
    On the concrete level, the Sähkökvartetti fulfils the idea of a collective per-
formance instrument par excellence. The initial idea was to replace conven-
tional rock group instruments with one collective instrument. Although the
instrument was designed for collective performance, the intermodulation
between the instruments is mainly filtering and ring modulation.425 The light
sensors in the melody machine and the light sword affect the dynamics and
frequency response of the sound produced by the other players. The output
of the instrument sums the signal together. Even though singing and differ-
ent sound gestures of the melody machines and the drums can be identified,
the output signal is glued together by the filtering and dynamic variation.
    Kurenniemi and Ruohomäki tested collective performance with the DIMI-
A in the studio environment in 1970, but failed to produce a consistent col-
lective playing experience and the instrument was never used in collective
live performance (see Figure 40). A situation in which each player holds their
own stylus and controls each side of the plates leads to randomized perfor-
mance. The fact that touching a plate on the left-hand side changes the pa-
rameter on which the selection of the right-hand side affects the performing
method leads to a somewhat chaotic outcome from the players’ point of view.
    Collectiveness is also apparent in the DIMI-O. However, the documentary
evidence typically hides the actions of the operator and the outcome is only
perceived and analyzed as interaction between the instrument and the visual
material presented to the camera – such as the dance movements of Riitta
Vainio in DIMI ballet426. Niemelä (2019, 109–110), for example, sees DIMI
ballet as a duet featuring Vainio and the DIMI-O, whereas the DIMI-O oper-
ator (presumably Kurenniemi) plays a significant part in the performance,
which in fact is a trio. Hiding the DIMI-O operator in the original document
is in line with Kurenniemi’s design goal. Even though his utopian vision was


   425 Personal communication with Jari Suominen in 2020 during his latest project aimed at restor-

   ing the instrument.
   426 See DIMI ballet in: https://youtu.be/d-yHULQ2V5c




                                                 224

[p. 225 / pdf 251]

not realized in the DIMI-O, he pursued his quest to develop an instrument
that could take part in the performance and genuinely react to the musical
gestures of the other participants.427
    Kurenniemi presented his DIMI music machine (presumably the DIMI-O)
at the Pori Jazz festival in the summer of 1971. According to Helsingin
Sanomat, his daily presentations tended to be collective improvisations. A
similar event is reported in documentary evidence from the following sum-
mer when Kurenniemi was presenting his DIMIs (the DIMI-O and the DIMI-
S) at the Vaasan Kesä festival from June 16 to 18, 1972. No audio or video
recordings have survived, but Kurenniemi describes the collective improvisa-
tion in issue 18/1972 of Tekniikan Maailma magazine.428 Later, he recalled
the event in the DIMI Family lecture at the UNESCO Computer Music semi-
nar held in Helsinki on August 21, 1978. 429 His interest in sex is equally pre-
sent in these descriptions as performing with the instruments. Kurenniemi
recalls how the participants in a collective improvisation, who were randomly
chosen from the audience and thus complete strangers to each other, sat
back-to-back in a circle on four chairs with the DIMI-S handcuffs around
their wrists, touching each other behind their backs. Accompanying the DI-
MI-S sounds was the DIMI-O, its camera focused on the collective of per-
formers.
    Collective performance was the key feature of the DIMI-S. Kurenniemi
even suggested that sexual union between the players was more important
than the sounds of the instrument.430 It was rarely used publicly – not at
least following the initial design idea– but only privately and for fun. In pub-
lic it was used mainly for demonstration purposes (see Figure 120) – along-
side casual Pripps brewery visitors, who were able to play with the instru-
ment in the brewery in which the other copy was installed.




   427 See Kurenniemi’s verbal description in Sähköinen tapahtuma Vanhalla presented in the previ-

   ous footnote 422.
   428 See Alanko (1972).

   429 See the DIMI Family lecture audio recording in the UHMRL archive.

   430 See Pitkänen (1972, 7).




                                                225

[p. 226 / pdf 252]

User Stories of Kurenniemi’s Electronic Musical Instruments




Figure 120. The DIMI-S (Sexophone) presented by Ralph Lundsten in a Swedish Television
documentary (photo: unknown / Ralph Lundsten archive 431)




   431 Photo available via Andromeda website: https://www.andromeda.se/wp-

   content/uploads/2012/10/dimi-s.jpg




                                              226

[p. 227 / pdf 253]

8 DISCUSSION

In this chapter, I review the analytical part of the study (Chapters 5, 6 and 7)
with reference to the key background concepts (Chapters 2 and 3), and con-
textualize the situation in Finland with reference to the global development
of electroacoustic music (Chapter 4). As I note in the Introduction, I empha-
size the need for both description (basic research) and analysis (interpreta-
tion) of the research subject.


8.1 Kurenniemi as an instrument designer and an artist
The distinctive feature in Kurenniemi’s work is his double role in the field of
electronic music. On the one hand, he was an engineer and an instrument
designer, and on the other he was an artist in his own right. At the time,
these roles formed a unique combination on the Finnish scene, which was
characteristic of Kurenniemi but not of his (Finnish) contemporaries. 432 Otto
Donner and Erkki Salmenhaara emphasized their artistic roles whereas
Hannu Viitasalo and Jouko Kottila had expertise in the worlds of engineering
and business, respectively. M.A. Numminen, Ralph Lundsten, Leo Nilsson
and Osmo Lindeman had a background in electronics, and therefore an un-
derstanding of both engineering and art. However, Kurenniemi was the one
who could cross the boundary between the two worlds. Resembling Robert
Moog, he was a boundary shifter.
    According to Pinch and Trocco, Moog had an “ability to move between the
worlds of engineering and music and bring about a transformation” (Pinch &
Trocco 2002a, 313–14; Pinch 2009, 190). Kurenniemi failed to move into the
fields of politics and economics, and in this sense he was not a heterogeneous
engineer: this is something that, according to John Law, is required of a suc-
cessful entrepreneur (see Law 2012).
    Experimental practices melded art and technology in Kurenniemi’s work
and produced a new form of inter- and multimedia aesthetics that was “total-
ly future-oriented” (Ballantine 1977, 241). Not only did he transverse the
worlds of art and technology, he moved agilely between his own time and his
utopian dreams of the future. This emerges as a contrast between his futuris-
tic envisioning presented in contemporary magazine articles, and his descrip-
tions of viable technical solutions in official documents such as business pro-


   432 Viitasalo (2015) in an interview with Ojanen & Suominen.




                                                 227

[p. 228 / pdf 254]

Discussion



posals for DEF’s customers. Kurenniemi was both a user and a designer of
technology. As a user he employed existing electronic components and text-
book examples, whereas as a designer he developed and experimented with
new technological artifacts. In the latter respect, his consumption of technol-
ogy exemplifies the DIY and modification culture. He modified existing tech-
nology to match his visions, which he eventually could not realize.
    The underpinnings of Kurenniemi’s work lie in his two roles as engineer
and artist, even though on a personal level these roles were intertwined. 433 As
revealed in his diaries, his train of thought switched seamlessly from one top-
ic to another. The resemblance to Thomas Edison’s notebooks as Hughes
(1986, 285) describes them is evident. The only difference is that whereas
Edison’s thoughts were entwined with economics, technology, and science,
Kurenniemi’s visions encompassed future technologies such as computers,
artificial intelligence, electronic devices and their music technological appli-
cations. He mixed this with girlfriends, sex, pornography, and narcotics –
even on the most concrete material level of taping pubic hair on his diary
pages beside the technical drawings (see Paasonen 2013, 55), and seamlessly
overlaying the technological artifact on a woman’s body on the enigmatic
poster and the record sleeve used for marketing the DIMI-A (see Figures
121).
    As described, from the engineering perspective Kurenniemi’s designs
were based on programmability and algorithmic composition, in other words
the computer metaphor. He envisioned a musical instrument as an automat-
ed music-making machine that would replace the burdensome tape-editing
process, which Donald Buchla called tape buffering. 434 A similar trend, which
eventually led to the development of musical sequencers, emerged globally at
the same time, implemented in Donald Buchla’s synthesizers, for example,
and a few years later by Robert Moog in his synthesizers. On the practical
level, a version of this vision emerged in one form or another in all Kuren-
niemi’s instruments. The computer metaphor – inspired by his early pro-
gramming experiences with the analogue computer at the Department of Nu-
clear Physics – was emphasized even further when he chose to employ digital
logic rather than voltage-controlled technology in sound synthesis, and in the
sequencer and memory applications of his instruments.




   433 See Pitkänen (1972, 7).

   434 Buchla Associates (1966, [3]).




                                        228

[p. 229 / pdf 255]

Figure 121. The Dimi is born poster with flying cows and the DIMI-A user interface laid on top of
a woman’s body was also used as on the record cover: it was designed by Meri Vennamo, who
was Kurenniemi’s wife435 at the time. (photo: Meri Vennamo and Musica)




    435 See the announcement of Vennamo and Kurenniemi’s marriage in Helsingin Sanomat on May

    15, 1970 (HS 1970, 13): they were married the day before, on May 14, 1970.




                                                229

[p. 230 / pdf 256]

Discussion



Kurenniemi experimented with various instrument-control methods in his
user interface design, and only one of his instruments included a piano-style
keyboard. It is worth noting here that when he made his early designs the
synthesizer was not (generally) considered a keyboard instrument, and only
slowly came to be seen as such. In this respect, the 1960s was a time of inter-
pretative flexibility (Pinch & Trocco 2002b, 67–68). Moog integrated the first
piano-style keyboard into his modular system in 1965. Buchla, on the other
hand, never used a piano-style keyboard – a feature of his design that was
highly valued by electronic music composer and musician Suzanne Ciani, for
example: in her view the modular synthesizer was taken over by tonal music
when a keyboard was added to the instrument.436 It is notable that even
though he did not include such keyboards in his instruments, Kurenniemi
was constrained by tonal music due to his engagement in note-based pro-
grammability.
    One version of Kurenniemi’s future vision emerges if his separate instru-
ment-design plans are seen as one continuous development project. Even
though his individual instruments remained prototypes, his studio-design
principle repeatedly reflected them. They could produce automated musical
sequences in real time. Contemporary newspaper and magazine articles fre-
quently referred to the first DIMI as a musical computer.437 However, in an
article published in Apu magazine in 1971, Kurenniemi cautions against
likening the DIMI-A to a computer because the instrument is not capable of
making decisions and associations.438 Later in 1971, in an article published in
the musicological journal Musiikki, he presented his most far-reaching vision
of his studio: “in the 1980s a composer will communicate with his studio un-
less the instruments are capable of reading his or her thoughts directly”. 439
Here, he was envisioning something that is understood nowadays as artificial
intelligence. It is therefore understandable that he was not satisfied with the
contemporary state of technology.
    It is noteworthy that Kurenniemi was envisioning completely novel in-
struments rather than concentrating on further developing or enhancing ex-
isting musical tools. This placed him in a situation in which there was no rep-
ertoire for his instruments in the traditional sense. Composers realized works
with the instruments rather than composing for the instruments – which
was typically the case with concertos written for piano, violin, flute, and so
on. There are a few exceptions, however. Osmo Lindeman concentrated sole-
ly on the DICO in his early electronic works. However, he soon rejected his
DICO-based works because he thought that he had accepted them too easily
when he composed them.440 Other exceptions include the Sähkökvartetti (the

   436 For the Ciani interview see Fantinatto (2017). See also Ciani (2016).

   437 HS (January 21, 1971, 5); HS (January 21, 1971, 13); Leino (1971, 35).

   438 Leino (1971, 35).

   439 Kurenniemi (1971a, 41); see also Kurenniemi (2015, 255–260).

   440 Lindeman (1975) in an interview with Sermilä.




                                                   230

[p. 231 / pdf 257]

instrument) and the Andromatic. However, after their initial appearances as
special-purpose instruments441 both were used as general-purpose sound
sources in the studio environment.
    Similar exceptions from the DIMI synthesizer series include the works for
the DIMI-A on the promotional sound recording Dimi is born (1970) and
Kurenniemi’s Deal (1971/72) for a DIMI-O-like instrument configuration.
Ruohomäki’s Mikä aika on could be considered a composition for the DIMI-
A. The Bach arrangements, on the other hand, were realized with the instru-
ment. Kurenniemi describes the technical setup required to implement the
work in the score of Deal, but he does not refer to the DIMI-O per se, rather
to any similar setup, despite the fact that the work was inspired by the newly
finished DIMI-O.
    On the artistic level, the ideas guiding Kurenniemi’s work reflect many
contemporary international trends. Even though he did not form any sys-
tematic tenet for his artistic activity, he repeatedly referred to a few ideas and
principles related to art and technology in various interviews and writings
throughout the 1960s and 1970s.
    In 1967, he envisioned the future digital composer as a trendsetter or in-
dustrial designer rather than a traditional composer laying out a prescribed
score for a musical work based on his or her initial ideas (mental schema).
According to Kurenniemi, the digital composer of the future would concen-
trate on algorithms and production technology rather than sonic out-
comes.442 In this sense he was anticipating not only the mass reproduction of
musical products such as sound recordings, but also the automated mass and
on-demand production of new music whenever needed. The process origi-
nates from the computer metaphor – a machine capable of executing tasks
according to a pre-programmed script.
    It was Kurenniemi’s view that music would eventually lose its identity,
and that the digital music of the future would at least be cheap, if nothing
else.443 I read this as referring to the disappearance of the composer as an
individual author, which could also even obviate copyrights and royalties (in
other words, music will be cheap). This utopian vision resonates perfectly
with contemporary performance and conceptual art ideology, which “insisted
- - - on an art that could not be bought and sold” (Goldberg 2001[1979], 7).
Kurenniemi was not intent on dismissing the composer altogether, however,
given his DIMI-T experiments and his aim to design mind-reading studio
equipment. He wished to expand the means of music production and bypass
the intermediate technology such that composers could directly communi-
cate their vision to an output device.

   441 The Sähkökvartetti (the instrument) for Sähkökvartetti (the band) with M.A. Numminen mainly

   playing a dedicated work Kaukana väijyy ystäviä, and the Andromatic as a case-specific sound in-
   stallation as a part of the Feel it exhibition.
   442 Kurenniemi (1967) in an interview with Oura.

   443 Kurenniemi (1967) in an interview with Oura.




                                                231

[p. 232 / pdf 258]

Discussion



    Composer Jukka Ruohomäki wrote down Kurenniemi’s rules at the turn
of the 1970s: 1) a work must be completed in a single day and 2) consecutive
sounds must be chosen so that they are totally inconsistent or surprising and
have no rational relationship with each other (see Ruohomäki 2020, EH22).
The first rule in particular reflects an essential aspect of Kurenniemi’s atti-
tude towards artistic work (Ruohomäki 2020, EH34/10–11). In addition to
his rules, there were recurring themes in his writing such as: only by abusing
technology can we control it, 444 and eventually electronic technology will
amalgamate all art forms – music will be experienced as pictures or even as
material artifacts such as sculptures.445

   444 See Taanila (2002).
   445 See Kurenniemi (1971b, 38): “Kertakäyttötaide. Teokset katoavat kosketeltavasta maailmasta

   koska ne ovat enimmän aikaa tarpeettomia. Kuvan ei tarvitse roikkua seinällä muulloin, kun joku
   katsoo sitä. Ei silloinkaan, jos seinä on maalattu ajattelevalla maalilla. Kun teos on lausuttu ohjel-
   mointikielellä, se voi realisoitua milloin ja missä tahansa, missä vain on tulostusväline. Tai muoto
   realisoidaan aivoelektrodien välityksellä suoraan tajuntaan. (Ensi keväänä pidetään jossakin kong-
   ressi jonka teemana on näön palauttaminen sokeille videokameran ja aivoelektrodien avulla.) Tai
   heittää laserilla aurinkoon, sehän voi olla elävä. Teos voidaan säilyttää reikäkorteilla, reikänauhal-
   la, magneettikortilla, ferriittirenkaissa, magneettinauhalla, MOS-transistoreissa, levymuistissa,
   hologrammissa, magneettikuplina tai paperille kirjoitettuna. Se voidaan tulostaa musiikkina digi-
   taalisyntensaattorilla, tekstinä rivikirjoittimella, grafiikkana plotterilla, filmille COM-(Computer-
   Output Microfilm)-laitteella, TV-ruudulle, kuvanauhalle, metalliin, puuhun tai muoviin tietoko-
   neen ohjaamalla työstökoneella, latoa tietokoneohjatulla latomakoneella ja se voidaan hävittää yh-
   dellä DELETE FILE käskyllä.” (Engl. “Disposable Art. The works disappear from the tangible
   world because they are unnecessary most of the time. The picture needs to be hanging on the wall
   only when someone is looking at it. Not even then, if the wall is painted with thinking paint. Once a
   work is produced with a programming language, it can be realized anytime and anywhere, where
   there is a printer. Or the form is realized through the brain electrodes directly into the conscious-
   ness. (Next spring there will be a congress about restoring vision to the blind with a video camera
   and brain electrodes.) Or thrown with a laser into the sun, it can be alive. The work can be stored
   on punch cards, punch tape, magnetic card, ferrite rings, magnetic tape, MOS transistors, disk
   memory, holograms, magnetic bubbles, or written on paper. It can be printed as music for a digital
   synthesizer, text on a line printer, a graphic plotter, film on a COM (Computer-Output Microfilm),
   on TV screen, videotape, metal, wood or plastic on a computer-controlled machine tool, typed on a
   computer-controlled typewriter and destroyed with a single DELETE FILE command.”).
   See also Hämäläinen (1972, 36) and Kurenniemi (1969 in the documentary film Ihmisen uudet
   mahdollisuudet (Engl. The new possibilities of man). Document in Yle’s archive; Media ID: ME-
   DIA_2014_00772238; Program ID: PROG_2009_00121250; First aired on March 27, 1969. Di-
   rector: Aki Oura.):”Siinä tapauksessa, että rajoitutaan tietokoneen hyvin yksinkertaiseen, alkeelli-
   seen käyttöön toisin sanoen ei kiinnitetä huomiota sen potentiaalisiin mahdollisuuksiin todella
   luoda jotain uutta --- korvata säveltäjä --- jos sen sijaan tarkastellaan vain sen käyttöä musiikilli-
   sen informaation tallettajana ja käsittelijänä, jo sellasena nähdäkseni se voi aikaan saada musiikin
   kentässä aivan ratkaisevia muutoksia. Lähinnä ehkä vertaisin sitä tässä asemassa nuottikirjoituk-
   seen, jonka syntyminen aikanaan saattoi säveltäjän aivan uuteen asemaan. Hän saattoi näköaisti-
   aan käyttäen hahmottaa sellasia asioita, jotka aikaisemmin olivat vain korvan hahmotettavissa. Jos
   tietokoneen sisäinen kieli, koodi ymmärretään eräänlaiseksi uudeksi nuottikirjoitukseksi, se tarjo-
   aa musiikkiväelle suunnattomasti vielä uusia tapoja hahmottaa musiikkia siitä syystä, että konee-
   seen talletettu musiikkikokonaisuus ei ole rajoitettu minkään aistin alueelle. Paitsi ääninä se voi-
   daan toistaa koneesta kuvina, liikkeinä, muotoina, väreinä vaikkapa haju---.” (Engl. If limited to
   very simple, rudimentary use of the computer, in other words, no attention is paid to its potential
   to create something new --- to replace the composer --- if, instead, one looks only at its use as a re-
   pository and processor of musical information, even as such I see it can bring about quite decisive




                                                   232

[p. 233 / pdf 259]

    Kurenniemi’s relationship with the sound quality and sonic output of his
instruments was controversial and reveals interesting details about his idea
of abusing technology. As he recalled in 1993, his first standalone tape music
work On-Off was a rebellion against the clean, clear and ethereal sound ideal
of the Cologne studio and Stockhausen’s compositions. He thought that this
rebellion might have arisen due to frustration about the poor quality of the
equipment at the University Studio at the time.446 Earlier, in November 1970,
he described the fast development of the integrated circuits used in the DI-
MI-A memory application, noting only six months after the completion of the
instrument that the technology was already many times faster, smaller and
cheaper.447 He further commented in 1978 that the 8-bit Intel microchip was
not fast enough to process musical data. 448 (see also Ruohomäki 2020,
EH22/5)
    It is clear from these statements that Kurenniemi considered issues relat-
ed to sound quality at least to some extent, and that against his tenet accord-
ing to which man can rule technology only by misusing it, he pursued the
sound ideal after all. In this respect, interestingly, he failed in the end to mis-
use his own technology for artistic purposes: for example, the initial comput-
er-metaphor-driven design principle directed his use of the DIMI-A. In fo-
cusing on HiFi sound production and processing equipment, Kurenniemi
broke away from Cascone’s (2000) failure aesthetics


8.2 An assessment of Kurenniemi’s design and
    marketing processes
A comparison of Kurenniemi’s initial design ideas with the finished instru-
ments reveals the need for sensitivity in their analysis to whether the focus is
on the initial design idea or the finished product. These analytical levels are
not necessarily contradictory: they address different aspects of the same arte-
fact and will lead to significantly different interpretations of the same sub-
ject. (See also Chapter 8.5 for more detailed discussion of different targets of
analysis.)
    This is exemplified in the assessment of the DIMI-T (1973), the electroen-
cephalophone, an instrument designed to read its player’s thoughts. The


   changes in the field of music. I would compare it in this position to musical notation, the emer-
   gence of which in time brought composers to a whole new position. Using their sense of sight, they
   could perceive things that were previously only perceptible to the ear. If the internal language of a
   computer, the code, is understood as a kind of new musical notation, it offers musicians totally
   new ways of perceiving music because the music stored in the machine is not limited to any senso-
   ry area. In addition to sounds, it can be reproduced from the machine in images, movements,
   shapes, colors, even as smells ---.”)
   446 Kurenniemi (1993a) in an interview with Ruohomäki.

   447 Kurenniemi (1970) in Sähköinen tapahtuma Vanhalla.

   448 Dimi Family lecture on August 21, 1978.




                                                   233

[p. 234 / pdf 260]

Discussion



above-mentioned notion of a mind-reading studio could be considered one of
the starting points for building the instrument. On the component level,
however, it is clear that the finished instrument hardly ever used brainwave
data as a control signal for an oscillator because the signal detected on the
player’s head was probably lost in the noise generated by the signal path due
to the excessive amplification required to lift the weak EEG to a measurable
level.449 Furthermore, Kurenniemi implicitly rendered human cognition to a
pale EEG in his design, which is a somewhat oversimplified presentation of
complex cognitive processes.
    Another typical interpretation of Kurenniemi’s designs relates to the DI-
MI-A (1970) and its associative memory scheme. Associative in this context
refers to the working logic of the instrument’s memory and is thus a purely
mechanical and technical term. The instrument could not form a semantic
structure and retrieve information from its memory by semantic content – as
an association with the human cognition metaphor might suggest (see Tiekso
2016, 406). In his utopian vision, however, Kurenniemi aimed at an instru-
ment capable of decision-making.450
    I have detected the following non-exclusive categories that direct descrip-
tions and assessments of an instrument-design process in different directions
during the course of this study on Kurenniemi. It depends on: 1) whether the
instrument building is considered a DIY pursuit or a project aimed at making
a commercial product; 2) whether the goal is to design a case-specific or a
general-purpose instrument; 3) and whether the instrument is meant to be
used in live performance or in the studio as a sound generator. Examining
Kurenniemi’s instruments from these starting points directs the interpreta-
tion of their character and the circumstances around them.
    The most revealing example of how the point of departure for such an in-
terpretation works is the assessment of Kurenniemi’s failure or success,
which is frequently discussed. According to the symmetry principle as de-
fined in STS approaches, the success and failure of an artefact should be ex-
plained within the same conceptual framework: in other words, the working
or non-working of an instrument is not an explanation of its success or fail-
ure, but it is something that needs to be explained (Bijker 1995, 14–15).
    How Kurenniemi’s failure or success is assessed depends on the above-
mentioned points of departure. If one thinks of his designs as artefacts based
on DIY practice intended to produce a case-specific electronic musical in-
strument to be included in a sound installation, for example, many of his
works could hardly be described as failures. The most notable example is the
Andromatic sequencer-synthesizer, which was used as part of the Andro-
matic acrylic sculpture created by Olle Adrin, Ralph Lundsten and Leo Nils-
son, and featured in several exhibitions in Stockholm, New York and Öster-
sund during 1968 and 1969. Moreover, for Lundsten the instrument was an

   449 Lehtinen, Suominen & Ojanen (2013).

   450 Kurenniemi (1973) description of digital insturments; unpublished archive document in EKA.




                                                234

[p. 235 / pdf 261]

irreplaceable sound source in his Andromeda studio, where he used it for
almost 50 years: in 2012 he declared it was “the best synthesizer in the
world”451.
    On the other hand, if one evaluates the designs as potential commercial
products, as mass-produced general-purpose musical instruments or music
computers to be used in studios around the world as sound generators and
signal processors, one would probably conclude that Kurenniemi failed to
achieve his target. In the case of DEF, which succeeded together with many
other non-musical-instrument-related products, this is only one side of the
story. Kurenniemi’s instrument designs remained in a prototype state and
the mass production never started. As Hannu Viitasalo, one of the main de-
signers at DEF, recalls, they never ‘labbed’ the musical instruments proper-
ly452 – referring to the testing-and-development period of the product-
manufacturing life cycle in laboratory conditions before its release to cus-
tomer markets. Although the linear model of innovation is criticized by pro-
ponents of socially oriented approaches, the importance of routine and a sys-
tematized prototype phase cannot be denied. However, I do not suggest
adopting a linear model of Kurenniemi’s design process. I simply wish to
point out how many different options were available at the time, and how the
DIMI instruments evolved in a certain direction, strongly driven by trial-and-
error practice, by the computer metaphor, by Kurenniemi’s experiments
seeking new methods of controlling how instruments performed and by (a
lack of) user experience.
    Kurenniemi’s first instrument-design project, the Integrated Synthesizer,
was more of a testbed than even a prototype – not to mention a finished mu-
sic technological product. Trial-and-error is a typical working method in
DIY-based projects. Kurenniemi exemplifies a technical culture or hobby (see
Haring 2007), which was common practice among tinkerers before and after
him. Evaluation of instruments in terms of sales (see Théberge 1997) and
successfulness in designed-to-be-marketed and sold-as-products contrasts
with DIY practice and case-specific sound installation. This is not a trivial
dichotomy in Kurenniemi’s case because he also aimed at a commercial
product. Tinkering was not only a DIY hobby for him. He was a figure caught
between cultures recognized today as DIY versus sound art and instrument
design for commercial markets. He was experimental not only in his artistic
output, in other words his art works, but also in his practices and workflow
development: DIY practices nowadays could be considered close to main-
stream. DIY tinkerers sell their designs and modifications of established
products (e.g. the DevilFish mod for TB-303, which is now adopted by the

   451 Lundsten (2012) in an interview with Ojanen & Ruohomäki.

   452 Viitasalo (2015) in an interview with Ojanen & Suominen. Nikkilä (2017; in an interview with

   Ojanen) also recalls that from DEF’s point of view Kurenniemi’s musical-instrument projects were
   only a sidetrack and did not feature in the company’s operations, which focused mainly on larger
   industrial-technology projects.




                                                  235

[p. 236 / pdf 262]

Discussion



largest retailer of musical instruments, Thomann, which integrated the mod
into its reissue of TB-303: this is an excellent example of a full circle of using
user experiences to enhance the instrument-design process).
    One detail that reveals the prototype state of Kurenniemi’s instruments
and explains the failed marketing concerns the names he gave them, which
changed frequently. They even had generic names during the DEF period:
DIMI derived from the concrete description of the physical artifact, DIgital
Musical Instrument. This contrasts with the naming practices of Kuren-
niemi’s contemporaries for products such as the ARP (as in Alan R. Pearl-
man), Moog, Buchla Music Easel and Oberheim, which derived from their
designers’ names. The first DEF logo appears in the research material no ear-
lier than June 1974: promotion and branding were clearly in their infancy in
the company.
    Kurenniemi’s instruments did not cause a technological revolution (see
Lassfolk et al. 2015, 247), for one reason because of the lack of user testing.
Not only was there no customer base for his designs, Kurenniemi’s electronic
musical instruments as products were beyond mass distribution. The situa-
tion that he and DEF were facing was not exceptional. Even the analog syn-
thesizer did not have a customer base in the late-1960s, for example, and
Moog’s salespeople had to build the market from scratch (Pinch & Trocco
2002a; Pinch 2009). It was also easier to associate Moog’s designs with mu-
sical instruments. In the case of DIMI, domestication was not an option.
    In addition to the failed marketing to larger audiences, there were prob-
lems with the distribution of Kurenniemi’s instruments even among profes-
sional users: with the exception of Lundsten, most of them eventually reject-
ed the designs. Even though the instruments designed in DEF were directed
toward large-scale industrial customers and were beyond the reach of con-
sumer markets, Kurenniemi anticipated their mass production. He frequent-
ly described how their manufacturing could be scaled to the consumer price
range. In 1972 he calculated that a one-off version of the DIMI-O would cost
approximately FIM 30,000453, although mass production would significantly
lower the retail price.454 When he presented the DIMI-S he admitted that in
its technical implementation for general purposes it may have been too ver-
satile and high-end, and the prototype’s retail price would rise to a few thou-
sand Finnish marks, but in future it could be realized with a simpler setup
and the price reduced to a few hundred marks,455 for example.456




   453 In 2019 approx. 40,000 Euros.

   454 See Hämäläinen (1972, 36).

   455 E.g. FIM 500 FIM in 1972 was equivalent to approx. 650 Euros in 2019.

   456 See Alanko (1972, 45).




                                                236

[p. 237 / pdf 263]

8.3 Kurenniemi’s working environment
A comparison of Kurenniemi’s working environment with those of his con-
temporaries may explain why even the feasible elements of his utopian de-
signs did not materialize. Most similar contemporary projects were conduct-
ed in collaboration with a fiscally responsible organization that “fitted the
bill” (Bernstein 2008, 115). Elektronmusikstudion (Engl. the electronic music
studio; founded in 1964) in Stockholm was developed within Swedish Radio.
The main European studios in Paris, Cologne and Milan were founded in
connection with the national radio corporations or official institutes. The
Electronic Music Center in New York was established in cooperation with the
Universities of Columbia and Princeton. The San Francisco Tape Music Cen-
ter (founded in 1962) was hooked up with Mills College to receive funding
from the Rockefeller Foundation. Peter Zinovieff’s instrument-design pro-
jects in the UK, which he started in 1962 and developed into Electronic Music
Studio (EMS, London), was a rare exception having been developed with pri-
vate assets.
    Composers Morton Subotnick and Ramon Sender in San Francisco were
envisioning a new electronic instrument with Donald Buchla, an engineer.
Inspired by the example of Columbia-Princeton Electronic Music Center,
which it funded, Subotnick contacted the Rockefeller Foundation to request
funding for their plans. The initial answer was that it was cheaper to fly peo-
ple to New York to compose than to build a second music center in the Unit-
ed States. The foundation did not even grant the $500 that Buchla claimed
from Subotnick and Sender for the first prototype. Eventually, after seeing
the first Buchla system, the Rockefeller Foundation’s advocate was convinced
and in 1965 the foundation funded Subotnick’s and Sender’s plans to the
tune of $30,000 (or $200,000 depending on the source). (Bernstein 2008,
passim.)
    The first drafts of Elektronmusikstudion in Sweden were laid out in de-
tailed minutes in 1957, and official institutions such as Fylkingen were pre-
sent during the planning process. There was an organizational framework –
not only for providing resources but also for hosting the planning. However,
it was only after Karl-Birger Blomdahl had started work as Head of the Music
Department that Swedish Radio invested in the studio. Elektronmusikstudi-
on “was assessed at a value of SEK 2.8 million” in 1970, considerably higher
than the 1962 assessment in which it was valued at SEK 450,000 (Groth
2014, 95; see also Broman 2007, 66).457
    Kurenniemi’s plans for the University Studio in Helsinki were included in
the annual funding applications of the Department of Musicology, signed by
Professor Tawaststjerna. Each year he requested funding for the electronic
components and equipment, but never for a salaried position: in other words,

   457 SEK 450,000 in 1962 was equivalent to approx. 600,000 Euros in 2019, whereas SEK 2.8 mil-

   lion in 1970 was equivalent to approx. 3.4 million Euros in 2019.




                                                  237

[p. 238 / pdf 264]

Discussion



the university invested only in materials and not in Kurenniemi’s work. As a
consequence, there was lack of resources to back up the development of the
studio: no official organizational planning committee was ever founded, for
example. Kurenniemi worked as an unpaid – so-called voluntary – assistant.
He developed and maintained the University Studio under the Department.
Thereby, he was working within an organization but not within an organiza-
tional frame – something that facilitated the development of Columbia-
Princeton Electronic Music Center, San Francisco Tape Music Center, and
Elektronmusikstudion.
    The requested funding seems inadequate given the content and target of
the plans. Thus, even Kurenniemi’s material resources were modest through-
out the 1960s. On the other hand, working “outside” the formal organization-
al structure he was free to follow his own ideas. As early as in 1964 he ex-
pressed gratitude for the freedom Tawaststjerna gave him.458 Freedom also
mattered on the artistic side, which emerged when Donner compared the
working environments in the University Studio and Yle.459
    It remains unclear from the known documentary evidence why Kuren-
niemi was not paid for his work. Presumably, his background as a technical
hobbyist and his salaried position at the Department of Physics supported a
structure in which covering the cost of human resources was not considered
necessary to maintain a viable working environment. In 2004, Kurenniemi
recalled being very strict about not taking advantage of university money,
and he did not use university resources to build his own projects.460
    Eventually, in a funding arrangement similar to that of the San Francisco
Tape Music Center, in 1970 Kurenniemi received a loan from SITRA based
on a DIMI-A prototype. He needed a fiscally viable organization to get the
SITRA funding, and Digelius Electronics Finland provided a structure that
was similar to the one Mills College provided for Buchla, Sender, and Su-
botnick. It is noteworthy that not even an improved financial situation facili-
tated viable instrument design.


8.4 A social construction of Kurenniemi’s designs
For Kurenniemi, the computer metaphor was just as strong as – or even
stronger than –the association of his work with a musical instrument. Pertti
Lehto, owner of the record label that released the promotional sound record-
ing Dimi is born of the sequencer-synthesiser DIMI-A (1970), recalls the in-
terest of composer Ilkka Kuusisto in whether the DIMI-A was able to print
out musical scores.461 This exemplifies the diverse meanings of technology to

   458 Hbl (1964).

   459 Donner (2013) in an interview with Home & Ojanen.

   460 Kurenniemi (2004) in an interview with Ojanen & Suominen.

   461 Lehto (2015) in an interview with Ojanen & Suominen.




                                                238

[p. 239 / pdf 265]

various relevant social groups. As far as Kurenniemi was concerned, relevant
social groups consisted of a few individuals with their own anticipations, ex-
pectations, hopes and fears of his designs. Below, I discuss a few examples.
    Even though Kurenniemi designed and built the studio and the first in-
struments alone, in his discoveries and designs he was influenced by the so-
cial community to which he belonged. The social context was lively from the
early 1960s as Finnish and Swedish composers visited and used the Universi-
ty Studio. As noted in previous chapters, Henrik Otto Donner, Erkki Salmen-
haara, Mauri Antero Numminen and Kaj Chydenius, as well as Jan Bark,
Folke Rabe, Ralph Lundsten, Leo Nilson and Osmo Lindeman, were in active
contact with Kurenniemi during the 1960s. His collaboration with other art-
ists at several events, happenings and seminars in the early years of the dec-
ade also played a significant role. It is known that composers such as György
Ligeti, Luigi Nono, Karlheinz Stockhausen, Terry Riley and Ken Dewey visit-
ed Finland at that time, the two latter on Donner’s initiative.
    In the 1970s, during the Digelius years, Kurenniemi collaborated closely
with Jouko Kottila and Hannu Viitasalo, for example, and with several Dige-
lius employees and contemporary composers and artists. He was in contact
with fellow visionaries such as Knut Wiggen (Head of Elektronmusikstudion
EMS in Stockholm in 1964–1975), Manford L. Eaton (at a conference in Flor-
ence in 1968 and in later correspondence), Peter Zinovieff and Tristram Cary,
and Arild Boman, who used Kurenniemi’s instruments at the University of
Oslo and met him several times in the 1970s. If there had been no commis-
sioned instrument projects – starting with the University Studio, would Ku-
renniemi have designed his instruments, or would he have ended up as a de-
signer of musical instruments?
    For one thing, the foundation of the University Studio was in the hands of
a few people. Tawaststjerna, at least, together with Salmenhaara, Oramo, and
Heikinheimo played a significant role when Kurenniemi ended up designing
it. Whether the true mastermind behind the idea was Tawaststjerna or the
young students of musicology – Salmenhaara, Oramo, and Heikinheimo –
cannot be verified from the surviving documentary evidence. Nevertheless,
Salmenhaara’s and Oramo’s link to Kurenniemi was a crucial factor when
Tawaststjerna was considering who would be suitable for executing its design
and construction.
    Tawaststjerna had high hopes of the University Studio, even though in the
end he did not care for it. 462 The development of computer-aided analysis
frequently emerged in the funding applications, the text evidently written by
Kurenniemi even though the applications were posted to the university ad-
ministration in Tawaststjerna’s name. Some of the research-oriented com-
puter applications may well have been written to secure official academic
justification from the university administration. According to Donner, Ta-


   462 Kurenniemi (1993a) in an interview with Ruohomäki.




                                               239

[p. 240 / pdf 266]

Discussion



waststjerna had the ability so see the potential in people and to give them the
freedom to realize it.463 Even though Kurenniemi did not receive a salary for
the work, he had Tawaststjerna’s full support and was free to design the stu-
dio according to his own plans.464 He built the studio and his instruments in
a positive and open environment set up by Tawaststjerna.
    Numminen, on the other hand, wanted an instrument for live perfor-
mance with the ability to stretch cultural boundaries with unconventional
musical expressions. He aimed at avant-garde and underground performanc-
es that contrasted with traditional conventions, first with Laulukone and lat-
er with Sähkökvartetti. Numminen deliberately performed classical music on
the former (in the academic singing contest), following a long-established
tradition. In this case he partially succeeded in expanding the boundaries as
the organizers of the singing contest formed a separate category for his per-
formance – in which he received the second prize even though he was the
only competitor. The first prize went to Italian composer Luciano Berio by
whom, according to the judges, Numminen had been too directly influ-
enced.465 Berio did not take part in the contest. (on avant-garde and under-
ground features in the Finnish context, see also Ruohomäki 2020, EH37/4–
5)
    Within the underground movement, Numminen and Sähkökvartetti (the
band) attacked the stagnant structures of society. The band successfully real-
ized this aim at its premiere in Sofia when the leaders of the Communist Par-
ty walked out of the performance. 466 On later occasions Sähkökvartetti failed
to cause similar ripples when their performances were received with enthusi-
asm rather than being frowned upon. This is illustrated clearly in a few ex-
amples. Sähkökvartetti gave a 90-minute uninterrupted performance in the
Amos Anderson Art Museum, which Numminen considered its best and
Oramo praised in a review in Helsingin Sanomat, stating that it “multiplied
his belief in underground music.”467 The audience at the concert recording in
the University of Helsinki’s main auditorium on November 25, 1968, was
audibly amused when Numminen introduced Kaukana väijyy ystäviä.
Moreover, Sähkökvartetti performed on national TV on September 2, 1969,
in a documentary about the youth generation and their role in society. None
of these examples provoked public disapproval: they rather evoked a curious
interest in electronic sounds and performance art. Other events of the under-
ground movement did manage to raise objections, however. The shocking
content was not related to the electronic sounds per se, neither did electronic
music play a key role in the provocation.

   463 Donner (2013) in an interview with Home & Ojanen.

   464 Kurenniemi (2004) in an interview with Ojanen & Suominen; Donner (2013) in an interview

   with Home & Ojanen.
   465 Numminen (2018) in an interview with Ojanen; Nummi (1964, 6/Uusi Suomi April 6, 1964);

   Uusi Suomi (1964, 20/Uusi Suomi April 5, 1964).
   466 See ESS (August 11, 1968, 7); Stump (1968b, 19).

   467 Oramo (1968, 19).




                                               240

[p. 241 / pdf 267]

    Donner, who was Kurenniemi’s close collaborator at the time, traveled
throughout Europe several times during the first years of the 1960s. Within a
brief period, he visited and worked at the electronic music studio in Bilt-
hoven, Siemens’s computer-based studio, and at the Theater of Nations in
Paris with Terry Riley, who was very interested in tape loop techniques.
Donner also frequently worked in the Yle studio for the radio theater, the
Elektrovox studio, and in the studios of Eino Ruutsalo and Kaarlo Kaartinen.
Donner’s diverse experiences of studio technology were at Kurenniemi’s dis-
posal, even though he never visited the Central European studios. The inter-
action between Kurenniemi and Donner was intensive during the early years,
and they even formed a team, according to Salmenhaara. 468 Kurenniemi ex-
perimented with the instruments, and Donner commented on the sonic out-
put.469
    Donner had a utilitarian approach to electronic instruments. He was less
interested in how the technology worked than in what the composer or artist
could achieve with it. He expected high technical quality from any equipment
he used. Not unlike French composer Edgar Varèse a few decades earlier,
Donner rejected electronic means altogether during the 1960s, partially due
to the mediocre quality of the technology. The peak of his rejection was dur-
ing a concert in Kulttuuritalo in which he wanted to turn off everything that
produced an electric hum: the unexpected fully acoustic concert with a jazz
group turned out to be a success, according to Donner. 470
    Despite his refusal to use electronic means, Donner did not abandon his
technological optimism and expectations. As chief of Yle’s music department,
he played a key role in the foundation of the experimental studio, in which he
also arranged the order of Kurenniemi’s last musical design in the 1970s –
the DIMI 6000. Donner’s critical attitude on the one hand, and his expecta-
tions of technological developments on the other, clearly appear repeatedly
in the documentary evidence. He criticized the state of technology in the ear-
ly 1970s, but he embraced Kurenniemi’s future visions and saw the future
potential of technological development. He was looking forward to the future
world that Kurenniemi envisioned. This is closely documented in a discus-
sion between the two during the introduction to the DIMI-A improvisation
session in Sähköinen tapahtuma Vanhalla on November 17, 1970. The ideas
reappeared later in a radio program471 Donner hastily produced with Ruo-
homäki in 1974, in which he assessed the current state of technology and de-
scribed his expectations for the future.
    The relevant social groups, in Kurenniemi’s case individuals, could be
considered the stakeholders of his designs and located in the communication

   468 Salmenhaara (1964, 55).

   469 Donner (2013) in an interview with Home & Ojanen.

   470 Donner (2013) in an interview with Home & Ojanen.

   471 Donner (1974): The radio program Varoke (Title: Varoke. Käyttökulttuuriohjelmaa. Elektroni-

   nen musiikki; Yle archive ID: 000109628).




                                                241

[p. 242 / pdf 268]

Discussion



model (see Figures 122 and 123; see also Chapter 2). In a hypothetical situa-
tion the different stakeholders involved in an instrument-design process
would communicate directly with each other and via the technological arti-
fact. In other words, all actants or stakeholders have their roles in a network.
Given that the process of instrument design effectively develops in interac-
tion, it is relevant to ask how this interaction was realized in Kurenniemi’s
case. With a few exceptions, the users worked within the technological
boundaries set by the instruments on the level of both their internal configu-
ration and their interfaces. Locating the other stakeholders in the communi-
cation model shows how the communication links between them were bro-
ken or non-existent in the real situation.




Figures 122 and 123. A hypothetical network of crucial stakeholders, in other words relevant
social groups involved in the design (upper image): the links between the different stakeholders
are either broken or non-existent (lower image). Here, I employ the concepts and model from the
SCOT and ANT frameworks and the modern DMI analysis (see O’Modhrain, 2011). See Appen-
dix 1 for descriptions of each of Kurenniemi’s instruments. (images: Ojanen 2019)




                                                242

[p. 243 / pdf 269]

8.5 Kurenniemi’s projected users and the engagement
    of real users with his designs
According to Kurenniemi’s utopian vision, his projected user was a composer
of digital music working in a computerized music-production environment
with artificial intelligence as a compositional tool. This envisioning is a
tempting point of analytical departure. However, these utopian ideas did not
materialize, and any analysis must be based on concrete, realized examples.
The difference between Kurenniemi’s projected user and the realized use sit-
uations forces the researcher to determine whether the analysis focuses on 1)
Kurenniemi’s initial idea for an instrument, 2) the materialized physical con-
figuration of the instrument at the time when it was completed, 3) its config-
uration after 50 years of deterioration, or 4) the version of an instrument in
the hands of its user.
    It is worth pointing out that one is restricted to analyzing Kurenniemi’s
instruments in their prototype state when assessing their realized configura-
tions, a state in which they remained due to a lack of user experience. User
experiences that did not circulate back into Kurenniemi’s design process –
excluding those with the cumbersome DIMI-A user interface that led him to
improve the interface in the DIMI-O472 – would have influenced his designs.
In this respect, even his feasible ideas materialized only in part as users only
rarely explored the potential of the instruments.
    Only a few examples in the research material imply that users tried to
stretch the constraints of Kurenniemi’s instruments or used them in a crea-
tive outside-the-box setting: there were few modifications to them. The in-
ternal configurations of the Sähkökvartetti, the DICO and the DIMI-O
changed in the early phases of their life cycles, although the changes were
only minor updates to fix functional deficiencies rather than major modifica-
tions. Moreover, they were fixed by Kurenniemi and not the user. In this re-
spect, Ralph Lundsten was one of the rare exceptions when he equipped the
DIMI-O with a MIDI retrofit interface introduced in the 1980s.
    Kurenniemi initially designed customized instruments based on the ex-
pectations of those who requested them. He was thus in direct contact with
the real user and the projection of the feasible part of his initial ideas was
straightforward. If the instrument had gone into mass production, the pro-
jection might have been more complex and indirect. From the period follow-
ing that of customized design, the DIMI-A exemplifies how the script in the
artifact guided users to follow its initial design principle even in more indi-
rect situations. Kurenniemi’s projected user programmed the instrument
step by step within the constraints of the physical artifact to produce musical
sequences, and this is what real users of the DIMI-A did. Interestingly, Ruo-
homäki and Sakari Lehtinen from the group Cumulus used it as a metro-

   472 See Kurenniemi’s unpublished presentation on his digital musical instrument in 1973

   FNG/EKA.




                                                 243

[p. 244 / pdf 270]

Discussion



nome, and the structure of the DIMI-A sequencer enabled Ruohomäki to
control the musical events with precision when working with film music.
    Ruohomäki and Vesterinen further exemplify a use case in which Kuren-
niemi’s design gave added value to their composition process when they real-
ized sound material for the radio play Sähkölintupuutarha (1971). To pro-
duce sounds that were reminiscent of the chirping of chicks they aimed the
DIMI-O camera at the clouds. Thus, the subtle changes of lighting produced
a stochastic trigger signal for the instrument. Another way of producing sto-
chastic material would have been to use a computer that was not available in
Helsinki at the time.
    The different backgrounds of the composers and artists affected how they
used and engaged with Kurenniemi’s designs. Only rarely did any of them
concentrate solely on one specific instrument, or consider Kurenniemi’s in-
struments a point of departure for their artistic work – with the exceptions of
M. A. Numminen with the Sähkökvartetti, Osmo Lindeman with the DICO
for a brief period, and Ruohomäki in Mikä aika on (1970). The novelty of the
instrument initially occupied almost all the attention of the users, but they
gradually overcame their astonishment and employed Kurenniemi’s instru-
ments as sound sources or as part of a larger instrument setup or studio con-
struction. This tendency is evident in the works of Ralph Lundsten, Leo Nils-
son, Ruohomäki, and Lindeman.
    Users accepted Kurenniemi’s designs as they were – at first: then, when
the instruments could no longer provide new interesting sonic aspects or
points of departure for compositional decisions, they rejected them rather
than attempting to modify or enhance them. An interesting question is why
Kurenniemi’s instruments eventually faded away while other instruments in
the University Studio remained in use. According to Ruohomäki, the DIMI-A
broke – or at least started to behave surprisingly. 473 Being considered proto-
types and already outdated at the time of the first demonstration may have
led to the conclusion that if they broke, they were not worth repairing. This
supports the interpretation that Kurenniemi was looking towards the future,
and resonates with Ballantine’s (1977, 241) observation that experimental
music is totally future oriented.
    With hindsight, Kurenniemi’s DIMIs offered interpretative flexibility and
outside-the-box experimentation potential for music-making practices. Ex-
pectations were high, but experimentation among users was practically non-
existent, whereas composer- and work-centeredness were emphasized in the
use of the instruments. Even though misuse and abuse of technology were
among the key principles in Kurenniemi’s own art-making and philosophy,
users – interestingly including Kurenniemi – could not go beyond the con-
straints of the instruments. Kurenniemi’s script, the intrinsic functionalities



   473 Ruohomäki (2019) in personal communication with Ojanen.




                                              244

[p. 245 / pdf 271]

of his design, directed their use and users were unable to explore their im-
plicit features.


8.6 Plugging electric sounds into other art forms and
    into society
According to many previous studies, electroacoustic music in Finland devel-
oped in two waves – the first one starting in the late 1950s and settling by the
mid-1960s, and the second one starting in the late 1960s (see Lång 1990,
Ruohomäki 1998; 2020; Kuljuntausta 2002; 2008). As I have previously
mentioned, this is an adequate description in terms of concert activity and
the number of completed works (Ojanen 2013; 2014b), but it falls seriously
short if one examines the use of electronic sounds in other arts and their
mentions in contemporary media. If one changes perspective from electroa-
coustic standalone tape music to cover a wide range of other styles, or from
electroacoustic and experimental music concerts to other art forms, it is clear
that the notion of phased development tells only one side of the story about
the situation in the 1960s. During the assumed quiet period in the mid-
1960s, Kurenniemi developed his instruments, maintained the University
Studio and produced sounds, sound effects, soundscapes and even music for
various productions.
    In addition, his connections with his Swedish collaborators remained
strong and his instruments and the University Studio played an important
role, even on the Swedish scene in the mid-1960s. Leo Nilsson started to em-
ploy Kurenniemi’s instruments in 1964, for example, and in 1965 he com-
pleted Skorpionen (1965), which was the first work produced with the in-
struments to be released on a sound recording. Moreover, the work was aired
by Radio Andorra to honor the 84th birthday of Pablo Picasso. As Ralph
Lundsten and Nilsson reveal in the sleeve notes for their first LP album, they
had to travel to Helsinki to produce the electronic sequenced material they
wanted because it was not possible in Sweden at the time in the modest stu-
dio facilities. The studio of Swedish Radio – eventually Elektronmusikstudi-
on (EMS) – started to materialize only a couple of years after Kurenniemi
completed his first instrument. The electronic work entitled Kaleijdoskop
(1965), composed for the Alarm architecture exhibition in Stockholm in
1965, was based on concrete sounds with tape manipulation. The plan was to
utilize electronic sound sources automated with a sequencer in their next ex-
hibition work, which Kurenniemi’s Integrated Synthesizer provided.474
    Electroacoustic music was actively discussed in the contemporary media.
Concert reviews from the 1960s and 1970s very strongly reflect the writers’

   474 See the sleeve notes of Lundsten and Nilsson (1966) Elektronmusikstudion Dokumentation 1

   (Sveriges Radio, LPD 1, 1966) in the Discogs database: https://www.discogs.com/Ralph-
   Lundsten-Leo-Nilson-Elektronmusikstudion-Dokumentation-1/release/938156.




                                                245

[p. 246 / pdf 272]

Discussion



attitudes. In Finland this was most evident in the reviews of Erkki Salmen-
haara and Seppo Heikinheimo, both of whom were active concertgoers over
the decades. Salmenhaara was critical of the technological quality but was
usually very positive in his reviews of the new trends, 475 whereas Heikin-
heimo became well known for his critical and even sarcastic statements.
However, even he did not spare his praise when he appreciated something.
Typically, he had great expectations of Kurenniemi’s designs and wrote posi-
tively about future prospects,476 even though he tended to dismiss contempo-
rary works and composers as poor and stagnant.
    Integrating electronic sounds into other art forms was closely linked with
concepts such as intermedia and intermediality, although the terms were not
used in Finland until 1970. Interestingly, Kurenniemi started his music ca-
reer with theater music. Unfortunately, only fragments of Ylioppilasteatteri’s
production of Tintagilesin kuolema (Engl. The Death of Tintagiles) have sur-
vived, albeit with no electronic sounds, and there are no sound recordings of
the production of Hanjo – first in Ylioppilasteatteri (1964) and then as a TV
arrangement on Mainos-TV (1964) following its re-appearance at the Finnish
National Theater (1966). It is therefore impossible to give a detailed analysis
of these early theater works. What we do know is that Kurenniemi’s sound
designs were praised in the reviews. A few years later, he continued his ex-
periments within the theater context when the group Scene 7 used the DIMI-
O to produce the music for Samuel Beckett’s play Act without words, per-
formed in Oslo, Norway. Still in the context of theater, Kurenniemi’s instru-
ments were frequently used and heard in radio plays, exhibitions, films,
commercials and as part of dance works. What probably attracted the widest
audience was the soundscape over the opening titles of the national TV news
that aired throughout the 1970s: lasting only a few seconds, it was composed
by Osmo Lindeman with Kurenniemi’s DICO.
    Among the various platforms, exhibitions in particular offered an innova-
tive environment for experimenting with sound distribution and the tech-
nical-aesthetic setup of the display. Electronic music was reproduced from
the tape in most of the exhibitions, and live instruments were rarely used in
the presentations. The sounds produced in the University Studio and from
Kurenniemi’s first synthesizer were heard as part of the Hej Stad! (1966) ex-
hibition, first in Stockholm where it reached the ears of 22,000 visitors, and
later in Messuhalli in Helsinki when thousands of visitors heard electronic
sounds from the University Studio – even though they probably were not
aware of their origin. The work realized two years later in the University Stu-
dio, which probably attracted the most international attention, was Erkki
Salmenhaara’s two-piece tape collage Information Explosion (1967), a work
on the Man in the Community theme of Expo 67 commissioned as part of

   475 See Salmenhaara (1967, 18 / HS October 31, 1967); (1969, 16 / HS November 19, 1969); (1970,

   19 / HS November 19, 1970).
   476 See Heikinheimo (1972, 24 / HS October 20, 1972).




                                                 246

[p. 247 / pdf 273]

Montreal’s World Fair from 27 April to 29 October, 1967. 477 Information ex-
plosion served as an acoustic canvas for 800 slides produced by interior de-
signers Ilmari and Timo Tapiovaara. It was also the first electroacoustic work
to be released on a sound recording in Finland.478 Within the scope of this
study, other notable exhibitions include Den Immateriella Processen and
Feel It, of which the latter even toured in New York. Later on, national exhi-
bitions such as Valo ja liike 1 (1968), Valo ja liike 2 (1969), and Kineettisiä
kuvia (1970), and several exhibitions organized by the groups Elonkorjaajat
and Dimensio distributed sounds from the University Studio widely in the
national context.
    The University Studio and Kurenniemi’s work there did have an influence.
However, it was its users – not Kurenniemi’s instruments per se – who
caused the impact in society. The origin of the sound material produced in
there and with Kurenniemi’s instruments remained unknown to the public,
even though the studio was frequently introduced as such in magazine and
newspaper articles. Interestingly, even though the significant contribution of
the University Studio was acknowledged, it did not lead to the granting of
financial support.


8.7 The diversification of valuation processes in music
    production
The emergence of technology-driven music production, which was facilitated
by electroacoustic music practices, exemplifies how technological develop-
ment can diversify valuation processes (including traditional composition).
Technological developments in music, especially in the areas of sound re-
cording, sound processing and computer technology, led to an emphasis on
listening-based and process-driven working methods, and the emergence of a
bottom-up composition workflow (Emmerson & Landy 2016, 10). Gradually,
traditional perspectives on musical works broadened to include technology-
driven, real-time and even process-based composition. In extreme cases the
composer’s intention was not necessarily to compose a work but to test the
equipment – as exemplified in a few of Kurenniemi’s works. It was only later
that the sound processing and its release as an album converted the record-
ing into a musical work. This is reflected in Talbot’s (2000, 185) observation
that “recorded sound has the power to turn non-works into real works”.


   477 See e.g. Tawaststjerna’s funding application dated 26 January 1967: “Mainittakoon, että studi-

   ossa realisoidaan parhaillaan Montrealin maailmannäyttelyyn tilattua elektronista sävellystä.”
   (Engl. “It should be mentioned that an electronic composition commissioned for the Montreal
   World Fair is currently being realized in the studio.”)
   478 See the liner notes of LREP103. The EP was released in June 1967 (Rantanen 2005, 292). Ku-

   renniemi is mentioned in the liner notes as a technical assistant, although according to Ruohomäki
   it is likely that Salmenhaara mainly worked alone.




                                                  247

[p. 248 / pdf 274]

Discussion



    At the time when Kurenniemi started to build his instruments (in the ear-
ly 1960s), electronic music was judged by the standards of traditional classi-
cal music, even if a significant number of the new generation of composers
and artists came from outside the academic, classically trained environment.
This is exemplified in Lindeman, who was a classically trained composer but
abandoned composing for a traditional orchestra and sought new, more di-
rect and predetermined ways of communicating with his orchestra via the
electronic medium. He soon discovered that there were similar problems in
finding his own way in the world of electronic music as in traditional music.
Lindeman judged his output against traditional, classical music standards.
(see Ruohomäki 2020, EH37/4–5)
    Donner, on the other hand, intentionally broke free from the distinction
between highbrow and popular art. Even though he no longer worked in the
field of experimental electronic music, he continued to explore similar
themes with his Jazz-oriented group Otto Donner Treatment (OTD), the aim
of which was to integrate the worlds of pop, rock, and jazz. Donner inten-
tionally brought together musicians from distinctly different backgrounds.
This is exemplified in his work Two guitars? (1968) for two such groups,
OTD and Blues section. It is also reflected in his decision to publish an eclec-
tic compilation album, Perspectives ’68 – Music in Finland (1968), which
comprises Salmenhaara’s work for solo flute Preludi, iskelmä ja fuuga (1967;
Engl. Prelude, Pop Tune and Fugue), Kurenniemi’s Antropoidien tanssi
(1968) and Football (1967) by the pop group Blues section, as well as his own
Two guitars?.
    The influence of traditional norms is also exemplified by Saunio479 when
he describes Kurenniemi as “brave to appear as a composer even though he
was a mathematician”, and even more strongly when he anticipated the criti-
cism Kurenniemi would face upon entering the world of academically trained
composers as an autodidact. Many of the new artists in the electroacoustic
music field were self-trained, or trained engineers, not composers or artists
trained in a field other than music.
    Reflecting on Kurenniemi’s vision of the digital composer of the future in
light of the debate about the concept of a musical work, I argue that Kuren-
niemi did not compose musical works, he produced music. Here I return to
Goehr’s (1992, 186) remark that music and musical works should not be con-
flated. Kurenniemi exemplifies the digital composer of the future who pro-
duces on-demand music for use whenever needed. The essential feature of
his musical output is its improvisatory and fleeting nature. His works could
be described as manifestations of real-time interaction between physical
technological artifacts such as musical instruments and their creator/user. In
extreme cases he did not pay any attention to the sonic output, considering



   479   Saunio (1963, 4).




                                       248

[p. 249 / pdf 275]

the technology and the process far more important. This is emphasized in his
composition rule: “A work has to be finished in a day.”
    Contradicting his view of himself as merely an instrument designer, Ku-
renniemi repeatedly envisioned future music-production ecosystems and the
role of the digital composer in the production process. Even though he re-
fused to consider himself an artist, he repeatedly assumed such a role or
identity in his own works. He set about blurring the boundaries between art,
engineering and technology, and in doing so he was one of the eclectic actors
of the 1960s and the 1970s who were creating new forms of musical and sonic
expression, new practices and new genres. Kurenniemi brought about re-
alignments in art and technology, but not in economics, politics or gender
roles (see Pinch 2009, 190, for example, on the concept of re-alignment).
    Kurenniemi’s refusal to call himself a composer reflected the traditional
definition of the term, and a new definition was called for in the 1960s. Along
with the slow shift in paradigm from music to sonic art, a new kind of engi-
neer-artist role started to develop. Kurenniemi explicitly described his de-
signs as moving towards a new understanding of music production even in
the early days. He anticipated a trend that would position the composer as a
producer rather than an author, explaining in 1964 that the composer was
becoming closer to the conductor of the orchestra.480 Nevertheless, in the
same year Salmenhaara described Kurenniemi as a composer. 481 Interesting-
ly, Kurenniemi included the title of composer in his CV later in the 1970s,
explaining in his diary that he was starting to use the artist role to facilitate
or accelerate the marketing of his instrument. He wanted to identify himself
as a composer after all.
    Within his local context, it seems that Kurenniemi was the only one who
could accept the idea that any sonic manifestation could be considered musi-
cal material. Numminen with his avant-garde works came close, but Kuren-
niemi was only able to overcome the need for a prescribed plan with his
Sähkökvartetti improvisation. Among classically trained composers, both
Lindeman and Romanowski wanted to design a system or to formulate a lan-
guage of a sort to support their musical works. Romanowski relies on testing
and improvisation only during the brainstorming phase of his composition
process, believing that improvisation per se, in other words without a context
or a justified reason, is not interesting enough for the listener. 482 He ap-
proves of documenting improvisation only for research purposes – not for
artistic purposes. He composes his tape music works strictly according to a
prescribed plan, the building blocks being processes, ideas, systems, or sound
fields.
    Very similar tenets directing Lindeman’s working method are reflected in
his comments when he retrospectively assessed his electroacoustic music

   480 Hbl (1964; 1, 11).

   481 Salmenhaara (1964, 55); see also Hbl (1964; 1, 11).

   482 Romanowski (2019) in an interview with Ojanen.




                                                   249

[p. 250 / pdf 276]

Discussion



repertoire in 1975: he described his early works as studies rather than official
compositions, which should be ignored. He further explained that he was too
easily satisfied with his early works. This differs from Kurenniemi’s attitude.
After studying further and focusing on electronic music composition, Linde-
man gradually revealed his background as a traditionally trained composer.
In the end, he did not see any difference in the processes of composing tradi-
tional and electroacoustic music – in general.
    Whereas other composers and artists are located on the same map, it is
clear that Ruohomäki exemplifies an actor who acknowledges the importance
of the poietic ecosystem, but his interactive-listening mode of working with
the technology places the emphasis on the sonic output, that is, on the mate-
rial reality of the work. He denies that his music has a program. In emphasiz-
ing this he wishes to step away from defining how people should listen to his
works, even though he gives them distinctively descriptive names: Pisces, for
example, has a clear reference to water, and the sonic nature of the work is
strongly mimetic in this sense.
    Going against Kurenniemi’s utopian vision, Ruohomäki did not automate
the studio. He programmed Kurenniemi’s sequencers, but technological con-
straints such as the DIMI-A’s memory forced him to rely on traditional elec-
tronic music techniques of tape manipulation – something that Kurenniemi
tried to overcome even though he was faced with the same constraints. Ruo-
homäki’s emphasis lies somewhere between the work and the poietic ecosys-
tem. For Donner, in turn, the esthesic side was clearly more dominant: his
interest was not in how the technology worked, but in what the user could
achieve with it.
    It is thus clear that Kurenniemi was an innovator not solely for the avant-
garde but for any art practices. The electronic medium provided a platform
on which the boundaries between high and popular art were frequently
crossed. However, the differences among the actors emerge in their attitudes
towards composition principles, not electronic means. Even though electroa-
coustic music provided a neutral platform and a chance to break free from
traditional categories of high and low, or arty and popular, the genre and its
development exemplifies how the tool, in other words electronic means, is
only a tool and the valuation process is based on users’ attitudes. Technology
could be considered neutral – even though this has been debated – but as
soon as it is in the hands of users, it turns into a projection of the user’s atti-
tudes, goals, expectations and wishes – just as music and musical works are
signified via contextualization. Similarly, as with musical works and how they
relate to their production and reception, Nattiez’s tripartition could be used
to describe music technological artifacts.
    Electroacoustic music is electronically mediated. The medium enables the
detachment of the content and its management from the composer’s imme-




                                         250

[p. 251 / pdf 277]

diate control. Technology-driven music production diversifies483 the work-
flow from user-centeredness to media-centeredness. Electroacoustic music
made it possible to surpass the orchestra and the conductor as the interpreter
or mediator. Kurenniemi aimed even further. For him, music technology
made it possible to surpass the intention of the composer and the composer’s
mental schema, or the music technology as a physical mediator, and thereby
to transform the composer’s mental schema directly into musical output. It
facilitates a shift in the workflow, first, to listening-based real-time processes,
and then even to fully technology-driven processes. (see Figure 124) This is
where the valuation of music production diversified along with the techno-
logical development. Only a few composers and artists were ready to accept
the new, radical method in which the composer’s mental schema and educa-
tional background do not play a key role – the value judgements are ubiqui-
tous.
    Kurenniemi’s work exemplifies close interaction between music and tech-
nology on the one hand, and the role of the electronic medium in the early
days of value-free music production on the other. Here, I refer to the situa-
tion in the 1960s when contemporary technology provided a new aesthetic
tool to be utilized in both popular and art-music contexts. However, any in-
strument is similarly used in various contexts, in various styles and genres,
and for different purposes. As I have shown in this study, value-free music
production soon vanished whereas the attitudes of composers and artists,
directed by their background, re-emerged to judge what is good, bad, ac-
ceptable or forbidden in electroacoustic music.




   483 Diversification does not change or exclude previous compositional process, it rather broadens

   or adds things to them. One should ask how the technological development broadened and en-
   hanced music production rather than how technology changed it. Old attitudes and techniques
   persist, while something new is added.




                                                  251

[p. 252 / pdf 278]

Discussion




Figure 124. The author’s (composers, producers, or artists) three attitudes towards the music-
production process. Most of the composers acquired all or at least two of the three attitudes,
however this is where they differ. Some accept purely technology-driven content in their work
more readily than others, and others emphasize the composer’s control over all parameters and
musical events (located mainly in the bottom-right circle). Composers also differ in how much
they emphasize their own aesthetic decision-making. In some sense, music production driven by
technology and the author’s mental schema can result in a musical work with a sonic outcome
that is secondary to the system driving the production process. (image: Ojanen 2019)




                                               252

[p. 253 / pdf 279]

9 CONCLUSIONS

This study provides new insights into electronic and electroacoustic music in
Finland between 1961 and 1978. I have examined the period through the
works of composers and artists who used the unique electronic musical in-
struments designed by Erkki Kurenniemi, the Finnish pioneer of electronic
music. Kurenniemi’s work as an instrument designer and artist was the point
of departure for this interdisciplinary study, in which I consider the phenom-
enon from historical, technological and musical perspectives. My analyses of
the user interfaces of Kurenniemi’s instruments and the stories of their users
reveal the complex networks of 1) technological artifacts with their explicit
and implicit features and functionalities, 2) users with their attitudes and
value assessments, and 3) cultural and historical contexts such as musical
traditions and genres, in which all the components are seamlessly inter-
twined. Kurenniemi did not invent and develop his instruments in an isolat-
ed laboratory, and his social network played a significant role in both the
successes and failures of his musical adventure.
    On the historical level I show how understanding of the past is relative,
and that constant re-evaluation based on new discoveries in the source mate-
rial is needed. This study presents a large amount of new and significant
documentary evidence. Credible conclusions and interpretations can only be
based on systematic and thorough research. As I point out, for example, in-
terpretation of the two waves in the development of electroacoustic music in
Finland is tenable only within a certain scale of observation. The idea of two
waves is a later construct that is detached from the target of this study –
something that was conjured up afterwards. Upon closer examination of Ku-
renniemi’s oeuvre, based on Giovanni Levi’s scale of observation, the re-
search material reveals that throughout the 1960s he worked continuously on
his designs, which were then utilized by composers and artists in various art
works – across genres.
    Furthermore, the division into two periods reflects the researcher’s choice
to classify the musical genre according the production methods used to cre-
ate the works. Research results vary depending on the assumed role of tech-
nology in music production. The adoption of production technology as a
point of departure for the classification directs the research in a different di-
rection than starting from the pure aesthetic output of music – neither of
which is wrong. Such choices also influence the definition of and discussion
about electroacoustic music. To relate the musical genre entirely to the pro-
duction technology is to dismiss both the intention of the composer and the
interpretation of the listener. The value of an instrument or a production is



                                        253

[p. 254 / pdf 280]

Conclusions



defined by its users, not by the medium per se. Researchers who set their
goal to trace works produced by electronic means form a different picture of
the period than those who wish to trace the overall stylistic development of a
certain group of composers.
    Tracking the use of electronic technology in music production and com-
position without proper musical and cultural-historical analysis may even
skew the conception of the music culture of the time. As Landy (1999, 64)
points out, the history of electroacoustic music is “not solely technology
based or even necessarily technologically driven.” The electronic means used
in music production and composition vary from one composer to another.
Kurenniemi was deeply involved in his instrument design, for example,
whereas his close collaborator, Henrik Otto Donner was mainly interested in
the sonic outcome of a musical work: for him, the production methods and
media were secondary to the musical expression. Classifying both in the elec-
troacoustic music category reveals little about their musical similarities and
differences.
    On the technological level, in studying both the development and the use
of Kurenniemi’s electronic musical instruments I show how the target of a
study can dictate the research results. This is exemplified in the current study
by the assessment of Kurenniemi’s designs and their implementation. Ku-
renniemi was a successful designer of musical instruments, finding solutions
that facilitated the work of several composers and artists in various fields of
music, art and technology during the 1960s and 1970s. His utopian dreams
were welcomed enthusiastically by his contemporaries, but their implemen-
tation, the materialized version of his designs, remained only half-completed.
The user experiences did not circulate back to his design process and he
could not take full advantage of the relevant social groups who appreciated
his work. Eventually, users of his instruments could not get beyond the con-
straints, and many even rejected them. Here, the assessment of Kurenniemi’s
work depends on whether his designs are considered case-specific electronic
musical instruments and outcomes of a DIY culture, or prototypes of viable
commercial products. In fact, they were both.
    On the level of music aesthetics, it is more fruitful to ask how technology
diversified music-production processes and their valuation rather than how
it changed music. On the basis of this study I argue that technological devel-
opment did not change music or musical practices. It was the various actors
– designers, composers, users, artists, listeners, and audiences – who decid-
ed whether or not they accepted the new means. Technology only sets the
framework within which users operate, guided by their attitudes and points
of departure. Aesthetics is also socially constructed.
    Using the theoretical and methodological toolbox borrowed from music,
technology and history studies I have presented a holistic description of elec-
troacoustic music in Finland in the 1960s and 1970s. However, to ensure a
thorough understanding the theoretical and material triangulation discussed
above should be complemented with interdisciplinary triangulation. I was



                                       254

[p. 255 / pdf 281]

fortunate to conduct my research in a technology-minded environment. The
related projects of my fellow Kurenniemi enthusiasts Jari Suominen and Kai
Lassfolk complement my own work. Moreover, the opportunity to use Ku-
renniemi’s instruments in performance together with my colleagues has
broadened my points of view. Even though I do not employ artistic research
methodology in my work, performing with the research subject had a pro-
found effect both on the questions I asked, and on my interpretation based
on them.
    Framing the study is necessary and only a narrow point of view can be ac-
quired at any one time. The world did not end in 1978, which marked the end
of my observations. Neither did the target of this study arise from out of no-
where in 1961. Moreover, the period in between, which I examine here,
should be further elaborated. Amid artistic research, the material I present in
this study would benefit from other methodological approaches, such as
those represented by media archeology, art history, sociology, or gender
studies – to mention but a few. Contextualization with closer analyses of eco-
nomic and political structures would also enrich this description.
    Two interrelated themes that specifically deserve a closer look in the fu-
ture are intermedia and societal impact, in other words how electric sounds
were incorporated into different art forms and into society. This study consti-
tutes a point of departure for these themes. The University Studio and Ku-
renniemi’s instruments played a significant role in providing electronic
sounds for various kinds of art works, which were then distributed into con-
temporary society. An interesting collection of documentary evidence with
the potential for further research emerged from the archive material ana-
lyzed within this study. For example, the sounds made by Kurenniemi’s in-
struments on sound recordings provide an interesting framework, with a set
of source material that is considerably larger than previously known. The
mere visibility of a cultural artifact in society does not equal its impact, how-
ever, but the concept of impact requires a detailed definition. In addition, the
composers and artists and their unique and original work, which I mention
only briefly in this study, deserve their own, interrelated chapters in books on
electroacoustic music history. A detailed look into these themes could pro-
vide new insights for those interested in the question of nationalism.
    According to the modern historiographical paradigm, it is acknowledged
that everything has a history, and whatever it is, it is entitled to be written.
Its description may be based on various, fragmented and even surprising
sources, not only official documents. Rahikainen & Fellman (2012) defend
the right of historians to access proper documentary evidence, in other words
the research should be transparent, repeatable and based on archival work.
Given the extensive qualitative research material and data behind several
modern research projects, it is ever more important to support and secure
the right of researchers to their data and its management.
    On this issue in particular, I have great expectations of the digital tools
and methods, such as linked and big data, that are rapidly emerging in hu-



                                        255

[p. 256 / pdf 282]

Conclusions



manities and history studies. Machines cannot do the research, but they can
open up avenues to new points of view and interpretation.
    To facilitate the research community’s right to proper and transparent
documentary evidence, I have made the material and data I have processed
within this study as openly available as possible. I have used the study to pi-
lot an approach to the management of research data comprising complex
material related to cultural heritage and the arts. I am committed to open
science and research ideology. Technologically informed analysis and history
writing will continue in cultural-heritage projects such as Finnish ElectroA-
coustic Research Sources (FinEARS).
    As I point out in this study, research on Kurenniemi exemplifies how di-
verse approaches produce different descriptions – complementary rather
than exclusive. Thus, there is a need for more researchers, more research ma-
terial, new tools and more points of view to draw a comprehensive picture of
electroacoustic music in Finland – and of Finnish electroacoustic music. The
work continues.




                                       256

[p. 257 / pdf 283]

REFERENCES

Source material and research data

Archives and collections
Amos Anderson Art Museum archive
Erkki Kurenniemi archive in the Finnish National Gallery (FNG/EKA)
Helsingin Yliopiston Ylioppilaskunta (HYY) archive (University of Helsinki
  Student Union archive)
Jouko Kottila archive (private archive)
Jukka Ruohomäki archive (private archive)
Kielipankki (The Language Bank of Finland holding FinEARS Interviews)
Lehtikuva archive
Leo Nilsson archive (private archive)
Music Finland archive (incl. Jukka Ruohomäki’s digitizations of electronic
  works)
Kansallisarkisto (National Archive; holding Digelius Electronics Finland
  documents)
Kansalliskirjaston kokoelmat (National Library of Finland collections; incl.
  digi.kansalliskirjasto.fi)
Osmo Lindeman archive (private archive)
Oulu Sinfonian arkisto (Oulu Symphony Orchestra archive)
Pekka Hoikkala archive (private archive)
Pekka Sirén archive archive (private archive)
Ralph Lundsten archive (private archive)
Risto Rautee archive (private archive)
Teatterimuseon arkisto (Theater Museum archive; TeaMA)
University of Helsinki Music Research Laboratory and Electronic Music Stu-
  dio (UHMRL) archive
Yleisradion arkisto (Finnish Broadcasting Company archive; Yle)
Ylioppilasteatteri archive (Helsinki Student Theater archive located in
   TeaMA)




                                         257

[p. 258 / pdf 284]

References



Archive material (unpublished)


The Finnish National Gallery / Erkki Kurenniemi archive
Kurenniemi's audio diaries C4000, C4060, C4113, C4136, C4137, C4138.
Kurenniemi, E. 1971. The written instructions for Deal, in Finnish (October
  1971), in English (October 26, 1971).
Kurenniemi, E. 1972. DIMI-päiväkirja 1971–1972.
Kurenniemi, E. 1973. Description of digital instruments.
Kurenniemi’s letters and correspondence.
Oramo, I. 1971. The program of the Nordisk seminar and Oramo’s talk.
Wahlström, E. 1971. letter to Kurenniemi about the acceptance of the work
  for the Nordic Music Days.


The National Archive of Finland
Journal number: 1406/178-70.


Leo Nilsson archive
The invitation card of Den Immateriella Processen in Leo Nilsson archive.


Music Finland archive
Donner, Henrik Otto. 1962. Ideogramme I.
  https://core.musicfinland.fi/works/ideogramme-i
Donner, Henrik Otto. 1963. Ideogramme II.
  https://core.musicfinland.fi/works/ideogramme-ii
Donner, Henrik Otto. 1963. Ideogramme For Emmy 2.
  https://core.musicfinland.fi/works/for-emmy-2
Salemenhaara, Erkki. 1963. Concerto per due violini.
   https://core.musicfinland.fi/works/concerto-per-due-violini
Music Finland sound archive digitized by composer Jukka Ruohomäki; CD
  signums for example: CD5261.


Oulu Symphony Orchestra’s archive
Oulu Symphony Orchestra’s concert program 18.10.1972.
  https://doi.org/10.5281/zenodo.4290669




                                      258

[p. 259 / pdf 285]

Theater Museum archive
The minutes of a meeting of the executive committee of Ylioppilasteatteri
  held on January 15, 1963 (TeaMA1487: Cb:2).
The minutes of a committee of meeting held on February 6, 1963
  (TeaMA1487: Cb:2).
The Ylioppilasteatteri’s annual report of 1963 (TeaMA1487: Db).
Ylioppilasteatteri executive committee minutes, May 4, 1963 / TeaMA1487:
   Cb:2).


The University’s Archive and Registry
The University of Helsinki Register of Faculty of Science.
The University of Helsinki Register of Students.


The University of Helsinki Music Research Laboratory (UHMRL)
  archive
The composer brochure of Osmo Lindeman (FIMIC 1979) in the UHMRL
  archive.
Erkki Kurenniemi’s daily planner, 1969 in the UHMRL archive.
Erkki Kurenniemi’s daily planner, 1971 in the UHMRL archive.
The balance sheet and annual report of Digelius Electronics Finland in Jouko
  Kottila’s private archive; copy in the UHMRL archive.
The UHMRL digital tape archive; tape IDs for example: 20180711_01
The DIMI Family lecture audio recording in the UHMRL archive.
The inventory catalogue of the University Studio in the UHMRL archive.
The DIMIX specifications in the UHMRL archive.
The DIMIX purchase documents in the UHMRL archive.
The Department of Musicology annual funding applications by Erik Ta-
  waststjerna (1967; 1970; 1971) in the UHMRL archive.
The Digelius briefing program, January 20, 1971 in Jouko Kottila’s private
  archive; copy in the UHMRL archive.


The University of Helsinki Student Union archive
The HYY executive committee meeting minutes on June 19, 1968
H_Hga_2_680530_sopimus. https://doi.org/10.5281/zenodo.4290688
H_Hga_2_680530_sopimus_liite.
  https://doi.org/10.5281/zenodo.4290688




                                       259

[p. 260 / pdf 286]

References



Audio-visual recordings, radio programmes, films and documentaries
Anon. 1975. Kika-digga-ding. [School TV program].
  https://www.youtube.com/watch?v=VfDr9zaO_TQ.
Aaltonen, Kajander, Lampila, Marttila, Saar, Vehniäinen. 1969. Otto Donner.
   (Materiaalinauha = material tape). [Documentary film]. Helsinki: Yle’s
   education office. Yle’s archive; Media ID: MEDIA_2015_00923242; Pro-
   gram ID: PROG_2009_0035191.
Craig, D. 2007. Ligeti – Artikulation. Visual listening score.
   https://www.youtube.com/watch?v=71hNl_skTZQ.
Donner, O. et al. 1970. Sähköinen tapahtuma Vanhalla [A radio program].
  Yle’s archive ID: 000053962.
Donner, O. 1974. Varoke: Käyttökulttuuriohjelmaa. Elektroninen musiikki.
  [A radio program]. Yle’s archive ID: 000109628.
Donner, O. & Vesterinen, M. 1971. Viherä elain. [A radio play] Yle’s archive
  ID: 000096478.
Fantinatto, R. 2017. SUBOTNICK: Suzanne Ciani on Morton Subotnick.
   [Video/DVD]. https://www.youtube.com/watch?v=-
   Rj6IJBR77g&list=PL2aIqCqnqukLN8dGhMYmJOeLigcziHIJo&index=35
Heikinheimo, H. 1971. DIMI-baletti [Documentary] Yle archive document;
  Name of the program: DIMI-baletti. Media ID: MEDIA_2014_00760531;
  Program ID: PROG_ 2009_00206150. Created: 19710922. Producer:
  Hannu Heikinheimo.
Jarva, R. 1968. Tietokoneet palvelevat [Computers serve; Commercial film].
   Helsinki: Filminor. https://www.elonet.fi/fi/elokuva/601470.
   https://elavamuisti.fi/aikajana/tietokoneet-palvelevat.
Jarva, R. 1969. Pakasteet II [Frozen food; Commercial film]. Helsinki: Filmi-
   nor. https://www.elonet.fi//fi/elokuva/640415.
   https://elavamuisti.fi/aikajana/pakasteet-ii.
Lindeman, O. 1969. Computer Music for Stereophonic Tape. Yle’s archive
   ID: 000102029.
Lindfors, J. 2008. DIMI, suomalainen syntetisaattori.
   https://yle.fi/aihe/artikkeli/2008/03/18/dimi-suomalainen-
   syntetisaattori.
Nono, L. 1960. Omaggio A Emilio Vedova. https://youtu.be/8WAjjtNVVKg.
Ojanen, Mikko. 2018. Arrangement of J.S. Bach's Invention No. 13 in A mi-
   nor (BWV784) for the DIMI-A synthesizer by Erkki Kurenniemi (1970):
   An annotated video of the master tape. https://vimeo.com/278832133.
Oura, A. 1967. Kahdeksan tahtia tietokoneelle [Documentary film] Yle’s ar-
  chive document; Name of the program: Kahdeksan tahtia tietokoneelle
  (Engl. Eight bars for a computer). Media ID: MEDIA_2012_00467326;
  Program ID: PROG_2009_00123373. Director: Aki Oura.




                                       260

[p. 261 / pdf 287]

--- 1969. Ihmisen uudet mahdollisuudet (Engl. The new possibilities of man).
    [Documentary] Yle’s archive document; Media ID: ME-
    DIA_2014_00772238; Program ID: PROG_2009_00121250. Director:
    Aki Oura.
Ritavuori, H. 1969. Maan aurinko [Documentary] Yle’s archive document;
   Name of the program: Maan aurinko (Engl. Sun of the Earth). Media ID:
   MEDIA_2014_00768009; Program ID: PROG_2009_00105005. Direc-
   tor: Heikki Ritavuori.
Ruohomäki, Jukka. 1993. Ihmisiä, koneita ja musiikkia, [A radio program;
  Engl. Men, Machines and Music]. Yle Archive ID: DIG-390965-0.
Ruutsalo, E. 1965. Hyppy [Movie]. https://www.elonet.fi/fi/elokuva/129895
Schreck, J., & Kokkonen, E. 1964. Hanjo [TV Movie].
   https://www.imdb.com/title/tt1454005/.
Sima, J. 1973. Cosmic Love. Ralph Lundsten elektrontonsättare; Ett porträtt
   av Jonas Sima. [Documentary].
   http://www.svenskfilmdatabas.se/sv/item/?type=film&itemid=56455;
   http://www.sima.nu/film-cosmic.htm.
Taanila, M. 2002. Tulevaisuus ei ole entisensä. [Video/DVD] Helsinki: Ki-
   notar.
--- 2003. The dawn of DIMI. [Video/DVD] Helsinki: Kinotar.
--- 2007. Aika & aine = Time & matter. [Video/DVD] Helsinki: [Pan Vision]
    [jakaja].
Tenney, J. 1961. Analog #1 (Noise Study). https://youtu.be/fe4UlyQAgcc.
Vainio, R. 1972. Musiikkiykkönen: Hummerit ja hummarit. Hummarit ja
   hammarit; Media ID: MEDIA_2016_01094581; Programme-ID:
   PROG_2009_00171786; Date: 19721006.
Yli-Ojanperä, E. 2013. Futuristisella matkalla ylihuomiseen 1971.
    https://yle.fi/aihe/artikkeli/2013/05/30/futuristisella-matkalla-
    ylihuomiseen-1971#media=96419.
Vesterinen, M. & Kari, A. & Ruohomäki, J. 1974. Sähkölintupuutarha. [Mo-
   vie]. Helsinki: Tööt-filmi.
   https://elonet.finna.fi/Record/kavi.elonet_elokuva_153068.


Interviews
Andersson, Åke, Honkanen, A., & Kuljuntausta, P. 2018. [Interview with Åke
  Andersson and Antero Honkanen by Petri Kuljuntausta in November
  2015]. In Andersson, Åke & Honkanen, A. Reidarin sähköiset kuvat: Åke
  Anderssonin ja Antero Honkasen elektronimusiikkia. Svart Records –
  SRE 129.
Bentley, Andrew, & Ojanen, M. & Lassfolk, K. 2015. Interview with Andrew
  Bentley by Mikko Ojanen and Kai Lassfolk 4.11.2015, The University of
  Helsinki Electronic Music Studio, Topelia. In Ojanen, Mikko. 2020. Finn-




                                       261

[p. 262 / pdf 288]

References


   ish electroacoustic music interviews [corpus]. Kielipankki. Available:
   http://urn.fi/urn:nbn:fi:lb-2020030421.
--- 2019. Interview with Andrew Bentley 28.–30.9.2019. By Mikko Ojanen,
    Email conversation. https://doi.org/10.5281/zenodo.4289358.
Davidow, Joe, & Ojanen, Mikko. 2019. Interview with Joe Davidow by Mikko
  Ojanen 8.3.2019. The University of Helsinki Electronic Music Studio,
  Topelia. In Ojanen, Mikko. 2020. Finnish electroacoustic music inter-
  views [corpus]. Kielipankki. Available: http://urn.fi/urn:nbn:fi:lb-
  2020030421.
Donner, Henrik Otto, & Ruohomäki, J. 1994. Interview with Henrik Otto
  Donner by Jukka Ruohomäki 7.9.1994. In Jukka Ruohomäki archive.
Donner, Henrik Otto, & Home, M., & Ojanen, M. 2013. Interview with Hen-
  rik Otto Donner by Marko Home and Mikko Ojanen 29.4.2013. The Uni-
  versity of Helsinki Electronic Music Studio, Topelia. In Ojanen, Mikko.
  2020. Finnish electroacoustic music interviews [corpus]. Kielipankki.
  Available: http://urn.fi/urn:nbn:fi:lb-2020030421.
Hakala, Kari, & Lassfolk, K., & Ojanen, M. 2013. Interview with Kari Hakala
  by Mikko Ojanen and Kai Lassfolk 18.11.2013. The University of Helsinki
  Electronic Music Studio, Topelia. In Ojanen, Mikko. 2020. Finnish elec-
  troacoustic music interviews [corpus]. Kielipankki. Available:
  http://urn.fi/urn:nbn:fi:lb-2020030421.
Karlsson, Cay, Lehtinen, S., & Riihimaa, J. 2018. Sirkustirehtöörin pieni sy-
   dän – musiikillisia muistoja: [Interview with Cay Karlsson and Sakari
   Lehtinen in the Fall of 2016]. In Cumulus, Sirkustirehtöörin pieni sydän.
   Svart Records – SRE153.
Kottila, Jouko, & Lassfolk, K., & Suominen, J., & Ojanen, M. 2014. Interview
   with Jouko Kottila by Kai Lassfolk, Jari Suominen and Mikko Ojanen
   16.6.2014. The University of Helsinki Electronic Music Studio, Topelia. In
   Ojanen, Mikko. 2020. Finnish electroacoustic music interviews [corpus].
   Kielipankki. Available: http://urn.fi/urn:nbn:fi:lb-2020030421.
Kurenniemi, Erkki, & Oura, A. 1967. Interview with Erkki Kurenniemi by Aki
  Oura in October 1967. By Aki Oura. The University of Helsinki Electronic
  Music Studio, Vironkatu. In Kahdeksan tahtia tietokoneelle (Engl. Eight
  bars for a computer). Document in Yle’s archive; Media ID: ME-
  DIA_2012_00467326; Program ID: PROG_2009_00123373.
Kurenniemi, Erkki, & Oura, A. 1969. Interview with Erkki Kurenniemi by Aki
  Oura March 1969. Location unknown. In Ihmisen uudet mahdollisuudet
  (Engl. The new possibilities of man). Document in Yle’s archive; Media
  ID: MEDIA_2014_00772238; Program ID: PROG_2009_00121250.
Kurenniemi, Erkki, & Ruohomäki, J. 1993a. Interview with Erkki Kuren-
  niemi by Jukka Ruohomäki 28.10.1993. The University of Helsinki Elec-
  tronic Music Studio, Vironkatu. In Jukka Ruohomäki archive.
Kurenniemi, Erkki, & Ruohomäki, J. 1993b. Interview with Erkki Kurennie-
  mi by Jukka Ruohomäki 19.11.1993. Heureka. In Jukka Ruohomäki archi-
  ve.



                                      262

[p. 263 / pdf 289]

Kurenniemi, Erkki, & Suominen, J., & Ojanen, M. 2004. Interview with Erkki
  Kurenniemi by Mikko Ojanen and Jari Suominen 29.5.2004. The Univer-
  sity of Helsinki Electronic Music Studio, Vironkatu. In Ojanen, Mikko.
  2020. Finnish electroacoustic music interviews [corpus]. Kielipankki.
  Available: http://urn.fi/urn:nbn:fi:lb-2020030421.
Lehtinen, Jari, Jari Suominen and Mikko Ojanen. 2013. An email conversati-
   on between Jari Lehtinen, Jari Suominen and Mikko Ojanen June 14,
   2013. In Mikko Ojanen archive.
Lehto, Pertti, & Suominen, J., & Ojanen, M. 2015. Interview with Pertti Lehto
   by Mikko Ojanen and Jari Suominen 14.12.2015. The University of Hel-
   sinki Electronic Music Studio, Topelia. In Ojanen, Mikko. 2020. Finnish
   electroacoustic music interviews [corpus]. Kielipankki. Available:
   http://urn.fi/urn:nbn:fi:lb-2020030421.
Lindeman, Osmo, & Koskimies, A.-N. 1972. Interview with Osmo Lindeman
   by A-N Koskimies, Radio interview. Recording in UHMRL archive.
Lindeman, Osmo, & Paalanen, L. 1974. Interview with Osmo Lindeman by
   Leena Paalanen, Musiikkikellariohjelma. Recording in UHMRL archive.
Lindeman, Osmo, & Santalahti, L. 1980. Interview with Osmo Lindeman by
   Leena Santalahti 1980. Recording in UHMRL archive.
Lindeman, Osmo, & Sermilä, J. 1975. Interview with Osmo Lindeman by
   Jarmo Sermilä 5.2.1975. Recording in UHMRL archive.
Lindeman, Sirkka, & Ruohomäki, J. 1996. Interview with Sirkka Lindeman
   by Jukka Ruohomäki 8.5.1996. In Jukka Ruohomäki archive.
Lundsten, Ralph, & Ruohomäki, J., & Ojanen, M. 2012. Interview with Ralph
  Lundsten by Mikko Ojanen and Jukka Ruohomäki 13.6.2012. Andromeda
  studio, Stockholm. In Mikko Ojanen archive.
Lundsten, Ralph, & Ojanen, M. 2018. Interview with Ralph Lundsten by
  Mikko Ojanen 2018–2020. https://doi.org/10.5281/zenodo.4289353.
Nikkilä, Seppo, & Ojanen, M. 2017. Interview with Seppo Nikkilä by Mikko
   Ojanen 11.3.2017. Marbella / The University of Helsinki. In Ojanen, Mik-
   ko. 2020. Finnish electroacoustic music interviews [corpus]. Kielipankki.
   Available: http://urn.fi/urn:nbn:fi:lb-2020030421.
Nilsson, Leo, & Ojanen, M. 2019. Interview with Leo Nilsson by Mikko
   Ojanen 2019–2020. https://doi.org/10.5281/zenodo.4271167.
Numminen, M. A., & Ojanen, M. 2018. Interview with M.A. Numminen by
  Mikko Ojanen 8.3.2018. The University of Helsinki Electronic Music Stu-
  dio, Topelia. In Ojanen, Mikko. 2020. Finnish electroacoustic music in-
  terviews [corpus]. Kielipankki. Available: http://urn.fi/urn:nbn:fi:lb-
  2020030421.
Rautee, Risto and Pekka Hoikkala, & Ojanen, M. 2017. Interview with Risto
  Rautee and Pekka Hoikkala by Mikko Ojanen 19.4.2017. The University of
  Helsinki Electronic Music Studio, Topelia. In Ojanen, Mikko. 2020. Finn-
  ish electroacoustic music interviews [corpus]. Kielipankki. Available:
  http://urn.fi/urn:nbn:fi:lb-2020030421.



                                      263

[p. 264 / pdf 290]

References


Romanowski, Otto, & Ojanen, M. 2019. Interview with Otto Romanowski by
  Mikko Ojanen 13.2.2019. The University of Helsinki Electronic Music
  Studio, Topelia. In Ojanen, Mikko. 2020. Finnish electroacoustic music
  interviews [corpus]. Kielipankki. Available: http://urn.fi/urn:nbn:fi:lb-
  2020030421.
Ruohomäki, Jukka, & Suominen, J., & Ojanen, M. 2004. Interview with Juk-
  ka Ruohomäki by Mikko Ojanen and Jari Suominen 3.12.2004. The Uni-
  versity of Helsinki Electronic Music Studio, Vironkatu. In Ojanen, Mikko.
  2020. Finnish electroacoustic music interviews [corpus]. Kielipankki.
  Available: http://urn.fi/urn:nbn:fi:lb-2020030421.
Ruohomäki, Jukka, & Ojanen, M. 2014. Interview with Jukka Ruohomäki by
  Mikko Ojanen 15.–16.5.2014. The University of Helsinki Electronic Music
  Studio, Topelia. In Ojanen, Mikko. 2020. Finnish electroacoustic music
  interviews [corpus]. Kielipankki. Available: http://urn.fi/urn:nbn:fi:lb-
  2020030421.
--- 2018. Interview with Jukka Ruohomäki by Mikko Ojanen. 2018.
    Oulunkylä. In Ojanen, Mikko. 2020. Finnish electroacoustic music inter-
    views [corpus]. Kielipankki. Available: http://urn.fi/urn:nbn:fi:lb-
    2020030421.
Salmenhaara, Erkki, & Sermilä, J. 1975. Interview with Erkki Salmenhaara
   by Jarmo Sermilä 17.2.1975. In Jukka Ruohomäki archive.
Vesterinen, Marja and Jukka Ruohomäki, & Paavolainen, T. 1971. Interview
   with Marja Vesterinen and Jukka Ruohomäki by Tytti Paavolainen
   19.11.1971. The University of Helsinki Electronic Music Studio, Vironkatu.
   Yle Archive ID: 000059535
Viitasalo, Hannu, & Suominen, J., & Ojanen, M. 2004. Interview with Hannu
   Viitasalo by Mikko Ojanen and Jari Suominen 4.11.2004. Helsinki-Vantaa
   Airport. In Ojanen, Mikko. 2020. Finnish electroacoustic music inter-
   views [corpus]. Kielipankki. Available: http://urn.fi/urn:nbn:fi:lb-
   2020030421.
--- 2015. Interview with Hannu Viitasalo by Mikko Ojanen and Jari Suomi-
    nen 23.11.2015. The University of Helsinki Electronic Music Studio. In
    Ojanen, Mikko. 2020. Finnish electroacoustic music interviews [corpus].
    Kielipankki. Available: http://urn.fi/urn:nbn:fi:lb-2020030421.


Newspaper and magazine articles, contemporary historical documents
     and retrospective memoires
Amos Andersonin taidemuseo. 1969. Valo ja liike 2: kansainvälinen kineetti-
  sen taiteen näyttely: Amos Andersonin taidemuseo, Helsinki, 10.5.–
  8.6.1969 = Ljus och rörelse 2: internationell utställning av kinetisk
  konst: Amos Andersons konstmuseum, Helsingfors, 10.5.–8.6.1969 =
  Light and movement 2 : international exhibition of kinetic art. (Amos
  Andersonin taidemuseo. Luettelo ; no 42). Helsinki: Amos Andersonin
  taidemuseo.
Ahlgren, Stig. 1970. “Kärleksmaskinen.” Svenska dagbladet, 31.7.1970, 7.



                                      264

[p. 265 / pdf 291]

Ala-Könni, Erkki, Gothóni, A., Kaurinkoski, T., Nieminen, M., & Virtamo, K.
   1977. Otavan iso musiikkitietosanakirja. 2, Dallapiccola – Hervé. Helsin-
   gissä: Otava.
Ala-Könni, Erkki, Granholm, H., & Kaurinkoski, T. 1978. Otavan iso musiik-
   kitietosanakirja. 4, Laulu – Rantasalo. Helsingissä: Otava.
Alanko, Jouko. 1972. “Musiikkia Seksofonilla.” Tekniikan Maailma, 18/1972,
   44–45.
American Craftsmen's Council. Museum of Contemporary Crafts. 1969. Feel
  It – Press Release
  https://digital.craftcouncil.org/digital/collection/p15785coll6/id/6547/re
  c/2.
--- 1969. Feel It [catalog & sound recording].
    https://digital.craftcouncil.org/digital/collection/p15785coll6/id/5876/.
Arpiainen, Leila. 1966a. “Koristeellinen’Hanjo’”. Helsingin Sanomat,
   8.7.1966, 13.
--- 1966b. “Tarinaa idästä ja lännestä.” Helsingin Sanomat, 22.9.1966, 16.
Bakerich, F., & Scully, R. 1973. Electroencephalophone and feedback system
  (US3753433 ed.). https://www.google.com/patents/US3753433.
Bentley, Andrew. 2017. Historical electronic music by Andrew Bentley 2.
  https://algorithmicsound.com/2017/03/03/historical-electronic-music-
  by-andrew-bentley-2/.
Brandel, Åke 1971. “Dom tänder på varandra med kärleksmaskin!” Af-
   tonbladet, 1.8.1971, 7.
Buchla Associates. 1966. The modular electronic music system. Berkeley:
  Buchla Associates.
Chydenius, Kaj. 1963. “Musik utan musiker.” Hufvudstadtsbladet, 2.4.1963,
  6.
Dahlberg, Olof. 1968. “Ljus och ljud som tvärkonst.” Dagens Nyheter,
  10.11.1968, 6.
Davies, Hugh. 1968. Répertoire International Des Musiques Electroacous-
  tiques: International Electronic Music Catalog. Cambridge, Mass.: MIT.
DN = Dagens Nyheter. 1963. “Finländerna hoppas på Stockholmsstudion.”
  Dagens Nyheter, 4.4.1963, 19.
--- 1965. “Hommage à Picasso.” Dagens Nyheter, 24.10.1965, 23.
--- 1965. “Konstsalongen Samlaren Picasso i går och i dag.” Dagens Nyheter,
    20.11.1965, 41.
--- 1966. “Det slutna rummet på museiexpo.” Dagens Nyheter, 24.3.1966, 15.
--- 1969. “Rikskonserter i sommar: Musik från jätteballong strömmar över
    Östersund.” Dagens Nyheter, 26.4.1969, 16.
--- 1969. “Nytt om nöjen – 30-tal.” Dagens Nyheter, 12.6.1969, 22.




                                      265

[p. 266 / pdf 292]

References


Eaton, Manford L. 1968. Bio-potentials as Control Data for Spontaneous
   Music. [S.l.]: Orcus.
ESS = Etelä-Suomen Sanomat. 1968. “Kritiikkiä M. A. Nummiselle.” Etelä-
  Suomen Sanomat, 11.8.1968, 7.
--- 1971. “Tietokonesoitin kehitetty Suomessa.” Etelä-Suomen Sanomat,
    21.1.1971, 7.
Expressen 1966. “Då tog censuren låten…” Expressen, 24.10.1966, 5.
Gronow, Pekka. 1966. “M.A. ja minä.” Iskelmä. 9/1966, 16–17 ja 47
Hbl.= Hufvudstadsbladet. 1964. “Elektrontonsättare utan konstambition.”
  Hufvudstadtsbladet, 16.1.1964, 1, 11.
Heikinheimo, Seppo. 1962. “The University of Helsinki Electronic Music
  Studio.” World of Music (4)3, June 1962, 56.
--- 1965. “Tyylinsä etsijöitä sekä nykymusiikin klassikoita.” Helsingin Sano-
    mat, 8.7.1965, 11.
--- 1967. “Tietokoneestako säveltäjien karsija.” Helsingin Sanomat,
    29.10.1967, 20.
--- 1972. “Tietokone orkesterin täydentäjänä Oulussa.” Helsingin Sanomat,
    20.10.1972, 24.
HS = Helsingin Sanomat. 1962. “Ylioppilasteatteri tarjoaa ekspressionismia
  ja runoa.” Helsingin Sanomat, 9.10.1962, 21.
--- 1964. “Televisio tänään.” Helsingin Sanomat, 22.3.1964, 15.
--- 1966. “Hei kaupunki – tervetuloa.” Helsingin Sanomat, 4.5.1966, 16.
--- 1966. “Kirjallisuus ja taide – ensi-iltakalenteri.” Helsingin Sanomat,
    2.7.1966, 9.
--- 1968. “Liikettä, valoa ja sähkö Eino Ruutsalon näyttelyyn.” Helsingin Sa-
    nomat, 17.1.1968, 17.
--- 1968. “Soulset, Numminen ja Muksut Sofiaan.” Helsingin Sanomat,
    14.7.1968, 15.
--- 1970. “[Wedding announcements].” Helsingin Sanomat, 15.5.1970, 13.
--- 1971. “Suomalainen teki sävellystietokoneen.” [A Finn Designed a Compo-
    sition Computer]. Helsingin Sanomat, 21.1.1971, 5.
--- 1971. “Ydinfyysikon sävelkone maailmanmarkkinoille.” [The Nuclear Phy-
    sicist’s Tune Machine to the World Market]. Helsingin Sanomat,
    21.1.1971, 13.
--- 1971. “tapahtuu tänään.” Helsingin Sanomat, 26.5.1971, 18.
--- 1971. “Suomalainen yritys jo toiminnassa: Tv-kasetit käyttöön viimeistään
    v. 1978.” Helsingin sanomat, 28.5.1971, 16.
--- 1971. “[Radio ja televisio].” Helsingin Sanomat, 20.7.1971, 25.
--- 1971. “Oulussa pidetään vakavasta musiikista.” Helsingin Sanomat,
    30.8.1971, 11.



                                       266

[p. 267 / pdf 293]

Hämäläinen, Raimo. 1972, “Videopositiivi.” Tekniikan Maailma, 5/1972, 34–
  36.
[Juva, Mikko] 1972. Kertomus Helsingin yliopiston toiminnasta lukuvuonna
   1971–1972. Helsinki: Valtionneuvoston kirjapaino.
--- 1973. Kertomus Helsingin yliopiston toiminnasta lukuvuonna 1972–
    1973. Helsinki: Valtionneuvoston kirjapaino.
J.V. 1960. “Norssit elektronimusiikin parissa.” Uusi Suomi, 18.3.1960, 18.
[Kivinen, Erkki] 1963. Kertomus Helsingin yliopiston toiminnasta luku-
  vuonna 1962–1963. Helsinki: Valtionneuvoston kirjapaino.
--- 1965. Kertomus Helsingin yliopiston toiminnasta lukuvuonna 1964–
    1965. Helsinki: Valtionneuvoston kirjapaino.
--- 1967. Kertomus Helsingin yliopiston toiminnasta lukuvuonna 1966–
    1967. Helsinki: Valtionneuvoston kirjapaino.
--- 1968. Kertomus Helsingin yliopiston toiminnasta lukuvuonna 1967–
    1968. Helsinki: Valtionneuvoston kirjapaino.
--- 1969. Kertomus Helsingin yliopiston toiminnasta lukuvuonna 1968–
    1969. Helsinki: Valtionneuvoston kirjapaino.
--- 1970. Kertomus Helsingin yliopiston toiminnasta lukuvuonna 1969–
    1970. Helsinki: Valtionneuvoston kirjapaino.
--- 1971. Kertomus Helsingin yliopiston toiminnasta lukuvuonna 1970–1971.
    Helsinki: Valtionneuvoston kirjapaino.
Kujasalo, Kai and Fröberg, Per. 1971. “Syrjäyttääkö tietokone Kirkan?”. Suo-
  sikki, 6/1971, 1.6.1971, 67.
Kurenniemi, Erkki. 1971a. “Elektronisen musiikin instrumenteista.” Musiik-
  ki, 1(1), 37–41.
--- 1971b. “Message is massage.” Taide, 6/1971, 36–38.
--- (1972–1979?). Programmable space. [Thesis]. [Helsinki]: [Erkki Kuren-
    niemi].
--- 1999. Askeleen edellä: "Todellisuus on aina askeleen edellä mielikuvitus-
    ta": artikkeleita 1979–1999. Helsinki: Edita: Kiasma, Nykytaiteen museo
    [jakaja].
--- 2004. “Oh, human fart.” Framework, 2/2004, 34–37.
--- 2015. “On Electronic Music Instruments.” [Elektronisen musiikin instru-
    menteista]. In J. Krysa, & J. Parikka (Eds.), Writing and Unwriting (Me-
    dia) Art History: Erkki Kurenniemi in 2048. Cambridge: MIT Press.
    255–260.
Leino, Eino. 1971. “Musiikkia uusilla uruilla: DIMI soi pian Suomen maail-
   mankartalle.” Apu, 5.2.1971, 34–36.
Lindeman, Osmo. 1972. Tietojenkäsittelyopin peruskurssi. [Helsinki]: [Os-
   mo Lindeman].
--- 1973. Digitaalitekniikka. [Helsinki]: [Osmo Lindeman].



                                      267

[p. 268 / pdf 294]

References


--- 1974. Elektronisen musiikin teknologia. Helsinki: Sibelius-Akatemia.
--- 1976. Johdatus musiikin teoriaan. Helsinki: Otava.
--- 1980. Elektroninen musiikki: Elektronisen äänisynteesin perusteet. Hel-
    singissä: Otava.
Linkomies, Edwin. 1962. Kertomus Helsingin yliopiston toiminnasta luku-
   vuonna 1961–1962. Helsinki: Valtionneuvoston kirjapaino.
Lundsten, Ralph. 2006. En själens vagabond: en personlig levnadshistoria
  av och om en äventyrare i tid och rum. Saltsjö-Boo: Andromeda.
--- 2014. Cosmic Composer. Saltsjö-Boo: Andromeda Music.
Länsi-Savo 1970. “Länsi-Savon Radio- ja TV-liite.” Länsi-Savo, 17.10.1970,
   10.
--- 1971. “Maailman ensimmäinen musiikkitietokone valmis.” Länsi-Savo,
    21.1.1971, 10.
Mallander, Jan Olof. 1970. “Itsestään selviä asioita.” Iiris, 8/1970, 2–3.
Mangs, Runar 1965. “Till Picasso av Nilsson.” Dagens Nyheter, 27.10.1965,
  15.
Maunula, Leena. 1966. “Hei monimuotoinen kaupunki.” Helsingin Sanomat,
  15.5.1966, 22.
Nikkilä, Seppo 1993a. “Suomen ensimmäinen mikrotietokone.” In Mikrotie-
   tokone Suomessa 1973–1993. Risto Linturi ja Martti Tala. (Eds.) Helsinki:
   Yritysmikrot Oy. 36–40.
--- 1993b. “Bugi hirtettiin kumilenkkiin.” In Mikrotietokone Suomessa 1973–
    1993. Risto Linturi ja Martti Tala. (Eds.) Helsinki: Yritysmikrot Oy. 36–
    40.
Nilsson, Leo. 2014. Musikens Väsen. Stockholm: Themis.
Nordwall, Trygve. 1969. “Musikfestivalen i norr svårsmält för publiken.” Da-
  gens Nyheter, 3.7.1969, 16.
Nummi, Seppo. 1964. “Uusia akateemisia mestareita: Musiikkikilpailut päät-
  tyivät eilen.” Uusi Suomi, 6.4.1964, 6.
Numminen, Mauri Antero. 1970. Kauneimmat runot. Helsinki: Kirjayhtymä
  Helsinki.
--- 1999. Helsinkiin: Opiskelija Juho Niityn Sivistyshankkeet 1960–1964.
    Espoo: Schildt.
--- 2020. Kaukana väijyy ystäviä. Helsinki: Docendo.
Olsson, Claes. 1971. “TV-kasetit – tajuntateollisuuden uusin ase.” Kansan
   Uutiset, 1.5.1971.
Oramo, Ilkka. 1968. “Elektronifolklorea.” Helsingin Sanomat, 29.9.1968, 19.
Pitkänen, Ilkka. 1970. “Nuorison taidetapahtuma: Vakka-Suomen Sähköhe-
   teeka ravisti unesta turkulaiset.” Helsingin Sanomat, 31.10.1970, 29.




                                        268

[p. 269 / pdf 295]

--- 1972. “Ihmelaatikko muuttaa muhinat musiikiksi.” Iltasanomat,
    22.2.1972, 7.
Rautee, Risto. 1978. Junavaa'an tietojenkäsittelyjärjestelmä [Train scaling
  data processing system]. Teknillinen korkeakoulu, Otaniemi.
  http://doi.org/10.5281/zenodo.3592770.
Reijonen-Oibopuu, Tuuli. 1964. “Mustaa ja oranssia”. Helsingin Sanomat,
   2.2.1964, 16.
Ruohomäki, Jukka. 1976. “Vaikutelmia Århusista: UNM-päivät 1976.” Mu-
  siikki 5(3): 43–49.
Salmenhaara, Erkki. 1964. “Erkki Kurenniemi och hans studio.” Nutida Mu-
   sik, 5/1964, 55–56.
--- 1967. “Tietokonemusiikin ongelmia.” Helsingin Sanomat, 31.10.1967, 18.
--- 1968. Vuosisatamme musiikki: 1900-luvun musiikin historia pääpiirteis-
    sään. Helsinki: Otava.
--- 1969. “Elektrononstop.” Helsingin Sanomat, 19.11.1969, 16.
--- 1970. “Elektrotapahtuma.” Helsingin Sanomat, 19.11.1970, 19.
Saunio, Ilpo. 1963. “Keskikesän keskipiste – Jyväskylän kesä.” Ylioppilasleh-
   ti, 30.8.1963, 4.
Sirén, Pekka. 1976. “Kokeellisesta toiminnasta YLE:ssä.” In Tehosteet ja ää-
   ni-ilmaisu. R. Korpio (Ed.). Helsinki: Oy. Yleisradio Ab. 49–58.
Stockhausen, Karlheinz. 1958. ”Ajatuksia elektronisesta musiikista.” Helsin-
   gin Sanomat, 16.4.1958.
Stump. 1968a. Rajua undergroundia. Stump, 6/1968, 5.
--- 1968b. “Soulset soitteli kultaa Sofiassa: Mukana myös M.A. Numminen,
    Anki ja Muksut.” Stump, 9/1968, 19.
Tarkka, Pekka. 1971. “Kaksi mestaria.” Helsingin Sanomat, 28.11.1971, 22.
Tawaststjerna, Erik. 1967. The Department of Musicology annual allowance
  application in the UHMRL archive.
Tawaststjerna, Erik. 1970. The Department of Musicology annual allowance
  application in the UHMRL archive.
Tawaststjerna, Erik. 1971. The Department of Musicology annual allowance
  application in the UHMRL archive.
TV. 1968. “Dipoli: Vauhdikas tapahtuma saa yleisön mukaansa.” Etelä-
   Suomen Sanomat, 24.3.1968, 9.
Uusi Suomi. 1962. “Maeterlinckiä ja Tolleria Ylioppilasteatteriin.” Uusi Suo-
  mi, 10.10.1962, 17.
--- 1964. “Akateemiset kulttuurikilpailut tänä keväänä täydessä laajuudessa.”
    Uusi Suomi, 5.4.1964, 20.
--- 1971. “Uusi taiteilijaryhmä järjestää Elonkorjuujuhlan.” Uusi Suomi,
    26.5.1971, 12.




                                      269

[p. 270 / pdf 296]

References


Valkonen, Markku. 1972. “Dimensio Tampereella: Taiteen taikahattuja.” Hel-
   singin Sanomat, 15.10.1972, 33.
Viikkosanomat. 1964. “Hän laulaa yksin.” Viikkosanomat, 10.4.1964, 47.
Virtaranta, Pertti, Huuhka, K., Koivisto, I., Polvinen, T., Tunkelo, E. & Wiio,
   O.A. 1973. Tiedon värikäs maailma: nykyaikainen tietosanakirja: osa 3:
   D–ETE. Helsinki: Uusi kirjakerho.
Wahlström, Erik. 1969. “Osmo Lindeman söker elektronmusikestetik.”
  Hufvudstadsbladet, 11.11.1969, 11.
Widding, Lars 1970. “Kärlekens ljuva musik.” Expressen, 8.8.1970, 13.
Zweigberck, Eva. 1966. “Hej stad.” Dagens Nyheter, 2.4.1966, 4.


Newspapers and magazines
Aftonbladet
Apu
Dagens Nyheter
Eksessi
Expressen
Etelä-Suomen Sanomat
Helsingin Sanomat
Hufvudstadtsbladet
Iiris
Iskelmä
Iltasanomat
Kansan Uutiset
Länsi-Savo
Nutida Musik
Stump
Svenska Dagbladet
Taide
Tekniikan maailma
Ylioppilaslehti


Photographs
Anon. [s.a.]. Photograph of Kurenniemi as an amateur radio operator. In The
  Finnish National Gallery/EKA.




                                       270

[p. 271 / pdf 297]

Anon. [s.a.]. Photograph of Kurenniemi programming the DIMI-A. In The
  Finnish National Gallery/EKA.
Anon. [s.a.]. Photograph of The DIMI-S tested by two unidentified players. In
  The Finnish National Gallery/EKA.
Anon. [s.a.]. Photograph of The DIMI-S (Sexophone) presented by Ralph
  Lundsten in a Swedish Television documentary. In Ralph Lundsten ar-
  chive.
Anon. [s.a.]. Photographs of The University Studio, 1971–1975. In The Finn-
  ish National Gallery/EKA.
Anon. [s.a.]. Photographs of The University Studio from 1976 to the late
  1970s. In Otavan iso musiikkitietosanakirja.
Anon. [s.a.]. Photograph of Composer Ralph Lundsten in his Andromeda
  Studio. In Otavan iso musiikkitietosanakirja.
Anon. [s.a.]. Photograph of Ruohomäki programming the DIMI 6000 in the
  Yle Ratakatu Studio. In Pekka Sirén archive.
Anon. [s.a.]. Photograph of Pekka Sirén and Joe Davidow with the DIMI
  6000. In Pekka Sirén archive.
Anon. [s.a.]. Photograph of the DIMI 6000. In Otavan iso musiikkitietosa-
  nakirja.
Anon. 1960. Photograph of Kurenniemi and his classmates on the loft of the
  school organ. In Uusi Suomi on March 18, 1960.
Anon. 1964. Photograph of M.A. Numminen and Kullervo Aura. In Uusi
  Suomi on April 5, 1964.
Anon. 1965. Photograph of Algorithmic music seminar with Ralph Lundsten,
  Leo Nillson and two identified persons in the Lehtikuva archive, ID:
  2038894; Date Created: 19650707.
Anon. 1968. Photographs of Sähkö-shokki-ilta (Electric Shock Evening) at
  the Amos Anderson Art Museum, February 9, 1968. In The Amos Ander-
  son Art Museum archive.
Anon. 1968. Photographs of The Andromatic in the exhibition Den Immate-
  riella Processen. In The Finnish National Gallery/EKA.
Anon. 1968. Photograph of Ralph Lundsten in Samlaren Gallery in Ralph
  Lundsten archive. https://www.andromeda.se/wp-
  content/uploads/2012/10/anmdromaticljusterminal.jpg.
Anon. 1971. Photograph of The DIMI-O in the event featuring art group
  Elonkorjaajat. In The Finnish National Gallery/EKA.
Anon. 1972. Photograph of the DIMI-S in Ralph Lundsten archive.
  https://www.andromeda.se/wp-content/uploads/2012/10/dimi-s.jpg.
Anon. 1972. Photographs of Erkki Kurenniemi and the DIMI-O in the
  Lehtikuva archive IDs: 2125578, 2125579, 1316483; Date Created:
  19720124.




                                      271

[p. 272 / pdf 298]

References


Anon. 1975. Photograph of Lindeman’s home studio setup in 1975. In Otavan
  iso musiikkitietosanakirja.
Ekholm, H. 1965. Photograph of Erkki Kurenniemi in the Lehtikuva archive,
  ID: 1316442; Date created: 19650323.
Hakli, K. 1959. Heimolan talon elokuvateatterit Aloha ja Arita.
  https://www.finna.fi/Record/kansa_ah.M011-1388008?.
Hakli, K. 1969. Hallituskatu 15 (=Yliopistonkatu 5), Heimolan talo.
  https://hkm.finna.fi/Record/hkm.HKMS000005%3Akm003w7c.
Haraste, P. 1968. Photograph of M.A. Numminen in the Lehtikuva archive
  ID: 1928201; Date Created: 19680715.
Jenytin, P. 1962. Photograph of Erik Tawaststjerna in the Lehtikuva archive,
   ID: 6667509; Date created: 19620901.
Kurenniemi, E. 1968. A series of photographs of the Andromatic at the An-
  dromeda studio in Kurenniemi’s collection in FNG/EKA.
--- 1974. A series of photographs in the Yle Liisankatu Studio on February 27,
    1974 in Kurenniemi’s collection in FNG/EKA.
Lindeman. S. 1972. Photograph of Composer Osmo Lindeman in his home
   studio in 1972. In Osmo Lindeman archive.
Messo, P. 1970. Photograph of the DIMI-A and Sähkökvartetti in the
  Lehtikuva archive ID: 33197848; Date Created: 19701117.
Oksanen, M. 1968. Photograph of Sähköshokki-ilta with Erkki Kurenniemi,
  Kalevi Seilonen and Cleas Andersson in the Lehtikuva archive, ID:
  22215978; Date Created: 19680209.
Saves, M. 1971. Photographs of Erkki Kurenniemi and Jukka Ruohomäki in
   the Lehtikuva archive ID: 1316478, 1260078, 1260076; Date Created:
   19710120.
Tapola, M. 1964. Photograph of M.A. Numminen in the Lehtikuva archive
   ID: 4160308; Date Created: [19640404].


Research data publications
Lindeman, Osmo, & Lindeman, S., & Ojanen, M. (2020). The Scrapbook of
   Osmo Lindeman: catalogued and annotated contents with sample pic-
   tures [Data set]. Zenodo. http://doi.org/10.5281/zenodo.3886432.
Ojanen, Mikko. 2018. Arrangement of J.S. Bach's Invention No. 13 in A mi-
   nor (BWV784) for the DIMI-A synthesizer by Erkki Kurenniemi (1970):
   An annotated video of the master tape. Zenodo.
   http://doi.org/10.5281/zenodo.1469722.
--- 2018. Templates for agreements and contracts on research data and ma-
    terials. Zenodo. https://doi.org/10.5281/zenodo.846985.
--- 2019. Appearances of Erkki Kurenniemi's Electronic Musical Instru-
    ments (Version 20191130) [Data set]. Zenodo.
    https://doi.org/10.5281/zenodo.842854.



                                      272

[p. 273 / pdf 299]

--- 2019. The development of Digelius Electronics Finland (DEF) in the doc-
    umentary evidence (Version 20191225_01) [Data set]. Zenodo.
    http://doi.org/10.5281/zenodo.3592770.
--- 2019. Preliminary metadata for the UHMRL digital tape archive pilot
    (Version 20191223_01) [Data set]. Zenodo.
    http://doi.org/10.5281/zenodo.3591336.
--- 2019. The User Interface and Functionality Charts of Erkki Kurenniemi's
    Electronic Musical Instruments (EKIS) [Data set]. Zenodo.
    https://doi.org/10.5281/zenodo.3596466.
--- 2020. Analyses of the works of art and events related to Erkki Kuren-
    niemi's Electronic Musical Instruments (EKIS)
    https://doi.org/10.5281/zenodo.2092577.
--- 2020. The Photo Set of the Master Tape of Erkki Kurenniemi's On-Off
    (1963) (Version 20200108_01). Zenodo.
    http://doi.org/10.5281/zenodo.3601403.
--- 2020. The User Interface and Functionality Charts of Erkki Kurenniemi's
    Electronic Musical Instruments (EKIS) (Version Version 2: 20200101)
    [Data set]. Zenodo. https://doi.org/10.5281/zenodo.2089416.


Sound recordings
Carlos, W. 1968. Switched-On Bach. (Columbia Masterworks – MS 7194).
   https://www.discogs.com/Walter-Carlos-Switched-On-
   Bach/release/1308287.
Ciani, S. 2016. Buchla Concerts 1975. (Finders Keepers Records –
   FKR082LP). https://www.discogs.com/Suzanne-Ciani-Buchla-Concerts-
   1975/release/8439470.
Koivistoinen, E. 1971. Muusa ja Ruusa (WSOY – WS 8)
   https://www.discogs.com/Eero-Koivistoinen-Muusa-Ja-
   Ruusa/release/2450473.
Kurenniemi, E. 2002. Äänityksiä/Recordings 1963–1973. (Love Records –
  LXCD 637). https://www.discogs.com/Erkki-Kurenniemi-
  %C3%84%C3%A4nityksi%C3%A4-Recordings-1963-
  1973/release/221581.
--- 2012. Rules. (Full Contact Records – KRYPT-022).
    https://www.discogs.com/Erkki-Kurenniemi-Rules/release/3791751.
--- 2012. Music for the film Hyppy. In Rules. (Full Contact Records –
    KRYPT-022).
    https://soundcloud.com/ektrorecords/erkki-kurenniemi-music-for-the.
Lundsten, R. & Nilsson. L. 1966. Elektronmusikstudion Dokumentation 1.
  (Sveriges Radio – LPD 1). https://www.discogs.com/Ralph-Lundsten-
  Leo-Nilson-Elektronmusikstudion-Dokumentation-1/release/938156.




                                      273

[p. 274 / pdf 300]

References


--- 1967. MUMS: Musik Under Millioner Stjärnor. (Sveriges Radio – RELP
    5023). https://www.discogs.com/Ralph-Lundsten-Leo-Nilson-MUMS-
    Musik-Under-Millioner-Stj%C3%A4rnor/release/1321092.
--- 1968. Elektronisk Musik. (His Master’s Voice –CSDS 1085).
    https://www.discogs.com/Ralph-Lundsten-Leo-Nilson-Elektronisk-
    Musik/release/907465.
--- 1968. Feel it. (Andromeda – A2). https://www.discogs.com/Ralph-
    Lundsten-And-Leo-Nilsson-Feel-It/release/2473419.
--- 1969. Feel it. Exhibition Edition. (Andromeda – A2).
    https://www.discogs.com/Ralph-Lundsten-Leo-Nilson-Feel-It-
    Exhibition-Edition-/release/10416668.
--- 1969. Tellus / Fågel Blå. (Telestar – TRS 11066).
    https://www.discogs.com/Ralph-Lundsten-Leo-Nilson-Tellus-
    F%C3%A5gel-Bl%C3%A5/release/2215498.
Nilsson, L. 1964. Skorpionen / Copa De Poma. ([Konstsalongen Samlaren]).
   https://www.discogs.com/Leo-Nilson-Skorpionen-Copa-De-
   Poma/release/11323683#images/31900490.
Numminen, M.A. 1964. Background tape for Oigu-S. In More Arctic Hyste-
  ria / Son Of Arctic Hysteria: The Later Years Of Early Finnish Avant-
  Garde (Love Records – LXCD 647) https://www.discogs.com/Various-
  More-Arctic-Hysteria-Son-Of-Arctic-Hysteria-The-Later-Years-Of-Early-
  Finnish-Avant-Garde/release/600283.
--- 1970. Taisteluni. (Love Records – LXLP 501).
    https://www.discogs.com/MA-Numminen-Ja-Viisi-Vierasta-
    Miest%C3%A4-Taisteluni/release/714591.
Salmenhaara, E. 1967. Information Explosion. (Love Records – LREP 103).
   https://www.discogs.com/Erkki-Salmenhaara-Information-
   Explosion/release/8819351.
Various. 1968. Perspectives '68 – Music In Finland. (Love Records – LRLP
   4). https://www.discogs.com/Various-Perspectives-68-Music-In-
   Finland/release/1389437.
--- 1978. Suomalaista Elektroakustista Musiikkia – Finnish Electro-Acoustic
    Music. (Fennica Nova – FENO 5). https://www.discogs.com/Various-
    Suomalaista-Elektroakustista-Musiikkia-Finnish-Electro-Acoustic-
    Music/release/1469987.
--- 1982. Musica Nova Academiae. Sibelius-Akatemia 1882 – 1982. (SALP
    1). https://www.discogs.com/Various-Musica-Nova-Academiae-Sibelius-
    Akatemia-1882-1982/release/6521662.


Websites
120 years of electronic music. http://120years.net/.
Avaruusromua: https://yle.fi/aihe/ohjelma/avaruusromua.




                                      274

[p. 275 / pdf 301]

Andrew Bentley’s Sound Cloud: https://soundcloud.com/andrew-bentley-
  804731324.
Electronic Musical Instruments by Erkki Kurenniemi website:
   http://ekis.helsinki.fi.
Electronic Musical Instruments by Erkki Kurenniemi, Zenodo community:
   https://zenodo.org/communities/electronic-musical-instruments-by-
   kurenniemi/.
Elonet: https://elonet.finna.fi/.
Finna.fi: https://www.finna.fi/Content/about.
Finnish Electroacoutic Research Sources: http://finears.helsinki.fi.
IMDB: https://www.imdb.com/.
Kansallinen audiovisuaalinen instituutti: Kavi (National Audiovisual Institu-
  te): https://kavi.fi/.
Kansallisbiografia (National Biography of Finland):
  https://kansallisbiografia.fi/.
Kansalliskirjasto (National Library of Finland’s digital archive):
  https://digi.kansalliskirjasto.fi/.
Lehtikuva: http://kuvakauppa.lehtikuva.fi/edoris?tem=www_e.
Leo Nilsson’s Sound Cloud: https://soundcloud.com/user-745910767.
Music Finland: https://musicfinland.com.
NIMiMS: Network for the inclusion of music in music studies:
  http://nimims.net/.
Phinnweb: http://www.phinnweb.org/.
Radioamatööritoiminnan kutsumerkit ja yhteisöt Suomessa:
  https://fi.wikipedia.org/wiki/Radioamat%C3%B6%C3%B6ritoiminnan_k
  utsumerkit_ja_yhteis%C3%B6t_Suomessa.
Rahanarvolaskuri (Money Value Converter):
  http://apps.rahamuseo.fi/rahanarvolaskin#ENG.
Otto Romanowski’s Sound Cloud: https://soundcloud.com/oromanow.
S-HIP – Society for Historical Informed Performance:
   https://sohipboston.squarespace.com/what-is-hip/.
Scenknostmuseet, teater, musik, dans, kultur (the Swedish Museum of Per-
   forming Arts) https://scenkonstmuseet.se/.
Vanhat Norssit semanttisessa webissä: http://www.norssit.fi/semweb/.
WikiChip, MCS-8: https://en.wikichip.org/wiki/intel/mcs-8.
Ylioppilasteatteri (Helsinki Student Theater): https://ylioppilasteatteri.fi/in-
   english/.
Äänenlumo.fi: www.aanenlumo.fi.




                                        275

[p. 276 / pdf 302]

References



Research literature


Adams, Norman. 2006. Visualization of Musical Signals. In M. Simoni (Ed.),
  Analytical Methods of Electroacoustic Music. New York: Routledge. 13–
  28.
Adorno, Theodor W. 2006. Esteettinen Teoria. Tampere: Vastapaino.
Akrich, Madeleine. 1992. The De-Scription of Technical Objects. In W. Bijker,
   & J. Law (Eds.), Shaping Technology/Building Society: Studies in Soci-
   otechnical Change. Cambridge, Mass.: MIT press. 205–224.
Anttonen, Erkki. 1995. Performance, Aktio, Happening: Jälkiä katoavasta
  taiteesta. Helsinki: Helsingin yliopiston taidehistorian laitos.
Arrasvuori, Juha. 2006. Playing and Making Music: Exploring the Similari-
   ties between Video Games and Music-Making Software. Tampere: Tam-
   pere University Press.
Ashby, Arved. 2010. Absolute Music, Mechanical Reproduction. Berkeley:
   University of California Press.
Baer, C. T. 2011. From “Home Sweet Home" to "Karn Evil 9”: Hagley docu-
   ments the origins of the synthesizer.
   https://www.hagley.org/librarynews/home-sweet-home-karn-evil-9-
   hagley-documents-origins-synthesizer.
Ballantine, Christopher. 1977. Towards an aesthetic of experimental music.
   The Musical Quarterly, 63(2), 224–246.
Bent, Ian. 1987. Analysis. London: Macmillan Press, Music Division.
Bernstein, David W. 2008. The San Francisco Tape Music Center: 1960s
   Counterculture and the Avant-Garde. Berkeley: University of California
   Press.
Bijker, Wiebe. 1995. Of Bicycles, Bakelites and Bulbs: Toward a Theory of
   Sociotechnical Change. Cambridge: MIT.
Bijker, Wiebe E., & Law, J. (Eds.). 1992. Shaping Technology/Building Soci-
   ety: Studies in Sociotechnical Change. Cambridge, Mass.: MIT Press.
Bijker, Wiebe, Hughes, T., & Pinch, T. 2012a. Introduction. In W. Bijker, T.
   Hughes & T. Pinch (Eds.), The Social Construction of Technological Sys-
   tems: New Directions in the Sociology and History of Technology. Anni-
   versary Edition. Cambridge. Cambridge: The MIT Press. 3–10.
--- 2012b. The Social Construction of Technological Systems: New Direc-
    tions in the Sociology and History of Technology. Anniversary edition
    Cambridge: The MIT press.
Bijker, Wiebe, & Pinch, T. 2012. Preface to the Anniversary Edition. In W.
   Bijker, T. Hughes & T. Pinch (Eds.), The Social Construction of Techno-
   logical Systems: New Directions in the Sociology and History of Tech-
   nology. Anniversary Edition. Cambridge: The MIT press. xi–xxxiv.




                                      276

[p. 277 / pdf 303]

Birnbaum, David, Fiebrink, R., Malloch, J., & Wanderley, M. M. 2005. To-
   wards a Dimension Space for Musical Devices. Proceedings of the 2005
   Conference on New Interfaces for Musical Expression. Singapore: Na-
   tional University of Singapore. 192–195.
Borgmann, Albert. 1984. Technology and the Character of Contemporary
   Life: A Philosophical Inquiry. Chicago: Chicago University Press.
Born, Georgina. 1995. Rationalizing Culture: IRCAM, Boulez, and the Insti-
   tutionalization of the Musical Avant-Garde. Berkeley: University of Cali-
   fornia Press.
Broman, Per Olov. 2007. Kort Historik Över Framtidens Musik: Elektron-
   musiken Och Framtidstanken i Svenskt 1950- Och 60-Tal. Stockholm:
   Gidlund.
Burke, Peter. 1991a. History of Events and the Revival of Narrative. In P.
  Burke (Ed.), New Perspectives on Historical Writing. Cambridge: Polity
  Press. 233–248.
--- 1991b. Overture: The New History, its Past and its Future. In P. Burke
    (Ed.), New Perspectives on Historical Writing. Cambridge: Polity Press.
    1–23.
Böhme-Mehner, Tatjana. 2011. Does the GDR have its own electroacoustic
  sound? Contemporary Music Review, 30(1), 5–13.
Callon, Michel. 1980. The state and technical innovation: A case study of the
   electrical vehicle in France. Research Policy, 9(4), 358–376.
   https://doi.org/10.1016/0048-7333(80)90032-3.
--- 2012. Society in the Making: The Study of Technology as a Tool for Socio-
    logical Analysis. In W. Bijker, T. Hughes & T. Pinch (Eds.), The Social
    Construction of Technological Systems: New Directions in the Sociology
    and History of Technology. Cambridge: MIT Press. 77–97.
Camilleri, Lelio, & Smalley, D. 1998. The analysis of electroacoustic music:
  Introduction. Journal of New Music Research, 27(1), 3–12.
Carr, Edward Hallett. 1986. What is History? 2nd ed. London: Macmillan.
Cascone, Kim. 2000. The Aesthetics of Failure: “Post-Digital” Tendencies in
   Contemporary Computer Music. Computer Music Journal, 24(4), 12–18.
Chadabe, Joel. 1997. Electric Sound: The Past and Promise of Electronic
  Music. Upper Saddle River, New Jersey: Prentice-Hall.
--- 2005. Writing History and Preservation. EMS Proceedings and Other
    Publications: EMS05 – Sound in Multimedia Contexts, Montréal.
Cogan, Robert. 1984. New Images of Musical Sound. Cambridge (Mass.):
  Harvard University Press.
Collins, Nick, & d'Escriván, J. (Eds.). 2007. The Cambridge Companion to
   Electronic Music. Cambridge: Cambridge University Press.
Collins, Nick, Schedel, M., & Wilson, S. 2013. Electronic Music. Cambridge:
   Cambridge University Press.




                                       277

[p. 278 / pdf 304]

References


Collins, Nicolas. 2006. Handmade Electronic Music: The Art of Hardware
   Hacking. New York and London: Routledge.
Crab, S. 2015. “‘DIMI’ & Helsinki Electronic Music Studio, Erkki Kurenniemi.
   Finland, 1961.” In 120 years of electronic music.
   http://120years.net/dimi-helsinki-electronic-music-studioerkki-
   kurenniemifinland1961-2/
Dahlhaus, Carl. 1983. Foundations of Music History. Cambridge: Cambridge
  University Press.
--- 1989. The Idea of Absolute Music. Chicago: University of Chicago Press.
Delalande, François. 1998. Music analysis and reception behaviors: Sommeil
   by Pierre Henry. Journal of New Music Research, 27(1), 13–66.
Demers, Joanna Teresa. 2010. Listening through the Noise: The Aesthetics
  of Experimental Electronic Music. New York: Oxford University Press.
Denzin, Norman K. 1970a. The Research Act: A Theoretical Introduction to
  Sociological Methods. Chicago: Aldine.
--- 1970b. Sociological Methods: A Sourcebook. London: Butterworths.
Doornbusch, Paul. 2017. Early computer music experiments in Australia and
  England. Organised Sound, 22(2), 297–307.
Dunsby, Jonathan. 1983. Music and semiotics: The Nattiez phase. The Musi-
  cal Quarterly, 69(1), 27–43.
Eerikäinen, Hannu. 2007. Videotaide Suomessa: Taiteen laidalla, eturinta-
   massa vai ei-kenenkään maalla? In K. Väkiparta (Ed.), Sähkömetsä: Vi-
   deotaiteen ja kokeellisen elokuvan historiaa Suomessa 1933–1998. 82–
   137.
Elster, Jon. 1983. Explaining Technical Change: A Case Study in the Philos-
   ophy of Science. Cambridge: Cambridge University Press.
Emmerson, Simon. 1982. Analysis and the composition of electroacoustic
  music. Authorized facsimile, UMI Dissertation Information Service.
Emmerson, Simon. 1986. The Relation of Language to Materials. In S. Em-
  merson (Ed.), The Language of Electroacoustic Music. Basingstoke:
  Macmillan. 17–39.
Emmerson, Simon, & Landy, L. 2016. The Analysis of Electroacoustic Music:
  The Differing Needs of its Genres and Categories. In S. Emmerson & L.
  Landy (Eds), Expanding the Horizon of Electroacoustic Music Analysis.
  Cambridge: Cambridge University Press. 8–27.
Emmerson, Simon, & Smalley, D. 2001. Electro-Acoustic Music. Grove Music
  Online. Oxford: Oxford University Press.
  https://doi.org/10.1093/gmo/9781561592630.article.08695
Ensmenger, Nathan. 2010. The Computer Boys Take Over: Computers, Pro-
  grammers, and the Politics of Technical Expertise. Cambridge, Mass.:
  MIT Press.




                                      278

[p. 279 / pdf 305]

Essl, Karlheinz. 2007. Algorithmic Composition. In N. Collins, & J. d'Es-
   criván (Eds.), The Cambridge Companion to Electronic Music. Cam-
   bridge University Press. 106–125.
Fagerberg, Jan. 2006. Innovation: A Guide to the Literature. In J. Fagerberg,
   D. C. Mowery & R. R. Nelson (Eds.), The Oxford Handbook of Innova-
   tion. Oxford: Oxford University Press. 1–26.
Gaskell, Ivan. 2001. Visual History. In P. Burke (Ed.), New Perspectives on
  Historical Writing. 2nd ed. Cambridge: Polity. 187–217.
Geertz, Clifford. 1973. The Interpretation of Cultures: Selected Essays. New
  York: Basic Books.
Ginzburg, Carlo. 1989. Clues, Myths, and the Historical Method. [Miti em-
   blemi spie: morfologia e storia] (J. Tedeschi, A. C. Tedeschi Trans.). Bal-
   timore: Johns Hopkins University Press.
--- 1993. Microhistory: Two or three things that I know about it. Critical In-
    quiry, 20(1), 10–35.
--- 2012. Our Word, and theirs: A Reflection on the Historian's Craft, Today.
    In S. Fellman, & M. Rahikainen (Eds.), Historical Knowledge: In Quest of
    Theory, Method and Evidence. Newcastle upon Tyne: Cambridge Schol-
    ars. 97–120.
Glinsky, Albert. 2000. Theremin: Ether music and espionage. Urbana and
   Chicago: University of Illinois Press.
Gloag, Kenneth. 2015. "A Thing of the Past": Canon Formation and the
   Postmodern Condition. In V. Kurkela, & M. Mantere (Eds.), Critical Mu-
   sic Historiography: Probing Canons, Ideologies and Institutions. Farn-
   ham, Surrey: Ashgate. 227–237.
Godin, Benoît. 2006. The linear model of innovation: The historical con-
  struction of an analytical framework. Science, Technology, & Human
  Values, 31(6), 639–667.
Goehr, Lydia. 1992. Writing music history. History and Theory, 31(2), 182–
  199.
--- 2007. The Imaginary Museum of Musical Works: An Essay in the Phi-
    losophy of Music. Rev. ed. Oxford: Oxford University Press.
Goldberg, RoseLee. 1979. Performance Art: From Futurism to the Present.
   London: New York: Thames and Hudson.
Groth, Sanne Krogh. 2014. Politics and Aesthetics in Electronic Music: A
   Study of EMS – Elektronmusikstudion Stockholm, 1964–1979. Berlin:
   Kehrer.
Hamilton, Andy. 2007. Aesthetics and Music. London; New York: Continu-
  um.
Haring, Kristen. 2007. Ham Radio's Technical Culture. Cambridge, Mass.:
  MIT Press.
Hatten, Robert S. 1992. Kofi Agawu. Playing with signs: A semiotic interpre-
  tation of classic music. Princeton: Princeton university press, 1991 and



                                       279

[p. 280 / pdf 306]

References


   Jean-Jacques Nattiez. Music and discourse: Toward a semiology of music.
   Translated by Carolyn Abbate. (Translation and abridgment of musicolo-
   gie genéralé et sémiologie [Paris: Christian bourgois, 1987].) Princeton:
   Princeton university press, 1990. Music Theory Spectrum, 14(1), 88–98.
   https://doi.org/10.2307/746084.
Hattwick, I., & Wanderley, M. M. A 2012. Dimension Space for Evaluating
  Collaborative Musical Performance Systems. New Interfaces for Musical
  Expression.
Headland, Thomas L. 1990. Introduction: A Dialogue between Kenneth Pike
  and Marvin Harris on Emics and Etics. In M. Harris, T. L. Headland & K.
  L. Pike (Eds.), Frontiers of Anthropology. Newbury Park, Calif.: Sage.
Heidegger, Martin. 1953. Tekniikan kysyminen [Die Frage Nach Der Tech-
  nik]. Niin & Näin, 2(94), 31–40.
Heiniö, Mikko. 1986. 12-säveltekniikan aika: Dodekafonian ja sarjallisuu-
  den reseptio ja Suomen luova säveltaide 1950-luvulta 1960-luvun puoli-
  väliin. Helsinki: Suomen musiikkitieteellinen seura.
--- 1988. Lastenkamarikonserteista pluralismiin: Postmoderneja piirteitä
    uudessa suomalaisessa musiikissa. Helsinki: Suomen musiikkitieteelli-
    nen seura.
--- 1995. Suomen musiikin historia 4: Aikamme musiikki 1945–1993. Por-
    voo: WSOY.
Henriksson, Juha. 2016. [Sleeve Notes]. Eero Koivistoinen: Muusa ja Ruusa.
  (Svart Records, SRE049).
Hobsbawm, Eric. 1980. The revival of narrative: Some comments. Past &
  Present, (86), 3–8.
--- 1998. On History. London: Abacus.
Holmes, Thom. 2012. Electronic and Experimental Music: Technology, Mu-
  sic, and Culture. 4th New York: Taylor & Francis.
Home, Marko. 2013. Uuden tuulen havinaa ilmassa: Sähkö-shokki-ilta 1968.
  [New Swish in the Air: Electric-Shock-Evening 1968] Musiikin Suunta,
  35(3), 17–23.
--- [forthcoming]. ”Pysähtymisessä vaanii kuolema!” – Eino Ruutsalon ko-
    keellinen 1960-luku sekä siihen johtanut kehity. [Working title of the
    fortcoming doctoral dissertation]. [s.l.]: [s.n.].
Hughes, Thomas. 1986. The seamless web: Technology, science, etcetera,
  etcetera. Social Studies of Science, 16(2), 281–292.
--- 1994. Technological Momentum. In M. R. Smith, & L. Marx (Eds.), Does
    Technology Drive History?: The Dilemma of Technological Determin-
    ism. Cambridge: The MIT Press. 101–113.
--- 2012. The Evolution of Large Technological Systems. In W. Bijker, T.
    Hughes & T. Pinch (Eds.), The Social Construction of Technological Sys-
    tems: New Directions in the Sociology and History of Technology. Anni-
    versary Edition Cambridge: The MIT press. 45–76.



                                     280

[p. 281 / pdf 307]

Hultberg, Teddy. 1994. Fylkingen: Ny Musik & Intermediakonst: Rikt Illu-
  strerad Historieskrivning & Diskussion För Radikal & Experimentell
  Konst 1933–1993. Stockholm: Fylkingen.
Huttunen, Matti. 1993. Modernin musiikinhistoriankirjoituksen synty Suo-
  messa: musiikkikäsitykset tutkimuksen uranuurtajien tuotannossa. Hel-
  sinki: Suomen musiikkitieteellinen seura.
--- 1995. The "Canon" of Music History and the Music of a Small Nation. In
    U. Lippus (Ed.), Music History Writing and National Culture: Proceed-
    ings of a Seminar, Tallinn, December 1–3, 1995. Tallinn: Eesti Keele In-
    stitut. 20–30.
Hvidlykke, John Alex. 2013. Erkki Kurenniemi: Pioneer of digital synthesis.
  Sound on Sound, September 2013 Retrieved from
  https://www.soundonsound.com/people/pioneer-digital-synthesis
Jensen, K.B. 2016. Intermediality. In K.B. Jensen, E.W. Rothenbuhler, J.D.
   Pooley and R.T. Craig (Eds), The International Encyclopedia of Commu-
   nication Theory and Philosophy.
   https://doi.org/10.1002/9781118766804.wbiect170
Jeppesen, Knud, & Lindeman, O. 1972. Kontrapunkti: Klassisen vokaalipo-
   lyfonian oppikirja. Helsinki: Musiikki Fazer.
Jordà, Sergi. 2004. Instruments and players: Some thoughts on digital lu-
   therie. Journal of New Music Research, 33(3), 321–341.
Juva, Anu. 2008. ”Hollywood-syndromi”, jazzia ja dodekafoniaa: elokuva-
   musiikin funktioanalyysi neljässä 1950- ja 1960-luvun vaihteen suoma-
   laisessa elokuvassa. Åbo: Åbo akademis förlag = Åbo Akademi University
   Press.
Jylhä, Minna. 2002. Dimensio 1972–2002. In O. Kantokorpi (Ed.), Dimensio
   30: Dimension Vuodet 1972–2002. Helsinki: Like.
Kahn, David. 2001. Noise, Water, Meat: A History of Sound in the Arts.
  Cambridge, MA: MIT Press.
Kane, Brian. 2014. Sound Unseen: Acousmatic Sound in Theory and Prac-
  tice. New York: Oxford University Press.
Kantokorpi, Otso (Ed.). 2002. Dimensio 30. Dimension Vuodet 1972–2002.
  Helsinki: Like.
Karjalainen, Toni-Matti, & Kärki, K. (Eds.) 2020. Made in Finland: Studies
   in Popular Music. New York: Routledge.
Katz, Mark. 2010. Capturing Sound: How Technology has Changed Music.
   2nd and revised edition Berkeley: University of California Press.
--- 2012. Groove Music: The Art and Culture of the Hip-Hop DJ. Oxford
    University Press.
Korhonen, Kimmo. 2002. New Music of Finland. In J. D. White & J. Chris-
  tensen (Eds.) New Music of the Nordic Countries. [Hillsdale, NY]: Pen-
  dragon Press. 121–286.




                                      281

[p. 282 / pdf 308]

References


Krysa, Joasia, & Parikka, J. (Eds.). 2015. Writing and Unwriting (Media) Art
   History: Erkki Kurenniemi in 2048. Cambridge, Mass: MIT Press.
Kuljuntausta, Petri. 2002. On/Off: Eetteriäänistä sähkömusiikkiin. Helsinki:
   Like.
--- 2008. First Wave: A Microhistory of Early Finnish Electronic Music.
    Helsinki: Like.
--- 2020. The Hunters of New Sounds: Early Electronic Music Instruments
    and the Dawn of DIY Culture. In T.-M. Karjalainen & K. Kärki (Eds.)
    Made in Finland: Studies in Popular Music. New York: Routledge. 127–
    140.
Kurkela, Vesa, & Väkevä, L. 2009. Introduction. In V. Kurkela, & L. Väkevä
  (Eds.), De-Canonizing Music History. Newcastle upon Tyne: Cambridge
  Scholars Publishing. vii–xiii.
Laiho, Timo. 1982. Suomen musiikkinuorison "Lastenkamarikonsertit" ja
   niihin liittynyt lehdistöpolemiikki 1962–64. [S.l.]: [s.n.].
Laine, Pauli. 1984. Katsaus Suomen elektronimusiikin vaiheisiin.
Landy, Leigh. 1994. The “something to hold on to factor” in timbral composi-
   tion. Contemporary Music Review, 10(2), 49–60.
--- 1999. Reviewing the musicology of electroacoustic music: A plea for great-
    er triangulation. Organised Sound, 4(1), 61–70.
--- 2007. Understanding the Art of Sound Organization. Cambridge, Mass:
    MIT Press.
Lassfolk, K. 2012. Erkki Kurenniemen elektroakustisten sävellysten sointi-
   maailma. Suomen Musiikkitiede 100 Vuotta: Juhlasymposiumin Satoa,
   Helsinki. 58–65.
--- 2013a. The Electronic Music of Erkki Kurenniemi. In M. Mellais (Ed.),
    Erkki Kurenniemi: A Man from the Future. Helsinki: Finnish National
    Gallery. 74–98.
--- 2013b. Fourier-muunnos ja spektrianalyysikuvaajien tulkinta musiikin-
    tutkimuksessa, osa 1. Musiikin Suunta, 35(1), 55–62.
Lassfolk, K., Suominen, J., & Ojanen, M. 2014. DIMI-6000: An Early Musical
   Microcomputer by Erkki Kurenniemi. Proceedings of the 2014 ICMC
   Conference, Athens, 40 1538–1541.
--- 2015. Interaction of Music and Technology: The Music and Musical In-
    struments of Erkki Kurenniemi. In J. Krysa, & J. Parikka (Eds.), Writing
    and Unwriting (Media) Art History: Erkki Kurenniemi in 2048. Cam-
    bridge: MIT Press. 261–277.
Latour, Bruno. 1987. Science in Action: How to Follow Scientists and Engi-
   neers through Society. Milton Keynes: Open University Press.
Law, John. 2012. Technology and Heterogeneous Engineering: The Case of
  Portuguese Expansion. In W. Bijker, T. Hughes & T. Pinch (Eds.), The So-
  cial Construction of Technological Systems: New Directions in the Soci-
  ology and History of Technology. Cambridge: MIT Press. 105–128.



                                      282

[p. 283 / pdf 309]

Lemola, Tarmo. 2000a. Esipuhe. In T. Lemola (Ed.), Näkökulmia teknologi-
  aan. Helsinki: Gaudeamus. 9–15.
--- 2000b. Näkökulmia teknologiaan. Helsinki: Gaudeamus.
Leskinen, Jaakko. 2000. Michel Callon Ja Sosiologian Materialisointi. In T.
   Lemola (Ed.), Näkökulmia teknologiaan. Helsinki: Gaudeamus. 176–192.
Levi, Giovanni. 1991. On Microhistory. In P. Burke (Ed.), New Perspectives
   on Historical Writing. Cambridge: Polity Press. 93–113.
--- 2012. Microhistory and the Recovery of Complexity. In S. Fellman, & M.
    Rahikainen (Eds.), Historical Knowledge: In Quest of Theory, Method
    and Evidence. Newcastle upon Tyne: Cambridge Scholars. 121–132.
Lindfors, Jukka. 2016. Eteenpäin! 1966–1970 [Sleeve Note for a 6 LP Box-
   set]. Turku: Svart Records.
Lindfors, Jukka, & Salo, M. 1988. Ensimmäinen aalto: Helsingin under-
   ground 1967–1970. Helsinki: Odessa.
Lång, Peter. 1990. Den tidigaste elektronmusiken i Finland. Master's thesis,
   Åbo akademi, Musikvetenskapliga institution.
Magnusson, Thor. 2009. Epistemic Tools: The Phenomenology of Digital
  Musical Instruments. University of Sussex.
--- 2010. An Epistemic Dimension Space for Musical Devices. Proceedings of
    the 2010 Conference on New Interfaces for Musical Expression, 43–46.
Manning, Peter. 2013. Electronic and Computer Music. 4th edition. Oxford:
  Oxford University Press.
Mantere, Markus, & Kurkela, V. 2015. Introduction. In V. Kurkela, & M.
  Mantere (Eds.), Critical Music Historiography: Probing Canons, Ideolo-
  gies and Institutions. Farnham, Surrey: Ashgate. 1–13.
Marx, Leo, & Smith, M. R. 1994. Introduction. In L. Marx, & M. R. Smith
  (Eds.), Does Technology Drive History?: The Dilemma of Technological
  Determinism. Cambridge (Mass.): MIT Press. ix–xv.
Mathews, M. V. 1963. The digital computer as a musical instrument. Science,
  142(3592), 553–557. doi:10.1126/science.142.3592.553
McLuhan, Marshall. 1964. Understanding Media: The Extensions of Man.
  New York: McGraw-Hill.
McMaster, Tom, Vidgen, R. T., & Wastell, D. G. 1997. Technology Transfer:
  Diffusion Or Translation? In T. McMaster, E. Mumford, E. B. Swanson, B.
  Warboys & D. Wastell (Eds.), Facilitating Technology Transfer through
  Partnership: Learning from Practice and Research. Boston, MA: Spring-
  er.
Megill, Allan. 2007. Historical Knowledge, Historical Error: A Contempo-
  rary Guide to Practice. Chicago, Ill: University of Chicago Press.
Mellais, Maritta. 2013[2010]. Erkki Kurenniemen arkisto. In M. Mellais
  (Ed.), Erkki Kurenniemi: A Man from the Future. Helsinki: Finnish Na-




                                      283

[p. 284 / pdf 310]

References


   tional Gallery, Central Art Archives.
   http://www.lahteilla.fi/kurenniemi/fi/erkki-kurenniemen-arkisto
Mellais, Maritta (Ed.). 2013. Erkki Kurenniemi: A Man from the Future.
  Helsinki: Finnish National Gallery.
Merriam-Webster. 2019. A keyword entry Agent. Dictionary by Merriam-
  Webster. https://www.merriam-webster.com/dictionary/agent (Re-
  trieved on September 17, 2019).
Moisala, Pirkko, & Seye, E. 2013. Musiikintutkija ihmisten keskellä: Etnomu-
  sikologinen kenttätyö. In P. Moisala, & E. Seye (Eds.), Musiikki kulttuuri-
  na. Helsinki: Suomen etnomusikologinen seura. 29–55.
Molino, Jean. 1990. Musical fact and the semiology of music. Music Analysis,
  9(2), 105–156.
Monroe, Alexei. 2003. Ice on the circuits/coldness as crisis: The re-
  subordination of laptop sound. Contemporary Music Review, 22(4), 35–
  43.
Muikku, Jari. 2001. Musiikkia kaikkiruokaisille: Suomalaisen populaarimu-
  siikin äänitetuotanto 1945–1990. Helsinki: Gaudeamus.
Mumma, Gordon, Fillion, M., & Wolff, C. 2015. Cybersonic Arts: Adventures
  in American New Music. Urbana, Illinois: University of Illinois Press.
Nattiez, Jean-Jacques. 1975. Fondements D'Une Sémiologie De La Musique.
  Paris: Union Générale d'Éditions.
--- 1989. Reflections on the development of semiology in music. Music Anal-
    ysis, 8(1), 21–75.
--- 1990. Music and Discourse: Toward a Semiology of Music. Princeton
    (N.J.): Princeton University Press.
Niebur, Louis. 2010. Special Sound: The Creation and Legacy of the BBC
   Radiophonic Workshop. Oxford: Oxford University Press.
Niemelä, Riikka. 2019. Performatiiviset jäljet. Teos ja tallenne esityslähtöi-
   sessä mediataiteessa. Turku: Turun yliopisto.
Niiniluoto, Ilkka. 2000. Tekniikan filosofia. In T. Lemola (Ed.), Näkökulmia
   teknologiaan. Helsinki: Gaudeamus. 16–35.
Nikki, Tarja. 1993. Dualistisen sointuteorian tarkastelua kuulohavainnon
   pohjalta: Erityistapauksina Jouko Tolosen ja Erkki Kurenniemen teori-
   at. Helsinki: Tarja Nikki.
O’Modhrain, Sile. 2011. A framework for the evaluation of digital musical
   instruments. Computer Music Journal, 35(1), 28–42.
Ojanen, Mikko. 2013. Erkki Kurenniemi's Electronic Music Studio. In M.
   Mellais (Ed.), Erkki Kurenniemi: A Man from the Future. Helsinki: Finn-
   ish National Gallery, Central Art Archives. 99–128.
--- 2014a. Electroacoustic concert and happening performances of the ‘60s
    and early ‘70s in Finland. Proceedings of the Electroacoustic Music Stud-




                                       284

[p. 285 / pdf 311]

   ies Network Conference (EMS14): Electroacoustic Music Beyond Concert
   Performance, Berlin.
--- 2014b. Jukka Ruohomäen ensimmäisen sävellyskauden elektroakustinen
    musiikki. Musiikki, 44(1–2), 146–183.
--- 2015. Mastering Kurenniemi’s Rules (2012): The role of the audio engi-
    neer in the mastering process. Journal on the Art of Record Production,
    (10)
--- [forthcoming]. Kurenniemi, Erkki. In Kansallisbiografia-verkkojulkaisu.
    Helsinki: Suomalaisen Kirjallisuuden Seura, 1997–
    https://kansallisbiografia.fi/
Ojanen, Mikko, & Lassfolk, K. 2012. Material tape as a piece of art: case stud-
   ies of an inconstant work-concept in Erkki Kurenniemi’s Electroacoustic
   Music. Proceedings of the Electroacoustic Music Studies Network Con-
   ference (EMS12): Meaning and Meaningfulness in Electroacoustic Mu-
   sic, Stockholm.
Ojanen, Mikko, & Suominen, J. 2005. Erkki Kurenniemen sähkösoittimet.
   [The Electronic Musical Instruments of Erkki Kurenniemi] Musiikki,
   35(3), 15–44.
Ojanen, Mikko, Suominen, J., Kallio, T., & Lassfolk, K. 2007. Design Princi-
   ples and User Interfaces of Erkki Kurenniemi’s Electronic Musical In-
   struments of the 1960’s and 1970’s. Proceedings of the 2007 Conference
   on New Interfaces for Musical Expression (NIME07), New York. 88–93.
Oldenziel, Ruth. 2006. Signifying semantics for a history of technology.
   Technology and Culture, 47(3), 477–485.
Oudshoorn, Nelly, & Pinch, T. 2003. How Users and Non-Users Matter. In N.
  Oudshoorn, & T. Pinch (Eds.), How Users Matter: The Co-Construction
  of Users and Technologies. Cambridge: MIT Press. 1–25.
Paasonen, Susanna. 2013. Slimy Traces: Memory, Technology and the Ar-
   chive. In M. Mellais (Ed.), Erkki Kurenniemi: A Man from the Future.
   Helsinki: Finnish National Gallery. 32–56.
Padilla, Alfonso. 1996. Dialektinen lähestymistapa musiikkitieteessä I. Mu-
   siikki, 26(2), 223–283.
--- 1997. Dialektinen lähestymistapa musiikkitieteessä II. Musiikki, 27(2),
    135–194.
Padilla, Alfonso, & Torvinen, J. 2005. Johdanto. In A. Padilla, & J. Torvinen
   (Eds.), Musiikin filosofia ja estetiikka: Kirjoituksia taiteen ja populaarin
   merkityksistä. Helsinki: Yliopistopaino = Helsinki University Press. 9–21.
Patteson, Thomas. 2016. Instruments for new music: Sound, technology,
   and modernism. Oakland, California: University of California Press.
Peltonen, Matti. 1995. Carlo Ginzburg and the new microhistory. Suomen
   Antropologi, 20(1), 2–11.
--- 2002. Clues, margins, and monads: The micro–macro link in historical
    research. History and Theory, 40(3), 347–359.



                                       285

[p. 286 / pdf 312]

References


Pike, Kenneth Lee. 1967. Language in Relation to a Unified Theory of the
   Structure of Human Behavior. 2nd, rev. ed The Hague: Mouton.
Pinch, Trevor. 2009. Telling Tales about how Concepts Develop: Stories from
   Ethnographic Encounters with the Moog Synthesizer. In A. Puddephatt,
   W. Shaffir & S. Kleinknecht (Eds.), Ethnographies Revisited: Construct-
   ing Theory in the Field. Abingdon: Routledge. 180–194.
Pinch, Trevor, & Bijker, W. 1984. The social construction of facts and arte-
   facts: Or how the sociology of science and the sociology of technology
   might benefit each other. Social Studies of Science, 14(3), pp. 399–441.
--- 2012. The social construction of facts and artefacts: Or how the sociology
    of science and the sociology of technology might benefit each other. In W.
    Bijker, T. Hughes & T. Pinch (Eds.), The Social Construction of Techno-
    logical Systems: New Directions in the Sociology and History of Tech-
    nology. Anniversary Edition Cambridge: The MIT press. pp. 11–44.
Pinch, Trevor, & Trocco, F. 2002a. Analog Days: The Invention and Impact
   of the Moog Synthesizer. Cambridge, Mass: Harvard University Press.
--- 2002b. The Social Construction of the Early Electronic Music Synthesizer.
    In H. Braun (Ed.), Music and Technology in the Twentieth Century. Bal-
    timore: The Johns Hopkins University Press. 67–83.
Rahikainen, Marjatta, & Fellman, S. 2012. Introduction. In S. Fellman, & M.
  Rahikainen (Eds.), Historical Knowledge: In Quest of Theory, Method
  and Evidence. Newcastle upon Tyne: Cambridge Scholars. 1–3.
Rajewsky, Irina. 2005. Intermediality, intertextuality, and remediation: A
   literary perspective on intermediality. Intermédialités: Histoire Et
   Théorie Des Arts, Des Lettres Et Des Techniques/Intermediality: History
   and Theory of the Arts, Literature and Technologies, (6), 43–64.
Rantanen, Miska. 2005. Love Records 1966–1979: Tarina, taiteilijat, tuo-
  tanto. Espoo: Schildts.
Reimann, Heli. 2015. Jazz in Soviet Estonia from 1944 to 1953: Meanings,
   spaces and paradoxes. [S.l.], [s.n.].
Riikonen, Hannu. 1978. Osmo Lindemanin elektromusiikkituotannosta:
   arkkitehtonisia ja toteutusteknisiä periaatteita. Master's thesis, Universi-
   ty of Turku.
Risset, Jean-Claude. 2002. Foreword. In T. Licata (Ed.), Electroacoustic Mu-
   sic: Analytical Perspectives. Westport, Connecticut: Greenwood Press.
   xiii–xvii.
Rogers, Everett M. 1983. Diffusion of Innovations. 3rd edition. New York
  (NY): Free Press.
Rojola, Sanna. 2001. Musiikin ja tutkimuksen tekijät. Musiikki, 31(1), 92–96.
Rothbauer, Paulette M. 2008. Triangulation: The Sage Encyclopedia of Qual-
   itative Research Methods. In L. Given (Ed.), The SAGE Encyclopedia of
   Qualitative Research Methods. SAGE Publications, Inc.




                                       286

[p. 287 / pdf 313]

Ruohomäki, Jukka. 1994. Switched on: Electronic music under the wing of
  Yle. Finnish Music Quarterly, (1), 9–15.
--- 1998. Pioneers and explorers: Electronic music in Finland 1958–1998.
    Finnish Music Quarterly, (3), 28–35.
--- 2013. Otto Donner ja elektroninen musiikki. Musiikin Suunta, 35(3), 6–
    14.
--- 2020. Suomalaisen elektroakustisen musiikin historia [käsikirjoitus] /
    The History of Electroacoustic Music in Finland [manuscript]. Zenodo.
    https://doi.org/10.5281/zenodo.3605511.
Samuels, Robert. 2004. Mahler's Sixth Symphony: A Study in Musical Se-
  miotics. 1st pbk. edition. Cambridge; New York: Cambridge University
  Press.
Sandlund, Björn. 2019. The Early Synth Days: Dataton: The Creative Way
   of Making Sound. [S.l.]: Panoramicum Förlag.
Sarjala, Jukka. 2002. Miten tutkia musiikin historiaa: Johdatus näkökul-
   miin ja menetelmiin. Helsinki: Suomalaisen kirjallisuuden seura.
Schaeffer, Myron. 1963. The electronic music studio of the University of To-
   ronto. Journal of Music Theory, 7(1), 73–81. doi:10.2307/843022
Schaeffer, Pierre. 2017. Treatise on Musical Objects: An Essay Across Disci-
   plines. Oakland, California: University of California Press.
Schedel, Margaret. 2007. The Electronic Music Studio. In N. Collins, & J.
   d’Escriván (Eds.), Cambridge Companion to Electronic Music. Cam-
   bridge: Cambridge University Press. 24–38.
Shreffler, Anne C. 2003. Berlin walls: Dahlhaus, Knepler, and ideologies of
   music history. The Journal of Musicology, 20(4), 498–525.
Simoni, Mary. 2006. Analytical Methods of Electroacoustic Music. New
   York: Routledge.
Sirppiniemi, Ano. 2006. Home Studio Aesthetics: Tracking Cultural Process-
   es of Popular Music Production. In E. Pekkilä, D. Neumeyer & R. Little-
   field (Eds.), Music, Meaning and Media. Imatra: International Semiotics
   Institute. 174–191.
Sivuoja-Kauppala, Anne, Mantere, M., & Ojala, J. 2013. Esipuhe. Musiikki,
   43(3–4), 3–4.
Smirnov, Andrej. 2013. Sound in Z: Experiments in sound and electronic
  music in early 20th century Russia. London: Sound and Music.
Städje, Jörgen. 2009. Kärleksmaskinen – synten man spelar med hela krop-
   pen. IDG.Se, www.idg.se/2.1085/1.269878/karleksmaskinen---synten-
   man-spelar-med-hela-kroppen
--- 2012. Andromatic, den automatiska andromedaren. IDG.Se,
    www.idg.se/2.1085/1.445306/andromatic-den-automatiska-
    andromedaren




                                      287

[p. 288 / pdf 314]

References


--- 2013. Ett slag i luften för vacker musik. IDG.Se,
    www.idg.se/2.1085/1.514246/ett-slag-i-luften-for-vacker-musik
--- 2017. Fötterna på Jorden men huvudet bland molnen. Teknikaliteter –
    teknik på djupet. http://www.teknikaliteter.se/2017/10/24/fotterna-pa-
    jorden-men-huvudet-bland-molnen/
Sterne, Jonathan. 2003. The Audible Past: Cultural Origins of Sound Re-
   production. Durham: Duke University Press Books.
Stone, Lawrence. 1979. The Revival of Narrative: Reflections On a New Old
   History. Past & Present, (85), 3–24.
Suominen, Jari. 2013. Erkki Kurenniemi's Electronic Musical Instruments of
  the 1960s and 1970s. In M. Mellais (Ed.), Erkki Kurenniemi: A Man from
  the Future. Helsinki: Finnish National Gallery. 129–161.
--- 2020. Erkki Kurenniemi’s Integrated Synthesizer – User Manual of the
    Generator Unit. Zenodo. https://doi.org/10.5281/zenodo.3600460.
Sutinen, Virve. 2000. “The multidisciplinary path of Dimi-O.” Kiasma Mag-
   azine, 5(16) Retrieved from https://kiasma.fi/kiasma-
   lehti/16.php?lang=en&id=4
Taanila, Mika. 2002. Laitetestauksia / Just testing the equipment [Sleeve
   Notes]. In Erkki Kurenniemi: Äänityksiä/Recordings 1963–1973. Love
   Records – LXCD 637.
--- 2007. Seitsemännen taiteen sivullisia – kokeellinen elokuva Suomessa
    1933–1985. In K. Väkiparta (Ed.), Sähkömetsä: Videotaiteen ja kokeelli-
    sen elokuvan historiaa Suomessa 1933–1998. 8–81.
Tagg, P. 2015. NIMiMS: Network for the inclusion of music in music studies:
   http://nimims.net/.
Talbot, Michael. 2000. The Work-Concept and Composer-Centredness. In M.
   Talbot (Ed.), The Musical Work: Reality or Invention? Liverpool: Liver-
   pool University Press. 168–186.
Tamminen, Tatu. 2017. Reijo Jyrkiäisen elektroakustinen sävellystuotanto:
  Kolmen teoksen analyysi. University of Helsinki.
Tarasti, Eero. 2012. Semiotics of Classical Music: How Mozart, Brahms and
   Wagner Talk to Us. Boston: De Gruyter Mouton.
Taylor, Timothy D. 2001. Strange Sounds: Music, Technology & Culture.
   New York: Routledge.
Taylor, Timothy D., Katz, M., & Gradeja, T. (Eds.). 2012. Music, Sound, and
   Technology in America: A Documentary History of Early Phonograph,
   Cinema, and Radio. Durham: Duke University Press.
Tenney, James, Pratt, L., Wannamaker, R., Winter, M., & Polansky, L. 2015.
   From Scratch: Writings in Music Theory. Urbana: University of Illinois
   Press.
Théberge, Paul. 1997. Any Sound You Can Imagine: Making Mu-
  sic/Consuming Technology. Hanover (N.H.): Wesleyan University Press.




                                      288

[p. 289 / pdf 315]

--- 2001. “Plugged in”: Technology and Popular Music. In S. Frith, W. Straw
    & J. Street (Eds.), The Cambridge Companion to Pop and Rock. Cam-
    bridge, UK: Cambridge University Press. 3–25.
--- 2004. The network studio: Historical and technological paths to a new
    ideal in music making. Social Studies of Science, 34(5), 759–781.
Tiekso, Tanja. 2013. Todellista musiikkia: Kokeellisuuden idea musiikin
   avantgardemanifesteissa. Helsinki: Osuuskunta Poesia.
--- 2016. Art has Opened People's Eyes, Music People's Ears and Computers
    People's Minds: Erkki Kurenniemi on Music and Technology. In T. Ørum,
    & J. Olsson (Eds.), A Cultural History of the Avant-Garde in the Nordic
    Countries, 1950–1975. Avant-Garde Critical Studies; Volume 32. Leiden:
    Brill/Rodopi. 401–411.
Tiits, Kalev. 1990a. Erkki Kurenniemi – avantgarden innovaattori. Musiikki-
    tiede, 2(2), 37–60.
--- 1990b. Voluntääriassistentti Kurenniemi ja elektronimusiikin alku yli-
   opistolla. Master's thesis, University of Helsinki, Department of Musi-
   cology.
Toivakka, Svetlana. 2015. Alma Fohström: Kansainvälinen primadonna.
   Helsinki: Suomen musiikkitieteellinen Seura.
Tomlinson, Gary. 1984. The web of culture: A context for musicology. 19th-
  Century Music, 7(3), 350–362.
Torvinen, Juha. 2007. Musiikki ahdistuksen taitona: Filosofinen tutkimus
   musiikin eksistentiaalis-ontologisesta merkityksestä. Helsinki: Suomen
   musiikkitieteellinen seura.
Uimonen, Tanja. 2007. Erkki Salmenhaaran elektroakustiset teokset ja 1960-
  luvun säveltäjäkuva. [Erkki Salmenhaara’s electroacoustic works and
  composer image] Musiikki, 37(4), 85–99.
Ulmann, Bernd. 2013. Analog Computing. München: Oldenbourg Verlag.
van Oost, Elizabeth C.J. 2003. Materialized Gender: How Shavers Configure
   the Users' Feminity and Masculinity. In N. Oudshoorn, & T. Pinch (Eds.),
   How Users Matter: The Co-Construction of Users and Technology. MIT
   Press. 193–208.
Voorvelt, Martijn. 2000. New sounds, old technology. Organised Sound,
  5(2), 67–74.
Väkiparta, K. (Ed.) 2007. Sähkömetsä: Videotaiteen ja kokeellisen elokuvan
  historiaa Suomessa 1933–1998. Helsinki: Valtion taidemuseo.
Wanderley, M. M. 2001. Gestural control of music. International Workshop
  Human Supervision and Control in Engineering and Music, 632–644.
--- 2002. Evaluation of input devices for musical expression: Borrowing tools
    from HCI. Computer Music Journal, 26(3), 62–76.
Weale, R. 2005. Electroacoustic music: English definition. ElectroAcoustic
  Resource Site (EARS). http://ears.huma-num.fr/305810c2-a85b-4ac1-
  8b8f-04ee8d096249.html



                                      289

[p. 290 / pdf 316]

References


Wiggen, Knut. 1972. The electronic music studio at Stockholm, its develop-
  ment and construction. Journal of New Music Research, 1(2), 127–165.
Yli-Annala, Kari. 2007. Pieni jälkiteollinen tuotanto – taiteilijoiden liikkuva
    kuva Suomessa 1982–1998. In K. Väkiparta (Ed.), Sähkömetsä: Videotai-
    teen ja kokeellisen elokuvan historiaa Suomessa 1933–1998. 138–187.
Zaffiri, Enore. 2007. Selected Writings (1964–2003). In M. Libague (Ed.),
   Musica/Tecnologia 1. Firenze: Firenze University Press e Fondazione
   Ezio Franceschini. 367–412.




                                       290

[p. 291 / pdf 317]

APPENDIX

Appendix 1. Relevant social groups related to the
    development of Kurenniemi’s instruments




                            291

[p. 292 / pdf 318]

Appendix




           292

[p. 293 / pdf 319]

293

[p. unnumbered (blank) / pdf 320]

