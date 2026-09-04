/* Pure budget calculations. No DOM or dependencies.
 * All amounts are rounded to paise at line-item level before summing.
 * These are configurable planning assumptions, not product specifications.
 */
window.EpoxyCalculator = (() => {
  'use strict';
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const number = (value,min,max,label) => {
    if(value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value)<min || Number(value)>max) throw new Error(`${label} must be between ${min} and ${max}.`);
    return Number(value);
  };
  function areaSqft(rooms,unit) {
    if(!['sqft','sqm'].includes(unit))throw new Error('Choose square feet or square metres.');
    if(!Array.isArray(rooms)||!rooms.length||rooms.length>20)throw new Error('Add between 1 and 20 spaces.');
    const area=rooms.reduce((sum,r)=>sum+number(r.area,0.01,100000,'Each area'),0)*(unit==='sqm'?10.76391041671:1);
    if(area>100000)throw new Error('For more than 100,000 sq.ft, please request a custom quotation.');
    return area;
  }
  function estimate(input,system) {
    if(!system)throw new Error('Select an epoxy system.');
    const area=areaSqft(input.rooms,input.unit);
    const materialRate=number(system.material,0,100000,'Material rate');
    const labourRate=number(system.labour,0,100000,'Labour rate');
    const minimum=number(system.minimum,0,10000000,'Minimum project allowance');
    const complexity=number(input.complexity,1,1.5,'Design multiplier');
    const waste=number(input.waste,0,30,'Material allowance');
    const contingency=number(input.contingency,0,30,'Contingency');
    const transport=number(input.transport,0,1000000,'Transport');
    const taxPercent=number(input.tax,0,30,'Tax allowance');
    const prepRate=number(input.prep,0,1000,'Preparation rate');
    const finishRate=number(input.finish,0,500,'Finish upgrade rate');
    const materials=round(area*materialRate*complexity*(1+waste/100));
    const labour=round(area*labourRate),prep=round(area*prepRate),finish=round(area*finishRate);
    const base=round(materials+labour+prep+finish);
    const minimumAdjustment=round(Math.max(0,minimum-base));
    const subtotal=round(base+minimumAdjustment+transport);
    const tax=round(subtotal*taxPercent/100);
    const buffer=round(subtotal*contingency/100);
    const total=round(subtotal+tax+buffer);
    return {area,materials,labour,prep,finish,base,minimumAdjustment,transport,subtotal,tax,buffer,total,low:round(total*0.85),high:round(total*1.15),effectiveRate:round(total/area),lines:[
      ['Materials + design allowance',materials],['Application labour',labour],['Additional surface preparation',prep],['Protective finish upgrade',finish],['Minimum project adjustment',minimumAdjustment],['Transport / mobilisation',transport],['Tax allowance',tax],['Contingency reserve',buffer]
    ]};
  }
  return {estimate,areaSqft,round};
})();
