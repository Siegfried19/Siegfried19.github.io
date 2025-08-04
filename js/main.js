import { addAnno } from './utils.js';

const state = { scene:0, extra:'none' };
const scenesDiv=[...document.querySelectorAll('.scene')];

document.getElementById('next').onclick=()=>{state.scene=(state.scene+1)%3;render();}
document.getElementById('previous').onclick=()=>{state.scene=(state.scene+2)%3;render();}

let tuitionData, incomeData, debtData;
Promise.all([
  d3.csv('data/tuition_cpi_vs_all.csv',d3.autoType),
  d3.csv('data/income_pell.csv',d3.autoType),
  d3.csv('data/debt_salary_rates.csv',d3.autoType)
]).then(([tuit,inc,debt])=>{
  tuitionData=tuit; incomeData=inc; debtData=debt;
  render();
});

function render(){
  scenesDiv.forEach((d,i)=>d.classList.toggle('active',i===state.scene));
  d3.select('#controls').html('');
  if(state.scene===0){
    scene0();
    // d3.select('#controls')
  }else if(state.scene===1){
    scene1();
  }else{
    scene2();
    d3.select('#controls')
      .append('select')
      .attr('id','extraSel')
      .html('<option value="none">— extra series —</option><option value="Debt-to-Income ratio">Debt-to-Income ratio</option><option value="5yr">Debt 5 yrs</option>')
      .property('value',state.extra)
      .on('change',e=>{state.extra=e.target.value; scene2(true);});
  }
}

function scene0(update=false){

  // SVG
  const svg = d3.select('#scene-0 svg'); 
  const margin = {t:30,r:50,b:40,l:60};
  const width  = +svg.attr('width')  - margin.l - margin.r;
  const height = +svg.attr('height') - margin.t - margin.b;

  svg.selectAll('g.chartroot').remove();

  const leftColor  = '#d1495b';  
  const rightColor = '#1d3557'; 

  // Axis
  const g = svg.append('g')
               .attr('class','chartroot')
               .attr('transform',`translate(${margin.l},${margin.t})`);

  const x = d3.scaleLinear()
              .domain(d3.extent(tuitionData,d=>d.year))
              .range([0,width]);
  
  /* Here we use the same interview for left and right*/            
  const yL = d3.scaleLinear()
              .domain([d3.min(tuitionData, d=>d.tuition_cpi_index),
                      d3.max(tuitionData,d=>d.tuition_cpi_index)])
              .nice()
              .range([height, 0]);

  const leftTicks = yL.ticks();
  const step = leftTicks[1] - leftTicks[0]; 
  const count = leftTicks.length;      
  
  const minR = d3.min(tuitionData, d=>d.cpi_all_items_index); 
  const rightTicks = d3.range(minR, minR + count * step, step);

  const yR = d3.scaleLinear()
              .domain([Math.floor(minR / step) * step, rightTicks[rightTicks.length-1]])
              .range([height,0]);        

  g.selectAll('*').remove();
  g.append('g')
    .attr('class','x axis')
    .attr('transform',`translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')));
  
  g.append('g')
    .attr('class','y axis left')
    .attr('stroke', leftColor)
    .attr('fill',  leftColor)
    .call(d3.axisLeft(yL));
  
  g.append('g')
    .attr('class', 'y axis right')
    .attr('stroke', rightColor)
    .attr('fill',  rightColor)
    .attr('transform',`translate(${width},0)`)
    .call(d3.axisRight(yR));

  // Two line
  const series = [
    {key:'tuition_cpi', color:leftColor, dash:'' , y:yL, field:'tuition_cpi_index'},
    {key:'total_cpi',     color:rightColor, dash:'4 2', y:yR, field:'cpi_all_items_index'}
  ];

  const lines = g.selectAll('.line').data(series, d=>d.key);

  lines.enter().append('path')
      .attr('class',d=>'line '+d.key)
      .merge(lines)
      .transition().duration(800)
      .attr('fill','none')
      .attr('stroke', d => d.color)
      .attr('stroke-width',2)
      .attr('stroke-dasharray',d => d.dash)
      .attr('d', d => d3.line()
                         .x(p=>x(p.year))
                         .y(p=>d.y(p[d.field]))
                         (tuitionData));
  lines.exit().remove();

  // Legend
  svg.selectAll('g.legend').remove();

  const legendData = [
    { label: 'Tuition CPI',       color: '#d62728', dash: null   }, 
    { label: 'All items CPI',     color: '#1f77b4', dash: '4 2' }  
  ];

  const lg = g.append('g')
    .attr('class','legend')
    .attr('transform', `translate(${10}, ${10})`);    

  legendData.forEach((d, i) => {
    const row = lg.append('g')
      .attr('transform', `translate(0, ${i * 20})`);

    row.append('line')
      .attr('x1', 0)
      .attr('x2', 24)
      .attr('y1', 9)
      .attr('y2', 9)
      .attr('stroke', d.color)
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', d.dash || null);

    row.append('text')
      .attr('x', 32)
      .attr('y', 12)
      .attr('font-size', '0.8rem')
      .text(d.label);
  });

  // Hover Toolkit
  g.selectAll('.vline').remove();           
  d3.select('.tooltip').remove();

  const chartBox = d3.select('#scene-0 .chart-box');
  const tip = chartBox.append('div')
    .attr('class','tooltip')
    .style('opacity',0);

  const vline = g.append('line')
    .attr('class','vline')
    .attr('y1', 0)
    .attr('y2', height)
    .style('opacity',0);

  g.append('rect')
    .attr('class','overlay')
    .attr('width', width)
    .attr('height', height)
    .attr('fill','none')
    .attr('pointer-events','all')
    .on('mousemove', event => {
      const [mx, my] = d3.pointer(event);
      const year = Math.round(x.invert(mx));
      const i    = tuitionData.findIndex(d => d.year === year);
      if (i < 0) return;                      
      const cur  = tuitionData[i];
      const prev = tuitionData[i-1];         

      const tuYoY = prev
          ? ((cur.tuition_cpi_index - prev.tuition_cpi_index) /
            prev.tuition_cpi_index * 100).toFixed(1) + '%'
          : '-';                              
      const cpYoY = prev
          ? ((cur.cpi_all_items_index - prev.cpi_all_items_index) /
            prev.cpi_all_items_index * 100).toFixed(1) + '%'
          : '-';

      vline.attr('x1', x(year))
          .attr('x2', x(year))
          .style('opacity', 1);

      tip.html(`
        <b>${year}</b><br>
        Tuition YoY: <b>${tuYoY}</b><br>
        CPI YoY: <b>${cpYoY}</b>
        `)
        .style('left', (mx + margin.l + 10) + 'px')   
        .style('top',  (my + margin.t + 10) + 'px')   
        .style('opacity', 1);
    })
    .on('mouseleave', () => {
        vline.style('opacity',0);
        tip.style('opacity',0);
    });

  // Annotation
  addAnno(svg,'anno0',[{
    year : 2008,
    value: tuitionData.find(d=>d.year===2008).tuition_cpi_index, 
    text:'Tuition CPI still +5% under 2008 crisis'
  }],x,yL,margin, 20, 30, 220);
}


function scene1(update=false){

  const svg = d3.select('#scene-1 svg'); 
  const margin = {t:30,r:50,b:40,l:60};
  const width  = +svg.attr('width')  - margin.l - margin.r;
  const height = +svg.attr('height') - margin.t - margin.b;

  const leftColor  = '#d1495b';  
  const rightColor = '#158639ff'; 

  // Axis
  svg.selectAll('g.chartroot').remove();
  const g = svg.append('g')
               .attr('class','chartroot')
               .attr('transform',`translate(${margin.l},${margin.t})`);

  const x = d3.scaleLinear()
              .domain(d3.extent(incomeData,d=>d.year))
              .range([0,width]);

  const yL = d3.scaleLinear()
              .domain(d3.extent(incomeData,d=>d.tuition_public))
              .nice()
              .range([height,0]);

  const yR = d3.scaleLinear()
              .domain(d3.extent(incomeData,d=>d.median_household_income_2023usd))
              
              .nice()
              .range([height,0]);
  
  
  g.selectAll('*').remove();
  g.append('g')
    .attr('class','x axis')
    .attr('transform',`translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')));

  g.append('g')
    .attr('class','y axis')
    .attr('stroke', leftColor)
    .attr('fill',  leftColor)
    .call(d3.axisLeft(yL));

  g.append('g')
    .attr('class','y axis')
    .attr('stroke', rightColor)
    .attr('fill',  rightColor)
    .attr('transform',`translate(${width},0)`)
    .call(d3.axisRight(yR));

  const series = [
    { key:'tuition', color:leftColor, dash:'',    y:yL, field:'tuition_public' },
    { key:'income',  color:rightColor, dash:'4 2', y:yR, field:'median_household_income_2023usd' }
  ];

  const lines = g.selectAll('.line').data(series, d => d.key);

  lines.enter()
      .append('path')
      .attr('class', d => 'line ' + d.key)
    .merge(lines)
      .transition().duration(800)
      .attr('fill', 'none')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.dash)
      .attr('d', d => d3.line()
                        .x(p => x(p.year))
                        .y(p => d.y(p[d.field]))
                        (incomeData));  

  lines.exit().remove();

  // Legend
  svg.selectAll('g.legend').remove();

  const legendData = [
    { label: 'Public School Tuition Fee(USD)',       color: '#d62728', dash: null   }, 
    { label: 'Median Household Income(USD)',     color: '#158639ff', dash: '4 2' }  
  ];

  const lg = g.append('g')
    .attr('class','legend')
    .attr('transform', `translate(${10}, ${10})`);     

  legendData.forEach((d, i) => {
    const row = lg.append('g')
      .attr('transform', `translate(0, ${i * 20})`);

    row.append('line')
      .attr('x1', 0)
      .attr('x2', 24)
      .attr('y1', 9)
      .attr('y2', 9)
      .attr('stroke', d.color)
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', d.dash || null);

    row.append('text')
      .attr('x', 32)
      .attr('y', 12)
      .attr('font-size', '0.8rem')
      .text(d.label);
  });

  // Hover toolkit
  g.selectAll('.vline').remove();
  d3.select('.tooltip').remove();

  const chartBox = d3.select('#scene-1 .chart-box');  
  const tip = chartBox.append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);

  const vline = g.append('line')
    .attr('class', 'vline')
    .attr('y1', 0)
    .attr('y2', height)
    .style('opacity', 0);

  g.append('rect')
    .attr('class', 'overlay')
    .attr('width',  width)
    .attr('height', height)
    .attr('fill',   'none')
    .attr('pointer-events', 'all')
    .on('mousemove', event => {
      const [mx, my] = d3.pointer(event);
      const year = Math.round(x.invert(mx));

      const idx = incomeData.findIndex(d => d.year === year);
      if (idx < 0) return;

      const cur  = incomeData[idx];
      const prev = incomeData[idx - 1];          

      const ratio = cur.ratio + '%' ?? '–' ;

      const tuYoY = prev
        ? ((cur.tuition_public - prev.tuition_public) /
          prev.tuition_public * 100).toFixed(1) + '%'
        : '-';
      const inYoY = prev
        ? ((cur.median_household_income_2023usd -
            prev.median_household_income_2023usd) /
            prev.median_household_income_2023usd * 100).toFixed(1) + '%'
        : '-';

      vline.attr('x1', x(year))
          .attr('x2', x(year))
          .style('opacity', 1);

      tip.html(`
        <b>${year}</b><br>
        Tuition / Income: <b>${ratio}</b><br>
        Tuition&nbsp;YoY: <b>${tuYoY}</b><br>
        Income&nbsp;YoY: <b>${inYoY}</b>
      `)
        .style('left', (mx + margin.l + 10) + 'px')
        .style('top',  (my + margin.t + 10) + 'px')
        .style('opacity', 1);
    })
    .on('mouseleave', () => {
      vline.style('opacity', 0);
      tip.style('opacity', 0);
    });

  addAnno(svg,'anno0',[{
    year : 2008,
    value: incomeData.find(d=>d.year===2008).tuition_public, 
    text:'2008 crisis'
  }],x,yL,margin, 20, 20, 80);
    
}


// ---------- Scene 2 -------------
function scene2(update = false) {

  // SVG
  const svg = d3.select('#scene-2 svg');
  const M   = { t: 30, r: 50, b: 40, l: 60 };
  const W   = +svg.attr('width')  - M.l - M.r;
  const H   = +svg.attr('height') - M.t - M.b;

  svg.selectAll('g.chartroot').remove();
  
  // Axis
  const g = svg.append('g')
               .attr('class', 'chartroot')
               .attr('transform', `translate(${M.l},${M.t})`);

  const x  = d3.scaleLinear()
               .domain(d3.extent(debtData, d => d.year))
               .range([0, W]);

  const yL = d3.scaleLinear()                     
               .domain([0, d3.max(debtData,
                       d => Math.max(d.avg_debt_usd,
                                     d.starting_salary_usd,
                                     d.debt_5yr_usd))])
               .nice()
               .range([H, 0]);

  const extraKey = state.extra;                   
  const yR = extraKey === 'Debt-to-Income ratio'
      ? d3.scaleLinear()
          .domain([0, d3.max(debtData, d => d.dti_percent)])
          .nice()
          .range([H, 0])
      : null;

  g.append('g').attr('class', 'x axis')
               .attr('transform', `translate(0,${H})`)
               .call(d3.axisBottom(x).tickFormat(d3.format('d')));

  g.append('g').attr('class', 'y axis').call(d3.axisLeft(yL));

  const yAxisR = g.append('g')
                  .attr('class', 'y axis right')
                  .attr('transform', `translate(${W},0)`);
  if (yR) yAxisR.call(d3.axisRight(yR)); else yAxisR.selectAll('*').remove();

  // lines
  const baseSeries = [
    { key:'avg_debt_usd', color:'#e9c46a', dash:'', field:'avg_debt_usd', label:'Avg Debt (USD)', y:yL},
    { key:'starting_salary_usd', color:'#ac1b91ff', dash:'4 2', field:'starting_salary_usd', label:'Starting Salary (USD)', y:yL }
  ];

  // Extra lines
  const extraInfo = {
    '5yr': { key:'debt_5yr_usd', color:'#e9c46a', dash:'3 3', y:yL, field:'debt_5yr_usd', label:'Debt After 5 yr (USD)',  },
    'Debt-to-Income ratio': { key:'dti_percent', color:'#a92e1eff', dash:'4 2', y:yR, field:'dti_percent', label:'Debt-to-Income ratio (%)'}
  };

  const series = extraKey && extraInfo[extraKey]
              ? [...baseSeries, extraInfo[extraKey]]
              : baseSeries;

  const lines = g.selectAll('.line').data(series, d => d.key);

  lines.enter()
      .append('path')
      .attr('class', d => 'line ' + d.key)
    .merge(lines)
      .transition().duration(800)
      .attr('fill', 'none')
      .attr('stroke',        d => d.color)
      .attr('stroke-width',  2)
      .attr('stroke-dasharray', d => d.dash)
      .attr('d', d => d3.line()
                        .x(p => x(p.year))
                        .y(p => d.y(p[d.field]))
                        (debtData));

  lines.exit().remove();

  // Legend
  svg.selectAll('g.legend').remove();

  const legendData = series.map(d => ({
    label : d.label,
    color : d.color,
    dash  : d.dash
  }));

  const lg = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${M.l + 10}, ${M.t})`);

  legendData.forEach((d, i) => {
    const row = lg.append('g')
      .attr('transform', `translate(0, ${i * 20})`);

    row.append('line')
      .attr('x1', 0).attr('x2', 24)
      .attr('y1', 9).attr('y2', 9)
      .attr('stroke', d.color)
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', d.dash || null);

    row.append('text')
      .attr('x', 32).attr('y', 12)
      .attr('font-size', '0.8rem')
      .text(d.label);
  });



  // Hover Toolkit
  g.selectAll('.vline').remove();
  d3.select('.tooltip').remove();

  const chartBox = d3.select('#scene-2 .chart-box');  
  const tip = chartBox.append('div')
    .attr('class','tooltip')
    .style('opacity',0);

  const vline = g.append('line')
    .attr('class','vline')
    .attr('y1',0).attr('y2',H)
    .style('opacity',0);

  g.append('rect')
    .attr('class','overlay')
    .attr('width', W)
    .attr('height', H)
    .attr('fill','none')
    .attr('pointer-events','all')
    .on('mousemove', event => {
      const [mx, my] = d3.pointer(event);
      const yr  = Math.round(x.invert(mx));
      const row = debtData.find(d => d.year === yr);
      if (!row) return;

      const fmt$ = d3.format('$,');
      const fmtP = d => d.toFixed(1) + '%';

      let html = `
        <b>${yr}</b><br>
        Avg Debt: <b>${fmt$(row.avg_debt_usd)}</b><br>
        Salary: <b>${fmt$(row.starting_salary_usd)}</b><br>`;
      if (state.extra === '5yr')
        html += `Debt 5 yr: <b>${fmt$(row.debt_5yr_usd)}</b>`;
      else if (state.extra === 'Debt-to-Income ratio')
        html += `Debt-to-Income ratio: <b>${fmtP(row.dti_percent)}</b>`;

      vline.attr('x1', x(yr))
          .attr('x2', x(yr))
          .style('opacity',1);

      tip.html(html)
        .style('left', (mx + M.l + 10) + 'px')
        .style('top',  (my + M.t + 10) + 'px')
        .style('opacity', 1);
    })
    .on('mouseleave', () => {
      vline.style('opacity',0);
      tip.style('opacity',0);
    });


  // Annotation
  addAnno(svg, 'anno2', [{
    year : 2008,
    value: debtData.find(d => d.year === 2008).avg_debt_usd,
    text : '2008 crisis'
  }], x, yL, M, 40, -55, 80);
}
