import{_ as l,g as ye,s as ge,q as pe,p as ve,a as xe,b as Te,c as ct,d as gt,e as be,au as U,l as Dt,k as we,j as _e,y as De,u as Se}from"./mermaid.core-D-mGnfG0.js";import{g as Wt}from"./index-DWf5j1Pp.js";import{t as Ce,m as Ee,a as Me,i as Ae,b as jt,c as Ut,d as Ie,e as Fe,f as Le,g as Ye,h as We,j as Ve,k as Pe,l as Zt,n as $t,o as Qt,s as Kt,p as Jt}from"./time-BEjrHOyX.js";import{l as ze}from"./linear-BfjZ8xob.js";import"./step-CdWOLO1w.js";import"./init-Dmth1JHB.js";import"./defaultLocale-CNpUPyHh.js";function Oe(t){return t}var vt=1,Mt=2,At=3,pt=4,te=1e-6;function Re(t){return"translate("+t+",0)"}function Ne(t){return"translate(0,"+t+")"}function Be(t){return e=>+t(e)}function He(t,e){return e=Math.max(0,t.bandwidth()-e*2)/2,t.round()&&(e=Math.round(e)),n=>+t(n)+e}function qe(){return!this.__axis}function oe(t,e){var n=[],i=null,s=null,k=6,d=6,D=3,E=typeof window<"u"&&window.devicePixelRatio>1?0:.5,C=t===vt||t===pt?-1:1,g=t===pt||t===Mt?"x":"y",F=t===vt||t===At?Re:Ne;function S(v){var q=i??(e.ticks?e.ticks.apply(e,n):e.domain()),A=s??(e.tickFormat?e.tickFormat.apply(e,n):Oe),x=Math.max(k,0)+D,M=e.range(),L=+M[0]+E,Y=+M[M.length-1]+E,N=(e.bandwidth?He:Be)(e.copy(),E),R=v.selection?v.selection():v,G=R.selectAll(".domain").data([null]),z=R.selectAll(".tick").data(q,e).order(),y=z.exit(),b=z.enter().append("g").attr("class","tick"),T=z.select("line"),p=z.select("text");G=G.merge(G.enter().insert("path",".tick").attr("class","domain").attr("stroke","currentColor")),z=z.merge(b),T=T.merge(b.append("line").attr("stroke","currentColor").attr(g+"2",C*k)),p=p.merge(b.append("text").attr("fill","currentColor").attr(g,C*x).attr("dy",t===vt?"0em":t===At?"0.71em":"0.32em")),v!==R&&(G=G.transition(v),z=z.transition(v),T=T.transition(v),p=p.transition(v),y=y.transition(v).attr("opacity",te).attr("transform",function(m){return isFinite(m=N(m))?F(m+E):this.getAttribute("transform")}),b.attr("opacity",te).attr("transform",function(m){var w=this.parentNode.__axis;return F((w&&isFinite(w=w(m))?w:N(m))+E)})),y.remove(),G.attr("d",t===pt||t===Mt?d?"M"+C*d+","+L+"H"+E+"V"+Y+"H"+C*d:"M"+E+","+L+"V"+Y:d?"M"+L+","+C*d+"V"+E+"H"+Y+"V"+C*d:"M"+L+","+E+"H"+Y),z.attr("opacity",1).attr("transform",function(m){return F(N(m)+E)}),T.attr(g+"2",C*k),p.attr(g,C*x).text(A),R.filter(qe).attr("fill","none").attr("font-size",10).attr("font-family","sans-serif").attr("text-anchor",t===Mt?"start":t===pt?"end":"middle"),R.each(function(){this.__axis=N})}return S.scale=function(v){return arguments.length?(e=v,S):e},S.ticks=function(){return n=Array.from(arguments),S},S.tickArguments=function(v){return arguments.length?(n=v==null?[]:Array.from(v),S):n.slice()},S.tickValues=function(v){return arguments.length?(i=v==null?null:Array.from(v),S):i&&i.slice()},S.tickFormat=function(v){return arguments.length?(s=v,S):s},S.tickSize=function(v){return arguments.length?(k=d=+v,S):k},S.tickSizeInner=function(v){return arguments.length?(k=+v,S):k},S.tickSizeOuter=function(v){return arguments.length?(d=+v,S):d},S.tickPadding=function(v){return arguments.length?(D=+v,S):D},S.offset=function(v){return arguments.length?(E=+v,S):E},S}function Ge(t){return oe(vt,t)}function Xe(t){return oe(At,t)}var xt={exports:{}},je=xt.exports,ee;function Ue(){return ee||(ee=1,function(t,e){(function(n,i){t.exports=i()})(je,function(){var n="day";return function(i,s,k){var d=function(C){return C.add(4-C.isoWeekday(),n)},D=s.prototype;D.isoWeekYear=function(){return d(this).year()},D.isoWeek=function(C){if(!this.$utils().u(C))return this.add(7*(C-this.isoWeek()),n);var g,F,S,v,q=d(this),A=(g=this.isoWeekYear(),F=this.$u,S=(F?k.utc:k)().year(g).startOf("year"),v=4-S.isoWeekday(),S.isoWeekday()>4&&(v+=7),S.add(v,n));return q.diff(A,"week")+1},D.isoWeekday=function(C){return this.$utils().u(C)?this.day()||7:this.day(this.day()%7?C:C-7)};var E=D.startOf;D.startOf=function(C,g){var F=this.$utils(),S=!!F.u(g)||g;return F.p(C)==="isoweek"?S?this.date(this.date()-(this.isoWeekday()-1)).startOf("day"):this.date(this.date()-1-(this.isoWeekday()-1)+7).endOf("day"):E.bind(this)(C,g)}}})}(xt)),xt.exports}var Ze=Ue();const $e=Wt(Ze);var Tt={exports:{}},Qe=Tt.exports,re;function Ke(){return re||(re=1,function(t,e){(function(n,i){t.exports=i()})(Qe,function(){var n={LTS:"h:mm:ss A",LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY h:mm A",LLLL:"dddd, MMMM D, YYYY h:mm A"},i=/(\[[^[]*\])|([-_:/.,()\s]+)|(A|a|Q|YYYY|YY?|ww?|MM?M?M?|Do|DD?|hh?|HH?|mm?|ss?|S{1,3}|z|ZZ?)/g,s=/\d/,k=/\d\d/,d=/\d\d?/,D=/\d*[^-_:/,()\s\d]+/,E={},C=function(x){return(x=+x)+(x>68?1900:2e3)},g=function(x){return function(M){this[x]=+M}},F=[/[+-]\d\d:?(\d\d)?|Z/,function(x){(this.zone||(this.zone={})).offset=function(M){if(!M||M==="Z")return 0;var L=M.match(/([+-]|\d\d)/g),Y=60*L[1]+(+L[2]||0);return Y===0?0:L[0]==="+"?-Y:Y}(x)}],S=function(x){var M=E[x];return M&&(M.indexOf?M:M.s.concat(M.f))},v=function(x,M){var L,Y=E.meridiem;if(Y){for(var N=1;N<=24;N+=1)if(x.indexOf(Y(N,0,M))>-1){L=N>12;break}}else L=x===(M?"pm":"PM");return L},q={A:[D,function(x){this.afternoon=v(x,!1)}],a:[D,function(x){this.afternoon=v(x,!0)}],Q:[s,function(x){this.month=3*(x-1)+1}],S:[s,function(x){this.milliseconds=100*+x}],SS:[k,function(x){this.milliseconds=10*+x}],SSS:[/\d{3}/,function(x){this.milliseconds=+x}],s:[d,g("seconds")],ss:[d,g("seconds")],m:[d,g("minutes")],mm:[d,g("minutes")],H:[d,g("hours")],h:[d,g("hours")],HH:[d,g("hours")],hh:[d,g("hours")],D:[d,g("day")],DD:[k,g("day")],Do:[D,function(x){var M=E.ordinal,L=x.match(/\d+/);if(this.day=L[0],M)for(var Y=1;Y<=31;Y+=1)M(Y).replace(/\[|\]/g,"")===x&&(this.day=Y)}],w:[d,g("week")],ww:[k,g("week")],M:[d,g("month")],MM:[k,g("month")],MMM:[D,function(x){var M=S("months"),L=(S("monthsShort")||M.map(function(Y){return Y.slice(0,3)})).indexOf(x)+1;if(L<1)throw new Error;this.month=L%12||L}],MMMM:[D,function(x){var M=S("months").indexOf(x)+1;if(M<1)throw new Error;this.month=M%12||M}],Y:[/[+-]?\d+/,g("year")],YY:[k,function(x){this.year=C(x)}],YYYY:[/\d{4}/,g("year")],Z:F,ZZ:F};function A(x){var M,L;M=x,L=E&&E.formats;for(var Y=(x=M.replace(/(\[[^\]]+])|(LTS?|l{1,4}|L{1,4})/g,function(T,p,m){var w=m&&m.toUpperCase();return p||L[m]||n[m]||L[w].replace(/(\[[^\]]+])|(MMMM|MM|DD|dddd)/g,function(c,u,h){return u||h.slice(1)})})).match(i),N=Y.length,R=0;R<N;R+=1){var G=Y[R],z=q[G],y=z&&z[0],b=z&&z[1];Y[R]=b?{regex:y,parser:b}:G.replace(/^\[|\]$/g,"")}return function(T){for(var p={},m=0,w=0;m<N;m+=1){var c=Y[m];if(typeof c=="string")w+=c.length;else{var u=c.regex,h=c.parser,f=T.slice(w),_=u.exec(f)[0];h.call(p,_),T=T.replace(_,"")}}return function(a){var o=a.afternoon;if(o!==void 0){var r=a.hours;o?r<12&&(a.hours+=12):r===12&&(a.hours=0),delete a.afternoon}}(p),p}}return function(x,M,L){L.p.customParseFormat=!0,x&&x.parseTwoDigitYear&&(C=x.parseTwoDigitYear);var Y=M.prototype,N=Y.parse;Y.parse=function(R){var G=R.date,z=R.utc,y=R.args;this.$u=z;var b=y[1];if(typeof b=="string"){var T=y[2]===!0,p=y[3]===!0,m=T||p,w=y[2];p&&(w=y[2]),E=this.$locale(),!T&&w&&(E=L.Ls[w]),this.$d=function(f,_,a,o){try{if(["x","X"].indexOf(_)>-1)return new Date((_==="X"?1e3:1)*f);var r=A(_)(f),V=r.year,I=r.month,W=r.day,X=r.hours,P=r.minutes,O=r.seconds,Q=r.milliseconds,st=r.zone,at=r.week,dt=new Date,ft=W||(V||I?1:dt.getDate()),ot=V||dt.getFullYear(),B=0;V&&!I||(B=I>0?I-1:dt.getMonth());var $,j=X||0,nt=P||0,K=O||0,rt=Q||0;return st?new Date(Date.UTC(ot,B,ft,j,nt,K,rt+60*st.offset*1e3)):a?new Date(Date.UTC(ot,B,ft,j,nt,K,rt)):($=new Date(ot,B,ft,j,nt,K,rt),at&&($=o($).week(at).toDate()),$)}catch{return new Date("")}}(G,b,z,L),this.init(),w&&w!==!0&&(this.$L=this.locale(w).$L),m&&G!=this.format(b)&&(this.$d=new Date("")),E={}}else if(b instanceof Array)for(var c=b.length,u=1;u<=c;u+=1){y[1]=b[u-1];var h=L.apply(this,y);if(h.isValid()){this.$d=h.$d,this.$L=h.$L,this.init();break}u===c&&(this.$d=new Date(""))}else N.call(this,R)}}})}(Tt)),Tt.exports}var Je=Ke();const tr=Wt(Je);var bt={exports:{}},er=bt.exports,ne;function rr(){return ne||(ne=1,function(t,e){(function(n,i){t.exports=i()})(er,function(){return function(n,i){var s=i.prototype,k=s.format;s.format=function(d){var D=this,E=this.$locale();if(!this.isValid())return k.bind(this)(d);var C=this.$utils(),g=(d||"YYYY-MM-DDTHH:mm:ssZ").replace(/\[([^\]]+)]|Q|wo|ww|w|WW|W|zzz|z|gggg|GGGG|Do|X|x|k{1,2}|S/g,function(F){switch(F){case"Q":return Math.ceil((D.$M+1)/3);case"Do":return E.ordinal(D.$D);case"gggg":return D.weekYear();case"GGGG":return D.isoWeekYear();case"wo":return E.ordinal(D.week(),"W");case"w":case"ww":return C.s(D.week(),F==="w"?1:2,"0");case"W":case"WW":return C.s(D.isoWeek(),F==="W"?1:2,"0");case"k":case"kk":return C.s(String(D.$H===0?24:D.$H),F==="k"?1:2,"0");case"X":return Math.floor(D.$d.getTime()/1e3);case"x":return D.$d.getTime();case"z":return"["+D.offsetName()+"]";case"zzz":return"["+D.offsetName("long")+"]";default:return F}});return k.bind(this)(g)}}})}(bt)),bt.exports}var nr=rr();const ir=Wt(nr);var It=function(){var t=l(function(w,c,u,h){for(u=u||{},h=w.length;h--;u[w[h]]=c);return u},"o"),e=[6,8,10,12,13,14,15,16,17,18,20,21,22,23,24,25,26,27,28,29,30,31,33,35,36,38,40],n=[1,26],i=[1,27],s=[1,28],k=[1,29],d=[1,30],D=[1,31],E=[1,32],C=[1,33],g=[1,34],F=[1,9],S=[1,10],v=[1,11],q=[1,12],A=[1,13],x=[1,14],M=[1,15],L=[1,16],Y=[1,19],N=[1,20],R=[1,21],G=[1,22],z=[1,23],y=[1,25],b=[1,35],T={trace:l(function(){},"trace"),yy:{},symbols_:{error:2,start:3,gantt:4,document:5,EOF:6,line:7,SPACE:8,statement:9,NL:10,weekday:11,weekday_monday:12,weekday_tuesday:13,weekday_wednesday:14,weekday_thursday:15,weekday_friday:16,weekday_saturday:17,weekday_sunday:18,weekend:19,weekend_friday:20,weekend_saturday:21,dateFormat:22,inclusiveEndDates:23,topAxis:24,axisFormat:25,tickInterval:26,excludes:27,includes:28,todayMarker:29,title:30,acc_title:31,acc_title_value:32,acc_descr:33,acc_descr_value:34,acc_descr_multiline_value:35,section:36,clickStatement:37,taskTxt:38,taskData:39,click:40,callbackname:41,callbackargs:42,href:43,clickStatementDebug:44,$accept:0,$end:1},terminals_:{2:"error",4:"gantt",6:"EOF",8:"SPACE",10:"NL",12:"weekday_monday",13:"weekday_tuesday",14:"weekday_wednesday",15:"weekday_thursday",16:"weekday_friday",17:"weekday_saturday",18:"weekday_sunday",20:"weekend_friday",21:"weekend_saturday",22:"dateFormat",23:"inclusiveEndDates",24:"topAxis",25:"axisFormat",26:"tickInterval",27:"excludes",28:"includes",29:"todayMarker",30:"title",31:"acc_title",32:"acc_title_value",33:"acc_descr",34:"acc_descr_value",35:"acc_descr_multiline_value",36:"section",38:"taskTxt",39:"taskData",40:"click",41:"callbackname",42:"callbackargs",43:"href"},productions_:[0,[3,3],[5,0],[5,2],[7,2],[7,1],[7,1],[7,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[19,1],[19,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,2],[9,2],[9,1],[9,1],[9,1],[9,2],[37,2],[37,3],[37,3],[37,4],[37,3],[37,4],[37,2],[44,2],[44,3],[44,3],[44,4],[44,3],[44,4],[44,2]],performAction:l(function(c,u,h,f,_,a,o){var r=a.length-1;switch(_){case 1:return a[r-1];case 2:this.$=[];break;case 3:a[r-1].push(a[r]),this.$=a[r-1];break;case 4:case 5:this.$=a[r];break;case 6:case 7:this.$=[];break;case 8:f.setWeekday("monday");break;case 9:f.setWeekday("tuesday");break;case 10:f.setWeekday("wednesday");break;case 11:f.setWeekday("thursday");break;case 12:f.setWeekday("friday");break;case 13:f.setWeekday("saturday");break;case 14:f.setWeekday("sunday");break;case 15:f.setWeekend("friday");break;case 16:f.setWeekend("saturday");break;case 17:f.setDateFormat(a[r].substr(11)),this.$=a[r].substr(11);break;case 18:f.enableInclusiveEndDates(),this.$=a[r].substr(18);break;case 19:f.TopAxis(),this.$=a[r].substr(8);break;case 20:f.setAxisFormat(a[r].substr(11)),this.$=a[r].substr(11);break;case 21:f.setTickInterval(a[r].substr(13)),this.$=a[r].substr(13);break;case 22:f.setExcludes(a[r].substr(9)),this.$=a[r].substr(9);break;case 23:f.setIncludes(a[r].substr(9)),this.$=a[r].substr(9);break;case 24:f.setTodayMarker(a[r].substr(12)),this.$=a[r].substr(12);break;case 27:f.setDiagramTitle(a[r].substr(6)),this.$=a[r].substr(6);break;case 28:this.$=a[r].trim(),f.setAccTitle(this.$);break;case 29:case 30:this.$=a[r].trim(),f.setAccDescription(this.$);break;case 31:f.addSection(a[r].substr(8)),this.$=a[r].substr(8);break;case 33:f.addTask(a[r-1],a[r]),this.$="task";break;case 34:this.$=a[r-1],f.setClickEvent(a[r-1],a[r],null);break;case 35:this.$=a[r-2],f.setClickEvent(a[r-2],a[r-1],a[r]);break;case 36:this.$=a[r-2],f.setClickEvent(a[r-2],a[r-1],null),f.setLink(a[r-2],a[r]);break;case 37:this.$=a[r-3],f.setClickEvent(a[r-3],a[r-2],a[r-1]),f.setLink(a[r-3],a[r]);break;case 38:this.$=a[r-2],f.setClickEvent(a[r-2],a[r],null),f.setLink(a[r-2],a[r-1]);break;case 39:this.$=a[r-3],f.setClickEvent(a[r-3],a[r-1],a[r]),f.setLink(a[r-3],a[r-2]);break;case 40:this.$=a[r-1],f.setLink(a[r-1],a[r]);break;case 41:case 47:this.$=a[r-1]+" "+a[r];break;case 42:case 43:case 45:this.$=a[r-2]+" "+a[r-1]+" "+a[r];break;case 44:case 46:this.$=a[r-3]+" "+a[r-2]+" "+a[r-1]+" "+a[r];break}},"anonymous"),table:[{3:1,4:[1,2]},{1:[3]},t(e,[2,2],{5:3}),{6:[1,4],7:5,8:[1,6],9:7,10:[1,8],11:17,12:n,13:i,14:s,15:k,16:d,17:D,18:E,19:18,20:C,21:g,22:F,23:S,24:v,25:q,26:A,27:x,28:M,29:L,30:Y,31:N,33:R,35:G,36:z,37:24,38:y,40:b},t(e,[2,7],{1:[2,1]}),t(e,[2,3]),{9:36,11:17,12:n,13:i,14:s,15:k,16:d,17:D,18:E,19:18,20:C,21:g,22:F,23:S,24:v,25:q,26:A,27:x,28:M,29:L,30:Y,31:N,33:R,35:G,36:z,37:24,38:y,40:b},t(e,[2,5]),t(e,[2,6]),t(e,[2,17]),t(e,[2,18]),t(e,[2,19]),t(e,[2,20]),t(e,[2,21]),t(e,[2,22]),t(e,[2,23]),t(e,[2,24]),t(e,[2,25]),t(e,[2,26]),t(e,[2,27]),{32:[1,37]},{34:[1,38]},t(e,[2,30]),t(e,[2,31]),t(e,[2,32]),{39:[1,39]},t(e,[2,8]),t(e,[2,9]),t(e,[2,10]),t(e,[2,11]),t(e,[2,12]),t(e,[2,13]),t(e,[2,14]),t(e,[2,15]),t(e,[2,16]),{41:[1,40],43:[1,41]},t(e,[2,4]),t(e,[2,28]),t(e,[2,29]),t(e,[2,33]),t(e,[2,34],{42:[1,42],43:[1,43]}),t(e,[2,40],{41:[1,44]}),t(e,[2,35],{43:[1,45]}),t(e,[2,36]),t(e,[2,38],{42:[1,46]}),t(e,[2,37]),t(e,[2,39])],defaultActions:{},parseError:l(function(c,u){if(u.recoverable)this.trace(c);else{var h=new Error(c);throw h.hash=u,h}},"parseError"),parse:l(function(c){var u=this,h=[0],f=[],_=[null],a=[],o=this.table,r="",V=0,I=0,W=2,X=1,P=a.slice.call(arguments,1),O=Object.create(this.lexer),Q={yy:{}};for(var st in this.yy)Object.prototype.hasOwnProperty.call(this.yy,st)&&(Q.yy[st]=this.yy[st]);O.setInput(c,Q.yy),Q.yy.lexer=O,Q.yy.parser=this,typeof O.yylloc>"u"&&(O.yylloc={});var at=O.yylloc;a.push(at);var dt=O.options&&O.options.ranges;typeof Q.yy.parseError=="function"?this.parseError=Q.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function ft(Z){h.length=h.length-2*Z,_.length=_.length-Z,a.length=a.length-Z}l(ft,"popStack");function ot(){var Z;return Z=f.pop()||O.lex()||X,typeof Z!="number"&&(Z instanceof Array&&(f=Z,Z=f.pop()),Z=u.symbols_[Z]||Z),Z}l(ot,"lex");for(var B,$,j,nt,K={},rt,J,Xt,yt;;){if($=h[h.length-1],this.defaultActions[$]?j=this.defaultActions[$]:((B===null||typeof B>"u")&&(B=ot()),j=o[$]&&o[$][B]),typeof j>"u"||!j.length||!j[0]){var Et="";yt=[];for(rt in o[$])this.terminals_[rt]&&rt>W&&yt.push("'"+this.terminals_[rt]+"'");O.showPosition?Et="Parse error on line "+(V+1)+`:
`+O.showPosition()+`
Expecting `+yt.join(", ")+", got '"+(this.terminals_[B]||B)+"'":Et="Parse error on line "+(V+1)+": Unexpected "+(B==X?"end of input":"'"+(this.terminals_[B]||B)+"'"),this.parseError(Et,{text:O.match,token:this.terminals_[B]||B,line:O.yylineno,loc:at,expected:yt})}if(j[0]instanceof Array&&j.length>1)throw new Error("Parse Error: multiple actions possible at state: "+$+", token: "+B);switch(j[0]){case 1:h.push(B),_.push(O.yytext),a.push(O.yylloc),h.push(j[1]),B=null,I=O.yyleng,r=O.yytext,V=O.yylineno,at=O.yylloc;break;case 2:if(J=this.productions_[j[1]][1],K.$=_[_.length-J],K._$={first_line:a[a.length-(J||1)].first_line,last_line:a[a.length-1].last_line,first_column:a[a.length-(J||1)].first_column,last_column:a[a.length-1].last_column},dt&&(K._$.range=[a[a.length-(J||1)].range[0],a[a.length-1].range[1]]),nt=this.performAction.apply(K,[r,I,V,Q.yy,j[1],_,a].concat(P)),typeof nt<"u")return nt;J&&(h=h.slice(0,-1*J*2),_=_.slice(0,-1*J),a=a.slice(0,-1*J)),h.push(this.productions_[j[1]][0]),_.push(K.$),a.push(K._$),Xt=o[h[h.length-2]][h[h.length-1]],h.push(Xt);break;case 3:return!0}}return!0},"parse")},p=function(){var w={EOF:1,parseError:l(function(u,h){if(this.yy.parser)this.yy.parser.parseError(u,h);else throw new Error(u)},"parseError"),setInput:l(function(c,u){return this.yy=u||this.yy||{},this._input=c,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},"setInput"),input:l(function(){var c=this._input[0];this.yytext+=c,this.yyleng++,this.offset++,this.match+=c,this.matched+=c;var u=c.match(/(?:\r\n?|\n).*/g);return u?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),c},"input"),unput:l(function(c){var u=c.length,h=c.split(/(?:\r\n?|\n)/g);this._input=c+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-u),this.offset-=u;var f=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),h.length-1&&(this.yylineno-=h.length-1);var _=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:h?(h.length===f.length?this.yylloc.first_column:0)+f[f.length-h.length].length-h[0].length:this.yylloc.first_column-u},this.options.ranges&&(this.yylloc.range=[_[0],_[0]+this.yyleng-u]),this.yyleng=this.yytext.length,this},"unput"),more:l(function(){return this._more=!0,this},"more"),reject:l(function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},"reject"),less:l(function(c){this.unput(this.match.slice(c))},"less"),pastInput:l(function(){var c=this.matched.substr(0,this.matched.length-this.match.length);return(c.length>20?"...":"")+c.substr(-20).replace(/\n/g,"")},"pastInput"),upcomingInput:l(function(){var c=this.match;return c.length<20&&(c+=this._input.substr(0,20-c.length)),(c.substr(0,20)+(c.length>20?"...":"")).replace(/\n/g,"")},"upcomingInput"),showPosition:l(function(){var c=this.pastInput(),u=new Array(c.length+1).join("-");return c+this.upcomingInput()+`
`+u+"^"},"showPosition"),test_match:l(function(c,u){var h,f,_;if(this.options.backtrack_lexer&&(_={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(_.yylloc.range=this.yylloc.range.slice(0))),f=c[0].match(/(?:\r\n?|\n).*/g),f&&(this.yylineno+=f.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:f?f[f.length-1].length-f[f.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+c[0].length},this.yytext+=c[0],this.match+=c[0],this.matches=c,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(c[0].length),this.matched+=c[0],h=this.performAction.call(this,this.yy,this,u,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),h)return h;if(this._backtrack){for(var a in _)this[a]=_[a];return!1}return!1},"test_match"),next:l(function(){if(this.done)return this.EOF;this._input||(this.done=!0);var c,u,h,f;this._more||(this.yytext="",this.match="");for(var _=this._currentRules(),a=0;a<_.length;a++)if(h=this._input.match(this.rules[_[a]]),h&&(!u||h[0].length>u[0].length)){if(u=h,f=a,this.options.backtrack_lexer){if(c=this.test_match(h,_[a]),c!==!1)return c;if(this._backtrack){u=!1;continue}else return!1}else if(!this.options.flex)break}return u?(c=this.test_match(u,_[f]),c!==!1?c:!1):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},"next"),lex:l(function(){var u=this.next();return u||this.lex()},"lex"),begin:l(function(u){this.conditionStack.push(u)},"begin"),popState:l(function(){var u=this.conditionStack.length-1;return u>0?this.conditionStack.pop():this.conditionStack[0]},"popState"),_currentRules:l(function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},"_currentRules"),topState:l(function(u){return u=this.conditionStack.length-1-Math.abs(u||0),u>=0?this.conditionStack[u]:"INITIAL"},"topState"),pushState:l(function(u){this.begin(u)},"pushState"),stateStackSize:l(function(){return this.conditionStack.length},"stateStackSize"),options:{"case-insensitive":!0},performAction:l(function(u,h,f,_){switch(f){case 0:return this.begin("open_directive"),"open_directive";case 1:return this.begin("acc_title"),31;case 2:return this.popState(),"acc_title_value";case 3:return this.begin("acc_descr"),33;case 4:return this.popState(),"acc_descr_value";case 5:this.begin("acc_descr_multiline");break;case 6:this.popState();break;case 7:return"acc_descr_multiline_value";case 8:break;case 9:break;case 10:break;case 11:return 10;case 12:break;case 13:break;case 14:this.begin("href");break;case 15:this.popState();break;case 16:return 43;case 17:this.begin("callbackname");break;case 18:this.popState();break;case 19:this.popState(),this.begin("callbackargs");break;case 20:return 41;case 21:this.popState();break;case 22:return 42;case 23:this.begin("click");break;case 24:this.popState();break;case 25:return 40;case 26:return 4;case 27:return 22;case 28:return 23;case 29:return 24;case 30:return 25;case 31:return 26;case 32:return 28;case 33:return 27;case 34:return 29;case 35:return 12;case 36:return 13;case 37:return 14;case 38:return 15;case 39:return 16;case 40:return 17;case 41:return 18;case 42:return 20;case 43:return 21;case 44:return"date";case 45:return 30;case 46:return"accDescription";case 47:return 36;case 48:return 38;case 49:return 39;case 50:return":";case 51:return 6;case 52:return"INVALID"}},"anonymous"),rules:[/^(?:%%\{)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:%%(?!\{)*[^\n]*)/i,/^(?:[^\}]%%*[^\n]*)/i,/^(?:%%*[^\n]*[\n]*)/i,/^(?:[\n]+)/i,/^(?:\s+)/i,/^(?:%[^\n]*)/i,/^(?:href[\s]+["])/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:call[\s]+)/i,/^(?:\([\s]*\))/i,/^(?:\()/i,/^(?:[^(]*)/i,/^(?:\))/i,/^(?:[^)]*)/i,/^(?:click[\s]+)/i,/^(?:[\s\n])/i,/^(?:[^\s\n]*)/i,/^(?:gantt\b)/i,/^(?:dateFormat\s[^#\n;]+)/i,/^(?:inclusiveEndDates\b)/i,/^(?:topAxis\b)/i,/^(?:axisFormat\s[^#\n;]+)/i,/^(?:tickInterval\s[^#\n;]+)/i,/^(?:includes\s[^#\n;]+)/i,/^(?:excludes\s[^#\n;]+)/i,/^(?:todayMarker\s[^\n;]+)/i,/^(?:weekday\s+monday\b)/i,/^(?:weekday\s+tuesday\b)/i,/^(?:weekday\s+wednesday\b)/i,/^(?:weekday\s+thursday\b)/i,/^(?:weekday\s+friday\b)/i,/^(?:weekday\s+saturday\b)/i,/^(?:weekday\s+sunday\b)/i,/^(?:weekend\s+friday\b)/i,/^(?:weekend\s+saturday\b)/i,/^(?:\d\d\d\d-\d\d-\d\d\b)/i,/^(?:title\s[^\n]+)/i,/^(?:accDescription\s[^#\n;]+)/i,/^(?:section\s[^\n]+)/i,/^(?:[^:\n]+)/i,/^(?::[^#\n;]+)/i,/^(?::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{acc_descr_multiline:{rules:[6,7],inclusive:!1},acc_descr:{rules:[4],inclusive:!1},acc_title:{rules:[2],inclusive:!1},callbackargs:{rules:[21,22],inclusive:!1},callbackname:{rules:[18,19,20],inclusive:!1},href:{rules:[15,16],inclusive:!1},click:{rules:[24,25],inclusive:!1},INITIAL:{rules:[0,1,3,5,8,9,10,11,12,13,14,17,23,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52],inclusive:!0}}};return w}();T.lexer=p;function m(){this.yy={}}return l(m,"Parser"),m.prototype=T,T.Parser=m,new m}();It.parser=It;var sr=It;U.extend($e);U.extend(tr);U.extend(ir);var ie={friday:5,saturday:6},tt="",Vt="",Pt=void 0,zt="",ht=[],mt=[],Ot=new Map,Rt=[],St=[],ut="",Nt="",ce=["active","done","crit","milestone","vert"],Bt=[],kt=!1,Ht=!1,qt="sunday",Ct="saturday",Ft=0,ar=l(function(){Rt=[],St=[],ut="",Bt=[],wt=0,Yt=void 0,_t=void 0,H=[],tt="",Vt="",Nt="",Pt=void 0,zt="",ht=[],mt=[],kt=!1,Ht=!1,Ft=0,Ot=new Map,De(),qt="sunday",Ct="saturday"},"clear"),or=l(function(t){Vt=t},"setAxisFormat"),cr=l(function(){return Vt},"getAxisFormat"),lr=l(function(t){Pt=t},"setTickInterval"),ur=l(function(){return Pt},"getTickInterval"),dr=l(function(t){zt=t},"setTodayMarker"),fr=l(function(){return zt},"getTodayMarker"),hr=l(function(t){tt=t},"setDateFormat"),mr=l(function(){kt=!0},"enableInclusiveEndDates"),kr=l(function(){return kt},"endDatesAreInclusive"),yr=l(function(){Ht=!0},"enableTopAxis"),gr=l(function(){return Ht},"topAxisEnabled"),pr=l(function(t){Nt=t},"setDisplayMode"),vr=l(function(){return Nt},"getDisplayMode"),xr=l(function(){return tt},"getDateFormat"),Tr=l(function(t){ht=t.toLowerCase().split(/[\s,]+/)},"setIncludes"),br=l(function(){return ht},"getIncludes"),wr=l(function(t){mt=t.toLowerCase().split(/[\s,]+/)},"setExcludes"),_r=l(function(){return mt},"getExcludes"),Dr=l(function(){return Ot},"getLinks"),Sr=l(function(t){ut=t,Rt.push(t)},"addSection"),Cr=l(function(){return Rt},"getSections"),Er=l(function(){let t=se();const e=10;let n=0;for(;!t&&n<e;)t=se(),n++;return St=H,St},"getTasks"),le=l(function(t,e,n,i){return i.includes(t.format(e.trim()))?!1:n.includes("weekends")&&(t.isoWeekday()===ie[Ct]||t.isoWeekday()===ie[Ct]+1)||n.includes(t.format("dddd").toLowerCase())?!0:n.includes(t.format(e.trim()))},"isInvalidDate"),Mr=l(function(t){qt=t},"setWeekday"),Ar=l(function(){return qt},"getWeekday"),Ir=l(function(t){Ct=t},"setWeekend"),ue=l(function(t,e,n,i){if(!n.length||t.manualEndTime)return;let s;t.startTime instanceof Date?s=U(t.startTime):s=U(t.startTime,e,!0),s=s.add(1,"d");let k;t.endTime instanceof Date?k=U(t.endTime):k=U(t.endTime,e,!0);const[d,D]=Fr(s,k,e,n,i);t.endTime=d.toDate(),t.renderEndTime=D},"checkTaskDates"),Fr=l(function(t,e,n,i,s){let k=!1,d=null;for(;t<=e;)k||(d=e.toDate()),k=le(t,n,i,s),k&&(e=e.add(1,"d")),t=t.add(1,"d");return[e,d]},"fixTaskDates"),Lt=l(function(t,e,n){n=n.trim();const s=/^after\s+(?<ids>[\d\w- ]+)/.exec(n);if(s!==null){let d=null;for(const E of s.groups.ids.split(" ")){let C=it(E);C!==void 0&&(!d||C.endTime>d.endTime)&&(d=C)}if(d)return d.endTime;const D=new Date;return D.setHours(0,0,0,0),D}let k=U(n,e.trim(),!0);if(k.isValid())return k.toDate();{Dt.debug("Invalid date:"+n),Dt.debug("With date format:"+e.trim());const d=new Date(n);if(d===void 0||isNaN(d.getTime())||d.getFullYear()<-1e4||d.getFullYear()>1e4)throw new Error("Invalid date:"+n);return d}},"getStartDate"),de=l(function(t){const e=/^(\d+(?:\.\d+)?)([Mdhmswy]|ms)$/.exec(t.trim());return e!==null?[Number.parseFloat(e[1]),e[2]]:[NaN,"ms"]},"parseDuration"),fe=l(function(t,e,n,i=!1){n=n.trim();const k=/^until\s+(?<ids>[\d\w- ]+)/.exec(n);if(k!==null){let g=null;for(const S of k.groups.ids.split(" ")){let v=it(S);v!==void 0&&(!g||v.startTime<g.startTime)&&(g=v)}if(g)return g.startTime;const F=new Date;return F.setHours(0,0,0,0),F}let d=U(n,e.trim(),!0);if(d.isValid())return i&&(d=d.add(1,"d")),d.toDate();let D=U(t);const[E,C]=de(n);if(!Number.isNaN(E)){const g=D.add(E,C);g.isValid()&&(D=g)}return D.toDate()},"getEndDate"),wt=0,lt=l(function(t){return t===void 0?(wt=wt+1,"task"+wt):t},"parseId"),Lr=l(function(t,e){let n;e.substr(0,1)===":"?n=e.substr(1,e.length):n=e;const i=n.split(","),s={};Gt(i,s,ce);for(let d=0;d<i.length;d++)i[d]=i[d].trim();let k="";switch(i.length){case 1:s.id=lt(),s.startTime=t.endTime,k=i[0];break;case 2:s.id=lt(),s.startTime=Lt(void 0,tt,i[0]),k=i[1];break;case 3:s.id=lt(i[0]),s.startTime=Lt(void 0,tt,i[1]),k=i[2];break}return k&&(s.endTime=fe(s.startTime,tt,k,kt),s.manualEndTime=U(k,"YYYY-MM-DD",!0).isValid(),ue(s,tt,mt,ht)),s},"compileData"),Yr=l(function(t,e){let n;e.substr(0,1)===":"?n=e.substr(1,e.length):n=e;const i=n.split(","),s={};Gt(i,s,ce);for(let k=0;k<i.length;k++)i[k]=i[k].trim();switch(i.length){case 1:s.id=lt(),s.startTime={type:"prevTaskEnd",id:t},s.endTime={data:i[0]};break;case 2:s.id=lt(),s.startTime={type:"getStartDate",startData:i[0]},s.endTime={data:i[1]};break;case 3:s.id=lt(i[0]),s.startTime={type:"getStartDate",startData:i[1]},s.endTime={data:i[2]};break}return s},"parseData"),Yt,_t,H=[],he={},Wr=l(function(t,e){const n={section:ut,type:ut,processed:!1,manualEndTime:!1,renderEndTime:null,raw:{data:e},task:t,classes:[]},i=Yr(_t,e);n.raw.startTime=i.startTime,n.raw.endTime=i.endTime,n.id=i.id,n.prevTaskId=_t,n.active=i.active,n.done=i.done,n.crit=i.crit,n.milestone=i.milestone,n.vert=i.vert,n.order=Ft,Ft++;const s=H.push(n);_t=n.id,he[n.id]=s-1},"addTask"),it=l(function(t){const e=he[t];return H[e]},"findTaskById"),Vr=l(function(t,e){const n={section:ut,type:ut,description:t,task:t,classes:[]},i=Lr(Yt,e);n.startTime=i.startTime,n.endTime=i.endTime,n.id=i.id,n.active=i.active,n.done=i.done,n.crit=i.crit,n.milestone=i.milestone,n.vert=i.vert,Yt=n,St.push(n)},"addTaskOrg"),se=l(function(){const t=l(function(n){const i=H[n];let s="";switch(H[n].raw.startTime.type){case"prevTaskEnd":{const k=it(i.prevTaskId);i.startTime=k.endTime;break}case"getStartDate":s=Lt(void 0,tt,H[n].raw.startTime.startData),s&&(H[n].startTime=s);break}return H[n].startTime&&(H[n].endTime=fe(H[n].startTime,tt,H[n].raw.endTime.data,kt),H[n].endTime&&(H[n].processed=!0,H[n].manualEndTime=U(H[n].raw.endTime.data,"YYYY-MM-DD",!0).isValid(),ue(H[n],tt,mt,ht))),H[n].processed},"compileTask");let e=!0;for(const[n,i]of H.entries())t(n),e=e&&i.processed;return e},"compileTasks"),Pr=l(function(t,e){let n=e;ct().securityLevel!=="loose"&&(n=_e.sanitizeUrl(e)),t.split(",").forEach(function(i){it(i)!==void 0&&(ke(i,()=>{window.open(n,"_self")}),Ot.set(i,n))}),me(t,"clickable")},"setLink"),me=l(function(t,e){t.split(",").forEach(function(n){let i=it(n);i!==void 0&&i.classes.push(e)})},"setClass"),zr=l(function(t,e,n){if(ct().securityLevel!=="loose"||e===void 0)return;let i=[];if(typeof n=="string"){i=n.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);for(let k=0;k<i.length;k++){let d=i[k].trim();d.startsWith('"')&&d.endsWith('"')&&(d=d.substr(1,d.length-2)),i[k]=d}}i.length===0&&i.push(t),it(t)!==void 0&&ke(t,()=>{Se.runFunc(e,...i)})},"setClickFun"),ke=l(function(t,e){Bt.push(function(){const n=document.querySelector(`[id="${t}"]`);n!==null&&n.addEventListener("click",function(){e()})},function(){const n=document.querySelector(`[id="${t}-text"]`);n!==null&&n.addEventListener("click",function(){e()})})},"pushFun"),Or=l(function(t,e,n){t.split(",").forEach(function(i){zr(i,e,n)}),me(t,"clickable")},"setClickEvent"),Rr=l(function(t){Bt.forEach(function(e){e(t)})},"bindFunctions"),Nr={getConfig:l(()=>ct().gantt,"getConfig"),clear:ar,setDateFormat:hr,getDateFormat:xr,enableInclusiveEndDates:mr,endDatesAreInclusive:kr,enableTopAxis:yr,topAxisEnabled:gr,setAxisFormat:or,getAxisFormat:cr,setTickInterval:lr,getTickInterval:ur,setTodayMarker:dr,getTodayMarker:fr,setAccTitle:Te,getAccTitle:xe,setDiagramTitle:ve,getDiagramTitle:pe,setDisplayMode:pr,getDisplayMode:vr,setAccDescription:ge,getAccDescription:ye,addSection:Sr,getSections:Cr,getTasks:Er,addTask:Wr,findTaskById:it,addTaskOrg:Vr,setIncludes:Tr,getIncludes:br,setExcludes:wr,getExcludes:_r,setClickEvent:Or,setLink:Pr,getLinks:Dr,bindFunctions:Rr,parseDuration:de,isInvalidDate:le,setWeekday:Mr,getWeekday:Ar,setWeekend:Ir};function Gt(t,e,n){let i=!0;for(;i;)i=!1,n.forEach(function(s){const k="^\\s*"+s+"\\s*$",d=new RegExp(k);t[0].match(d)&&(e[s]=!0,t.shift(1),i=!0)})}l(Gt,"getTaskTags");var Br=l(function(){Dt.debug("Something is calling, setConf, remove the call")},"setConf"),ae={monday:Pe,tuesday:Ve,wednesday:We,thursday:Ye,friday:Le,saturday:Fe,sunday:Ie},Hr=l((t,e)=>{let n=[...t].map(()=>-1/0),i=[...t].sort((k,d)=>k.startTime-d.startTime||k.order-d.order),s=0;for(const k of i)for(let d=0;d<n.length;d++)if(k.startTime>=n[d]){n[d]=k.endTime,k.order=d+e,d>s&&(s=d);break}return s},"getMaxIntersections"),et,qr=l(function(t,e,n,i){const s=ct().gantt,k=ct().securityLevel;let d;k==="sandbox"&&(d=gt("#i"+e));const D=k==="sandbox"?gt(d.nodes()[0].contentDocument.body):gt("body"),E=k==="sandbox"?d.nodes()[0].contentDocument:document,C=E.getElementById(e);et=C.parentElement.offsetWidth,et===void 0&&(et=1200),s.useWidth!==void 0&&(et=s.useWidth);const g=i.db.getTasks();let F=[];for(const y of g)F.push(y.type);F=z(F);const S={};let v=2*s.topPadding;if(i.db.getDisplayMode()==="compact"||s.displayMode==="compact"){const y={};for(const T of g)y[T.section]===void 0?y[T.section]=[T]:y[T.section].push(T);let b=0;for(const T of Object.keys(y)){const p=Hr(y[T],b)+1;b+=p,v+=p*(s.barHeight+s.barGap),S[T]=p}}else{v+=g.length*(s.barHeight+s.barGap);for(const y of F)S[y]=g.filter(b=>b.type===y).length}C.setAttribute("viewBox","0 0 "+et+" "+v);const q=D.select(`[id="${e}"]`),A=Ce().domain([Ee(g,function(y){return y.startTime}),Me(g,function(y){return y.endTime})]).rangeRound([0,et-s.leftPadding-s.rightPadding]);function x(y,b){const T=y.startTime,p=b.startTime;let m=0;return T>p?m=1:T<p&&(m=-1),m}l(x,"taskCompare"),g.sort(x),M(g,et,v),be(q,v,et,s.useMaxWidth),q.append("text").text(i.db.getDiagramTitle()).attr("x",et/2).attr("y",s.titleTopMargin).attr("class","titleText");function M(y,b,T){const p=s.barHeight,m=p+s.barGap,w=s.topPadding,c=s.leftPadding,u=ze().domain([0,F.length]).range(["#00B9FA","#F95002"]).interpolate(Ae);Y(m,w,c,b,T,y,i.db.getExcludes(),i.db.getIncludes()),N(c,w,b,T),L(y,m,w,c,p,u,b),R(m,w),G(c,w,b,T)}l(M,"makeGantt");function L(y,b,T,p,m,w,c){y.sort((o,r)=>o.vert===r.vert?0:o.vert?1:-1);const h=[...new Set(y.map(o=>o.order))].map(o=>y.find(r=>r.order===o));q.append("g").selectAll("rect").data(h).enter().append("rect").attr("x",0).attr("y",function(o,r){return r=o.order,r*b+T-2}).attr("width",function(){return c-s.rightPadding/2}).attr("height",b).attr("class",function(o){for(const[r,V]of F.entries())if(o.type===V)return"section section"+r%s.numberSectionStyles;return"section section0"}).enter();const f=q.append("g").selectAll("rect").data(y).enter(),_=i.db.getLinks();if(f.append("rect").attr("id",function(o){return o.id}).attr("rx",3).attr("ry",3).attr("x",function(o){return o.milestone?A(o.startTime)+p+.5*(A(o.endTime)-A(o.startTime))-.5*m:A(o.startTime)+p}).attr("y",function(o,r){return r=o.order,o.vert?s.gridLineStartPadding:r*b+T}).attr("width",function(o){return o.milestone?m:o.vert?.08*m:A(o.renderEndTime||o.endTime)-A(o.startTime)}).attr("height",function(o){return o.vert?g.length*(s.barHeight+s.barGap)+s.barHeight*2:m}).attr("transform-origin",function(o,r){return r=o.order,(A(o.startTime)+p+.5*(A(o.endTime)-A(o.startTime))).toString()+"px "+(r*b+T+.5*m).toString()+"px"}).attr("class",function(o){const r="task";let V="";o.classes.length>0&&(V=o.classes.join(" "));let I=0;for(const[X,P]of F.entries())o.type===P&&(I=X%s.numberSectionStyles);let W="";return o.active?o.crit?W+=" activeCrit":W=" active":o.done?o.crit?W=" doneCrit":W=" done":o.crit&&(W+=" crit"),W.length===0&&(W=" task"),o.milestone&&(W=" milestone "+W),o.vert&&(W=" vert "+W),W+=I,W+=" "+V,r+W}),f.append("text").attr("id",function(o){return o.id+"-text"}).text(function(o){return o.task}).attr("font-size",s.fontSize).attr("x",function(o){let r=A(o.startTime),V=A(o.renderEndTime||o.endTime);if(o.milestone&&(r+=.5*(A(o.endTime)-A(o.startTime))-.5*m,V=r+m),o.vert)return A(o.startTime)+p;const I=this.getBBox().width;return I>V-r?V+I+1.5*s.leftPadding>c?r+p-5:V+p+5:(V-r)/2+r+p}).attr("y",function(o,r){return o.vert?s.gridLineStartPadding+g.length*(s.barHeight+s.barGap)+60:(r=o.order,r*b+s.barHeight/2+(s.fontSize/2-2)+T)}).attr("text-height",m).attr("class",function(o){const r=A(o.startTime);let V=A(o.endTime);o.milestone&&(V=r+m);const I=this.getBBox().width;let W="";o.classes.length>0&&(W=o.classes.join(" "));let X=0;for(const[O,Q]of F.entries())o.type===Q&&(X=O%s.numberSectionStyles);let P="";return o.active&&(o.crit?P="activeCritText"+X:P="activeText"+X),o.done?o.crit?P=P+" doneCritText"+X:P=P+" doneText"+X:o.crit&&(P=P+" critText"+X),o.milestone&&(P+=" milestoneText"),o.vert&&(P+=" vertText"),I>V-r?V+I+1.5*s.leftPadding>c?W+" taskTextOutsideLeft taskTextOutside"+X+" "+P:W+" taskTextOutsideRight taskTextOutside"+X+" "+P+" width-"+I:W+" taskText taskText"+X+" "+P+" width-"+I}),ct().securityLevel==="sandbox"){let o;o=gt("#i"+e);const r=o.nodes()[0].contentDocument;f.filter(function(V){return _.has(V.id)}).each(function(V){var I=r.querySelector("#"+V.id),W=r.querySelector("#"+V.id+"-text");const X=I.parentNode;var P=r.createElement("a");P.setAttribute("xlink:href",_.get(V.id)),P.setAttribute("target","_top"),X.appendChild(P),P.appendChild(I),P.appendChild(W)})}}l(L,"drawRects");function Y(y,b,T,p,m,w,c,u){if(c.length===0&&u.length===0)return;let h,f;for(const{startTime:I,endTime:W}of w)(h===void 0||I<h)&&(h=I),(f===void 0||W>f)&&(f=W);if(!h||!f)return;if(U(f).diff(U(h),"year")>5){Dt.warn("The difference between the min and max time is more than 5 years. This will cause performance issues. Skipping drawing exclude days.");return}const _=i.db.getDateFormat(),a=[];let o=null,r=U(h);for(;r.valueOf()<=f;)i.db.isInvalidDate(r,_,c,u)?o?o.end=r:o={start:r,end:r}:o&&(a.push(o),o=null),r=r.add(1,"d");q.append("g").selectAll("rect").data(a).enter().append("rect").attr("id",function(I){return"exclude-"+I.start.format("YYYY-MM-DD")}).attr("x",function(I){return A(I.start)+T}).attr("y",s.gridLineStartPadding).attr("width",function(I){const W=I.end.add(1,"day");return A(W)-A(I.start)}).attr("height",m-b-s.gridLineStartPadding).attr("transform-origin",function(I,W){return(A(I.start)+T+.5*(A(I.end)-A(I.start))).toString()+"px "+(W*y+.5*m).toString()+"px"}).attr("class","exclude-range")}l(Y,"drawExcludeDays");function N(y,b,T,p){let m=Xe(A).tickSize(-p+b+s.gridLineStartPadding).tickFormat(jt(i.db.getAxisFormat()||s.axisFormat||"%Y-%m-%d"));const c=/^([1-9]\d*)(millisecond|second|minute|hour|day|week|month)$/.exec(i.db.getTickInterval()||s.tickInterval);if(c!==null){const u=c[1],h=c[2],f=i.db.getWeekday()||s.weekday;switch(h){case"millisecond":m.ticks(Jt.every(u));break;case"second":m.ticks(Kt.every(u));break;case"minute":m.ticks(Qt.every(u));break;case"hour":m.ticks($t.every(u));break;case"day":m.ticks(Zt.every(u));break;case"week":m.ticks(ae[f].every(u));break;case"month":m.ticks(Ut.every(u));break}}if(q.append("g").attr("class","grid").attr("transform","translate("+y+", "+(p-50)+")").call(m).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10).attr("dy","1em"),i.db.topAxisEnabled()||s.topAxis){let u=Ge(A).tickSize(-p+b+s.gridLineStartPadding).tickFormat(jt(i.db.getAxisFormat()||s.axisFormat||"%Y-%m-%d"));if(c!==null){const h=c[1],f=c[2],_=i.db.getWeekday()||s.weekday;switch(f){case"millisecond":u.ticks(Jt.every(h));break;case"second":u.ticks(Kt.every(h));break;case"minute":u.ticks(Qt.every(h));break;case"hour":u.ticks($t.every(h));break;case"day":u.ticks(Zt.every(h));break;case"week":u.ticks(ae[_].every(h));break;case"month":u.ticks(Ut.every(h));break}}q.append("g").attr("class","grid").attr("transform","translate("+y+", "+b+")").call(u).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10)}}l(N,"makeGrid");function R(y,b){let T=0;const p=Object.keys(S).map(m=>[m,S[m]]);q.append("g").selectAll("text").data(p).enter().append(function(m){const w=m[0].split(we.lineBreakRegex),c=-(w.length-1)/2,u=E.createElementNS("http://www.w3.org/2000/svg","text");u.setAttribute("dy",c+"em");for(const[h,f]of w.entries()){const _=E.createElementNS("http://www.w3.org/2000/svg","tspan");_.setAttribute("alignment-baseline","central"),_.setAttribute("x","10"),h>0&&_.setAttribute("dy","1em"),_.textContent=f,u.appendChild(_)}return u}).attr("x",10).attr("y",function(m,w){if(w>0)for(let c=0;c<w;c++)return T+=p[w-1][1],m[1]*y/2+T*y+b;else return m[1]*y/2+b}).attr("font-size",s.sectionFontSize).attr("class",function(m){for(const[w,c]of F.entries())if(m[0]===c)return"sectionTitle sectionTitle"+w%s.numberSectionStyles;return"sectionTitle"})}l(R,"vertLabels");function G(y,b,T,p){const m=i.db.getTodayMarker();if(m==="off")return;const w=q.append("g").attr("class","today"),c=new Date,u=w.append("line");u.attr("x1",A(c)+y).attr("x2",A(c)+y).attr("y1",s.titleTopMargin).attr("y2",p-s.titleTopMargin).attr("class","today"),m!==""&&u.attr("style",m.replace(/,/g,";"))}l(G,"drawToday");function z(y){const b={},T=[];for(let p=0,m=y.length;p<m;++p)Object.prototype.hasOwnProperty.call(b,y[p])||(b[y[p]]=!0,T.push(y[p]));return T}l(z,"checkUnique")},"draw"),Gr={setConf:Br,draw:qr},Xr=l(t=>`
  .mermaid-main-font {
        font-family: ${t.fontFamily};
  }

  .exclude-range {
    fill: ${t.excludeBkgColor};
  }

  .section {
    stroke: none;
    opacity: 0.2;
  }

  .section0 {
    fill: ${t.sectionBkgColor};
  }

  .section2 {
    fill: ${t.sectionBkgColor2};
  }

  .section1,
  .section3 {
    fill: ${t.altSectionBkgColor};
    opacity: 0.2;
  }

  .sectionTitle0 {
    fill: ${t.titleColor};
  }

  .sectionTitle1 {
    fill: ${t.titleColor};
  }

  .sectionTitle2 {
    fill: ${t.titleColor};
  }

  .sectionTitle3 {
    fill: ${t.titleColor};
  }

  .sectionTitle {
    text-anchor: start;
    font-family: ${t.fontFamily};
  }


  /* Grid and axis */

  .grid .tick {
    stroke: ${t.gridColor};
    opacity: 0.8;
    shape-rendering: crispEdges;
  }

  .grid .tick text {
    font-family: ${t.fontFamily};
    fill: ${t.textColor};
  }

  .grid path {
    stroke-width: 0;
  }


  /* Today line */

  .today {
    fill: none;
    stroke: ${t.todayLineColor};
    stroke-width: 2px;
  }


  /* Task styling */

  /* Default task */

  .task {
    stroke-width: 2;
  }

  .taskText {
    text-anchor: middle;
    font-family: ${t.fontFamily};
  }

  .taskTextOutsideRight {
    fill: ${t.taskTextDarkColor};
    text-anchor: start;
    font-family: ${t.fontFamily};
  }

  .taskTextOutsideLeft {
    fill: ${t.taskTextDarkColor};
    text-anchor: end;
  }


  /* Special case clickable */

  .task.clickable {
    cursor: pointer;
  }

  .taskText.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideLeft.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideRight.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }


  /* Specific task settings for the sections*/

  .taskText0,
  .taskText1,
  .taskText2,
  .taskText3 {
    fill: ${t.taskTextColor};
  }

  .task0,
  .task1,
  .task2,
  .task3 {
    fill: ${t.taskBkgColor};
    stroke: ${t.taskBorderColor};
  }

  .taskTextOutside0,
  .taskTextOutside2
  {
    fill: ${t.taskTextOutsideColor};
  }

  .taskTextOutside1,
  .taskTextOutside3 {
    fill: ${t.taskTextOutsideColor};
  }


  /* Active task */

  .active0,
  .active1,
  .active2,
  .active3 {
    fill: ${t.activeTaskBkgColor};
    stroke: ${t.activeTaskBorderColor};
  }

  .activeText0,
  .activeText1,
  .activeText2,
  .activeText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Completed task */

  .done0,
  .done1,
  .done2,
  .done3 {
    stroke: ${t.doneTaskBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
  }

  .doneText0,
  .doneText1,
  .doneText2,
  .doneText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Tasks on the critical line */

  .crit0,
  .crit1,
  .crit2,
  .crit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.critBkgColor};
    stroke-width: 2;
  }

  .activeCrit0,
  .activeCrit1,
  .activeCrit2,
  .activeCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.activeTaskBkgColor};
    stroke-width: 2;
  }

  .doneCrit0,
  .doneCrit1,
  .doneCrit2,
  .doneCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
    cursor: pointer;
    shape-rendering: crispEdges;
  }

  .milestone {
    transform: rotate(45deg) scale(0.8,0.8);
  }

  .milestoneText {
    font-style: italic;
  }
  .doneCritText0,
  .doneCritText1,
  .doneCritText2,
  .doneCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .vert {
    stroke: ${t.vertLineColor};
  }

  .vertText {
    font-size: 15px;
    text-anchor: middle;
    fill: ${t.vertLineColor} !important;
  }

  .activeCritText0,
  .activeCritText1,
  .activeCritText2,
  .activeCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .titleText {
    text-anchor: middle;
    font-size: 18px;
    fill: ${t.titleColor||t.textColor};
    font-family: ${t.fontFamily};
  }
`,"getStyles"),jr=Xr,en={parser:sr,db:Nr,renderer:Gr,styles:jr};export{en as diagram};
