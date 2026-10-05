/* Business content from Epoxy_Aura.docx.
 * Rates below are proposed planning rates, not verified commercial quotations.
 * Kept separate from the original catalogue so the original simple structure stays readable.
 */
(() => {
  const seed = window.EPOXY_SEED;
  seed.version = 3;
  seed.settings = {
  name: 'EpoxyMitra',
  phone: '+91 6290490950 / +91 6202533268',
  whatsapp: '+91 6202533268',
  email: 'info@epoxymitra.com',

  address: 'Shop No 1, Street Number 844, Plot No 1278, Newtown AAIIIC, Kolkata 700160',
  mapQuery: 'Shop No 1, Street Number 844, Plot No 1278, Newtown AAIIIC, Kolkata 700160',

  hours: 'Please call to arrange a visit.',
  instagram: '',
  facebook: '',
  youtube: '',

  about: 'EpoxyMitra is a Kolkata-based epoxy design service creating distinctive, durable and artistic resin surfaces for homeowners, commercial spaces, designers, contractors and property owners.'
};
  // No confirmed dates or seat counts were supplied: never fabricate scheduled classes.
  seed.batches = [];
  const courseImages = ['solid-office.png','pearl-floor.png','ocean-floor.png','ocean-floor.png','pearl-floor.png','pearl-bedroom.png','pearl-floor.png','countertop.png','glitter-floor.png','flake-floor.png','river-table.png','workshop.png'];
  seed.courses.forEach((course,index) => {
    course.image = 'assets/' + courseImages[index];
    course.discount = 0; course.offer = '';
    course.syllabus = [
      'Epoxy systems, product selection and safety data sheets',
      'Surface preparation, moisture checks and substrate suitability',
      'Primer, screed, mid-coat, design coat and protective finishing',
      'Manufacturer mixing ratios, viscosity, pot life and curing conditions',
      course.name + ': colour planning, demonstration and practice',
      'Defects, repairs, quantity planning and job costing'
    ].join('\n');
  });
  seed.courses.forEach((course,index) => { if ([0,2,3].includes(index)) { course.discount=[20,15,10][[0,2,3].indexOf(index)]; course.offer='Learning launch offer'; } });
  seed.plans.forEach((plan,index) => {plan.discount=index===0?20:index===2?15:0;plan.offer=plan.discount?'Complete-plan offer':'';});
  seed.estimator = {
    pricingEdition: 2, transport: 2000,
    systems: [
      {id:'plain',name:'Plain / Solid Colour Epoxy',family:'floor',material:95,minRate:80,maxRate:110,rateNote:'₹80–₹110/sq.ft',image:'assets/solid-office.png',description:'Suggested customer range ₹80–₹110/sq.ft. Suitable for homes, shops and garages.'},
      {id:'flake',name:'Flake / Chip Epoxy',family:'floor',material:135,minRate:110,maxRate:160,rateNote:'₹110–₹160/sq.ft',image:'assets/flake-floor.png',description:'Suggested customer range ₹110–₹160/sq.ft. Suitable for garages, balconies and shops.'},
      {id:'glitter',name:'Glitter Epoxy',family:'floor',material:140,minRate:120,maxRate:160,rateNote:'₹120–₹160/sq.ft',image:'assets/glitter-floor.png',description:'Suggested customer range ₹120–₹160/sq.ft. Suitable for bedrooms and living rooms.'},
      {id:'pearl',name:'Pearl Epoxy',family:'floor',material:160,minRate:140,maxRate:180,rateNote:'₹140–₹180/sq.ft',image:'assets/pearl-bedroom.png',description:'Suggested customer range ₹140–₹180/sq.ft. Suitable for homes and showrooms.'},
      {id:'metallic',name:'Metallic Epoxy',family:'floor',material:195,minRate:170,maxRate:220,rateNote:'₹170–₹220/sq.ft',image:'assets/pearl-floor.png',description:'Suggested customer range ₹170–₹220/sq.ft. Suitable for luxury homes and offices.'},
      {id:'marble',name:'Marble-effect Epoxy',family:'floor',material:215,minRate:180,maxRate:250,rateNote:'₹180–₹250/sq.ft',image:'assets/pearl-floor.png',description:'Suggested customer range ₹180–₹250/sq.ft. Suitable for homes and showrooms.'},
      {id:'3d',name:'3D Epoxy',family:'floor',material:250,minRate:200,maxRate:300,rateNote:'₹200–₹300+/sq.ft',image:'assets/ocean-floor.png',description:'Suggested customer range ₹200–₹300+/sq.ft. Suitable for feature rooms and restaurants.'},
      {id:'quartz',name:'Quartz Epoxy',family:'floor',material:185,minRate:150,maxRate:220,rateNote:'₹150–₹220/sq.ft',image:'assets/flake-floor.png',description:'Suggested customer range ₹150–₹220/sq.ft. Suitable for commercial and industrial spaces.'},
      {id:'counter',name:'Epoxy Countertop',family:'furniture',material:1250,minRate:700,maxRate:2500,rateNote:'Budget ₹700–₹1,000 · Good ₹1,000–₹1,500 · Premium ₹1,500–₹2,500+/sq.ft',image:'assets/countertop.png',description:'Countertop pricing from the supplied Kolkata selling-price ranges.'},
      {id:'table-plain',name:'Epoxy Table Top – Plain',family:'furniture',material:1500,minRate:800,maxRate:2000,rateNote:'Budget ₹800–₹1,200 · Good ₹1,200–₹1,800 · Premium ₹2,000+/sq.ft',image:'assets/river-table.png',description:'Plain epoxy tabletop pricing from the supplied Kolkata selling-price ranges.'},
      {id:'table-pearl-metallic',name:'Pearl / Metallic Tabletop',family:'furniture',material:1850,minRate:1000,maxRate:2500,rateNote:'Budget ₹1,000–₹1,500 · Good ₹1,500–₹2,200 · Premium ₹2,500+/sq.ft',image:'assets/river-table.png',description:'Pearl or metallic tabletop pricing from the supplied Kolkata selling-price ranges.'}
    ]
  };
  const assignedSystems=['pearl','metallic','3d','marble','glitter','plain','pearl','3d','marble','glitter','metallic','flake','table-plain'];
  seed.designs.forEach((design,index) => {
    const system=seed.estimator.systems.find(s=>s.id===assignedSystems[index]);
    design.systemId=system.id;design.image=system.image;
    design.price=system.material;design.unit='per sq.ft';
    design.discount=0;design.offer='';
    design.description=`${system.description} Designed for ${design.category.toLowerCase()} projects. Colour, substrate, surface preparation and finish are agreed after a project review. The indicative rate covers the materials and design allowance; protective finish and transport are calculated separately.`;
  });
  seed.designs.push({id:'d14',name:'Graphite Vein Counter',category:'Furniture',systemId:'counter',image:'assets/countertop.png',price:950,unit:'per sq.ft',discount:0,discountStart:'',discountEnd:'',offer:'',description:'A graphite-and-white decorative countertop concept for kitchens, cafés and bars. Suitable-substrate resurfacing, edge detail and protective finishing are reviewed before quotation.'});
  const addedDesigns = [
    ['d15','Golden Dining Flow','Dining Room','metallic','assets/pearl-floor.png'],
    ['d16','Balcony Stone Shield','Balcony','flake','assets/flake-floor.png'],
    ['d17','Cascade Stair Finish','Staircase','marble','assets/pearl-floor.png'],
    ['d18','Seamless Pearl Flooring','Flooring','pearl','assets/pearl-bedroom.png'],
    ['d19','Amber River Statement','Table','river','assets/river-table.png'],
    ['d20','Midnight Vein Countertop','Countertop','counter','assets/countertop.png'],
    ['d21','Golden Reception Flow','Commercial Space','metallic','assets/solid-office.png']
  ];
  addedDesigns.forEach(([id,name,category,systemId,image],index)=>{const mappedId=systemId==='river'?'table-plain':systemId;const system=seed.estimator.systems.find(s=>s.id===mappedId);seed.designs.push({id,name,category,systemId:mappedId,image,price:system.material,unit:'per sq.ft',discount:index===6?10:0,discountStart:'',discountEnd:'',offer:index===6?'Commercial design offer':'',description:`${system.description} A premium ${category.toLowerCase()} concept with colour, preparation and final scope confirmed after a project review.`});});
  seed.categories.designs = ['1 BHK','2 BHK','3 BHK','Flat','Apartment','Office','Bedroom','Living Room','Kitchen','Bathroom','Dining Room','Balcony','Staircase','Flooring','Furniture','Table','Countertop','Commercial Space','Complete Home','Custom Design'];
  seed.gallery = [
    {id:'g1',name:'Silver Current',category:'Metallic floors',image:'assets/pearl-floor.png',systemId:'metallic',description:'Pearl-white and graphite metallic movement across a contemporary living-room floor.',finish:'Reflective metallic'},
    {id:'g2',name:'Ocean Statement',category:'3D floors',image:'assets/ocean-floor.png',systemId:'3d',description:'An ocean-inspired dimensional floor concept for a bold feature space.',finish:'High-gloss clear'},
    {id:'g3',name:'Quiet Pearl',category:'Pearl & glitter',image:'assets/pearl-bedroom.png',systemId:'pearl',description:'A pearl ivory and silver-blue floor brings a restrained sheen to a bedroom.',finish:'Pearlescent'},
    {id:'g4',name:'Champagne Light',category:'Pearl & glitter',image:'assets/glitter-floor.png',systemId:'glitter',description:'Fine champagne sparkle designed for a boutique or decorative interior.',finish:'Fine glitter'},
    {id:'g5',name:'Studio Grey',category:'Plain & flake',image:'assets/solid-office.png',systemId:'plain',description:'A clean grey finish with a simple, continuous look for a modern workplace.',finish:'Solid colour'},
    {id:'g6',name:'Graphite Flake',category:'Plain & flake',image:'assets/flake-floor.png',systemId:'flake',description:'Grey, white and charcoal flakes for a practical garage or utility-space concept.',finish:'Decorative flake'},
    {id:'g7',name:'Graphite Vein',category:'Counters & tables',image:'assets/countertop.png',systemId:'counter',description:'A dark graphite countertop with white veining and carefully finished edges.',finish:'Marble effect'},
    {id:'g8',name:'Amber River',category:'Counters & tables',image:'assets/river-table.png',systemId:'river',description:'Walnut grain and translucent amber resin in a statement river-table concept.',finish:'Timber & resin'},
    {id:'g9',name:'Learn by Making',category:'Learning',image:'assets/workshop.png',systemId:'',description:'An illustrative hands-on sample-board session showing the practical focus of epoxy learning.',finish:'Workshop illustration'}
  ];
  seed.consultations = [
    {id:'consult-design',name:'Design Direction',price:999,duration:30,description:'Choose your finish, colours and next steps before committing to a project.',topics:['Review your room and reference images','Compare suitable finish concepts','Discuss scope and budget questions']},
    {id:'consult-technical',name:'Project Planning',price:1999,duration:60,description:'Work through a project plan with material, layer and cost considerations.',topics:['Review visible site conditions by video','Discuss product and layer selection','Plan quantities using product-specific coverage','Review workflow and cost assumptions']},
    {id:'consult-troubleshoot',name:'Troubleshooting Review',price:2499,duration:60,description:'Discuss a visible issue and the information needed to assess repair options.',topics:['Review photos, video and product details','Discuss mixing, timing and environmental factors','Outline questions for your supplier or site specialist']}
  ];
  seed.home = {
    slideInterval: 2000,
    softwareVideo: 'assets/how-to-use-software.mp4',
    courseVideo: 'assets/how-to-join-course.mp4',
    customerGuide: {enabled:true,title:'Customer Guide',description:'Browse designs, check prices and send an enquiry.',video:'assets/how-to-use-software.mp4'},
    studentGuide: {enabled:true,title:'Student Guide',description:'Explore courses, fees and registration.',video:'assets/how-to-join-course.mp4'},
    slideshow: [
      ['Luxury Living Room','Living Room','assets/pearl-floor.png'],['Ocean Dimension','3D Epoxy Design','assets/ocean-floor.png'],['Quiet Pearl Suite','Bedroom','assets/pearl-bedroom.png'],['Champagne Sparkle','Decorative Flooring','assets/glitter-floor.png'],['Graphite Studio','Office','assets/solid-office.png'],['Amber River','Furniture & Table','assets/river-table.png'],['Midnight Vein','Kitchen Countertop','assets/countertop.png'],['Graphite Flake','Garage & Shop','assets/flake-floor.png'],['Learn by Making','Professional Training','assets/workshop.png']
    ].map((slide,index)=>({id:'hs'+(index+1),caption:slide[0],category:slide[1],image:slide[2],active:true}))
  };
})();
