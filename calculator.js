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
    const transport=number(input.transport,2000,1000000,'Transport / mobilisation');
    const finishRate=number(input.finish,0,500,'Finish upgrade rate');
    const minRate=number(system.minRate??materialRate,0,100000,'Minimum rate');
    const maxRate=number(system.maxRate??materialRate,0,100000,'Maximum rate');
    if(maxRate<minRate)throw new Error('Maximum rate must be greater than or equal to minimum rate.');
    const materials=round(area*materialRate),finish=round(area*finishRate);
    const total=round(materials+finish+transport);
    const low=round(area*minRate+finish+transport),high=round(area*maxRate+finish+transport);
    return {area,materials,finish,transport,total,low,high,effectiveRate:round(total/area),lines:[
      ['Materials + design allowance',materials],['Protective finish upgrade',finish],['Transport / mobilisation',transport]
    ]};
  }
  return {estimate,areaSqft,round};
})();
