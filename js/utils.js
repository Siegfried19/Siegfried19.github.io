export function addAnno(svg, id, pts, xScale, yScale, margin, dx ,dy, BOX_W) {
  svg.select('#' + id).remove();                     
  const W = +svg.attr('width')  - margin.r;          
  const H = +svg.attr('height') - margin.b;          
  const g = svg.append('g').attr('id', id);          

  pts.forEach(p => {
    const x0 = margin.l + xScale(p.year);            
    const y0 = margin.t + yScale(p.value);

    const BOX_H = 40;

    // let dx = x, dy = y;
    let boxX = x0 + dx, boxY = y0 + dy;

    if (boxX + BOX_W > W) { dx = -BOX_W - 40; boxX = x0 + dx; }
    if (boxY < margin.t)  { dy =  40;        boxY = y0 + dy; }

    g.append('path')
      .attr('d', `M${x0},${y0} l${dx},${dy}`)
      .attr('stroke', '#d62728')
      .attr('stroke-width', 1.5)
      .attr('fill', 'none');

    g.append('rect')
      .attr('x',      boxX)
      .attr('y',      boxY - BOX_H / 2)
      .attr('width',  BOX_W)
      .attr('height', BOX_H)
      .attr('fill',   '#fff')
      .attr('stroke', '#d62728');

    g.append('text')
      .attr('x', boxX + 6)          
      .attr('y', boxY + 5)         
      .attr('font-size', '0.75rem')
      .text(p.text);
  });
}

