import{p as V}from"./chunk-353BL4L5-SFeoycSY.js";import{aB as S,aC as z,aD as U,_ as u,g as j,s as q,a as H,b as Z,q as J,p as K,l as F,c as Q,D as X,H as Y,O as tt,V as P,af as et,e as at,y as rt,F as nt}from"./index-xXuyuj4Z.js";import{p as it}from"./treemap-FKARHQ26-DAwydcyy.js";import"./_baseUniq-D0yhYwcx.js";import"./_basePickBy-DSVvJnAN.js";import"./clone-bO0EptEs.js";function st(t,a){return a<t?-1:a>t?1:a>=t?0:NaN}function lt(t){return t}function ot(){var t=lt,a=st,h=null,l=S(0),p=S(z),x=S(0);function i(e){var r,o=(e=U(e)).length,g,A,m=0,c=new Array(o),n=new Array(o),v=+l.apply(this,arguments),D=Math.min(z,Math.max(-z,p.apply(this,arguments)-v)),f,T=Math.min(Math.abs(D)/o,x.apply(this,arguments)),$=T*(D<0?-1:1),d;for(r=0;r<o;++r)(d=n[c[r]=r]=+t(e[r],r,e))>0&&(m+=d);for(a!=null?c.sort(function(y,w){return a(n[y],n[w])}):h!=null&&c.sort(function(y,w){return h(e[y],e[w])}),r=0,A=m?(D-o*$)/m:0;r<o;++r,v=f)g=c[r],d=n[g],f=v+(d>0?d*A:0)+$,n[g]={data:e[g],index:r,value:d,startAngle:v,endAngle:f,padAngle:T};return n}return i.value=function(e){return arguments.length?(t=typeof e=="function"?e:S(+e),i):t},i.sortValues=function(e){return arguments.length?(a=e,h=null,i):a},i.sort=function(e){return arguments.length?(h=e,a=null,i):h},i.startAngle=function(e){return arguments.length?(l=typeof e=="function"?e:S(+e),i):l},i.endAngle=function(e){return arguments.length?(p=typeof e=="function"?e:S(+e),i):p},i.padAngle=function(e){return arguments.length?(x=typeof e=="function"?e:S(+e),i):x},i}var ct=nt.pie,G={sections:new Map,showData:!1},b=G.sections,O=G.showData,ut=structuredClone(ct),pt=u(()=>structuredClone(ut),"getConfig"),gt=u(()=>{b=new Map,O=G.showData,rt()},"clear"),dt=u(({label:t,value:a})=>{b.has(t)||(b.set(t,a),F.debug(`added new section: ${t}, with value: ${a}`))},"addSection"),ft=u(()=>b,"getSections"),ht=u(t=>{O=t},"setShowData"),mt=u(()=>O,"getShowData"),R={getConfig:pt,clear:gt,setDiagramTitle:K,getDiagramTitle:J,setAccTitle:Z,getAccTitle:H,setAccDescription:q,getAccDescription:j,addSection:dt,getSections:ft,setShowData:ht,getShowData:mt},vt=u((t,a)=>{V(t,a),a.setShowData(t.showData),t.sections.map(a.addSection)},"populateDb"),yt={parse:u(async t=>{const a=await it("pie",t);F.debug(a),vt(a,R)},"parse")},St=u(t=>`
  .pieCircle{
    stroke: ${t.pieStrokeColor};
    stroke-width : ${t.pieStrokeWidth};
    opacity : ${t.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${t.pieOuterStrokeColor};
    stroke-width: ${t.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${t.pieTitleTextSize};
    fill: ${t.pieTitleTextColor};
    font-family: ${t.fontFamily};
  }
  .slice {
    font-family: ${t.fontFamily};
    fill: ${t.pieSectionTextColor};
    font-size:${t.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${t.pieLegendTextColor};
    font-family: ${t.fontFamily};
    font-size: ${t.pieLegendTextSize};
  }
`,"getStyles"),xt=St,At=u(t=>{const a=[...t.entries()].map(l=>({label:l[0],value:l[1]})).sort((l,p)=>p.value-l.value);return ot().value(l=>l.value)(a)},"createPieArcs"),Dt=u((t,a,h,l)=>{F.debug(`rendering pie chart
`+t);const p=l.db,x=Q(),i=X(p.getConfig(),x.pie),e=40,r=18,o=4,g=450,A=g,m=Y(a),c=m.append("g");c.attr("transform","translate("+A/2+","+g/2+")");const{themeVariables:n}=x;let[v]=tt(n.pieOuterStrokeWidth);v??(v=2);const D=i.textPosition,f=Math.min(A,g)/2-e,T=P().innerRadius(0).outerRadius(f),$=P().innerRadius(f*D).outerRadius(f*D);c.append("circle").attr("cx",0).attr("cy",0).attr("r",f+v/2).attr("class","pieOuterCircle");const d=p.getSections(),y=At(d),w=[n.pie1,n.pie2,n.pie3,n.pie4,n.pie5,n.pie6,n.pie7,n.pie8,n.pie9,n.pie10,n.pie11,n.pie12],C=et(w);c.selectAll("mySlices").data(y).enter().append("path").attr("d",T).attr("fill",s=>C(s.data.label)).attr("class","pieCircle");let W=0;d.forEach(s=>{W+=s}),c.selectAll("mySlices").data(y).enter().append("text").text(s=>(s.data.value/W*100).toFixed(0)+"%").attr("transform",s=>"translate("+$.centroid(s)+")").style("text-anchor","middle").attr("class","slice"),c.append("text").text(p.getDiagramTitle()).attr("x",0).attr("y",-400/2).attr("class","pieTitleText");const M=c.selectAll(".legend").data(C.domain()).enter().append("g").attr("class","legend").attr("transform",(s,k)=>{const E=r+o,L=E*C.domain().length/2,_=12*r,B=k*E-L;return"translate("+_+","+B+")"});M.append("rect").attr("width",r).attr("height",r).style("fill",C).style("stroke",C),M.data(y).append("text").attr("x",r+o).attr("y",r-o).text(s=>{const{label:k,value:E}=s.data;return p.getShowData()?`${k} [${E}]`:k});const I=Math.max(...M.selectAll("text").nodes().map(s=>(s==null?void 0:s.getBoundingClientRect().width)??0)),N=A+e+r+o+I;m.attr("viewBox",`0 0 ${N} ${g}`),at(m,g,N,i.useMaxWidth)},"draw"),wt={draw:Dt},Mt={parser:yt,db:R,renderer:wt,styles:xt};export{Mt as diagram};
