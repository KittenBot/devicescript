"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[9020],{35318:(e,n,t)=>{t.d(n,{Zo:()=>c,kt:()=>y});var r=t(27378);function a(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function i(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,r)}return t}function l(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?i(Object(t),!0).forEach((function(n){a(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):i(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function o(e,n){if(null==e)return{};var t,r,a=function(e,n){if(null==e)return{};var t,r,a={},i=Object.keys(e);for(r=0;r<i.length;r++)t=i[r],n.indexOf(t)>=0||(a[t]=e[t]);return a}(e,n);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)t=i[r],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(a[t]=e[t])}return a}var p=r.createContext({}),s=function(e){var n=r.useContext(p),t=n;return e&&(t="function"==typeof e?e(n):l(l({},n),e)),t},c=function(e){var n=s(e.components);return r.createElement(p.Provider,{value:n},e.children)},u="mdxType",d={inlineCode:"code",wrapper:function(e){var n=e.children;return r.createElement(r.Fragment,{},n)}},m=r.forwardRef((function(e,n){var t=e.components,a=e.mdxType,i=e.originalType,p=e.parentName,c=o(e,["components","mdxType","originalType","parentName"]),u=s(t),m=a,y=u["".concat(p,".").concat(m)]||u[m]||d[m]||i;return t?r.createElement(y,l(l({ref:n},c),{},{components:t})):r.createElement(y,l({ref:n},c))}));function y(e,n){var t=arguments,a=n&&n.mdxType;if("string"==typeof e||a){var i=t.length,l=new Array(i);l[0]=m;var o={};for(var p in n)hasOwnProperty.call(n,p)&&(o[p]=n[p]);o.originalType=e,o[u]="string"==typeof e?e:a,l[1]=o;for(var s=2;s<i;s++)l[s]=t[s];return r.createElement.apply(null,l)}return r.createElement.apply(null,t)}m.displayName="MDXCreateElement"},79198:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>p,contentTitle:()=>l,default:()=>d,frontMatter:()=>i,metadata:()=>o,toc:()=>s});var r=t(25773),a=(t(27378),t(35318));const i={pagination_prev:null,pagination_next:null,description:"DeviceScript client for Sound player service"},l="SoundPlayer",o={unversionedId:"api/clients/soundplayer",id:"api/clients/soundplayer",title:"SoundPlayer",description:"DeviceScript client for Sound player service",source:"@site/docs/api/clients/soundplayer.md",sourceDirName:"api/clients",slug:"/api/clients/soundplayer",permalink:"/devicescript/api/clients/soundplayer",draft:!1,tags:[],version:"current",frontMatter:{pagination_prev:null,pagination_next:null,description:"DeviceScript client for Sound player service"},sidebar:"tutorialSidebar"},p={},s=[{value:"Commands",id:"commands",level:2},{value:"play",id:"play",level:3},{value:"cancel",id:"cancel",level:3},{value:"Registers",id:"registers",level:2},{value:"intensity",id:"rw:intensity",level:3}],c={toc:s},u="wrapper";function d(e){let{components:n,...t}=e;return(0,a.kt)(u,(0,r.Z)({},c,t,{components:n,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"soundplayer"},"SoundPlayer"),(0,a.kt)("admonition",{type:"caution"},(0,a.kt)("p",{parentName:"admonition"},"This service is rc and may change in the future.")),(0,a.kt)("p",null,"A device that can play various sounds stored locally. This service is typically paired with a ",(0,a.kt)("inlineCode",{parentName:"p"},"storage")," service for storing sounds."),(0,a.kt)("p",null),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-ts"},'import { SoundPlayer } from "@devicescript/core"\n\nconst soundPlayer = new SoundPlayer()\n')),(0,a.kt)("p",null),(0,a.kt)("h2",{id:"commands"},"Commands"),(0,a.kt)("h3",{id:"play"},"play"),(0,a.kt)("p",null,"Starts playing a sound."),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-ts",metastring:"skip no-run",skip:!0,"no-run":!0},"soundPlayer.play(name: string): Promise<void>\n")),(0,a.kt)("h3",{id:"cancel"},"cancel"),(0,a.kt)("p",null,"Cancel any sound playing."),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-ts",metastring:"skip no-run",skip:!0,"no-run":!0},"soundPlayer.cancel(): Promise<void>\n")),(0,a.kt)("h2",{id:"registers"},"Registers"),(0,a.kt)("p",null),(0,a.kt)("h3",{id:"rw:intensity"},"intensity"),(0,a.kt)("p",null,"Global volume of the output. ",(0,a.kt)("inlineCode",{parentName:"p"},"0")," means completely off. This volume is mixed with each play volumes."),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("p",{parentName:"li"},"type: ",(0,a.kt)("inlineCode",{parentName:"p"},"Register<number>")," (packing format ",(0,a.kt)("inlineCode",{parentName:"p"},"u0.16"),")")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("p",{parentName:"li"},"optional: this register may not be implemented")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("p",{parentName:"li"},"read and write"))),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-ts",metastring:"skip",skip:!0},'import { SoundPlayer } from "@devicescript/core"\n\nconst soundPlayer = new SoundPlayer()\n// ...\nconst value = await soundPlayer.intensity.read()\nawait soundPlayer.intensity.write(value)\n')),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},"track incoming values")),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-ts",metastring:"skip",skip:!0},'import { SoundPlayer } from "@devicescript/core"\n\nconst soundPlayer = new SoundPlayer()\n// ...\nsoundPlayer.intensity.subscribe(async (value) => {\n    ...\n})\n')),(0,a.kt)("admonition",{type:"note"},(0,a.kt)("p",{parentName:"admonition"},(0,a.kt)("inlineCode",{parentName:"p"},"write")," and ",(0,a.kt)("inlineCode",{parentName:"p"},"read")," will block until a server is bound to the client.")),(0,a.kt)("p",null))}d.isMDXComponent=!0}}]);