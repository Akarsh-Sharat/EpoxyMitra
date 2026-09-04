/* Editable starter catalogue. All prices, schedules and seats are SAMPLE DATA. */
window.EPOXY_SEED = (() => {
  const courseNames = ['Plain Design', 'Mix Design', '3D Design', '3D Design with Lighting', 'Complete Home Interior', 'Bedroom Design', 'Living Room Design', 'Kitchen Design', 'Bathroom Design', 'Office Design', 'Furniture Design', 'Other Room & Furniture Designs'];
  const levels = ['Beginner', 'Beginner', 'Intermediate', 'Advanced', 'Advanced', 'Intermediate', 'Intermediate', 'Intermediate', 'Intermediate', 'Advanced', 'Intermediate', 'Advanced'];
  const hours = [8, 12, 20, 28, 60, 16, 20, 16, 16, 24, 24, 32];
  const prices = [4999, 6999, 12999, 19999, 44999, 9999, 11999, 9999, 9999, 15999, 14999, 18999];
  const images = ['assets/pearl-floor.png', 'assets/ocean-floor.png', 'assets/river-table.png'];
  const dateAfter = days => { const d = new Date(); d.setDate(d.getDate() + days); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };
  const descriptions = [
    'Start with surface preparation, material measurement, colour selection and a clean single-colour finish. Includes guided practice and care basics.',
    'Learn two-tone blends, metallic movement and controlled colour mixing. Practise sample boards before planning a full surface.',
    'Explore image selection, layout, base preparation, artwork placement and clear finish planning for a dimensional floor.',
    'Combine dimensional artwork with lighting concepts, translucent accents and finish detailing. Electrical installation must be completed by a qualified professional.',
    'Plan coordinated finishes across an entire home: room surveys, design boards, material estimates, sequencing and client presentation.',
    'Create calm bedroom surfaces with pearl tones, restrained patterns, sample matching and a practical installation sequence.',
    'Develop statement living-room finishes using metallic movement, balanced colour palettes and furniture-aware layouts.',
    'Explore kitchen floor and counter design, substrate checks, edge detailing and product suitability assessment.',
    'Plan bathroom surfaces, drainage interfaces and slip-resistance requirements. Use suitable manufacturer-approved systems.',
    'Build an office design proposal with traffic zones, durable finish selection, branding and installation scheduling.',
    'Design resin river tables and furniture accents: mould planning, timber preparation, pouring sequence and finishing.',
    'Apply your skills to custom rooms, feature surfaces and furniture with a complete brief-to-sample design workflow.'
  ];
  const courses = courseNames.map((name, i) => ({id: 'c' + (i + 1), name, category: name, level: levels[i], duration: hours[i], price: prices[i], mode: i === 3 || i === 10 ? 'Offline' : i === 9 ? 'Online' : 'Both', image: images[i === 10 || i === 11 ? 2 : i === 2 || i === 3 ? 1 : 0], description: descriptions[i], discount: i === 0 ? 20 : i === 2 ? 10 : 0, discountStart: '', discountEnd: '', offer: i === 0 ? 'Starter offer' : '', syllabus: ['Design principles & material selection', 'Surface preparation & workflow', 'Guided demonstration and practice', 'Finishing, troubleshooting & maintenance'].join('\n')}));
  const properties = ['1 BHK', '2 BHK', '3 BHK', 'Flat', 'Apartment', 'Office', 'Bedroom', 'Living Room', 'Kitchen', 'Bathroom', 'Complete Home', 'Custom Design'];
  const designNames = ['Pearl One', 'Silver Current', 'Ocean Residence', 'Graphite Flow', 'Coastal Canvas', 'Studio Slate', 'Quiet Pearl', 'Ocean Statement', 'Stone & Silk', 'Blue Lagoon', 'Connected Spaces', 'Your Signature', 'Amber River Table'];
  const designs = designNames.map((name, i) => ({id:'d' + (i + 1), name, category: i === 12 ? 'Furniture' : properties[i], image:images[i === 12 ? 2 : [2, 4, 7, 9].includes(i) ? 1 : 0], price:i === 12 ? 25000 : 180 + i * 20, unit:i === 12 ? 'per piece' : 'per sq.ft', discount:i === 7 ? 15 : 0, discountStart:'', discountEnd:'', offer:i === 7 ? 'Design collection offer' : '', description: i === 12 ? 'A walnut-and-resin river table concept, tailored to your dimensions and colour preference. Final quotation follows the agreed specification.' : 'A considered epoxy finish for your ' + properties[i].toLowerCase() + '. Customise colour, pattern and finish after a site discussion. The displayed sample rate is indicative; surface repairs, site conditions, scope and taxes are confirmed in the final quotation.'}));
  return {
    version:1,
    settings:{name:'Epoxy Studio', phone:'', whatsapp:'', email:'', address:'', mapQuery:'', hours:'By appointment', about:'Hands-on learning and considered epoxy design for homes, offices and furniture.'},
    categories:{courses:[...courseNames], designs:[...properties, 'Furniture']},
    courses, designs,
    plans:[
      {id:'p1', name:'Foundation', level:'Beginner', courseIds:['c1','c2','c3'], duration:40, price:21999, discount:10, discountStart:'', discountEnd:'', offer:'Learn the essentials', description:'Build a confident foundation, from your first plain finish to an introductory 3D design.'},
      {id:'p2', name:'Room Specialist', level:'Intermediate', courseIds:['c6','c7','c8','c9'], duration:68, price:34999, discount:0, discountStart:'', discountEnd:'', offer:'Room-by-room learning', description:'Develop a consistent design approach for bedrooms, living spaces, kitchens and bathrooms.'},
      {id:'p3', name:'Complete Designer', level:'Advanced', courseIds:['c3','c4','c5','c11'], duration:132, price:84999, discount:15, discountStart:'', discountEnd:'', offer:'Complete learning path', description:'Bring advanced 3D, lighting, home interiors and furniture together in one practical programme.'}
    ],
    batches:[
      {id:'b1', courseId:'c1', name:'Weekend Foundations', mode:'Offline', start:dateAfter(14), end:dateAfter(15), schedule:'Sat–Sun · 10:00–14:00 IST', capacity:12, occupied:3, location:'Training center — address to be configured'},
      {id:'b2', courseId:'c3', name:'Live 3D Workshop', mode:'Online', start:dateAfter(21), end:dateAfter(25), schedule:'Mon–Fri · 18:00–22:00 IST', capacity:20, occupied:6, location:'Online · joining details after confirmation'},
      {id:'b3', courseId:'c11', name:'Furniture Lab', mode:'Offline', start:dateAfter(28), end:dateAfter(30), schedule:'10:00–18:00 IST', capacity:8, occupied:2, location:'Training center — address to be configured'}
    ],
    enquiries:[]
  };
})();
