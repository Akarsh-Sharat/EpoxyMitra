# EpoxyMitra — HTML, CSS & JavaScript

A complete browser-only website based on Epoxy_Aura.docx, extending the approved design into a premium black-and-gold light/dark experience.

## Temporary training visibility

All education and training code, course records, plans, batches and videos are preserved, but they are currently hidden from the public website. The Learning navigation, course plans, training schedules, Student Guide, training enquiries, training gallery item and training-related public copy do not appear. Direct visits to the hidden course/plan/batch routes return to Home.

To restore the complete training website later, open `app.js` and change `const TRAINING_VISIBLE = false;` to `true`. The underlying records have not been deleted.

The home page is now a full-screen cinematic showcase. Guide videos open from two compact notification cards at the bottom-left; the WhatsApp topic selector sits at the bottom-right. There is no visible slideshow countdown or progress bar. The black/red/gold background changes subtly, with additional colour accents and reduced-motion support.

The approved visual design is preserved while adding an English/Hindi/Bengali language selector. The selected language is stored in the browser and remains active across every client-side page; dynamically rendered views, catalogue descriptions, dialogs, form labels, validation feedback, admin text and weather status are translated as they appear. This temporary translation system is built into `i18n.js`, requires no API key, billing or backend, and works without sending page text to an outside translation service. Brand names and common technical product names remain recognizable. The navigation remains accessible while scrolling on desktop and mobile.

Customer Guide and Student Guide are video-first controls with a clear Play Video action. Local admin → Guide videos can upload/replace either MP4/WebM file, edit its title and description, or enable/disable it without source-code changes.

The Gallery menu includes a searchable, category-filtered collection. New concepts feature glitter dining tables, illuminated resin tables, preserved flowers, stars, metallic floors, nature-inspired 3D floors and colourful furniture. These are realistic-looking AI-created concepts, not photographs of completed EpoxyMitra projects.

The fixed bottom strip shows Kolkata date/time (IST) and a weather forecast integration. On local file previews, use its Forecast link; automatic weather requires a publicly hosted website. The business map appears directly below the address on Contact and in the footer. Browser Print / Save PDF now uses an English black/red/gold estimate template with calculation assumptions and clear totals.

## Open it

1. Extract the entire ZIP.
2. Open index.html in a current Chrome, Edge, Firefox or Safari browser.
3. Use the header language list for English, Hindi or Bengali and the moon/sun button to change the theme.
4. Open Estimator for a customer budget, or Local admin in the footer for catalogue, rates and guide-video editing.

No npm install, build, framework or database is required. Keep every file and the assets folder together. If your browser blocks local storage for file URLs, use VS Code Live Server or run `python -m http.server 8000` in this directory and open http://localhost:8000.

## Business details used

- EpoxyMitra
- Art Your Own Kingdom
- Phone / WhatsApp: +91 6202533268
- Address: Street 917, New Town, Kolkata

The document did not provide an official email, confirmed hours, class dates, precise entrance pin or actual project photos. No email has been invented, the email row is omitted, visits are arranged by phone, the map is explicitly a street search, and training dates are arranged by enquiry. All image areas are populated with finished concept imagery. No fabricated client testimonials, completed-project claims or trainer identities have been added.

## Pages

The website has 16 navigable client-side pages. Hash routing keeps it working when index.html is opened directly; these are distinct application views rather than separate server-rendered HTML files.

| Route | Page |
| --- | --- |
| #home | Cinematic showcase, software/course videos, services, designs and work process |
| #about | Business profile and audiences |
| #services | Flooring, consultation, learning and resin furniture |
| #gallery | Filterable concept gallery and image lightbox |
| #designs | Property/room-based design catalogue |
| #pricing | Indicative flooring/furniture rates and learning prices |
| #estimator | Multi-space budget calculator and finish comparison |
| #courses | Course search, levels, mode filters, syllabus and enquiries |
| #plans | Beginner, Intermediate and Advanced learning plans |
| #batches | Training enquiries and any admin-published schedules |
| #consultation | Video-consultation session options |
| #enquiry | Project brief, area, budget, dates and image attachments |
| #contact | Phone, WhatsApp, street map and quick enquiries |
| #faq | Questions about cost, design, learning and quotations |
| #privacy | Browser-local information and external service handling |
| #admin | Local catalogue, enquiries, pricing and reports |

## Files to edit

| File | Purpose |
| --- | --- |
| index.html | Shared header, navigation, footer and script loading |
| styles.css | Original approved responsive theme and light/dark colours |
| business.css | Additional business-page, gallery, estimator and print styles |
| showcase.css | Full-screen layout, floating guides/chat, animated background, live strip and themed PDF print styles |
| data.js | Base course/plan/design catalogue |
| business.js | EpoxyMitra details, active prices, gallery, consultation content and estimator systems; applied after data.js |
| gallery-data.js | Additional unique gallery concepts and featured homepage selections |
| i18n.js | Persistent English/Hindi translation for static and dynamically rendered UI |
| weather.js | Kolkata live clock, cached forecast request, provider attribution and offline handling |
| calculator.js | Pure arithmetic and input validation; no UI dependency |
| app.js | Page rendering, navigation, form handling, local admin and exports |
| assets/ | Original PNG concepts, new gallery JPEG images and two Full-HD MP4 walkthrough videos |

For permanent default rate/contact/content changes, edit business.js. The earlier base content in data.js is intentionally overridden by business.js before rendering. Admin changes are browser-local; they do not rewrite these files. Stored data takes precedence after your first admin/form save. Do not delete local data without exporting it first.

## Calculator

Supports plain, metallic, pearl, glitter, 3D/image, marble/abstract, flake/hybrid, clear protective, countertop/tabletop and river-table work.

- Enter up to 20 measured spaces in sq.ft or m².
- Use the ↔ button beside a space for length × width measurement.
- Changing area units converts existing measurements, rather than reinterpreting them.
- Select additional preparation, design detail and an optional finish upgrade.
- Adjust material wastage, contingency, transport and an optional tax allowance.
- Compare systems in the same family (flooring or furniture).
- Compare the planning total with an optional available budget.
- Print/save PDF using the browser print dialog, download text details or open the estimate in WhatsApp.
- Carry the estimate into the project-enquiry form.

### Calculation rules

Materials = area × material rate × design multiplier × (1 + wastage / 100).

Labour, extra preparation and finish upgrades use measured area only, without the material wastage or design multiplier.

Minimum adjustment = max(0, system minimum − materials − labour − preparation − upgrade).

Subtotal = work costs + minimum adjustment + transport.

Tax allowance = subtotal × user-entered tax percentage.

Contingency = subtotal × contingency percentage.

Planning total = subtotal + tax allowance + contingency.

Each monetary line is rounded to two decimals before addition. The planning range is total ±15%; it is not a guaranteed bound. Tax defaults to 0 and is excluded unless explicitly entered. The percentage is an allowance, not tax advice. Contingency is a reserve, not a contractor charge. No catalogue promotions are automatically applied.

### Proposed base rates

| System | Materials / sq.ft | Labour / sq.ft | Base combined / sq.ft | Minimum work allowance |
| --- | ---: | ---: | ---: | ---: |
| Plain | ₹80 | ₹40 | ₹120 | ₹15,000 |
| Metallic | ₹150 | ₹65 | ₹215 | ₹15,000 |
| Pearl | ₹170 | ₹70 | ₹240 | ₹15,000 |
| Glitter | ₹125 | ₹55 | ₹180 | ₹15,000 |
| 3D / image | ₹245 | ₹85 | ₹330 | ₹20,000 |
| Marble / abstract | ₹160 | ₹65 | ₹225 | ₹15,000 |
| Flake / hybrid | ₹105 | ₹45 | ₹150 | ₹15,000 |
| Clear protective | ₹55 | ₹30 | ₹85 | ₹12,000 |
| Countertop / tabletop | ₹650 | ₹300 | ₹950 | ₹7,500 |
| River table | ₹2,200 | ₹1,000 | ₹3,200 | ₹25,000 |

These rates were chosen for budgeting as requested; they are NOT researched market quotations, approved EpoxyMitra commercial rates or product technical specifications. Confirm them before business use. The default 500 sq.ft metallic example totals ₹1,24,025 with 5% material allowance, ₹1,500 transport, 10% contingency, no extra prep/upgrade and no tax allowance.

Base allowances include standard preparation and a standard finishing system. Extra preparation is an addition, not a second charge for standard work. Furniture area means tabletop/countertop area. Countertop resurfacing excludes new cabinetry. The river-table allowance is provisional for timber, resin, a standard base and finishing; actual slab, volume, hardware and engineering requirements can change cost substantially. Major damp/structural remediation, demolition, unusual access and specialist artwork need a separate quotation.

Local admin → Estimator rates edits material, labour, minimum work, default waste, contingency and transport. Saving these rates also updates linked design base rates. Additional-preparation and finish options are deliberately visible fixed planning allowances in app.js.

## Project enquiries and files

The project form collects name, mobile, optional email, service, location, area/unit, preferred system, residential/commercial use, preferred date, budget range, site photos, reference image and message.

Up to 3 site photos and 1 reference image are supported (PNG/JPEG/WebP, 500 KB each). They are previewed and stored locally when storage permits. The user must attach the photos manually in WhatsApp; a wa.me URL cannot attach files.

Preparing an enquiry is NOT sending it. The user opens WhatsApp and presses Send. A local save failure does not prevent preparing a project WhatsApp draft or downloading its text. No delivery confirmation is claimed. If the user edits area/finish after carrying over a calculator estimate, the original estimate remains explicitly identified in the message; return to the calculator for revised numbers.

## Admin and persistence limitations

This remains HTML/CSS/JavaScript only: no backend, real authentication, central database, automatic email, payments or server-side enquiry collection. Local admin is public and explicitly labelled as a demo. It is not safe for confidential multi-user records. Customers on other browsers do not appear automatically in your local admin inbox.

Current records use `epoxy-aura-data-v3`. New gallery records are merged by ID, preserving existing courses, rates, contacts and enquiries. On first use of this gallery edition, new featured slides are prepended up to the 20-image limit; existing default slides remain available in the gallery. Earlier v2/v1 data is not overwritten. Local admin → Reports → Export previous-version data downloads earlier data for safekeeping. There is no general restore/import UI.

Export CSV/JSON before clearing browser data. Downloads may contain personal information and should be kept private. Browser storage has size limits. Admin image uploads accept 600 KB per image; homepage video uploads accept MP4/WebM up to 2 MB. Use smaller media or suitable HTTPS URLs for large catalogues. Concurrent-tab changes are detected before saves where possible; keep one editing tab open because localStorage is not a transactional database.

No confirmed batches were provided. The initial batch list is therefore empty, with a complete training-enquiry page instead of invented dates/seats. Admin can add actual schedules. A New enquiry does not consume a seat; Confirmed local batch registrations do. Course/plan/batch reference safeguards from the previous version remain in place.

## Image provenance

The original nine images and newly generated gallery assets are stored locally. New JPEGs are encoded at quality 88 without rescaling. The new native image resolution is 1672 × 941, not 1920 × 1080; these must not be advertised as native Full HD. The two tutorial videos are 1920 × 1080. The image tool did not produce the requested Full-HD dimensions, so original image detail is preserved instead of silently upscaling. No stock-image hotlinks or fake completed-project claims are used.

## Weather integration

Weather uses MET Norway Locationforecast for fixed Kolkata coordinates, not device geolocation. It is model forecast data, not a live sensor measurement. The displayed provider and CC BY 4.0 attribution link are included. Requests use the hosted website origin, cache data for at least 45 minutes, stop on 403/429, and avoid refreshes while the tab is hidden. Local file/localhost previews show an external Forecast link instead of falsely displaying current conditions. A high-traffic public deployment should use a caching backend as required by the provider: https://api.met.no/doc/TermsOfService.

## Saving an epoxy-themed PDF

Open Estimator, enter your measurements, then choose **Print / save PDF**. Select **Save as PDF**, A4, and enable **Background graphics** to retain the dark red and gold header. Print/PDF styles force a light paper canvas and dark body text even when the application is in Dark Mode; branded header text keeps its high-contrast gold/cream treatment. Embedded PDF containers are also forced to a light readable colour scheme. Disable the browser's own headers/footers if you do not want the file URL on the page. The PDF remains in English, is a planning estimate rather than a tax invoice, and includes clear calculation details. Text and CSV downloads remain data formats, not decorative PDFs.

## Validation

JavaScript syntax, the 16 page-route mappings, image/script/style references, catalogue relationships, preserved-data merging, estimator arithmetic, print-template totals and address/map ordering were checked. Weather tests use controlled responses to verify the IST clock, local-file fallback, forecast caching and blocked-provider handling. The live weather service was not tested from a deployed website. Gallery counts and unique asset files are checked before packaging.

Automated browser/visual/end-to-end testing was not performed. Before launch, review the website in your actual browser, confirm commercial prices, test WhatsApp with your intended device, and replace concept images with permissioned real project photos when available. A production multi-user release requires secure backend handling.
