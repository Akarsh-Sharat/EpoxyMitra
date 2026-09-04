/* EpoxyMitra: plain JavaScript, no frameworks or server required.
 * Data stays in this browser. Admin is a public DEMO, not authentication.
 * Keep rendering, forms and business rules together for easy maintenance.
 */
(() => {
  'use strict';
  const STORAGE_KEY = 'epoxy-aura-data-v3';
  const THEME_KEY = 'epoxy-studio-theme';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const clone = object => JSON.parse(JSON.stringify(object));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => new Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', maximumFractionDigits:2}).format(Number(value) || 0);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const prettyDate = value => value ? new Date(value + 'T12:00:00').toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : 'Not set';
  const uid = prefix => prefix + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
  let storageWarning = '';
  let lastStoredValue = null;
  let data = clone(window.EPOXY_SEED);
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    lastStoredValue = stored;
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.version !== 3 || !['courses','designs','plans','batches','enquiries'].every(key => Array.isArray(parsed[key])) || !parsed.settings || !parsed.categories || !parsed.estimator || !parsed.home) throw new Error('Invalid data');
      data = parsed;
    }
  } catch (_) { storageWarning = 'Saved data could not be read. The business catalogue is shown; existing browser data has not been overwritten.'; }
  let adminTab = 'overview';
  // Add new gallery concepts without discarding saved courses, rates or enquiries.
  if(!Array.isArray(data.gallery))data.gallery=[];
  if(!Array.isArray(data.home.slideshow))data.home.slideshow=[];
  data.home.customerGuide={enabled:data.home.customerGuide?.enabled!==false,title:data.home.customerGuide?.title||'Customer Guide',description:data.home.customerGuide?.description||'Browse designs, check prices and send an enquiry.',video:data.home.customerGuide?.video||data.home.softwareVideo||'assets/how-to-use-software.mp4'};
  data.home.studentGuide={enabled:data.home.studentGuide?.enabled!==false,title:data.home.studentGuide?.title||'Student Guide',description:data.home.studentGuide?.description||'Explore courses, fees and registration.',video:data.home.studentGuide?.video||data.home.courseVideo||'assets/how-to-join-course.mp4'};
  for(const item of window.EPOXY_SEED.gallery)if(!data.gallery.some(g=>g.id===item.id))data.gallery.push(clone(item));
  if(!data.home.galleryEdition){
    const newSlides=window.EPOXY_SEED.home.slideshow.filter(s=>!data.home.slideshow.some(old=>old.id===s.id));
    const remainingSlots=Math.max(0,20-data.home.slideshow.length);
    data.home.slideshow=[...newSlides.slice(0,remainingSlots),...data.home.slideshow];
    data.home.galleryEdition=1;
  }
  let enquiryFilter = 'All';
  let toastTimer;
  let quotePrefill = {};
  let estimatorSystem = 'metallic';
  let currentEstimate = null;
  let slideshowTimer = null;
  const main = $('#main');
  const modal = $('#modal');
  const levels = ['Beginner','Intermediate','Advanced'];
  const statuses = ['New','Contacted','Confirmed','Closed','Cancelled'];

  function notify(message) {
    if (modal.open) {
      let status = $('#modal-status');
      if (!status) { status = document.createElement('p'); status.id = 'modal-status'; status.className = 'notice'; status.setAttribute('role','status'); $('#modal-body').prepend(status); }
      status.textContent = message;
    }
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4500);
  }

  // Commit only after storage succeeds, so the UI never claims an unsaved change worked.
  function commit(next) {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== lastStoredValue) {
        notify('Data changed in another tab. Reload this page before saving to avoid overwriting newer changes.');
        return false;
      }
      const serialized = JSON.stringify(next);
      localStorage.setItem(STORAGE_KEY, serialized);
      lastStoredValue = serialized;
      data = next;
      storageWarning = '';
      return true;
    } catch (_) {
      notify('Could not save. Browser storage may be full or disabled. Try a smaller image or enable storage.');
      return false;
    }
  }

  function discountState(item, date = today()) {
    const percent = Math.min(100, Math.max(0, Number(item.discount) || 0));
    const active = percent > 0 && (!item.discountStart || item.discountStart <= date) && (!item.discountEnd || item.discountEnd >= date);
    return {active, percent, final:Math.round(Number(item.price) * (active ? 1-percent/100 : 1) * 100)/100};
  }

  function availableSeats(batch, source = data, excludeEnquiry = '') {
    const confirmed = source.enquiries.filter(e => e.batchId === batch.id && e.status === 'Confirmed' && e.id !== excludeEnquiry).length;
    return Math.max(0, batch.capacity - batch.occupied - confirmed);
  }

  function imageSource(value) {
    if (/^assets\/[a-z0-9_./-]+$/i.test(value || '')) return value;
    if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value || '')) return value;
    try { const url = new URL(value); if (url.protocol === 'https:') return url.href; } catch (_) { /* Invalid image source is not rendered. */ }
    return 'assets/pearl-floor.png';
  }

  function videoSource(value) {
    if (/^assets\/[a-z0-9_./-]+\.(mp4|webm)$/i.test(value || '')) return value;
    if (/^data:video\/(mp4|webm);base64,[a-z0-9+/=]+$/i.test(value || '')) return value;
    try { const url = new URL(value); if (url.protocol === 'https:') return url.href; } catch (_) {}
    return '';
  }

  function priceHtml(item, caption = '') {
    const d = discountState(item);
    return `<div class="price">${money(d.final)}${d.active ? `<del>${money(item.price)}</del>` : ''}<small>${esc(caption || 'Indicative course fee')}</small></div>`;
  }

  function heading(title, subtitle, aside = '') {
    return `<div class="section-heading"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${aside}</div>`;
  }

  const options = (items, selected = '', all = '') => (all ? `<option value="">${esc(all)}</option>` : '') + items.map(item => {
    const value = typeof item === 'string' ? item : item.value;
    const label = typeof item === 'string' ? item : item.label;
    return `<option value="${esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${esc(label)}</option>`;
  }).join('');

  function openModal(title, body) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = body;
    if (!modal.open) modal.showModal();
  }

  function closeModal() { $$('video',modal).forEach(v=>v.pause()); modal.close(); }
  modal.addEventListener('close',()=>$$('video',modal).forEach(v=>v.pause()));
  $('#close-modal').addEventListener('click', closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) { const r = modal.getBoundingClientRect(); if(event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(); } });

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $('#theme-toggle').textContent = theme === 'dark' ? '☀' : '☾';
    $('#theme-toggle').setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    $('#theme-toggle').setAttribute('aria-pressed', String(theme === 'dark'));
    try {localStorage.setItem(THEME_KEY,theme);} catch (_) { /* Theme still works for this session. */ }
  }
  let initialTheme = 'dark';
  try { const storedTheme = localStorage.getItem(THEME_KEY); if (['dark','light'].includes(storedTheme)) initialTheme = storedTheme; } catch (_) {}
  setTheme(initialTheme);
  $('#theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  $('#menu-toggle').addEventListener('click', () => { const open = $('#navigation').classList.toggle('open'); $('#menu-toggle').setAttribute('aria-expanded', String(open)); });
  document.addEventListener('error', event => {
    if (event.target.tagName === 'IMG') {
      if (event.target.id === 'image-preview') { event.target.alt = 'Image unavailable — choose another image'; return; }
      const fallback = document.createElement('div'); fallback.className = 'broken-image'; fallback.textContent = 'Image unavailable — update this image in Admin'; event.target.replaceWith(fallback);
    }
  }, true);

  function courseCard(course) {
    const d = discountState(course);
    return `<article class="card"><div class="card-media"><img src="${esc(imageSource(course.image))}" alt="${esc(course.name)} — sample design concept" loading="lazy" width="480" height="300"><span class="badge">${esc(course.level)}</span>${d.active ? `<span class="badge offer">${d.percent}% off</span>` : ''}</div><div class="card-body"><h3>${esc(course.name)}</h3><p class="description">${esc(course.description)}</p><div class="card-meta"><span>${course.duration} hours</span><span>${course.mode === 'Both' ? 'Online + Offline' : esc(course.mode)}</span></div><div class="card-bottom">${priceHtml(course)}<button class="button small secondary" data-action="detail" data-kind="courses" data-id="${course.id}">View course ↗</button></div></div></article>`;
  }

  function designCard(design) {
    const d = discountState(design);
    return `<article class="card"><div class="card-media"><img src="${esc(imageSource(design.image))}" alt="${esc(design.name)} — sample epoxy concept" loading="lazy" width="480" height="300"><span class="badge">${esc(design.category)}</span>${d.active ? `<span class="badge offer">${d.percent}% off</span>` : ''}</div><div class="card-body"><h3>${esc(design.name)}</h3><p class="description">${esc(design.description)}</p><div class="card-bottom">${priceHtml(design, 'From · ' + design.unit)}<button class="button small secondary" data-action="detail" data-kind="designs" data-id="${design.id}">Explore design ↗</button></div></div></article>`;
  }

  function renderCourses() {
    main.innerHTML = `<section class="hero"><div class="hero-copy"><span class="eyebrow">The epoxy design academy</span><h1>A new skill.<br><em>Endless possibilities.</em></h1><p>Learn beautiful surface design, one practical step at a time. Find your course or follow a complete learning path.</p><div class="hero-links"><a href="#plans">Explore learning plans ↗</a><a href="#batches">Find your next batch ↗</a></div></div><div class="hero-image"><img src="assets/pearl-floor.png" alt="Pearl and graphite epoxy floor in a contemporary living room" width="650" height="400"><div class="image-caption">Metallic & pearl finishes · AI-created design concept</div></div></section><div class="section-heading"><div><span class="eyebrow">Start where you are</span><h2>Find your next course</h2></div><span class="count" id="result-count"></span></div><div class="toolbar"><label class="search-field">Search courses<input id="catalog-search" type="search" placeholder="Try 3D, bedroom or furniture…"></label><label>Level<select id="level-filter">${options(levels,'','All levels')}</select></label><label>Learning mode<select id="mode-filter">${options(['Online','Offline'],'','Any mode')}</select></label><label>Category<select id="category-filter">${options(data.categories.courses,'','All categories')}</select></label><label>Sort by<select id="sort-filter">${options([{value:'level',label:'Learning order'},{value:'low',label:'Price: low to high'},{value:'high',label:'Price: high to low'}])}</select></label></div><div class="grid" id="catalog-grid"></div><div class="path-strip"><div><strong>Prefer a complete learning path?</strong><p>Beginner → Intermediate → Advanced, with courses grouped into clear plans.</p></div><a class="button secondary" href="#plans">Compare plans ↗</a></div><p class="note">Course fees are indicative. Confirm the learning mode, materials, schedule and final fee before enrolment. Images illustrate the craft and design styles.</p>`;
    const update = () => {
      const q = $('#catalog-search').value.toLowerCase().trim();
      const level = $('#level-filter').value, mode = $('#mode-filter').value, category = $('#category-filter').value, sort = $('#sort-filter').value;
      const items = data.courses.filter(c => (!q || (c.name + ' ' + c.description).toLowerCase().includes(q)) && (!level || c.level === level) && (!mode || c.mode === mode || c.mode === 'Both') && (!category || c.category === category));
      items.sort((a,b) => sort === 'level' ? levels.indexOf(a.level)-levels.indexOf(b.level) : (discountState(a).final-discountState(b).final) * (sort === 'high' ? -1 : 1));
      $('#catalog-grid').innerHTML = items.length ? items.map(courseCard).join('') : '<div class="empty">No courses match these filters. Try a different search or level.</div>';
      $('#result-count').textContent = `${items.length} course${items.length === 1 ? '' : 's'}`;
    };
    $$('.toolbar input, .toolbar select').forEach(el => el.addEventListener('input', update)); update();
  }

  function renderPlans() {
    main.innerHTML = heading('One plan. A complete skill set.', 'Choose a structured path, from first principles to complete interior design.') + `<div class="grid">${data.plans.map((plan,i) => `<article class="card plan ${i === 1 ? 'featured' : ''}"><span class="eyebrow">${esc(plan.level)} plan</span><h2>${esc(plan.name)}</h2><p>${esc(plan.description)}</p>${priceHtml(plan,'Indicative package fee')}<span class="badge">${plan.duration} hours · ${plan.courseIds.length} courses</span><ul>${plan.courseIds.map(id => `<li>${esc(data.courses.find(c=>c.id===id)?.name || 'Course unavailable')}</li>`).join('')}</ul><p>Modes and schedules are agreed per included course.</p><button class="button ${i === 1 ? '' : 'secondary'}" data-action="enquire" data-kind="plans" data-id="${plan.id}">Enquire about this plan ↗</button></article>`).join('') || '<div class="empty">No plans yet. Add your first plan in Admin.</div>'}</div><div class="notice top-space">Package discounts apply to the package price only; they are not stacked with individual-course discounts. Training dates and availability are confirmed after discussion. No online payment is collected on this website.</div>`;
  }

  function renderDesigns() {
    main.innerHTML = heading('Make the space your own.', 'Explore epoxy finishes for homes, rooms, offices and furniture.', '<a class="button" href="#contact">Discuss a custom design ↗</a>') + `<div class="toolbar"><label class="search-field">Search designs<input id="catalog-search" type="search" placeholder="Search by name or finish…"></label><label>Property / room type<select id="category-filter">${options(data.categories.designs,'','All spaces')}</select></label></div><div class="grid" id="catalog-grid"></div><p class="note">Concept imagery, not a portfolio of completed client projects. Indicative starting rates are not final quotations. Measurements, substrate preparation, materials, installation, transport and taxes must be confirmed with your project scope.</p>`;
    const update = () => { const q = $('#catalog-search').value.trim().toLowerCase(), category = $('#category-filter').value; const items = data.designs.filter(d => (!q || (d.name+' '+d.description).toLowerCase().includes(q)) && (!category || d.category===category)); $('#catalog-grid').innerHTML = items.length ? items.map(designCard).join('') : '<div class="empty">No matching designs. Contact us for a custom concept.</div>'; };
    $$('.toolbar input, .toolbar select').forEach(el=>el.addEventListener('input',update)); update();
  }

  function renderBatches() {
    main.innerHTML = heading('Make time for your craft.', 'Explore online sessions and hands-on training batches.') + `<div class="notice">Training is arranged after discussion. Published batches, when available, appear below. An enquiry does not reserve a seat.</div><div class="chip-row"><button class="chip active" data-batch-mode="">All batches</button><button class="chip" data-batch-mode="Online">Online</button><button class="chip" data-batch-mode="Offline">Offline</button></div><div class="schedule" id="batch-list"></div>`;
    const update = (mode='') => {
      const batches = data.batches.filter(b => b.start >= today() && (!mode || b.mode===mode)).sort((a,b)=>a.start.localeCompare(b.start));
      $('#batch-list').innerHTML = batches.length ? batches.map(b => { const c=data.courses.find(c=>c.id===b.courseId), seats=availableSeats(b); return `<article class="batch-row"><div class="date-block"><strong>${new Date(b.start+'T12:00:00').getDate()}</strong><span>${new Date(b.start+'T12:00:00').toLocaleDateString('en',{month:'short'})}</span></div><div><h3>${esc(b.name)}</h3><p>${esc(c?.name || 'Unavailable course')} · ${esc(b.mode)}</p><p>${prettyDate(b.start)} — ${prettyDate(b.end)}</p></div><div><p>${esc(b.schedule)}</p><p>${esc(b.location)}</p><span class="seats">${seats ? seats+' seats available' : 'Batch full'}</span></div><button class="button small secondary" data-action="batch-enquire" data-id="${b.id}" ${!seats || !c ? 'disabled' : ''}>Register interest ↗</button></article>`; }).join('') : '<div class="panel"><h3>Arrange your learning schedule</h3><p>Choose online guidance or offline practical learning in New Town, Kolkata. Tell us your topic, experience level and preferred dates. We will confirm the schedule, materials, venue and seat availability before enrolment.</p><div class="form-actions"><a class="button" href="#courses">Choose a course ↗</a><a class="button secondary" href="https://wa.me/916202533268?text=Hello%20Epoxy%20Aura%2C%20I%20would%20like%20to%20discuss%20online%20or%20offline%20training%20dates." target="_blank" rel="noopener noreferrer">Ask about training dates</a></div></div>';
    };
    $$('[data-batch-mode]').forEach(b=>b.addEventListener('click',()=>{ $$('[data-batch-mode]').forEach(el=>el.classList.toggle('active',el===b)); update(b.dataset.batchMode); })); update();
  }

  function showDetail(kind, id) {
    const item=data[kind]?.find(i=>i.id===id); if(!item) return;
    const d=discountState(item);
    openModal(item.name, `<img class="detail-image" src="${esc(imageSource(item.image))}" alt="${esc(item.name)} concept"><div class="detail-meta"><span class="badge">${esc(item.category)}</span>${kind==='courses' ? `<span class="badge">${esc(item.level)}</span><span class="badge">${item.duration} hours</span><span class="badge">${esc(item.mode==='Both'?'Online + Offline':item.mode)}</span>` : ''}${d.active?`<span class="badge">${d.percent}% off ${esc(item.offer)}</span>`:''}</div><p class="detail-description">${esc(item.description)}</p>${kind==='courses'?`<h3>What you’ll learn</h3><ul class="detail-list">${(item.syllabus || '').split('\n').filter(Boolean).map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}${priceHtml(item,kind==='courses'?'Indicative course fee':'Indicative starting rate · '+item.unit)}${d.active&&item.discountEnd?`<p class="fine">Offer ends ${prettyDate(item.discountEnd)}.</p>`:''}<div class="form-actions"><button class="button" data-action="enquire" data-kind="${kind}" data-id="${id}">${kind==='courses'?'Enquire / register interest':'Request a design consultation'} ↗</button></div><p class="note">${kind==='courses'?'Registration and learning arrangements require confirmation.':'Final pricing depends on measurements and project scope.'} AI-created design concept.</p>`);
  }

  function enquiryForm(context = {}) {
    const type = context.kind==='designs'?'Customer Design':context.kind==='plans'?'Course Plan':'Student Course';
    return `<form id="enquiry-form"><div class="form-grid"><label>Full name<input name="name" required minlength="2" maxlength="100" autocomplete="name"></label><label>Mobile number<input name="phone" type="tel" required maxlength="20" autocomplete="tel" placeholder="Include country code"></label><label>Email address<input name="email" type="email" maxlength="150" autocomplete="email"></label><label>Enquiry type<select name="type">${options(['Student Course','Course Plan','Customer Design','General Contact'],type)}</select></label><label class="full">Course / plan / design<select name="itemId"></select></label><label id="mode-field">Learning mode<select name="mode"></select></label><label id="batch-field">Preferred batch<select name="batchId"></select></label><label class="full">Your message<textarea name="message" maxlength="2000" placeholder="Tell us what you would like to learn or create…" required></textarea></label><label class="full check-label"><input type="checkbox" name="consent" required><span>I understand a local copy is saved on this device. I must open WhatsApp and press Send to contact the business.</span></label></div><p class="form-error" id="enquiry-error" role="alert"></p><button type="submit" class="button">Prepare enquiry ↗</button><p class="note">On the next screen, open WhatsApp and send your prepared message. No payment or seat reservation is made here.</p></form>`;
  }

  function bindEnquiryForm(context={}) {
    const form=$('#enquiry-form');
    const type=form.elements.type, itemSelect=form.elements.itemId, mode=form.elements.mode, batch=form.elements.batchId;
    const collection=()=>type.value==='Student Course'?'courses':type.value==='Course Plan'?'plans':type.value==='Customer Design'?'designs':'';
    const updateBatch=()=>{
      const relevant=data.batches.filter(b=>b.courseId===itemSelect.value && b.mode===mode.value && b.start>=today() && availableSeats(b)>0);
      batch.innerHTML=options(relevant.map(b=>({value:b.id,label:`${b.name} · ${prettyDate(b.start)} · ${availableSeats(b)} seats`})),'','Discuss schedule later');
      $('#batch-field').hidden=type.value!=='Student Course';
    };
    const updateMode=()=>{
      const c=data.courses.find(c=>c.id===itemSelect.value);
      mode.innerHTML=options(type.value==='Course Plan'?['Discuss per course','Online','Offline']:c&&c.mode!=='Both'?[c.mode]:['Online','Offline']);
      $('#mode-field').hidden=!['Student Course','Course Plan'].includes(type.value);
      updateBatch();
    };
    const updateItems=()=>{ const kind=collection(); itemSelect.innerHTML=options(kind?data[kind].map(i=>({value:i.id,label:i.name})):[],'','Not decided yet'); updateMode(); };
    type.addEventListener('change',updateItems); itemSelect.addEventListener('change',updateMode); mode.addEventListener('change',updateBatch);
    updateItems();
    if(context.id){itemSelect.value=context.id;updateMode();}
    if(context.batchId){const b=data.batches.find(b=>b.id===context.batchId);if(b){mode.value=b.mode;updateBatch();batch.value=b.id;}}
    form.addEventListener('submit',event=>{
      event.preventDefault(); const fd=new FormData(form), name=String(fd.get('name')).trim(), phone=String(fd.get('phone')).trim(), message=String(fd.get('message')).trim();
      const fail=msg=>{$('#enquiry-error').textContent=msg;};
      if(name.length<2 || !message) return fail('Please enter your name and message.');
      if(!/^\+?[\d\s()-]{7,20}$/.test(phone) || phone.replace(/\D/g,'').length<7 || phone.replace(/\D/g,'').length>15) return fail('Enter a valid mobile number with 7–15 digits.');
      const kind=collection(), item=kind?data[kind].find(i=>i.id===itemSelect.value):null;
      const selectedBatch=type.value==='Student Course'?data.batches.find(b=>b.id===batch.value):null;
      if(selectedBatch && (selectedBatch.start<today() || availableSeats(selectedBatch)<1)) return fail('This batch is no longer available. Choose another batch.');
      const record={id:uid('e'),createdAt:new Date().toISOString(),name,phone,email:String(fd.get('email')||'').trim(),type:type.value,kind,itemId:item?.id||'',itemName:item?.name||'Not decided',mode:['Student Course','Course Plan'].includes(type.value)?mode.value:'',batchId:selectedBatch?.id||'',batchName:selectedBatch?.name||'',message,status:'New',notes:'',quotedPrice:item?discountState(item).final:null};
      const next=clone(data); next.enquiries.unshift(record);
      if(!commit(next)) return fail('Enquiry was not saved. Check browser storage and try again.');
      showEnquirySuccess(record);
    });
  }

  function enquiryText(e){return `Hello ${data.settings.name},\n\n${e.type} enquiry\nName: ${e.name}\nPhone: ${e.phone}\nEmail: ${e.email||'Not provided'}\nInterested in: ${e.itemName}\n${e.mode?'Mode: '+e.mode+'\n':''}${e.batchName?'Batch: '+e.batchName+'\n':''}\n${e.message}`;}
  function showEnquirySuccess(e){
    const text=enquiryText(e), whatsapp=data.settings.whatsapp.replace(/\D/g,''), email=data.settings.email;
    openModal('Enquiry saved on this device',`<div class="success-box"><h3>Thank you, ${esc(e.name)}.</h3><p>Your enquiry is in the local admin inbox. It has <strong>not been sent</strong> to the business and no seat has been reserved.</p></div><div class="form-actions">${whatsapp?`<a class="button" target="_blank" rel="noopener noreferrer" href="https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}">Open WhatsApp to send</a>`:''}${email?`<a class="button secondary" href="mailto:${esc(email)}?subject=${encodeURIComponent(e.type+' enquiry')}&body=${encodeURIComponent(text)}">Open email draft</a>`:''}<button class="button secondary" data-action="download-enquiry" data-id="${e.id}">Download enquiry</button></div>${!whatsapp&&!email?'<p class="note">Business contact details are not configured. Add them in Admin → Business settings to enable sending via WhatsApp or email.</p>':'<p class="note">Review the draft and press Send in WhatsApp or your email app. Opening a draft does not send it.</p>'}`);
  }

  function showEnquiry(context={}){if(context.kind==='designs'){const d=data.designs.find(d=>d.id===context.id);goQuote({systemId:d?.systemId||'',itemName:d?.name,message:d?'I am interested in '+d.name+'. Please discuss design options and a quotation.':'',service:d?.systemId==='river'?'River-style table':d?.systemId==='counter'?'Countertop / tabletop':'Epoxy flooring'});return;}openModal('Start your learning journey',enquiryForm(context));bindEnquiryForm(context);}

  function renderContact(){
    const s=data.settings,phone=s.phone.replace(/[^\d+]/g,''),query=s.mapQuery||s.address;
    const socials=[['Instagram',s.instagram],['Facebook',s.facebook],['YouTube',s.youtube]].filter(([,url])=>url);
    main.innerHTML=heading('Let’s create something beautiful.', 'Courses, custom surfaces, furniture or a project question — start here.')+`<div class="split"><section class="panel"><span class="eyebrow">Get in touch</span><h2>${esc(s.name)}</h2><p>${esc(s.about)}</p><dl class="contact-list"><div><dt>Call</dt><dd><a href="tel:${esc(phone)}">${esc(s.phone)}</a></dd></div><div><dt>WhatsApp</dt><dd><a href="${whatsappLink()}" target="_blank" rel="noopener noreferrer">${esc(s.whatsapp)} ↗</a></dd></div>${s.email?`<div><dt>Email</dt><dd><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></dd></div>`:''}<div><dt>Business location</dt><dd>${esc(s.address)}<iframe class="contact-map" title="Street 917, New Town area on Google Maps" loading="lazy" referrerpolicy="no-referrer" src="https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed"></iframe></dd></div><div><dt>Arrange a visit</dt><dd>${esc(s.hours)}</dd></div></dl><div class="form-actions"><a class="button" href="tel:${esc(phone)}">Call now</a><a class="button secondary" href="${whatsappLink()}" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>${socials.map(([name,url])=>`<a class="button secondary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${name} ↗</a>`).join('')}</div><a class="button secondary top-space" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}" target="_blank" rel="noopener noreferrer">Open street location ↗</a><p class="fine muted">This map shows the supplied street location, not a verified entrance pin. Call or WhatsApp for directions before visiting.</p></section><section class="panel"><h2>What would you like to discuss?</h2><div class="contact-choices"><a href="#enquiry"><strong>Design / project enquiry ↗</strong><span>Area, location, budget and site photographs</span></a><a href="#courses"><strong>Student course enquiry ↗</strong><span>Individual courses and online/offline options</span></a><a href="#plans"><strong>Complete learning plan ↗</strong><span>Beginner through advanced programmes</span></a><a href="#consultation"><strong>Video consultation ↗</strong><span>Design, planning and troubleshooting</span></a></div><h3 class="top-space">Quick enquiry</h3>${enquiryForm()}</section></div>`;
    bindEnquiryForm();
  }
  // Business pages: reuse the approved visual language and existing catalogue.
  function whatsappLink(message='Hello EpoxyMitra, I would like to discuss an epoxy project.') {
    return 'https://wa.me/'+data.settings.whatsapp.replace(/\D/g,'')+'?text='+encodeURIComponent(message);
  }
  function pageLinks(){return '<div class="chip-row page-links"><a class="chip" href="#courses">Individual courses</a><a class="chip" href="#plans">Learning plans</a><a class="chip" href="#batches">Online & offline</a><a class="chip" href="#consultation">Video consultation</a></div>';}
  function serviceCards(){return [
    ['01','Floor design & installation','Metallic, pearl, glitter, 3D, marble and flake systems designed around your space.','assets/pearl-floor.png','#designs'],
    ['02','Video consultation','Talk through your surface, design, material selection and project questions remotely.','assets/solid-office.png','#consultation'],
    ['03','Online & offline learning','Build practical understanding of preparation, layers, design, repairs and job costing.','assets/workshop.png','#courses'],
    ['04','Counters & river tables','Create a statement counter, tabletop or resin-and-timber piece for your interior.','assets/river-table.png','#pricing']
  ].map(([n,name,description,img,url])=>`<article class="card"><div class="card-media"><img src="${img}" alt="${esc(name)} design illustration" loading="lazy" width="480" height="300"></div><div class="card-body"><span class="eyebrow">${n} / EpoxyMitra</span><h3>${name}</h3><p>${description}</p><a class="text-link" href="${url}">Explore service ↗</a></div></article>`).join('');}
  function workSteps(){return `<div class="work-steps">${[
    ['Enquiry','Share your location, area, photos and design ideas.'],['Consultation','Review the surface, finish and budget together.'],['Estimate','Discuss materials, labour, preparation and transport.'],['Design approval','Agree the colours, reference design and scope.'],['Execution','Prepare the surface and apply the agreed system.'],['Handover','Review the result, curing guidance and care.']
  ].map(([name,copy],i)=>`<article><span>${String(i+1).padStart(2,'0')}</span><h3>${name}</h3><p>${copy}</p></article>`).join('')}</div>`;}
  function callToAction(){return `<section class="cta-band"><div><span class="eyebrow">Your space, your starting point</span><h2>Let’s put a plan around your idea.</h2><p>Start with an estimate, then share your site details for a tailored quotation.</p></div><div class="form-actions"><a class="button" href="#estimator">Estimate my budget ↗</a><a class="button secondary" href="#enquiry">Request a quote</a></div></section>`;}

  function renderHome(){
    const selected=(data.home?.slideshow||[]).filter(s=>s.active!==false).slice(0,20);
    const slides=selected.length?selected:[{image:'assets/pearl-floor.png',caption:'Silver Current',category:'Metallic flooring'}];
    main.innerHTML=`<section class="fullscreen-showcase" id="home-showcase" aria-label="Epoxy design showcase">
      ${slides.map((slide,index)=>`<figure class="showcase-slide ${index===0?'active':''}" aria-hidden="${index!==0}"><img src="${esc(imageSource(slide.image))}" alt="${esc(slide.caption)} — epoxy design concept" ${index===0?'fetchpriority="high"':'loading="lazy"'}><figcaption><span>${esc(slide.category)}</span><strong>${esc(slide.caption)}</strong></figcaption></figure>`).join('')}
      <div class="showcase-brand"><span class="eyebrow">EpoxyMitra · Kolkata</span><h1>Art your<br><em>own kingdom.</em></h1><p>Extraordinary floors. Illuminated tables.<br>Surfaces with a story of their own.</p><div class="form-actions"><a class="button" href="#gallery">Explore the gallery ↗</a><a class="button secondary" href="#estimator">Estimate my budget</a></div><small class="concept-label">Photorealistic AI-created design concepts</small></div>
      <div class="showcase-controls"><button class="icon-button" id="slide-prev" aria-label="Previous design">‹</button><button class="icon-button" id="slide-pause" aria-label="Pause showcase" aria-pressed="false">Ⅱ</button><button class="icon-button" id="slide-next" aria-label="Next design">›</button><button class="icon-button" id="showcase-fullscreen" aria-label="Enter full screen">⛶</button></div>
    </section><div class="home-content"><div class="intro-strip"><span>Luxury flooring</span><span>Glitter & resin tables</span><span>Floral & illuminated designs</span><span>Professional training</span></div><div class="section-heading"><div><span class="eyebrow">Create. Learn. Transform.</span><h2>Four ways to work with us</h2></div><a href="#services">All services ↗</a></div><div class="grid service-grid">${serviceCards()}</div><div class="section-heading"><div><span class="eyebrow">Designed to be different</span><h2>Discover your next statement piece</h2></div><a href="#gallery">All ${data.gallery.length} designs ↗</a></div><div class="grid">${data.gallery.slice(-6).map(galleryCard).join('')}</div>${callToAction()}<div class="section-heading"><h2>A clear process, all the way through</h2></div>${workSteps()}</div>`;
    initHomeShowcase(slides);
  }

  function initHomeShowcase(slides){
    const stage=$('#home-showcase'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const interval=Math.max(1500,Math.min(10000,Number(data.home.slideInterval)||2000));
    let index=0,paused=reduce||document.body.classList.contains('motion-paused');
    const show=next=>{
      index=(next+slides.length)%slides.length;
      $$('.showcase-slide',stage).forEach((el,i)=>{
        el.classList.toggle('active',i===index);el.setAttribute('aria-hidden',String(i!==index));
        if(i===index||i===(index+1)%slides.length)el.querySelector('img').loading='eager';
      });
      document.body.dataset.glitterPalette=['gold','ruby','emerald','sapphire'][index%4];
    };
    const schedule=()=>{
      clearInterval(slideshowTimer);
      if(!paused&&slides.length>1)slideshowTimer=setInterval(()=>{if(!document.hidden&&!modal.open)show(index+1);},interval);
      $('#slide-pause').textContent=paused?'▶':'Ⅱ';
      $('#slide-pause').setAttribute('aria-label',paused?'Play showcase':'Pause showcase');
      $('#slide-pause').setAttribute('aria-pressed',String(paused));
    };
    $('#slide-prev').addEventListener('click',()=>{show(index-1);schedule();});
    $('#slide-next').addEventListener('click',()=>{show(index+1);schedule();});
    $('#slide-pause').addEventListener('click',()=>{paused=!paused;schedule();});
    $('#showcase-fullscreen').addEventListener('click',async()=>{
      try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else notify('Use your browser full-screen option to expand the showcase.');}catch(_){notify('Full screen is not available in this browser.');}
    });
    show(0);schedule();
  }

  function renderGuideDock(){
    const guides=[['customer',data.home.customerGuide,'assets/solid-office.png'],['student',data.home.studentGuide,'assets/workshop.png']].filter(([,guide])=>guide.enabled);
    const dock=$('#guide-dock');dock.hidden=!guides.length;if(!guides.length)return;
    dock.innerHTML=`<div class="guide-dock-title"><span>Quick guides</span><button id="hide-guides" aria-label="Minimise guides">−</button></div><div class="guide-items">${guides.map(([id,guide,poster])=>`<button class="guide-notification" data-action="play-guide" data-id="${id}" aria-label="Play ${esc(guide.title)} video"><span class="guide-thumb"><img src="${poster}" alt=""><span>▶</span></span><span><strong>${esc(guide.title)}</strong><small>${esc(guide.description)}</small><em>Play video</em></span></button>`).join('')}</div><button id="restore-guides" hidden>▶ Video guides</button>`;
    $('#hide-guides').onclick=()=>{$('#guide-dock').classList.add('minimised');$('#restore-guides').hidden=false;};
    $('#restore-guides').onclick=()=>{$('#guide-dock').classList.remove('minimised');$('#restore-guides').hidden=true;};
  }

  function playGuide(kind){
    const guide=kind==='customer'?data.home.customerGuide:data.home.studentGuide,url=videoSource(guide.video);
    if(!guide.enabled||!url)return notify('This guide video is currently unavailable.');
    openModal(guide.title,`<video class="guide-player" src="${esc(url)}" controls autoplay playsinline preload="metadata"></video><p class="top-space">${esc(guide.description)}</p>`);
  }
  function renderAbout(){
    main.innerHTML=heading('Craft with a point of view.', 'Kolkata-based epoxy design, guidance and practical learning.')+`<div class="split editorial"><div class="panel"><span class="eyebrow">About EpoxyMitra</span><h2>Art meets a practical surface.</h2><p>${esc(data.settings.about)}</p><p>Our goal is to combine practical surface performance with creative design, whether the project is a decorative floor, a statement tabletop, a river-style counter, or a client who needs guidance before starting an epoxy project.</p><p>From concept selection and colour planning to material guidance, installation support and protective finishing, we aim to provide a clear experience from enquiry to completion.</p><div class="form-actions"><a class="button" href="#enquiry">Tell us about your idea ↗</a></div></div><figure><img src="assets/river-table.png" alt="Walnut and amber resin river-table concept" width="650" height="500"><figcaption>Amber River · Resin furniture concept</figcaption></figure></div><div class="section-heading"><h2>Designed for the people who use it.</h2></div><div class="grid"><article class="panel"><span class="eyebrow">For your space</span><h3>Homeowners & businesses</h3><p>Explore finishes for homes, offices, showrooms, studios, cafés and other suitable interiors.</p></article><article class="panel"><span class="eyebrow">For your practice</span><h3>Designers & contractors</h3><p>Discuss systems, colour direction, site considerations and design-led collaboration.</p></article><article class="panel"><span class="eyebrow">For your next skill</span><h3>Learners & applicators</h3><p>Build an understanding of epoxy materials, practical methods, estimation and troubleshooting.</p></article></div><div class="section-heading"><h2>How we work</h2></div>${workSteps()}${callToAction()}`;
  }
  function renderServices(){
    main.innerHTML=heading('One material. Many possibilities.', 'Flooring, furniture, learning and guidance — connected by the craft of epoxy.')+`<div class="grid service-grid">${serviceCards()}</div><div class="section-heading"><h2>Floor finishes, thoughtfully selected</h2><a href="#pricing">View indicative rates ↗</a></div><div class="finish-list">${data.estimator.systems.filter(s=>s.family==='floor').map(s=>`<article class="panel"><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p><button class="text-button" data-action="estimate-system" data-id="${s.id}">Calculate this finish ↗</button></article>`).join('')}</div><div class="split top-space"><section class="panel"><h3>Countertops, tables & decorative resin</h3><p>Kitchen counters, dining and coffee tops, bar tops, river-style resin tables and decorative panels. Restoration or resurfacing is considered where the existing surface is technically suitable.</p><a href="#enquiry">Discuss a custom piece ↗</a></section><section class="panel"><h3>Surface suitability comes first</h3><p>The chosen system depends on the substrate, moisture, use, finish and site conditions. A remote estimate does not replace on-site assessment or the manufacturer’s product instructions.</p><a href="#consultation">Ask a project question ↗</a></section></div>${callToAction()}`;
  }
  function galleryCard(g){return `<article class="card"><button class="gallery-image" data-action="gallery-detail" data-id="${g.id}" aria-label="View ${esc(g.name)}"><img src="${esc(imageSource(g.image))}" alt="${esc(g.description)}" loading="lazy" width="480" height="330"><span>View concept ↗</span></button><div class="card-body"><span class="eyebrow">${esc(g.category)}</span><h3>${esc(g.name)}</h3><p>${esc(g.description)}</p><div class="card-meta"><span>${esc(g.finish)}</span><span>Design concept</span></div></div></article>`;}
  function renderGallery(){
    const categories=['All',...new Set(data.gallery.map(g=>g.category))];
    main.innerHTML=heading('The EpoxyMitra gallery.', 'Explore flooring, glitter, light, florals and resin furniture.',`<span class="gallery-count">${data.gallery.length} unique concepts</span>`)+`
      <p class="notice">Photorealistic AI-created design concepts, not completed EpoxyMitra projects. Open any design to view the full-resolution image and discuss a customised version.</p>
      <div class="gallery-toolbar"><label>Find your inspiration<input id="gallery-search" type="search" placeholder="Try floral, star, emerald or dining…"></label><span id="gallery-count" class="count"></span></div>
      <div class="chip-row gallery-chip-container" id="gallery-filters">${categories.map((c,i)=>`<button class="chip ${i===0?'active':''}" data-gallery-filter="${esc(c)}" aria-pressed="${i===0}">${esc(c)}</button>`).join('')}</div><div class="grid" id="gallery-grid"></div>${callToAction()}`;
    let category='All';
    const update=()=>{
      const term=$('#gallery-search').value.trim().toLowerCase();
      const items=data.gallery.filter(g=>(category==='All'||g.category===category)&&(!term||(g.name+' '+g.category+' '+g.description).toLowerCase().includes(term)));
      $('#gallery-grid').innerHTML=items.length?items.map(galleryCard).join(''):'<div class="empty">No matching concepts. Try another colour or category.</div>';
      $('#gallery-count').textContent=items.length+' designs';
    };
    $$('[data-gallery-filter]').forEach(button=>button.addEventListener('click',()=>{
      category=button.dataset.galleryFilter;
      $$('[data-gallery-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});update();
    }));
    $('#gallery-search').addEventListener('input',update);update();
  }
  function galleryDetail(id){const g=data.gallery.find(g=>g.id===id);if(!g)return;openModal(g.name,`<img class="detail-image gallery-large" src="${esc(imageSource(g.image))}" alt="${esc(g.description)}"><p>${esc(g.description)}</p><div class="detail-meta"><span class="badge">${esc(g.category)}</span><span class="badge">${esc(g.finish)}</span></div><p class="fine muted">AI-created concept illustration; actual project design is agreed with you.</p><div class="form-actions">${g.systemId?`<button class="button" data-action="estimate-system" data-id="${g.systemId}">Estimate this finish ↗</button><button class="button secondary" data-action="quote-concept" data-id="${g.id}">Discuss this concept</button>`:'<a class="button" href="#courses">Explore learning</a>'}</div>`);}

  function renderPricing(){
    main.innerHTML=heading('Start with a clear budget.', 'Indicative planning rates, with project-specific details confirmed before quotation.', '<a class="button" href="#estimator">Open price estimator ↗</a>')+`<div class="notice">Rates below are proposed budgeting assumptions, not approved commercial offers. The base rate includes a standard material and labour allowance. Extra preparation, upgrades, transport, contingency and tax allowances are shown separately in the calculator.</div><div class="grid">${data.estimator.systems.map(s=>`<article class="card"><div class="card-media"><img src="${esc(imageSource(s.image))}" alt="${esc(s.name)} concept" loading="lazy" width="480" height="300"></div><div class="card-body"><span class="eyebrow">${s.family==='floor'?'Floor finish':'Resin furniture'}</span><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p><div class="price">${money(s.material+s.labour)}<small>Base allowance / sq.ft</small></div><p class="fine muted">Materials ${money(s.material)} + labour ${money(s.labour)} / sq.ft<br>Minimum work allowance ${money(s.minimum)}</p><button class="button secondary" data-action="estimate-system" data-id="${s.id}">Estimate this system ↗</button></div></article>`).join('')}</div><div class="section-heading"><h2>Guidance & learning</h2></div><div class="grid"><article class="panel"><h3>Video consultation</h3><div class="price">${money(data.consultations[0].price)}<small>Indicative · 30-minute design session</small></div><p>Discuss your idea, finish options and next steps.</p><a href="#consultation">Compare consultation options ↗</a></article><article class="panel"><h3>Individual learning</h3><div class="price">${money(Math.min(...data.courses.map(c=>c.price)))}<small>Indicative starting course fee</small></div><p>Choose an individual topic, with mode and schedule confirmed before enrolment.</p><a href="#courses">Explore courses ↗</a></article><article class="panel"><h3>Complete learning plans</h3><div class="price">${money(Math.min(...data.plans.map(p=>p.price)))}<small>Indicative starting package fee</small></div><p>Build a practical learning path from a group of courses.</p><a href="#plans">Compare plans ↗</a></article></div>${callToAction()}`;
  }
  function renderConsultation(){
    main.innerHTML=heading('A conversation before the first coat.', 'Remote guidance for customers, applicators and learners.')+`<div class="split consultation-intro"><div><span class="eyebrow">Video consultation</span><h2>Bring your questions.<br>We’ll discuss the next step.</h2><p>Review your space by video, explore design and layer options, or work through a material and quantity plan using your product information.</p><p>Remote guidance cannot verify hidden moisture, substrate strength or site safety. A site assessment or supplier review may still be needed.</p></div><img src="assets/workshop.png" alt="Illustrative epoxy sample-board training session" width="650" height="380"></div><div class="grid top-space">${data.consultations.map(c=>`<article class="card plan"><span class="eyebrow">${c.duration}-minute session</span><h2>${esc(c.name)}</h2><p>${esc(c.description)}</p><div class="price">${money(c.price)}<small>Indicative session fee</small></div><ul>${c.topics.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><button class="button secondary" data-action="consultation-enquiry" data-id="${c.id}">Request a session ↗</button></article>`).join('')}</div><div class="panel top-space"><h3>Before your session</h3><p>Have your area measurements, site photos/video, product technical and safety sheets, existing surface details and design references ready. Scheduling, payment, session platform and any follow-up are agreed on WhatsApp before confirmation.</p><a href="${whatsappLink('Hello EpoxyMitra, I would like to arrange a video consultation.')}" target="_blank" rel="noopener noreferrer">Ask about a session ↗</a></div>`;
  }
  const faqItems = [
    ['How much does epoxy flooring cost?','Use the estimator to compare finishes against your measured area. Base allowances start at ₹85 per sq.ft for a clear protective finish and ₹120 per sq.ft for plain epoxy, before additional preparation, transport and other project costs. Final pricing follows a project review.'],
    ['What is included in the calculator?','It separates materials, application labour, preparation, an optional protective finish upgrade, the minimum project adjustment, transport, a tax allowance and a contingency reserve. All rates are indicative planning assumptions.'],
    ['Can you create a custom design?','Yes. Metallic, pearl, glitter, 3D, marble-style and other effects can be planned around your colour palette and space. Share reference images and the intended use of the area.'],
    ['Do you provide consultation without installation?','Yes. Video consultation is available for design direction, project planning and troubleshooting. Session details and any follow-up are confirmed before booking.'],
    ['Do you teach epoxy work?','EpoxyMitra offers online learning and offline practical-training enquiries for beginners and working professionals. Courses cover materials, preparation, layers, design, repairs, estimation and job costing. Dates and batch availability are confirmed before enrolment.'],
    ['Do you make tables and countertops?','Yes. Custom countertops, tabletops, counters and river-style resin pieces are part of the service offering. Suitable-substrate resurfacing and custom furniture are assessed separately.'],
    ['Can epoxy be applied to my existing floor?','Suitability depends on the existing substrate, moisture, adhesion, movement, previous coatings and intended use. Share site information and arrange an assessment before choosing a system.'],
    ['Are the gallery images completed EpoxyMitra projects?','The current gallery contains AI-created design concepts and a training illustration. It helps explain design directions; it is not evidence of completed client work or a before/after portfolio.'],
    ['How do I get a quotation?','Fill in the enquiry form with area, location, design preference and site/reference photos. Open the prepared WhatsApp message and press Send. Attach your photos manually in WhatsApp; the website cannot automatically attach files to a WhatsApp chat.'],
    ['Is saving an enquiry the same as sending it?','No. This HTML/CSS/JavaScript version prepares your message and can keep a local copy in your browser. You must send it through WhatsApp. There is no central server or automatic delivery confirmation.']
  ];
  function renderFaq(){main.innerHTML=heading('Good questions, clear starting points.', 'Practical answers before you choose a course or start a project.')+`<div class="faq-list">${faqItems.map(([q,a])=>`<details class="panel"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>${callToAction()}`;}
  function renderPrivacy(){main.innerHTML=heading('Your enquiry, in your control.', 'How this browser-only version handles information.')+`<div class="reading-page panel"><h2>Local records</h2><p>Forms can save your name, contact information, project details and selected images in this browser’s local storage. Records are not sent to a server or shared between devices. Local admin is not password-protected; anyone using this browser may access its records.</p><h2>Sending a message</h2><p>A WhatsApp button opens a draft with the text you provide. You choose whether to send it. Site images are not automatically attached; add them yourself in WhatsApp. Your use of WhatsApp is subject to that service’s policies.</p><h2>Maps and outside links</h2><p>The Contact page loads a Google Maps street search. Opening maps, WhatsApp or external image links connects to those services. An email link is displayed only if an official email is configured.</p><h2>Live clock and weather</h2><p>The clock shows Kolkata time (IST). On a publicly hosted website, a weather request connects to MET Norway using fixed Kolkata coordinates; your browser IP and website origin are visible to that provider. No device-location permission is requested. Forecast data is cached locally to reduce requests. Maps and weather require internet access.</p><h2>Remove local information</h2><p>You can remove an enquiry from Local admin → Enquiry inbox. To remove all records from this version, clear the specific <code>epoxy-aura-data-v3</code> storage entry in your browser after exporting anything you need. Exported files are separate and must be managed by you.</p><h2>Before using this as a live business system</h2><p>This front-end implementation has no secure authentication, central enquiry delivery or payment processing. Add secure server-side handling and a business-approved privacy policy before collecting sensitive information at scale.</p><a class="button secondary" href="#contact">Contact EpoxyMitra</a></div>`;}

  function goQuote(context={}){quotePrefill=context;if(modal.open)closeModal();if(location.hash==='#enquiry'){renderQuote();window.scrollTo(0,0);}else location.hash='enquiry';}
  function renderQuote(){
    const prefill=quotePrefill;
    main.innerHTML=heading('Tell us about your project.', 'Share the space, the finish and the details that matter.')+`<div class="split quote-layout"><aside class="panel"><span class="eyebrow">Get a tailored quotation</span><h2>A useful brief.<br>A clearer estimate.</h2><p>We’ll need your measurements, location, surface condition and preferred design to discuss a realistic scope.</p><dl class="contact-list"><div><dt>Call / WhatsApp</dt><dd><a href="tel:${esc(data.settings.phone.replace(/[^\d+]/g,''))}">${esc(data.settings.phone)}</a></dd></div><div><dt>Location</dt><dd>${esc(data.settings.address)}</dd></div></dl><img class="detail-image" src="assets/countertop.png" alt="Graphite countertop concept" width="500" height="330"><p class="fine muted">No payment or booking is completed on this page. Preparing a message does not send it.</p></aside><section class="panel"><form id="project-form"><div class="form-grid"><label>Full name<input name="name" autocomplete="name" required minlength="2" maxlength="100"></label><label>Mobile / WhatsApp<input name="phone" type="tel" autocomplete="tel" required maxlength="20" placeholder="+91"></label><label>Email (optional)<input name="email" type="email" autocomplete="email" maxlength="150"></label><label>Service required<select name="service">${options(['Epoxy flooring','Countertop / tabletop','River-style table','Video consultation','Custom resin design'],prefill.service||'Epoxy flooring')}</select></label><label class="full">Project address / city<input name="city" required maxlength="250" autocomplete="street-address"></label><label>Approximate area<input name="area" type="number" min="0.01" max="100000" step="any" value="${esc(prefill.area||'')}"></label><label>Area unit<select name="unit">${options([{value:'sqft',label:'Square feet (sq.ft)'},{value:'sqm',label:'Square metres (m²)'}],prefill.unit||'sqft')}</select></label><label>Preferred epoxy system<select name="system">${options(data.estimator.systems.map(s=>({value:s.id,label:s.name})),prefill.systemId||'','Help me choose')}</select></label><label>Property use<select name="property">${options(['Residential','Commercial','Other'])}</select></label><label>Preferred project date (optional)<input name="date" type="date" min="${today()}"></label><label>Budget range (optional)<select name="budget">${options(['Under ₹25,000','₹25,000–₹50,000','₹50,000–₹1 lakh','₹1–₹3 lakh','₹3–₹5 lakh','Above ₹5 lakh'],'','Prefer to discuss')}</select></label><label class="full">Floor / site photos (up to 3)<input name="sitePhotos" type="file" accept="image/png,image/jpeg,image/webp" multiple></label><label class="full">Reference design (1 image)<input name="referencePhoto" type="file" accept="image/png,image/jpeg,image/webp"></label><div class="full attachment-preview" id="attachment-preview"></div><p class="full fine muted">PNG, JPEG or WebP, up to 500 KB per image. Images remain in this browser; attach them manually when you send your WhatsApp message.</p><label class="full">Message / special requirements<textarea name="message" maxlength="5000" required>${esc(prefill.message||'')}</textarea></label><label class="check-label full"><input type="checkbox" required name="consent"><span>I understand this prepares a message and may save a local copy on this device. I will send the message and attach photos myself in WhatsApp. <a href="#privacy">Privacy details</a></span></label></div><p class="form-error" id="project-error" role="alert"></p><button class="button" type="submit">Prepare WhatsApp enquiry ↗</button></form></section></div>`;
    const form=$('#project-form');let attachments=[],filesLoading=false,fileError='';
    if(prefill.estimate)form.insertAdjacentHTML('afterbegin','<div class="notice">The estimate in your message uses the measurements and finish selected in the calculator. If you change the project here, return to the estimator for a revised budget.</div>');
    const readFile=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:file.name,type:file.type,data:String(reader.result)});reader.onerror=()=>reject(new Error('An image could not be read. Please choose it again.'));reader.readAsDataURL(file);});
    let readVersion=0;
    const updateFiles=async()=>{
      const version=++readVersion;attachments=[];fileError='';filesLoading=true;
      const site=[...form.elements.sitePhotos.files],reference=[...form.elements.referencePhoto.files],files=[...site,...reference];
      try{if(site.length>3||reference.length>1)throw new Error('Choose at most 3 site images and 1 reference image.');if(files.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>500*1024))throw new Error('Each image must be PNG, JPEG or WebP and no larger than 500 KB.');const images=await Promise.all(files.map(readFile));if(version!==readVersion)return;attachments=images;$('#attachment-preview').innerHTML=images.map(a=>`<figure><img src="${esc(a.data)}" alt="${esc(a.name)}"><figcaption>${esc(a.name)}</figcaption></figure>`).join('');$('#project-error').textContent='';}catch(error){if(version!==readVersion)return;fileError=error.message;$('#project-error').textContent=fileError;$('#attachment-preview').innerHTML='';}finally{if(version===readVersion)filesLoading=false;}
    };
    form.elements.sitePhotos.addEventListener('change',updateFiles);form.elements.referencePhoto.addEventListener('change',updateFiles);
    form.addEventListener('submit',event=>{
      event.preventDefault();const f=Object.fromEntries(new FormData(form)),fail=message=>{$('#project-error').textContent=message;};
      if(filesLoading)return fail('Please wait for the images to finish loading.');if(fileError)return fail(fileError);
      if(!f.name.trim()||!f.city.trim()||!f.message.trim())return fail('Please enter your name, location and message.');
      if(!/^\+?[\d\s()-]{7,20}$/.test(f.phone)||f.phone.replace(/\D/g,'').length<7||f.phone.replace(/\D/g,'').length>15)return fail('Enter a valid mobile number with 7–15 digits.');
      if(f.date&&f.date<today())return fail('Choose today or a future project date.');
      const system=data.estimator.systems.find(s=>s.id===f.system);
      const message=[f.message.trim(),'',`Project location: ${f.city.trim()}`,`Service: ${f.service}`,`Property: ${f.property}`,`Area: ${f.area?f.area+' '+f.unit:'Please discuss measurements'}`,`Preferred system: ${system?.name||'Help me choose'}`,`Preferred date: ${f.date||'To be agreed'}`,`Budget: ${f.budget||'To be discussed'}`,`Images to attach in WhatsApp: ${attachments.map(a=>a.name).join(', ')||'None selected'}`].join('\n');
      const record={id:uid('e'),createdAt:new Date().toISOString(),name:f.name.trim(),phone:f.phone.trim(),email:f.email.trim(),type:f.service==='Video consultation'?'Video Consultation':'Customer Design',kind:'designs',itemId:system?.id||'',itemName:prefill.itemName||system?.name||f.service,mode:f.service==='Video consultation'?'Online':'',batchId:'',batchName:'',message,status:'New',notes:'',quotedPrice:prefill.estimateTotal??null,attachments,project:{city:f.city.trim(),service:f.service,area:f.area,unit:f.unit,property:f.property,date:f.date,budget:f.budget},estimate:prefill.estimate||null};
      const next=clone(data);next.enquiries.unshift(record);const saved=commit(next);
      openModal('Your enquiry is ready to send',`<div class="success-box"><h3>One more step, ${esc(record.name)}.</h3><p>Open WhatsApp, review your message and press <strong>Send</strong>. Your enquiry has not been sent yet.</p><p>${saved?'A copy was saved in this browser.':'A local copy could not be saved. You can still send or download your message.'}</p></div><div class="form-actions"><a class="button" href="${whatsappLink(enquiryText(record))}" target="_blank" rel="noopener noreferrer">Open WhatsApp to send ↗</a><button class="button secondary" id="download-project-message">Download message</button></div>${attachments.length?`<p class="notice">Attach these ${attachments.length} image(s) yourself in WhatsApp: ${esc(attachments.map(a=>a.name).join(', '))}. Website-selected files are not sent automatically.</p>`:''}`);
      $('#download-project-message').addEventListener('click',()=>download('Epoxy_Aura_Enquiry.txt',enquiryText(record),'text/plain;charset=utf-8'));
    });
  }

  function estimateText(snapshot){
    const {input,result,system}=snapshot;
    return [`${data.settings.name} — INDICATIVE BUDGET ESTIMATE`,new Date(snapshot.createdAt).toLocaleString(),'',`Finish: ${system.name}`,`Spaces: ${input.rooms.map(r=>r.name+': '+r.area+' '+input.unit).join('; ')}`,`Total area: ${result.area.toFixed(2)} sq.ft`,`Material rate: ${money(system.material)}/sq.ft; labour: ${money(system.labour)}/sq.ft`,`Design multiplier: ${input.complexity}; material allowance: ${input.waste}%`,`Extra preparation: ${money(input.prep)}/sq.ft; finish upgrade: ${money(input.finish)}/sq.ft`,'',...result.lines.map(([name,value])=>`${name}: ${money(value)}`),'',`PLANNING TOTAL: ${money(result.total)}`,`Planning range (±15%): ${money(result.low)}–${money(result.high)}`,`Contingency: ${input.contingency}% of subtotal. Tax allowance: ${input.tax}% of subtotal, excluding contingency.`,`Minimum work allowance: ${money(system.minimum)}`,'','Not a quotation or invoice. Rates are proposed planning assumptions. No promotion is applied. Final scope, thickness, product, moisture/substrate treatment, access, location and taxes require confirmation.',`${data.settings.phone} | ${data.settings.address}`].join('\n');
  }
  function renderEstimator(){
    currentEstimate=null;
    main.innerHTML=heading('What could your project cost?', 'Measure your space, choose a finish and explore a practical budget.')+`<div class="estimator-layout"><section class="panel estimator-input"><form id="estimate-form"><span class="eyebrow">01 / Your project</span><label>Epoxy finish<select name="system">${options(data.estimator.systems.map(s=>({value:s.id,label:s.name})),estimatorSystem)}</select></label><div class="system-preview" id="system-preview"></div><div class="section-heading compact"><h3>Your spaces</h3><label>Area unit<select name="unit">${options([{value:'sqft',label:'Square feet'},{value:'sqm',label:'Square metres'}])}</select></label></div><div id="estimate-spaces"></div><button class="text-button" type="button" id="add-space">+ Add another space</button><details class="estimate-options" open><summary>Surface & design choices</summary><div class="form-grid"><label>Additional preparation<select name="prep"></select></label><label>Design detail<select name="complexity">${options([{value:1,label:'Standard design'},{value:1.15,label:'Detailed · +15% materials'},{value:1.3,label:'Intricate · +30% materials'}])}</select></label><label class="full">Protective finish upgrade<select name="finish"></select></label></div></details><details class="estimate-options"><summary>Budget allowances</summary><div class="form-grid">${inputField('Material wastage allowance (%)','waste',data.estimator.waste,'number','min="0" max="30" step="0.1" required')}${inputField('Contingency reserve (%)','contingency',data.estimator.contingency,'number','min="0" max="30" step="0.1" required')}${inputField('Transport / mobilisation (₹)','transport',data.estimator.transport,'number','min="0" max="1000000" step="0.01" required')}${inputField('Tax allowance (%)','tax',0,'number','min="0" max="30" step="0.1" required')}</div><p class="fine muted">Tax defaults to 0 and is excluded unless you add an allowance. This is not a determination of applicable tax. The contingency is a budget reserve, not a quoted fee.</p></details><label>Your available budget (optional, ₹)<input name="budget" type="number" min="0" max="1000000000" step="1"></label><p class="form-error" id="estimate-error" role="alert"></p></form></section><aside class="estimate-aside"><section id="estimate-result" aria-live="polite" aria-atomic="true"></section><div class="notice top-space">Planning estimate only. Base rates include the standard system and application labour. Site-specific work is added separately. The ±15% range is a planning allowance, not a guaranteed price bound.</div></aside></div><section class="top-space"><div class="section-heading"><div><span class="eyebrow">Compare your options</span><h2>The same space, a different finish.</h2></div></div><div id="finish-comparison"></div></section><details class="panel faq-list top-space"><summary>How this estimate is calculated</summary><p>Materials = measured area × material rate × design-detail multiplier × (1 + wastage allowance). Labour and additional preparation use the measured area without wastage. Standard preparation and standard protective finishing are included in the base system allowance; selected additions are extra.</p><p>Work cost is increased to the minimum project allowance only when needed. Transport is then added. Tax and contingency are each calculated separately on that subtotal; tax is not applied to the contingency reserve. The range is the total ±15%. Each line is rounded to two decimal places before it is added.</p><p>Countertop and river-table estimates use the top’s surface area, not the room’s floor area. Countertop resurfacing excludes new cabinetry. River-table estimates include a provisional timber/resin/base allowance; slab choice, depth, casting volume and hardware can change the actual cost substantially.</p><p>There is no automatic catalogue discount in this estimator. Major structural repairs, damp-proofing, demolition, unusual access, specialist artwork and custom furniture engineering require a separate quote.</p></details><section id="print-estimate" class="print-estimate"></section>`;
    const form=$('#estimate-form');let previousUnit='sqft',previousFamily='';
    function addSpace(name='Additional space',area=100){
      if($('#estimate-spaces').children.length>=20)return notify('You can estimate up to 20 spaces together.');
      const row=document.createElement('div');row.className='space-row';row.innerHTML=`<label>Space name<input class="space-name" maxlength="60" value="${esc(name)}" required></label><label>Area<input class="space-area" type="number" min="0.01" max="100000" step="any" value="${area}" required></label><div class="space-actions"><button class="icon-button measure-space" type="button" aria-label="Calculate area from length and width" title="Length × width">↔</button><button class="icon-button remove-space" type="button" aria-label="Remove space">×</button></div>`;$('#estimate-spaces').append(row);
      $('.remove-space',row).addEventListener('click',()=>{if($('#estimate-spaces').children.length===1)return notify('Keep at least one space in your estimate.');row.remove();calculate();});
      $('.measure-space',row).addEventListener('click',()=>{
        const unit=form.elements.unit.value==='sqft'?'feet':'metres';openModal('Measure this space',`<form id="measure-form"><p>Enter the length and width in ${unit}. Their product will fill this space’s area.</p><div class="form-grid">${inputField('Length ('+unit+')','length','','number','min="0.01" max="10000" step="any" required')}${inputField('Width ('+unit+')','width','','number','min="0.01" max="10000" step="any" required')}</div><p id="measure-error" class="form-error" role="alert"></p><div class="form-actions"><button class="button" type="submit">Use calculated area</button></div></form>`);$('#measure-form').addEventListener('submit',event=>{event.preventDefault();const f=event.currentTarget,value=Number(f.elements.namedItem('length').value)*Number(f.elements.namedItem('width').value);if(!Number.isFinite(value)||value<0.01||value>100000){$('#measure-error').textContent='The calculated area must be between 0.01 and 100,000.';return;}$('.space-area',row).value=Number(value.toFixed(6));closeModal();calculate();});
      });
    }
    function updateSystem(){
      const system=data.estimator.systems.find(s=>s.id===form.elements.system.value);if(!system)return;
      estimatorSystem=system.id;
      if(previousFamily!==system.family){
        form.elements.prep.innerHTML=options(system.family==='floor'?[{value:0,label:'Sound surface · base prep included'},{value:20,label:'Light repairs · +₹20/sq.ft'},{value:50,label:'Moderate levelling · +₹50/sq.ft'},{value:90,label:'Heavy preparation · +₹90/sq.ft'}]:[{value:0,label:'Standard surface / top allowance'},{value:100,label:'Extra surface work · +₹100/sq.ft'},{value:250,label:'Detailed substrate work · +₹250/sq.ft'}]);
        form.elements.finish.innerHTML=options(system.family==='floor'?[{value:0,label:'Standard protective finish included'},{value:15,label:'Satin / matte upgrade · +₹15/sq.ft'},{value:25,label:'Textured finish upgrade · +₹25/sq.ft'}]:[{value:0,label:'Standard furniture finish included'},{value:100,label:'Detailed edge / finish work · +₹100/sq.ft'}]);previousFamily=system.family;
      }
      $('#system-preview').innerHTML=`<img src="${esc(imageSource(system.image))}" alt="${esc(system.name)} concept" width="180" height="120"><div><strong>${money(system.material+system.labour)} / sq.ft</strong><p>Base material + labour allowance</p><small>${system.family==='furniture'?'Use the countertop/tabletop surface area.':'Use the measured floor area.'}</small></div>`;
    }
    function calculate(){
      try{
        const input={rooms:$$('.space-row').map(row=>({name:$('.space-name',row).value.trim()||'Space',area:$('.space-area',row).value})),unit:form.elements.unit.value};
        ['complexity','waste','contingency','transport','tax','prep','finish'].forEach(key=>input[key]=form.elements[key].value);
        const system=data.estimator.systems.find(s=>s.id===form.elements.system.value),result=window.EpoxyCalculator.estimate(input,system);
        const budgetText=form.elements.budget.value,budget=Number(budgetText);
        if(budgetText!==''&&(!Number.isFinite(budget)||budget<0||budget>1000000000))throw new Error('Budget must be between ₹0 and ₹1,00,00,00,000.');
        currentEstimate={input:clone(input),result,system:clone(system),createdAt:new Date().toISOString()};$('#estimate-error').textContent='';
        $('#estimate-result').innerHTML=`<div class="estimate-total"><span class="eyebrow">Your indicative project budget</span><div class="estimate-number">${money(result.total)}</div><p>Planning range ${money(result.low)}–${money(result.high)}</p><div class="estimate-meta"><span>${result.area.toFixed(2)} sq.ft</span><span>${money(result.effectiveRate)} / sq.ft overall</span></div></div><div class="panel estimate-breakdown"><h3>Where the budget goes</h3><dl>${result.lines.map(([name,value])=>`<div><dt>${esc(name)}</dt><dd>${money(value)}</dd></div>`).join('')}</dl>${result.minimumAdjustment?`<p class="fine muted">The work allowance is brought up to the ${money(system.minimum)} minimum for this system.</p>`:''}${budgetText!==''?`<p class="budget-fit">${budget>=result.total?`${money(budget-result.total)} below your available budget.`:`${money(result.total-budget)} above your available budget.`} This comparison uses the planning total.</p>`:''}<div class="form-actions"><button class="button" data-action="quote-estimate">Discuss this estimate ↗</button><button class="button secondary small" data-action="print-estimate">Print / save PDF</button><button class="button secondary small" data-action="download-estimate">Download details</button></div><a class="text-link top-space" target="_blank" rel="noopener noreferrer" href="${whatsappLink(estimateText(currentEstimate))}">Open estimate in WhatsApp ↗</a></div>`;
        $('#finish-comparison').innerHTML=table(['Finish','Base rate / sq.ft','Planning total',''],data.estimator.systems.filter(s=>s.family===system.family).map(s=>{const other=window.EpoxyCalculator.estimate(input,s);return `<tr><td>${esc(s.name)}${s.id===system.id?' <span class="badge">Selected</span>':''}</td><td>${money(s.material+s.labour)}</td><td>${money(other.total)}</td><td><button class="button small secondary" data-action="compare-system" data-id="${s.id}">Select</button></td></tr>`;}).join(''))+'<p class="note">Comparisons use the same areas, preparation, design multiplier and allowances. Furniture and floor systems are compared separately.</p>';
      }catch(error){currentEstimate=null;$('#estimate-error').textContent=error.message;$('#estimate-result').innerHTML='<div class="panel"><h3>Check your measurements</h3><p>Enter valid areas and allowances to calculate your budget.</p></div>';$('#finish-comparison').innerHTML='';}
    }
    form.addEventListener('submit',event=>event.preventDefault());
    form.addEventListener('input',()=>{updateSystem();calculate();});
    form.elements.system.addEventListener('change',()=>{updateSystem();calculate();});
    form.elements.unit.addEventListener('change',()=>{const unit=form.elements.unit.value;if(unit!==previousUnit){const factor=unit==='sqm'?1/10.76391041671:10.76391041671;$$('.space-area').forEach(input=>{if(input.value!==''&&Number.isFinite(Number(input.value)))input.value=Number((Number(input.value)*factor).toFixed(6));});previousUnit=unit;calculate();}});
    $('#add-space').addEventListener('click',()=>{addSpace('Additional space',form.elements.unit.value==='sqft'?100:10);calculate();});
    addSpace('Main space',data.estimator.systems.find(s=>s.id===estimatorSystem)?.family==='furniture'?20:500);updateSystem();calculate();
  }
  function printEstimate(){
    if(!currentEstimate)return;
    const s=currentEstimate;
    $('#print-estimate').innerHTML=`
      <header class="estimate-brand"><span class="estimate-tag">Premium epoxy surfaces · Kolkata</span><h1>${esc(data.settings.name)}</h1><p>Art Your Own Kingdom</p><p>${esc(data.settings.phone)} · ${esc(data.settings.address)}</p></header>
      <section class="estimate-heading"><div><span class="estimate-tag">Project planning / not an invoice</span><h2>Epoxy budget estimate</h2><p>${esc(s.system.name)}<br>Total measured area: ${s.result.area.toFixed(2)} sq.ft</p></div><div><p>Prepared<br>${esc(new Date(s.createdAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}))} IST</p></div></section>
      <h2>01 / Your spaces</h2>${table(['Space','Measured area ('+esc(s.input.unit)+')'],s.input.rooms.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.area)}</td></tr>`).join(''))}
      <h2>02 / Cost breakdown</h2>${table(['Budget item','Amount (INR)'],s.result.lines.map(([label,value])=>`<tr><td>${esc(label)}</td><td>${money(value)}</td></tr>`).join(''))}
      <section class="estimate-budget"><h2>Planning total: ${money(s.result.total)}</h2><p>Indicative range (±15%): ${money(s.result.low)} – ${money(s.result.high)}</p></section>
      <h2>03 / Calculation assumptions</h2><p>Materials ${money(s.system.material)}/sq.ft; labour ${money(s.system.labour)}/sq.ft. Material allowance ${esc(s.input.waste)}%; design multiplier ${esc(s.input.complexity)}. Extra preparation ${money(s.input.prep)}/sq.ft; finish upgrade ${money(s.input.finish)}/sq.ft. Minimum work allowance ${money(s.system.minimum)}. Contingency ${esc(s.input.contingency)}%; tax allowance ${esc(s.input.tax)}%.</p>
      <section class="estimate-terms"><p><strong>Scope and confirmation</strong><br>This is a planning estimate, not a final quotation, invoice, payment request or tax document. Site assessment, product selection, access, preparation, artwork, electrical work and agreed specifications can change the final price. Contingency is a budget reserve, not a contractor fee. Catalogue offers are not automatically applied.</p><p>Discuss this estimate with ${esc(data.settings.name)} · ${esc(data.settings.phone)}<br>All amounts are in Indian Rupees. Save using your browser’s “Save as PDF” option; enable background graphics to retain the full epoxy theme.</p></section>`;
    document.body.dataset.printEstimate='true';window.print();
  }
  window.addEventListener('afterprint',()=>delete document.body.dataset.printEstimate);

  function adminEstimator(){
    $('#admin-content').innerHTML=adminTitle('Estimator rates & allowances')+`<div class="notice">These rates drive the public pricing page and calculator. They are editable planning allowances, not manufacturer coverage figures. Saving here also updates base design prices linked to each system.</div><form id="rates-form">${table(['System','Materials ₹/sq.ft','Labour ₹/sq.ft','Minimum work ₹'],data.estimator.systems.map(s=>`<tr><td>${esc(s.name)}</td><td><input aria-label="${esc(s.name)} material rate" name="${s.id}-material" type="number" min="0" max="100000" step="0.01" value="${s.material}" required></td><td><input aria-label="${esc(s.name)} labour rate" name="${s.id}-labour" type="number" min="0" max="100000" step="0.01" value="${s.labour}" required></td><td><input aria-label="${esc(s.name)} minimum" name="${s.id}-minimum" type="number" min="0" max="10000000" step="0.01" value="${s.minimum}" required></td></tr>`).join(''))}<div class="form-grid top-space">${inputField('Default material allowance (%)','waste',data.estimator.waste,'number','min="0" max="30" step="0.1" required')}${inputField('Default contingency (%)','contingency',data.estimator.contingency,'number','min="0" max="30" step="0.1" required')}${inputField('Default transport (₹)','transport',data.estimator.transport,'number','min="0" max="1000000" step="0.01" required')}</div><p id="rates-error" class="form-error" role="alert"></p><div class="form-actions"><button class="button" type="submit">Save estimator rates</button></div></form>`;
    $('#rates-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget,next=clone(data);next.estimator.systems.forEach(s=>['material','labour','minimum'].forEach(key=>s[key]=Number(form.elements[s.id+'-'+key].value)));['waste','contingency','transport'].forEach(key=>next.estimator[key]=Number(form.elements[key].value));try{next.estimator.systems.forEach(s=>window.EpoxyCalculator.estimate({rooms:[{area:1}],unit:'sqft',complexity:1,prep:0,finish:0,tax:0,...next.estimator},s));}catch(error){$('#rates-error').textContent=error.message;return;}next.designs.forEach(d=>{const s=next.estimator.systems.find(s=>s.id===d.systemId);if(s)d.price=s.material+s.labour;});if(commit(next))notify('Estimator and linked design rates saved.');});
  }

  function renderAdmin(){
    const tabs=[['overview','Overview'],['home','Homepage media'],['guides','Guide videos'],['courses','Courses'],['plans','Course plans'],['designs','Design services'],['batches','Batches & seats'],['discounts','Discounts'],['rates','Estimator rates'],['enquiries','Enquiry inbox'],['customers','Customers'],['students','Students'],['categories','Categories'],['reports','Reports'],['settings','Business settings']];
    main.innerHTML=heading('Studio workspace', 'Manage your local catalogue, training and enquiries.')+`<div class="notice"><strong>Admin demo — no login or security.</strong> All changes and enquiries are stored only in this browser. They are not shared with customers, other devices or a server. Do not use this demo to store sensitive information.</div>${storageWarning?`<div class="notice">${esc(storageWarning)}</div>`:''}<div class="admin-layout"><aside class="admin-nav" aria-label="Admin sections">${tabs.map(([key,label])=>`<button data-admin-tab="${key}" class="${adminTab===key?'active':''}">${label}</button>`).join('')}</aside><section class="admin-content" id="admin-content"></section></div>`;
    const renderers={overview:adminOverview,home:adminHomeMedia,guides:adminGuideVideos,courses:()=>adminItems('courses'),designs:()=>adminItems('designs'),plans:()=>adminItems('plans'),batches:adminBatches,discounts:adminDiscounts,rates:adminEstimator,enquiries:adminEnquiries,customers:()=>adminPeople('customers'),students:()=>adminPeople('students'),categories:adminCategories,reports:adminReports,settings:adminSettings};
    (renderers[adminTab]||adminOverview)();
  }

  function adminHomeMedia(){
    const slides=data.home.slideshow||[],active=slides.filter(s=>s.active!==false).length;
    $('#admin-content').innerHTML=adminTitle('Homepage media')+`<div class="notice">Choose up to 20 active showcase images. Tutorial videos accept MP4/WebM files up to 2 MB because this HTML-only version stores uploads in this browser.</div><form id="home-media-form"><section class="panel"><div class="form-grid">${inputField('Slideshow timing (seconds)','timing',(data.home.slideInterval/1000).toFixed(1),'number','min="1.5" max="10" step="0.5" required')}<label>How-to-use video URL / asset path<input name="softwareVideo" value="${esc(data.home.softwareVideo.startsWith('data:')?'':data.home.softwareVideo)}"></label><label>Upload how-to-use video<input name="softwareUpload" type="file" accept="video/mp4,video/webm"></label><label>Course guide video URL / asset path<input name="courseVideo" value="${esc(data.home.courseVideo.startsWith('data:')?'':data.home.courseVideo)}"></label><label>Upload course guide video<input name="courseUpload" type="file" accept="video/mp4,video/webm"></label></div></section><div class="section-heading"><h3>Showcase images <span class="muted">(${active}/20 active)</span></h3><button type="button" class="button small" data-action="add-home-slide">+ Add image</button></div><div class="media-admin-list">${slides.map((s,i)=>`<article class="media-admin-row"><img src="${esc(imageSource(s.image))}" alt=""><label class="check-label"><input type="checkbox" name="active-${i}" ${s.active!==false?'checked':''}>Show</label><label>Category<input name="category-${i}" value="${esc(s.category)}" maxlength="80" required></label><label>Caption<input name="caption-${i}" value="${esc(s.caption)}" maxlength="100" required></label><div class="row-actions"><button type="button" class="button small secondary" data-action="move-home-slide" data-index="${i}" data-direction="-1" ${i===0?'disabled':''}>↑</button><button type="button" class="button small secondary" data-action="move-home-slide" data-index="${i}" data-direction="1" ${i===slides.length-1?'disabled':''}>↓</button><button type="button" class="button small danger" data-action="remove-home-slide" data-index="${i}">Remove</button></div></article>`).join('')}</div><p id="home-media-error" class="form-error" role="alert"></p><div class="form-actions"><button class="button" type="submit">Save homepage media</button><a class="button secondary" href="#home">View homepage</a></div></form>`;
    $('#home-media-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,fd=new FormData(form),next=clone(data),activeCount=next.home.slideshow.filter((_,i)=>fd.get('active-'+i)==='on').length;if(activeCount>20){$('#home-media-error').textContent='Select no more than 20 active images.';return;}next.home.slideInterval=Math.round(Number(fd.get('timing'))*1000);next.home.slideshow.forEach((s,i)=>{s.active=fd.get('active-'+i)==='on';s.category=String(fd.get('category-'+i)).trim();s.caption=String(fd.get('caption-'+i)).trim();});for(const [field,target,urlField] of [['softwareUpload','softwareVideo','softwareVideo'],['courseUpload','courseVideo','courseVideo']]){const file=form.elements[field].files[0];if(file){if(!['video/mp4','video/webm'].includes(file.type)||file.size>2*1024*1024){$('#home-media-error').textContent='Videos must be MP4 or WebM and no larger than 2 MB.';return;}next.home[target]=await readAsData(file);}else{const value=String(fd.get(urlField)||'').trim();if(value)next.home[target]=value;}}if(commit(next)){renderAdmin();notify('Homepage media saved.');}});
  }

  function adminGuideVideos(){
    const row=(key,label)=>{const guide=data.home[key];return `<fieldset><legend>${label}</legend><div class="form-grid"><label class="check-label full"><input type="checkbox" name="${key}Enabled" ${guide.enabled?'checked':''}> Enable this video</label><label>Video title<input name="${key}Title" value="${esc(guide.title)}" maxlength="80" required></label><label>Video URL / asset path<input name="${key}Video" value="${esc(guide.video.startsWith('data:')?'':guide.video)}"></label><label class="full">Short description<textarea name="${key}Description" maxlength="220" required>${esc(guide.description)}</textarea></label><label class="full">Upload replacement video (MP4/WebM, max 2 MB)<input type="file" name="${key}Upload" accept="video/mp4,video/webm"></label></div></fieldset>`;};
    $('#admin-content').innerHTML=adminTitle('Guide videos')+`<div class="notice">These settings control the two floating video guides. Upload, replace, rename or disable either guide without editing source code.</div><form id="guide-video-form" class="stack">${row('customerGuide','Customer Guide Video')}${row('studentGuide','Student Guide Video')}<p id="guide-video-error" class="form-error" role="alert"></p><div class="form-actions"><button class="button" type="submit">Save guide videos</button><a class="button secondary" href="#home">View guides</a></div></form>`;
    $('#guide-video-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,fd=new FormData(form),next=clone(data);for(const key of ['customerGuide','studentGuide']){const guide=next.home[key],file=form.elements[key+'Upload'].files[0];guide.enabled=fd.get(key+'Enabled')==='on';guide.title=String(fd.get(key+'Title')).trim();guide.description=String(fd.get(key+'Description')).trim();if(file){if(!['video/mp4','video/webm'].includes(file.type)||file.size>2*1024*1024){$('#guide-video-error').textContent='Videos must be MP4 or WebM and no larger than 2 MB.';return;}guide.video=await readAsData(file);}else{const path=String(fd.get(key+'Video')||'').trim();if(path)guide.video=path;}if(guide.enabled&&(!guide.title||!guide.description||!guide.video)){$('#guide-video-error').textContent='Each enabled guide needs a title, description and video.';return;}}next.home.softwareVideo=next.home.customerGuide.video;next.home.courseVideo=next.home.studentGuide.video;if(commit(next)){renderGuideDock();renderAdmin();notify('Guide videos saved.');}});
  }

  function adminPeople(kind){
    const isStudent=kind==='students',records=data.enquiries.filter(e=>isStudent?/course|student/i.test(e.type):!/course|student/i.test(e.type));
    $('#admin-content').innerHTML=adminTitle(isStudent?'Students':'Customers')+`<div class="notice">People appear here after submitting a matching enquiry. Open any record to manage its status and internal notes.</div>`+table(['Name','Contact','Interest','Status',''],records.map(e=>`<tr><td><strong>${esc(e.name)}</strong></td><td>${esc(e.phone)}<small>${esc(e.email||'No email')}</small></td><td>${esc(e.itemName)}<small>${esc(e.type)}</small></td><td><span class="badge">${esc(e.status)}</span></td><td><button class="button small secondary" data-action="review-enquiry" data-id="${e.id}">Manage</button></td></tr>`).join(''));
  }

  function addHomeSlide(){
    if(data.home.slideshow.length>=20)return notify('The homepage already has 20 images. Remove one before adding another.');
    openModal('Add homepage image',`<form id="home-slide-form"><div class="form-grid"><label>Category<input name="category" maxlength="80" required></label><label>Caption<input name="caption" maxlength="100" required></label><label class="full">Image URL or asset path<input name="image" placeholder="https://… or assets/image.png"></label><label class="full">Or upload PNG, JPEG or WebP (max 600 KB)<input name="upload" type="file" accept="image/png,image/jpeg,image/webp"></label></div><p id="home-slide-error" class="form-error" role="alert"></p><div class="form-actions"><button class="button" type="submit">Add to showcase</button><button class="button secondary" type="button" data-action="close">Cancel</button></div></form>`);
    $('#home-slide-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,fd=new FormData(form),file=form.elements.upload.files[0];let image=String(fd.get('image')||'').trim();if(file){if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>600*1024){$('#home-slide-error').textContent='Choose a PNG, JPEG or WebP image no larger than 600 KB.';return;}image=await readAsData(file);}if(!image){$('#home-slide-error').textContent='Add an image URL/path or upload an image.';return;}const next=clone(data);next.home.slideshow.push({id:uid('hs'),caption:String(fd.get('caption')).trim(),category:String(fd.get('category')).trim(),image,active:true});if(commit(next)){closeModal();renderAdmin();notify('Homepage image added.');}});
  }

  function moveHomeSlide(index,direction){const next=clone(data),target=index+direction;if(target<0||target>=next.home.slideshow.length)return;[next.home.slideshow[index],next.home.slideshow[target]]=[next.home.slideshow[target],next.home.slideshow[index]];if(commit(next))renderAdmin();}
  function removeHomeSlide(index){const next=clone(data);next.home.slideshow.splice(index,1);if(commit(next)){renderAdmin();notify('Homepage image removed.');}}

  function readAsData(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});}

  function table(headers,rows){return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}"><div class="empty">No records yet.</div></td></tr>`}</tbody></table></div>`;}
  function adminTitle(title,action=''){return `<div class="section-heading"><h2>${esc(title)}</h2>${action}</div>`;}
  function statsHtml(){return `<div class="stats"><div class="stat"><span>Courses</span><strong>${data.courses.length}</strong></div><div class="stat"><span>Design concepts</span><strong>${data.designs.length}</strong></div><div class="stat"><span>New enquiries</span><strong>${data.enquiries.filter(e=>e.status==='New').length}</strong></div><div class="stat"><span>Confirmed registrations</span><strong>${data.enquiries.filter(e=>e.status==='Confirmed'&&e.batchId).length}</strong></div></div>`;}

  function adminOverview(){
    $('#admin-content').innerHTML=statsHtml()+`<div class="panel"><h3>Set up your studio</h3><p>Review your business details, adjust indicative rates and add only confirmed training schedules.</p><div class="form-actions"><button class="button" data-admin-tab="settings">Edit business details</button><button class="button secondary" data-admin-tab="courses">Manage courses</button></div></div><div class="section-heading"><h3>Latest enquiries</h3><button class="button small secondary" data-admin-tab="enquiries">View inbox</button></div>`+table(['Name','Interest','Status',''],data.enquiries.slice(0,5).map(e=>`<tr><td>${esc(e.name)}</td><td>${esc(e.itemName)}</td><td><span class="badge">${esc(e.status)}</span></td><td><button class="button small secondary" data-action="review-enquiry" data-id="${e.id}">Review</button></td></tr>`).join(''));
  }

  function adminItems(kind){
    const title=kind==='courses'?'Courses':kind==='plans'?'Course plans':'Design services';
    $('#admin-content').innerHTML=adminTitle(title,`<button class="button small" data-action="edit" data-kind="${kind}">+ Add ${kind==='plans'?'plan':kind==='courses'?'course':'design'}</button>`)+table(['Name',kind==='designs'?'Property type':'Level','Price','Actions'],data[kind].map(item=>`<tr><td><strong>${esc(item.name)}</strong><small>${kind==='courses'?`${item.duration} hours · ${esc(item.mode)}`:kind==='plans'?`${item.courseIds.length} courses · ${item.duration} hours`:esc(item.unit)}</small></td><td>${esc(item.level||item.category)}</td><td>${money(discountState(item).final)}${discountState(item).active?`<small>${item.discount}% discount</small>`:''}</td><td><div class="row-actions"><button class="button small secondary" data-action="edit" data-kind="${kind}" data-id="${item.id}">Edit</button><button class="button small danger" data-action="delete" data-kind="${kind}" data-id="${item.id}">Delete</button></div></td></tr>`).join(''));
  }

  function inputField(label,name,value='',type='text',extra=''){return `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;}
  function discountFields(item){return `<fieldset class="full"><legend>Price & discount</legend><div class="form-grid">${inputField('Original price (₹)','price',item.price||0,'number','min="0" max="100000000" step="0.01" required')}${inputField('Discount (%)','discount',item.discount||0,'number','min="0" max="100" step="0.01" required')}${inputField('Discount start (optional)','discountStart',item.discountStart||'','date')}${inputField('Discount end (optional)','discountEnd',item.discountEnd||'','date')}<label class="full">Special offer label<input name="offer" maxlength="100" value="${esc(item.offer||'')}"></label><output class="offer-summary full" id="price-preview"></output></div></fieldset>`;}
  function bindPricePreview(form){
    const update=()=>{ const price=Number(form.elements.price.value),discount=Number(form.elements.discount.value); $('#price-preview').textContent=`During offer: ${money(price*(1-discount/100))} · Outside offer: ${money(price)}. Blank dates mean no time limit.`; };
    form.elements.price.addEventListener('input',update);form.elements.discount.addEventListener('input',update);update();
  }
  function validateDiscount(record){
    if(!Number.isFinite(record.price)||record.price<0||record.price>100000000) return 'Enter a valid price between ₹0 and ₹10,00,00,000.';
    if(!Number.isFinite(record.discount)||record.discount<0||record.discount>100) return 'Discount must be between 0 and 100%.';
    if(record.discountStart && record.discountEnd && record.discountStart>record.discountEnd) return 'Discount end date must be on or after the start date.';
    return '';
  }

  function editItem(kind,id){
    const item=data[kind].find(i=>i.id===id)||{name:'',level:'Beginner',category:data.categories[kind]?.[0]||'',duration:8,mode:'Both',courseIds:[],image:'assets/pearl-floor.png',unit:'per sq.ft',description:'',syllabus:''};
    openModal(`${id?'Edit':'Add'} ${kind==='plans'?'course plan':kind==='courses'?'course':'design'}`,`<form id="item-form"><div class="form-grid"><label class="full">Name<input name="name" value="${esc(item.name)}" required maxlength="100"></label>${kind!=='plans'?`<label>Category<select name="category" required>${options(data.categories[kind],item.category)}</select></label>`:''}${kind!=='designs'?`<label>Level<select name="level">${options(levels,item.level)}</select></label>${inputField('Duration (hours)','duration',item.duration,'number','min="1" max="10000" required')}`:`<label>Price unit<select name="unit">${options(['per sq.ft','per project','per piece'],item.unit)}</select></label>`}${kind==='courses'?`<label>Learning mode<select name="mode">${options(['Online','Offline','Both'],item.mode)}</select></label>`:''}<label class="full">Description<textarea name="description" required maxlength="2000">${esc(item.description)}</textarea></label>${kind==='courses'?`<label class="full">Syllabus (one topic per line)<textarea name="syllabus" maxlength="3000">${esc(item.syllabus)}</textarea></label>`:''}${kind==='plans'?`<fieldset class="full"><legend>Included courses — select at least one</legend><div class="selection-list">${data.courses.map(c=>`<label><input type="checkbox" name="courseIds" value="${c.id}" ${item.courseIds.includes(c.id)?'checked':''}>${esc(c.name)} · ${esc(c.level)}</label>`).join('')||'<p>Add courses before creating a plan.</p>'}</div></fieldset>`:`<fieldset class="full"><legend>Design image</legend><label>Image URL or local asset path<input name="image" value="${esc(item.image.startsWith('data:')?'':item.image)}" placeholder="https://… or assets/your-image.png" maxlength="2000"></label><p class="fine muted">Upload a PNG, JPEG or WebP image up to 600 KB. Each course/design can have its own image. Remote image URLs require internet access.</p><label>Upload image<input type="file" name="upload" accept="image/png,image/jpeg,image/webp"></label><img class="upload-preview" id="image-preview" src="${esc(imageSource(item.image))}" alt="Current image preview"></fieldset>`}${discountFields(item)}</div><p id="item-error" class="form-error" role="alert"></p><div class="form-actions"><button class="button" type="submit">Save ${kind==='plans'?'plan':kind==='courses'?'course':'design'}</button><button class="button secondary" type="button" data-action="close">Cancel</button></div></form>`);
    const form=$('#item-form');bindPricePreview(form);
    let uploadedImage=item.image||'',uploading=false;
    if(kind!=='plans'){
      form.elements.image.addEventListener('input',()=>{uploadedImage='';$('#image-preview').src=imageSource(form.elements.image.value);});
      form.elements.upload.addEventListener('change',()=>{
        const file=form.elements.upload.files[0];if(!file)return;
        const fail=msg=>{$('#item-error').textContent=msg;form.elements.upload.value='';};
        if(!['image/png','image/jpeg','image/webp'].includes(file.type))return fail('Upload a PNG, JPEG or WebP image.');
        if(file.size>600*1024)return fail('Image is too large. Choose an image smaller than 600 KB.');
        uploading=true;const reader=new FileReader();reader.onload=()=>{uploadedImage=String(reader.result);$('#image-preview').src=uploadedImage;form.elements.image.value='';$('#item-error').textContent='';uploading=false;};reader.onerror=()=>{uploading=false;fail('Could not read the image. Try another file.');};reader.readAsDataURL(file);
      });
    }
    form.addEventListener('submit',event=>{
      event.preventDefault();const fd=new FormData(form),record={...item,id:id||uid(kind[0])};
      const fail=msg=>{$('#item-error').textContent=msg;};
      if(uploading)return fail('Wait for the image to finish loading.');
      ['name','description','offer','discountStart','discountEnd'].forEach(key=>record[key]=String(fd.get(key)||'').trim());
      ['price','discount'].forEach(key=>record[key]=Number(fd.get(key)));
      if(!record.name||!record.description)return fail('Name and description are required.');
      const error=validateDiscount(record);if(error)return fail(error);
      if(kind!=='designs'){record.level=String(fd.get('level'));record.duration=Number(fd.get('duration'));}
      if(kind==='plans'){record.courseIds=fd.getAll('courseIds');if(!record.courseIds.length)return fail('Choose at least one course for this plan.');}
      else{
        record.category=String(fd.get('category')||'');if(!record.category)return fail('Add a category first.');
        const url=String(fd.get('image')||'').trim();if(url&&imageSource(url)==='assets/pearl-floor.png'&&url!=='assets/pearl-floor.png')return fail('Use a valid HTTPS image URL or an assets/ path.');
        record.image=uploadedImage||url||'assets/pearl-floor.png';
      }
      if(kind==='courses'){
        record.mode=String(fd.get('mode'));record.syllabus=String(fd.get('syllabus')||'').trim();
        if(record.mode!=='Both'&&data.batches.some(b=>b.courseId===id&&b.mode!==record.mode))return fail('Update or remove batches in the other mode before changing this course mode.');
      }
      if(kind==='designs')record.unit=String(fd.get('unit'));
      const next=clone(data),index=next[kind].findIndex(i=>i.id===id);if(index>=0)next[kind][index]=record;else next[kind].push(record);
      if(commit(next)){closeModal();renderAdmin();notify('Saved successfully.');}
    });
  }

  function deleteItem(kind,id){
    const item=data[kind]?.find(i=>i.id===id);if(!item)return;
    if(kind==='courses'&&(data.plans.some(p=>p.courseIds.includes(id))||data.batches.some(b=>b.courseId===id)))return notify('This course is used by a plan or batch. Remove those references first.');
    if(kind==='batches'&&data.enquiries.some(e=>e.batchId===id))return notify('This batch has enquiry history. Keep it or remove its enquiries before deleting.');
    openModal('Delete this record?',`<p>Delete <strong>${esc(item.name)}</strong> from the local catalogue? This cannot be undone. Existing enquiry snapshots are retained.</p><div class="form-actions"><button class="button danger" id="confirm-delete">Delete record</button><button class="button secondary" data-action="close">Cancel</button></div>`);
    $('#confirm-delete').addEventListener('click',()=>{const next=clone(data);next[kind]=next[kind].filter(i=>i.id!==id);if(commit(next)){closeModal();renderAdmin();notify('Record deleted.');}});
  }

  function adminBatches(){
    $('#admin-content').innerHTML=adminTitle('Batches & seat availability','<button class="button small" data-action="edit-batch">+ Add batch</button>')+table(['Batch / course','Schedule','Seats','Actions'],data.batches.map(b=>`<tr><td><strong>${esc(b.name)}</strong><small>${esc(data.courses.find(c=>c.id===b.courseId)?.name||'Course unavailable')} · ${esc(b.mode)}</small></td><td>${prettyDate(b.start)}<small>To ${prettyDate(b.end)} · ${esc(b.schedule)}</small></td><td>${availableSeats(b)} / ${b.capacity} free<small>${b.start<today()?'Started / past':'Upcoming'}</small></td><td><div class="row-actions"><button class="button small secondary" data-action="edit-batch" data-id="${b.id}">Edit</button><button class="button small danger" data-action="delete" data-kind="batches" data-id="${b.id}">Delete</button></div></td></tr>`).join(''))+'<p class="note">Free seats = capacity − externally occupied seats − locally confirmed registrations. New enquiries do not reduce availability.</p>';
  }

  function editBatch(id){
    const b=data.batches.find(b=>b.id===id)||{name:'',courseId:data.courses[0]?.id||'',mode:'Offline',start:'',end:'',schedule:'',location:'',capacity:10,occupied:0};
    if(!data.courses.length)return notify('Add a course before creating a batch.');
    openModal(id?'Edit batch':'Add batch',`<form id="batch-form"><div class="form-grid"><label class="full">Batch name<input name="name" required maxlength="100" value="${esc(b.name)}"></label><label>Course<select name="courseId" required>${options(data.courses.map(c=>({value:c.id,label:c.name})),b.courseId)}</select></label><label>Mode<select name="mode">${options(['Online','Offline'],b.mode)}</select></label>${inputField('Start date','start',b.start,'date','required')}${inputField('End date','end',b.end,'date','required')}<label class="full">Schedule and timezone<input name="schedule" value="${esc(b.schedule)}" maxlength="150" placeholder="Sat–Sun · 10:00–14:00 IST" required></label><label class="full">Training center / online details<input name="location" value="${esc(b.location)}" maxlength="250" required></label>${inputField('Total seats','capacity',b.capacity,'number','min="1" max="10000" required')}${inputField('Seats occupied outside this demo','occupied',b.occupied,'number','min="0" max="10000" required')}</div><p id="batch-error" class="form-error" role="alert"></p><div class="form-actions"><button class="button" type="submit">Save batch</button><button class="button secondary" type="button" data-action="close">Cancel</button></div></form>`);
    const form=$('#batch-form');
    form.addEventListener('submit',event=>{
      event.preventDefault();const fd=new FormData(form),record=Object.fromEntries(fd),fail=msg=>{$('#batch-error').textContent=msg;};record.id=id||uid('b');record.capacity=Number(record.capacity);record.occupied=Number(record.occupied);record.name=record.name.trim();record.schedule=record.schedule.trim();record.location=record.location.trim();
      if(!record.name||!record.schedule||!record.location)return fail('Enter the batch name, schedule and location.');
      if(record.end<record.start)return fail('End date must be on or after start date.');
      const course=data.courses.find(c=>c.id===record.courseId);if(!course||course.mode!=='Both'&&course.mode!==record.mode)return fail('Batch mode must match the selected course mode.');
      if(data.enquiries.some(e=>e.batchId===id)&&(record.courseId!==b.courseId||record.mode!==b.mode))return fail('A batch with enquiry history cannot change its course or mode. Create a new batch instead.');
      const confirmed=data.enquiries.filter(e=>e.batchId===id&&e.status==='Confirmed').length;
      if(record.occupied+confirmed>record.capacity)return fail(`Capacity must cover ${record.occupied} externally occupied seats plus ${confirmed} confirmed registrations.`);
      const next=clone(data),index=next.batches.findIndex(b=>b.id===id);if(index>=0)next.batches[index]=record;else next.batches.push(record);
      if(commit(next)){closeModal();renderAdmin();notify('Batch saved.');}
    });
  }

  function adminDiscounts(){
    const rows=['courses','plans','designs'].flatMap(kind=>data[kind].map(i=>{
      const d=discountState(i),state=d.active?'Active':i.discount>0?(i.discountStart&&i.discountStart>today()?'Scheduled':'Expired'):'No offer';
      return `<tr><td>${esc(i.name)}<small>${kind}</small></td><td>${money(i.price)}</td><td>${i.discount}%<small>${money(d.final)} now</small></td><td>${esc(state)}<small>${i.discountStart?prettyDate(i.discountStart):'No start limit'} — ${i.discountEnd?prettyDate(i.discountEnd):'No end limit'}</small></td><td><button class="button small secondary" data-action="edit-discount" data-kind="${kind}" data-id="${i.id}">Edit offer</button></td></tr>`;
    })).join('');
    $('#admin-content').innerHTML=adminTitle('Discount management')+table(['Item','Original','Discount','Offer window',''],rows)+'<p class="note">Dates use the device’s local calendar. Both start and end dates are inclusive. Offers never stack.</p>';
  }

  function editDiscount(kind,id){
    const item=data[kind].find(i=>i.id===id);if(!item)return;
    openModal('Offer · '+item.name,`<form id="discount-form">${discountFields(item)}<p class="form-error" id="discount-error" role="alert"></p><div class="form-actions"><button type="submit" class="button">Save offer</button><button type="button" class="button secondary" data-action="close">Cancel</button></div></form>`);
    const form=$('#discount-form');bindPricePreview(form);form.addEventListener('submit',event=>{event.preventDefault();const fd=new FormData(form),record={...item,price:Number(fd.get('price')),discount:Number(fd.get('discount')),discountStart:fd.get('discountStart'),discountEnd:fd.get('discountEnd'),offer:String(fd.get('offer')).trim()},error=validateDiscount(record);if(error){$('#discount-error').textContent=error;return;}const next=clone(data);next[kind][next[kind].findIndex(i=>i.id===id)]=record;if(commit(next)){closeModal();renderAdmin();notify('Discount saved.');}});
  }

  function adminEnquiries(){
    $('#admin-content').innerHTML=adminTitle('Enquiry inbox','<button class="button small secondary" data-action="export-enquiries">Export all CSV</button>')+`<div class="toolbar"><label>Enquiry status<select id="enquiry-filter">${options(['All',...statuses],enquiryFilter)}</select></label><label>Search enquiries<input id="enquiry-search" type="search" placeholder="Name, mobile or interest"></label></div><div id="enquiry-table"></div>`;
    const update=()=>{enquiryFilter=$('#enquiry-filter').value;const q=$('#enquiry-search').value.toLowerCase();const records=data.enquiries.filter(e=>(enquiryFilter==='All'||e.status===enquiryFilter)&&(!q||(e.name+' '+e.phone+' '+e.itemName).toLowerCase().includes(q)));$('#enquiry-table').innerHTML=table(['Person','Enquiry','Date / status',''],records.map(e=>`<tr><td>${esc(e.name)}<small>${esc(e.phone)}</small></td><td>${esc(e.itemName)}<small>${esc(e.type)}${e.mode?' · '+esc(e.mode):''}</small></td><td>${new Date(e.createdAt).toLocaleDateString('en-IN')}<small>${esc(e.status)}</small></td><td><button class="button small secondary" data-action="review-enquiry" data-id="${e.id}">Review</button></td></tr>`).join(''));};$('#enquiry-filter').addEventListener('change',update);$('#enquiry-search').addEventListener('input',update);update();
  }

  function reviewEnquiry(id){
    const e=data.enquiries.find(e=>e.id===id);if(!e)return;
    openModal('Enquiry · '+e.name,`<div class="detail-meta"><span class="badge">${esc(e.type)}</span><span class="badge">${esc(e.status)}</span></div><p><strong>${esc(e.itemName)}</strong>${e.mode?' · '+esc(e.mode):''}${e.batchName?'<br>Batch: '+esc(e.batchName):''}</p><p>${esc(e.phone)}${e.email?' · '+esc(e.email):''}</p><p class="detail-description">${esc(e.message)}</p><p class="fine muted">Saved: ${esc(new Date(e.createdAt).toLocaleString())}${e.quotedPrice!==null?'<br>Indicative amount at enquiry: '+money(e.quotedPrice):''}</p><form id="review-form"><div class="form-grid"><label>Status<select name="status">${options(statuses,e.status)}</select></label><label class="full">Internal notes<textarea name="notes" maxlength="2000">${esc(e.notes)}</textarea></label></div><p class="note">Confirming a batch enquiry reserves one local seat. Cancelling or changing away from Confirmed releases it. No notification is sent.</p><p class="form-error" id="review-error" role="alert"></p><div class="form-actions"><button class="button" type="submit">Save changes</button><button class="button secondary" type="button" data-action="download-enquiry" data-id="${id}">Download</button><button class="button danger" type="button" id="delete-enquiry">Delete enquiry</button></div></form>`);
    if(e.attachments?.length)$('#modal-body').insertAdjacentHTML('beforeend',`<section class="enquiry-attachments"><h3>Locally attached images</h3><div class="attachment-preview">${e.attachments.map(a=>`<figure><img src="${esc(imageSource(a.data))}" alt="${esc(a.name)}"><figcaption>${esc(a.name)}</figcaption></figure>`).join('')}</div><p class="fine muted">These files were saved locally, not sent to WhatsApp.</p></section>`);
    $('#review-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget,status=form.elements.status.value,b=data.batches.find(b=>b.id===e.batchId);if(status==='Confirmed'&&e.batchId){if(!b||availableSeats(b,data,id)<1){$('#review-error').textContent='Cannot confirm: the batch is missing or has no free seats.';return;}}const next=clone(data),record=next.enquiries.find(i=>i.id===id);record.status=status;record.notes=form.elements.notes.value.trim();if(commit(next)){closeModal();renderAdmin();notify('Enquiry updated.');}});
    $('#delete-enquiry').addEventListener('click',()=>{openModal('Delete this enquiry?',`<p>This permanently removes ${esc(e.name)}’s local enquiry and releases any reserved local seat.</p><div class="form-actions"><button class="button danger" id="confirm-enquiry-delete">Delete enquiry</button><button class="button secondary" data-action="close">Cancel</button></div>`);$('#confirm-enquiry-delete').addEventListener('click',()=>{const next=clone(data);next.enquiries=next.enquiries.filter(i=>i.id!==id);if(commit(next)){closeModal();renderAdmin();notify('Enquiry deleted; it cannot be recovered unless exported earlier.');}});});
  }

  function adminCategories(){
    $('#admin-content').innerHTML=adminTitle('Catalogue categories')+`<div class="stack">${['courses','designs'].map(kind=>`<section class="panel"><h3>${kind==='courses'?'Course categories':'Property / room categories'}</h3><div class="category-list">${data.categories[kind].map((name,index)=>`<span class="category-tag">${esc(name)}<button data-action="rename-category" data-kind="${kind}" data-index="${index}" aria-label="Rename ${esc(name)}">Edit</button><button data-action="delete-category" data-kind="${kind}" data-index="${index}" aria-label="Delete ${esc(name)}">×</button></span>`).join('')}</div><button class="button small secondary top-space" data-action="add-category" data-kind="${kind}">+ Add category</button></section>`).join('')}</div><p class="note">Categories in use cannot be deleted. Renaming a category also updates its course/design records.</p>`;
  }

  function editCategory(kind,index){
    const previous=index===undefined?'':data.categories[kind][index];
    openModal(previous?'Rename category':'Add category',`<form id="category-form"><label>Category name<input name="name" required maxlength="100" value="${esc(previous)}"></label><p id="category-error" class="form-error" role="alert"></p><div class="form-actions"><button class="button" type="submit">Save category</button><button class="button secondary" type="button" data-action="close">Cancel</button></div></form>`);
    $('#category-form').addEventListener('submit',event=>{event.preventDefault();const name=event.currentTarget.elements.name.value.trim();if(!name||data.categories[kind].some((n,i)=>n.toLowerCase()===name.toLowerCase()&&i!==index)){$('#category-error').textContent='Enter a unique category name.';return;}const next=clone(data);if(previous){next.categories[kind][index]=name;next[kind].forEach(item=>{if(item.category===previous)item.category=name;});}else next.categories[kind].push(name);if(commit(next)){closeModal();renderAdmin();notify('Category saved.');}});
  }

  function deleteCategory(kind,index){
    const name=data.categories[kind][index];if(data[kind].some(i=>i.category===name))return notify('This category is in use. Reassign its courses/designs before deleting.');
    openModal('Delete category?',`<p>Remove ${esc(name)}?</p><div class="form-actions"><button class="button danger" id="confirm-category-delete">Delete</button><button class="button secondary" data-action="close">Cancel</button></div>`);$('#confirm-category-delete').addEventListener('click',()=>{const next=clone(data);next.categories[kind].splice(index,1);if(commit(next)){closeModal();renderAdmin();notify('Category deleted.');}});
  }

  function adminReports(){
    const total=data.enquiries.length,max=Math.max(1,...statuses.map(s=>data.enquiries.filter(e=>e.status===s).length));
    $('#admin-content').innerHTML=adminTitle('Reports','<button class="button small secondary" data-action="print">Print report</button>')+statsHtml()+`<div class="panel"><h3>Enquiries by status</h3><p>${total} locally saved enquiries · Generated ${esc(new Date().toLocaleString())}</p><div class="report-bars">${statuses.map(s=>{const count=data.enquiries.filter(e=>e.status===s).length;return `<div class="report-item"><span>${s}</span><div class="bar-track"><div class="bar" style="width:${count/max*100}%"></div></div><strong>${count}</strong></div>`;}).join('')}</div></div><div class="section-heading"><h3>Training capacity</h3></div>`+table(['Batch','Capacity','Occupied externally','Confirmed here','Free'],data.batches.map(b=>`<tr><td>${esc(b.name)}</td><td>${b.capacity}</td><td>${b.occupied}</td><td>${data.enquiries.filter(e=>e.batchId===b.id&&e.status==='Confirmed').length}</td><td>${availableSeats(b)}</td></tr>`).join(''))+`<div class="form-actions"><button class="button secondary" data-action="export-enquiries">Export enquiries CSV</button><button class="button secondary" data-action="export-catalogue">Export catalogue CSV</button><button class="button secondary" data-action="export-backup">Download all data (JSON)</button><button class="button secondary" data-action="export-previous">Export previous-version data</button></div><p class="note">These are activity reports, not revenue reports. No payments are processed or tracked. JSON includes personal enquiry details; keep exports private.</p>`;
  }

  function adminSettings(){
    const s=data.settings;
    $('#admin-content').innerHTML=adminTitle('Business settings')+`<section class="panel"><form id="settings-form"><div class="form-grid"><label class="full">Business name<input name="name" required maxlength="100" value="${esc(s.name)}"></label>${inputField('Mobile with country code','phone',s.phone,'tel','maxlength="20" placeholder="+91 …"')}${inputField('WhatsApp with country code','whatsapp',s.whatsapp,'tel','maxlength="20" placeholder="+91 …"')}${inputField('Business email','email',s.email,'email','maxlength="150"')}${inputField('Business hours','hours',s.hours,'text','maxlength="150"')}<label class="full">Business address<textarea name="address" maxlength="500">${esc(s.address)}</textarea></label><label class="full">Google Maps search location<input name="mapQuery" maxlength="300" value="${esc(s.mapQuery)}" placeholder="Exact business name and street address — not an embed code"></label><label>Instagram URL<input name="instagram" type="url" value="${esc(s.instagram||'')}"></label><label>Facebook URL<input name="facebook" type="url" value="${esc(s.facebook||'')}"></label><label>YouTube URL<input name="youtube" type="url" value="${esc(s.youtube||'')}"></label><label class="full">About your business<textarea name="about" maxlength="1000">${esc(s.about)}</textarea></label></div><p class="form-error" id="settings-error" role="alert"></p><div class="form-actions"><button type="submit" class="button">Save business details</button></div></form></section><p class="note">Google Maps, social profiles and WhatsApp require internet access. This demo opens email/WhatsApp drafts; it does not send messages automatically.</p>`;
    $('#settings-form').addEventListener('submit',event=>{event.preventDefault();const s=Object.fromEntries(new FormData(event.currentTarget));Object.keys(s).forEach(k=>s[k]=s[k].trim());if(!s.name){$('#settings-error').textContent='Business name is required.';return;}for(const key of ['phone','whatsapp'])if(s[key]&&(!/^\+?[\d\s()-]{7,20}$/.test(s[key])||s[key].replace(/\D/g,'').length<7||s[key].replace(/\D/g,'').length>15)){$('#settings-error').textContent='Enter valid phone/WhatsApp numbers with country code (7–15 digits).';return;}const next=clone(data);next.settings=s;if(commit(next)){updateBrand();notify('Business details saved.');}});
  }

  function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function csvCell(value){let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
  function csvDownload(name,headers,rows){download(name,'\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');}
  function exportEnquiries(){csvDownload('epoxy-enquiries.csv',['ID','Created','Name','Phone','Email','Type','Interest','Mode','Batch','Status','Message','Notes','Indicative amount at enquiry'],data.enquiries.map(e=>[e.id,e.createdAt,e.name,e.phone,e.email,e.type,e.itemName,e.mode,e.batchName,e.status,e.message,e.notes,e.quotedPrice]));}
  function exportCatalogue(){csvDownload('epoxy-catalogue.csv',['Type','Name','Category / level','Original price','Discount %','Current price','Discount start','Discount end','Unit / duration'],['courses','plans','designs'].flatMap(kind=>data[kind].map(i=>[kind,i.name,i.category||i.level,i.price,i.discount,discountState(i).final,i.discountStart,i.discountEnd,i.unit||i.duration+' hours'])));}

  document.addEventListener('click',event=>{
    const adminButton=event.target.closest('[data-admin-tab]');if(adminButton){adminTab=adminButton.dataset.adminTab;renderAdmin();return;}
    const button=event.target.closest('[data-action]');if(!button)return;
    const {action,kind,id,index}=button.dataset;
    if(action==='close')closeModal();
    if(action==='play-guide')playGuide(id);
    if(action==='detail')showDetail(kind,id);
    if(action==='gallery-detail')galleryDetail(id);
    if(action==='quote-concept'){const g=data.gallery.find(g=>g.id===id);if(g)goQuote({systemId:g.systemId,itemName:g.name,service:g.systemId==='river'?'River-style table':g.systemId==='counter'?'Countertop / tabletop':'Epoxy flooring',message:'I like the '+g.name+' concept. Please discuss a design for my project.'});}
    if(action==='estimate-system'){estimatorSystem=id;if(modal.open)closeModal();if(location.hash==='#estimator')renderEstimator();else location.hash='estimator';}
    if(action==='compare-system'){const form=$('#estimate-form');form.elements.system.value=id;form.elements.system.dispatchEvent(new Event('change',{bubbles:true}));$('#estimate-result').scrollIntoView({behavior:'auto',block:'nearest'});}
    if(action==='consultation-enquiry'){const c=data.consultations.find(c=>c.id===id);if(c)goQuote({service:'Video consultation',itemName:c.name,message:`I would like to request ${c.name}, a ${c.duration}-minute consultation with an indicative fee of ${money(c.price)}. Please confirm availability and session details.`});}
    if(action==='quote-estimate'&&currentEstimate){const s=clone(currentEstimate);goQuote({systemId:s.system.id,area:s.result.area.toFixed(2),unit:'sqft',itemName:s.system.name,service:s.system.id==='river'?'River-style table':s.system.id==='counter'?'Countertop / tabletop':'Epoxy flooring',message:estimateText(s),estimateTotal:s.result.total,estimate:s});}
    if(action==='download-estimate'&&currentEstimate)download('Epoxy_Aura_Budget_Estimate.txt',estimateText(currentEstimate),'text/plain;charset=utf-8');
    if(action==='print-estimate')printEstimate();
    if(action==='enquire')showEnquiry({kind,id});
    if(action==='batch-enquire'){const b=data.batches.find(b=>b.id===id);if(b)showEnquiry({kind:'courses',id:b.courseId,batchId:id});}
    if(action==='edit')editItem(kind,id);
    if(action==='delete')deleteItem(kind,id);
    if(action==='edit-batch')editBatch(id);
    if(action==='edit-discount')editDiscount(kind,id);
    if(action==='review-enquiry')reviewEnquiry(id);
    if(action==='add-home-slide')addHomeSlide();
    if(action==='move-home-slide')moveHomeSlide(Number(index),Number(button.dataset.direction));
    if(action==='remove-home-slide')removeHomeSlide(Number(index));
    if(action==='add-category')editCategory(kind);
    if(action==='rename-category')editCategory(kind,Number(index));
    if(action==='delete-category')deleteCategory(kind,Number(index));
    if(action==='export-enquiries')exportEnquiries();
    if(action==='export-catalogue')exportCatalogue();
    if(action==='export-backup')download('Epoxy_Aura_Backup.json',JSON.stringify(data,null,2),'application/json');
    if(action==='export-previous'){try{const previous=localStorage.getItem('epoxy-aura-data-v2')||localStorage.getItem('epoxy-studio-data-v1');if(previous)download('Epoxy_Aura_Previous_Data.json',previous,'application/json');else notify('No previous-version data exists at this browser address.');}catch(_){notify('Browser storage is unavailable.');}}
    if(action==='download-enquiry'){const e=data.enquiries.find(e=>e.id===id);if(e)download('epoxy-enquiry.txt',enquiryText(e),'text/plain;charset=utf-8');}
    if(action==='print')window.print();
  });

  function updateBrand(){
    $$('[data-business-name]').forEach(el=>el.textContent=data.settings.name);
    document.title=data.settings.name+' — Art Your Own Kingdom';
    $('#footer-year').textContent=new Date().getFullYear();
    $('#print-brand').innerHTML='<h1>'+esc(data.settings.name)+'</h1><p>Art Your Own Kingdom · '+esc(data.settings.phone)+'<br>'+esc(data.settings.address)+'</p>';
    const message=$('#whatsapp-message').value.trim(),topic=$('#whatsapp-topic').value;
    $('#whatsapp-send').href=whatsappLink('Hello '+data.settings.name+', I would like to enquire about '+topic+'.'+(message?'\n\n'+message:''));
    const address=$('#footer-address');if(address)address.textContent=data.settings.address;
    const map=$('#footer-map');if(map){const source='https://maps.google.com/maps?q='+encodeURIComponent(data.settings.mapQuery||data.settings.address)+'&output=embed';if(map.getAttribute('src')!==source)map.src=source;}
    const link=$('#footer-map-link');if(link)link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(data.settings.mapQuery||data.settings.address);
  }
  function render(){
    const page=location.hash.slice(1)||'home';
    document.body.classList.toggle('home-view',page==='home');
    clearInterval(slideshowTimer);slideshowTimer=null;
    if(modal.open)closeModal();
    delete document.body.dataset.printEstimate;
    $$('.more-nav').forEach(menu=>menu.open=false);
    $('#navigation').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');
    $$('#navigation a').forEach(a=>{const active=a.hash==='#'+page;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    const pages={home:renderHome,about:renderAbout,services:renderServices,gallery:renderGallery,pricing:renderPricing,estimator:renderEstimator,courses:renderCourses,plans:renderPlans,designs:renderDesigns,batches:renderBatches,consultation:renderConsultation,enquiry:renderQuote,contact:renderContact,faq:renderFaq,privacy:renderPrivacy,admin:renderAdmin};
    (pages[page]||renderHome)();
    if(['courses','plans','batches'].includes(page))main.insertAdjacentHTML('afterbegin',pageLinks());
    updateBrand();window.scrollTo(0,0);
  }
  window.addEventListener('hashchange',()=>{render();main.focus({preventScroll:true});});
  window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY)notify('Data changed in another tab. Reload before making further changes.');});
  // Update time-limited prices when returning to a previously hidden tab.
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!modal.open&&['courses','designs','plans','batches'].includes(location.hash.slice(1)))render();});
  $('#whatsapp-topic').addEventListener('change',updateBrand);
  $('#whatsapp-message').addEventListener('input',updateBrand);
  $('#motion-toggle').addEventListener('click',event=>{const paused=document.body.classList.toggle('motion-paused');event.currentTarget.textContent=paused?'Resume effects':'Pause effects';event.currentTarget.setAttribute('aria-pressed',String(paused));if((location.hash||'#home')==='#home')render();});
  renderGuideDock();
  render();
  if(storageWarning)notify(storageWarning);
})();
