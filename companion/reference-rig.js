/* Native SVG cutout rig of the supplied standing cel in the existing atlas.
   Each clipped region retains the user's bitmap; joints animate independently.
   No third-party downloads or newly claimed licensing. */
(()=>{'use strict';
const parts={
 tail:'M85 41 L135 15 L136 70 L108 72 L113 91 L92 108 L86 96 L99 87Z',
 'ear-left':'M0 0 H30 L55 34 L41 45 L12 29Z',
 'ear-right':'M66 32 L93 0 H115 L104 30 L80 43Z',
 'arm-left':'M35 65 Q46 72 53 83 L60 96 L48 103 L29 90Z',
 'arm-right':'M76 66 L89 65 L95 90 L79 103 L66 98 L71 84Z',
 'foot-left':'M27 117 L48 113 L54 129 L30 136 L19 132Z',
 'foot-right':'M78 115 L96 116 L108 136 H79Z'
};
const image='<image href="companion/assets/pikachu-user-poses.png" width="408" height="136"/>';
const clip=Object.entries(parts).map(([id,d])=>'<clipPath id="pc-ref-'+id+'"><path d="'+d+'"/></clipPath>').join('');
const part=id=>'<g class="pc-pik-'+id+' '+(id.startsWith('ear')?'pc-pik-ear':id.startsWith('arm')?'pc-pik-arm':id.startsWith('foot')?'pc-pik-foot':'')+'"><g clip-path="url(#pc-ref-'+id+')">'+image+'</g></g>';
window.PsychDeskReferenceRigMarkup='<svg class="pc-pikachu pc-reference-rig" viewBox="0 0 136 146" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs>'+clip+
 '<mask id="pc-ref-body" maskUnits="userSpaceOnUse" x="0" y="0" width="136" height="136"><rect width="136" height="136" fill="white"/>'+Object.values(parts).map(d=>'<path d="'+d+'" fill="black"/>').join('')+'</mask></defs>'+
 part('tail')+part('ear-left')+part('ear-right')+part('foot-left')+part('foot-right')+
 '<path d="M36 66 Q61 60 87 65 L93 112 Q65 129 29 113Z" fill="#f4d84b"/>'+ '<g mask="url(#pc-ref-body)">'+image+'</g>'+part('arm-left')+part('arm-right')+
 '<g class="pc-ref-eyelids" fill="none" stroke="#eed64b" stroke-width="15"><path d="M38 54 L48 54 M69 54 L79 54"/><path d="M38 54 q5 5 10 0 M69 54 q5 5 10 0" stroke="#332c22" stroke-width="1.7"/></g></svg>';
})();
